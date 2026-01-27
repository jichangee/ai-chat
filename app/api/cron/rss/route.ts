import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { parseRSSFeed, filterNewItems, formatRSSItemAsMessage } from '@/lib/rss/parser';
import { sendBarkNotification } from '@/lib/notification/bark';
import { matchKeywords } from '@/lib/notification/matcher';
import { checkAITriggers } from '@/lib/ai/trigger';
import { getAIResponse } from '@/lib/ai/chat';
import { RSSFeed, NotificationRule, AIBot, Message } from '@/types';

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

    // 获取所有活跃的 AI 机器人（在循环外获取一次）
    const botsResult = await sql`
      SELECT * FROM ai_bots WHERE is_active = true
    `;
    const bots: AIBot[] = botsResult.rows as any[];

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

          const message = messageResult.rows[0];

          // 检查是否需要发送通知
          await checkAndSendNotification(message, feed.name);

          // 检查是否触发 AI 机器人
          await processAIBotTriggers(message, bots);

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
          
          console.log(`${feed.name}: 发现 ${newItems.length} 条新消息，已发送最新的 1 条`);
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

// 处理 AI 机器人触发
async function processAIBotTriggers(message: any, bots: AIBot[]) {
  try {
    // 检查是否触发任何 AI 机器人
    const triggeredBots = checkAITriggers(message.content, bots);
    
    if (triggeredBots.length === 0) {
      return;
    }

    console.log(`RSS 消息触发了 ${triggeredBots.length} 个 AI 机器人:`, triggeredBots.map(b => b.name));

    // 获取最近的上下文消息（用于 AI 对话）
    const contextResult = await sql`
      SELECT * FROM messages
      WHERE sender_type IN ('user', 'ai', 'rss')
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const context: Message[] = (contextResult.rows as any[]).reverse();

    // 为每个被触发的机器人生成回复
    for (const bot of triggeredBots) {
      try {
        console.log(`机器人 ${bot.name} 正在处理 RSS 消息...`);
        
        const aiResponse = await getAIResponse(bot, message.content, context);
        
        const aiMetadata = { 
          model: bot.model, 
          bot_id: bot.id,
          triggered_by: 'rss',
          rss_message_id: message.id
        };

        await sql`
          INSERT INTO messages (
            content, 
            sender_type, 
            sender_id, 
            sender_name, 
            metadata,
            quoted_message_id
          )
          VALUES (
            ${aiResponse}, 
            'ai', 
            ${bot.id}, 
            ${bot.name},
            ${JSON.stringify(aiMetadata)},
            ${message.id}
          )
        `;
        
        console.log(`机器人 ${bot.name} 成功回复 RSS 消息`);
      } catch (error) {
        console.error(`机器人 ${bot.name} 处理 RSS 消息失败:`, {
          botId: bot.id,
          botName: bot.name,
          model: bot.model,
          error: error instanceof Error ? error.message : String(error),
        });
        // 继续处理其他机器人，不抛出异常
      }
    }
  } catch (error) {
    console.error('处理 AI 机器人触发失败:', error);
  }
}
