import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { parseRSSFeed, filterNewItems, formatRSSItemAsMessage } from '@/lib/rss/parser';
import { sendBarkNotification } from '@/lib/notification/bark';
import { matchKeywords } from '@/lib/notification/matcher';
import { RSSFeed, NotificationRule } from '@/types';

// GET: Vercel Cron 定时任务
export async function GET(request: NextRequest) {
  // 验证 Cron Secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('开始执行定时 RSS 获取任务');
    
    // 获取所有活跃的 RSS 订阅源
    const feedsResult = await sql`
      SELECT * FROM rss_feeds WHERE is_active = true
    `;
    const feeds: RSSFeed[] = feedsResult.rows as any[];

    if (feeds.length === 0) {
      console.log('没有活跃的 RSS 订阅源');
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
          // 保存新消息到数据库
          for (const item of newItems) {
            const messageContent = formatRSSItemAsMessage(item, feed.name);
            
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
                  title: item.title, 
                  link: item.link,
                  pubDate: item.pubDate 
                })}
              )
              RETURNING *
            `;

            // 检查是否需要发送通知
            const message = messageResult.rows[0];
            await checkAndSendNotification(message, feed.name);
          }

          // 更新订阅源的最后获取时间和最新条目时间
          const latestItemDate = newItems[0].pubDate;
          await sql`
            UPDATE rss_feeds
            SET 
              last_fetched_at = CURRENT_TIMESTAMP,
              last_item_date = ${latestItemDate}
            WHERE id = ${feed.id}
          `;

          totalNewItems += newItems.length;
          results.push({
            feed: feed.name,
            newItems: newItems.length,
          });
          
          console.log(`${feed.name}: 获取到 ${newItems.length} 条新消息`);
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
          error: (error as Error).message,
        });
      }
    }

    console.log(`定时任务完成，共获取 ${totalNewItems} 条新消息`);
    
    return NextResponse.json({
      message: `成功获取 ${totalNewItems} 条新消息`,
      newItems: totalNewItems,
      results,
    });
  } catch (error) {
    console.error('定时 RSS 获取失败:', error);
    return NextResponse.json(
      { error: 'RSS 获取失败', details: (error as Error).message },
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
