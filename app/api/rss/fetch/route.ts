import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { parseRSSFeed, filterNewItems, formatRSSItemAsMessage } from '@/lib/rss/parser';
import { sendBarkNotification } from '@/lib/notification/bark';
import { matchKeywords } from '@/lib/notification/matcher';
import { RSSFeed, NotificationRule } from '@/types';

// POST: 手动触发 RSS 获取
export async function POST(request: NextRequest) {
  try {
    // 获取所有活跃的 RSS 订阅源
    const feedsResult = await sql`
      SELECT * FROM rss_feeds WHERE is_active = true
    `;
    const feeds: RSSFeed[] = feedsResult.rows as any[];

    if (feeds.length === 0) {
      return NextResponse.json({ 
        message: '没有活跃的 RSS 订阅源',
        newItems: 0 
      });
    }

    let totalNewItems = 0;
    const results = [];

    for (const feed of feeds) {
      try {
        // 解析 RSS 源
        const items = await parseRSSFeed(feed.url);
        
        // 过滤新条目
        const newItems = filterNewItems(items, feed.last_item_date);
        
        if (newItems.length > 0) {
          // 只处理最新的一条消息
          const latestItem = newItems[0];
          const messageContent = formatRSSItemAsMessage(latestItem, feed.name);
          
          const messageResult = await sql`
            INSERT INTO messages (
              content,
              sender_type,
              sender_id,
              sender_name,
              metadata
            )
            VALUES (
              ${messageContent},
              'rss',
              ${feed.id},
              ${feed.name},
              ${JSON.stringify({ 
                title: latestItem.title, 
                link: latestItem.link,
                pubDate: latestItem.pubDate 
              })}
            )
            RETURNING *
          `;

          // 检查是否需要发送通知
          const message = messageResult.rows[0];
          await checkAndSendNotification(message, feed.name);

          // 更新订阅源的最后获取时间和最新条目时间
          await sql`
            UPDATE rss_feeds
            SET 
              last_fetched_at = CURRENT_TIMESTAMP,
              last_item_date = ${latestItem.pubDate}
            WHERE id = ${feed.id}
          `;

          totalNewItems += 1;
          results.push({
            feed: feed.name,
            newItems: 1,
            totalAvailable: newItems.length,
          });
        } else {
          // 即使没有新条目，也更新最后获取时间
          await sql`
            UPDATE rss_feeds
            SET last_fetched_at = CURRENT_TIMESTAMP
            WHERE id = ${feed.id}
          `;
        }
      } catch (error) {
        console.error(`获取 RSS 源 ${feed.name} 失败:`, error);
        results.push({
          feed: feed.name,
          error: '获取失败',
        });
      }
    }

    return NextResponse.json({
      message: `成功获取 ${totalNewItems} 条新消息`,
      newItems: totalNewItems,
      results,
    });
  } catch (error) {
    console.error('RSS 获取失败:', error);
    return NextResponse.json(
      { error: 'RSS 获取失败' },
      { status: 500 }
    );
  }
}

// 检查并发送通知
async function checkAndSendNotification(message: any, feedName: string) {
  try {
    const rulesResult = await sql`
      SELECT * FROM notification_rules WHERE is_active = true LIMIT 1
    `;
    
    if (rulesResult.rows.length === 0) {
      return;
    }

    const rule: NotificationRule = rulesResult.rows[0] as any;
    
    if (!rule.bark_url || !rule.keywords || rule.keywords.length === 0) {
      return;
    }

    if (matchKeywords(message.content, rule.keywords)) {
      await sendBarkNotification(
        rule.bark_url,
        `RSS 更新：${feedName}`,
        message.content.substring(0, 100),
        {
          group: 'ai-chat-rss',
        }
      );
    }
  } catch (error) {
    console.error('检查通知失败:', error);
  }
}
