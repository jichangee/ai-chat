import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { checkAITriggers } from '@/lib/ai/trigger';
import { getAIResponse } from '@/lib/ai/chat';
import { sendBarkNotification } from '@/lib/notification/bark';
import { matchKeywords } from '@/lib/notification/matcher';
import { Message, AIBot, NotificationRule } from '@/types';

// GET: 获取消息列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await sql`
      SELECT * FROM messages
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const messages: Message[] = result.rows as any[];
    
    return NextResponse.json({ 
      messages: messages.reverse(), // 反转以便最新的在底部
      hasMore: messages.length === limit 
    });
  } catch (error) {
    console.error('获取消息失败:', error);
    return NextResponse.json(
      { error: '获取消息失败' },
      { status: 500 }
    );
  }
}

// POST: 发送新消息
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      );
    }

    // 保存用户消息
    const userMessageResult = await sql`
      INSERT INTO messages (content, sender_type, sender_name, metadata)
      VALUES (${content}, 'user', '我', '{}')
      RETURNING *
    `;
    const userMessage: Message = userMessageResult.rows[0] as any;

    // 获取所有活跃的 AI 机器人
    const botsResult = await sql`
      SELECT * FROM ai_bots WHERE is_active = true
    `;
    const bots: AIBot[] = botsResult.rows as any[];

    // 检查是否触发任何 AI 机器人
    const triggeredBots = checkAITriggers(content, bots);

    // 获取最近的上下文消息（用于 AI 对话）
    const contextResult = await sql`
      SELECT * FROM messages
      WHERE sender_type IN ('user', 'ai')
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const context: Message[] = (contextResult.rows as any[]).reverse();

    const aiMessages: Message[] = [];

    // 为每个被触发的机器人生成回复
    for (const bot of triggeredBots) {
      try {
        const aiResponse = await getAIResponse(bot, content, context);
        
        const aiMessageResult = await sql`
          INSERT INTO messages (
            content, 
            sender_type, 
            sender_id, 
            sender_name, 
            metadata
          )
          VALUES (
            ${aiResponse}, 
            'ai', 
            ${bot.id}, 
            ${bot.name},
            ${JSON.stringify({ model: bot.model, bot_id: bot.id })}
          )
          RETURNING *
        `;
        
        const aiMessage: Message = aiMessageResult.rows[0] as any;
        aiMessages.push(aiMessage);

        // 检查是否需要发送 Bark 通知
        await checkAndSendNotification(aiMessage);
      } catch (error) {
        console.error(`AI 机器人 ${bot.name} 回复失败:`, error);
      }
    }

    // 也检查用户消息是否需要通知
    await checkAndSendNotification(userMessage);

    return NextResponse.json({
      userMessage,
      aiMessages,
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json(
      { error: '发送消息失败' },
      { status: 500 }
    );
  }
}

// 检查并发送通知
async function checkAndSendNotification(message: Message) {
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
      const title = message.sender_type === 'user' 
        ? '我' 
        : message.sender_name;
      
      await sendBarkNotification(
        rule.bark_url,
        `新消息：${title}`,
        message.content.substring(0, 100),
        {
          group: 'ai-chat',
        }
      );
    }
  } catch (error) {
    console.error('检查通知失败:', error);
  }
}
