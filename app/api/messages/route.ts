import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { checkAITriggers } from '@/lib/ai/trigger';
import { getAIResponse, getAIResponseStream } from '@/lib/ai/chat';
import { sendBarkNotification } from '@/lib/notification/bark';
import { matchKeywords } from '@/lib/notification/matcher';
import { Message, AIBot, NotificationRule } from '@/types';

// GET: 获取消息列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const beforeId = searchParams.get('beforeId'); // 加载此ID之前的消息

    let result;
    if (beforeId) {
      // 加载指定消息之前的历史消息
      result = await sql`
        SELECT * FROM messages
        WHERE created_at < (SELECT created_at FROM messages WHERE id = ${beforeId})
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      // 加载最新的消息
      result = await sql`
        SELECT * FROM messages
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    const messages: Message[] = result.rows as any[];
    
    // 检查是否还有更多历史消息
    let hasMore = false;
    if (messages.length > 0) {
      const oldestMessage = messages[messages.length - 1];
      const checkResult = await sql`
        SELECT COUNT(*) as count FROM messages
        WHERE created_at < ${oldestMessage.created_at}
      `;
      hasMore = parseInt(checkResult.rows[0].count) > 0;
    }
    
    return NextResponse.json({ 
      messages: messages.reverse(), // 反转以便最新的在底部
      hasMore,
      oldestMessageId: messages.length > 0 ? messages[0].id : null // 返回最旧的消息ID，用于下次加载
    });
  } catch (error) {
    console.error('获取消息失败:', error);
    return NextResponse.json(
      { error: '获取消息失败' },
      { status: 500 }
    );
  }
}

// POST: 发送新消息（支持流式响应）
export async function POST(request: NextRequest) {
  try {
    const { content, quoted_message_id, stream } = await request.json();

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      );
    }

    // 保存用户消息
    const userMessageResult = await sql`
      INSERT INTO messages (content, sender_type, sender_name, metadata, quoted_message_id)
      VALUES (${content}, 'user', '我', '{}', ${quoted_message_id || null})
      RETURNING *
    `;
    const userMessage: Message = userMessageResult.rows[0] as any;

    // 获取所有活跃的 AI 机器人
    const botsResult = await sql`
      SELECT * FROM ai_bots WHERE is_active = true
    `;
    const bots: AIBot[] = botsResult.rows as any[];

    // 调试日志：记录消息内容和机器人列表
    console.log('=== 收到用户消息 ===');
    console.log('消息内容:', content);
    console.log('活跃机器人数量:', bots.length);
    console.log('活跃机器人详情:', bots.map(b => ({ 
      name: b.name, 
      is_active: b.is_active,
      trigger_keywords: b.trigger_keywords,
      keywords_count: b.trigger_keywords?.length || 0
    })));

    // 检查是否触发任何 AI 机器人
    const triggeredBots = checkAITriggers(content, bots);
    
    // 调试日志：记录触发结果
    console.log('=== 触发检测结果 ===');
    console.log('触发的机器人数量:', triggeredBots.length);
    console.log('触发的机器人列表:', triggeredBots.map(b => b.name));

    if (triggeredBots.length === 0) {
      // 如果没有触发任何机器人，直接返回用户消息
      await checkAndSendNotification(userMessage);
      return NextResponse.json({
        userMessage,
        aiMessages: [],
      });
    }

    // 获取最近的上下文消息（只取最近5条，用于 AI 对话）
    const contextResult = await sql`
      SELECT * FROM messages
      WHERE sender_type IN ('user', 'ai')
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const context: Message[] = (contextResult.rows as any[]).reverse();

    // 如果有引用消息，将引用的消息添加到上下文中
    let enhancedContext = [...context];
    if (quoted_message_id) {
      const quotedMessageResult = await sql`
        SELECT * FROM messages WHERE id = ${quoted_message_id}
      `;
      if (quotedMessageResult.rows.length > 0) {
        const quotedMessage: Message = quotedMessageResult.rows[0] as any;
        // 在上下文开头添加引用的消息
        enhancedContext = [quotedMessage, ...context.filter(m => m.id !== quoted_message_id)];
      }
    }

    // 构建消息内容，如果有引用，添加引用信息
    let messageForAI = content;
    if (quoted_message_id) {
      const quotedMessageResult = await sql`
        SELECT * FROM messages WHERE id = ${quoted_message_id}
      `;
      if (quotedMessageResult.rows.length > 0) {
        const quotedMessage: Message = quotedMessageResult.rows[0] as any;
        messageForAI = `[回复 ${quotedMessage.sender_name}: "${quotedMessage.content.substring(0, 100)}..."]\n${content}`;
      }
    }

    // 如果请求流式响应
    if (stream) {
      console.log(`开始流式响应，触发了 ${triggeredBots.length} 个机器人`);
      
      // 创建流式响应，支持多机器人并发
      const encoder = new TextEncoder();
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            // 1. 发送用户消息
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'user', message: userMessage })}\n\n`));
            
            // 2. 为每个机器人创建处理Promise
            const botPromises = triggeredBots.map(async (bot) => {
              let messageId: string | null = null;
              
              try {
                // 创建持久化占位消息，保证未进入页面也能看到“回复中”
                const loadingMetadata = { 
                  model: bot.model, 
                  bot_id: bot.id, 
                  loading: true 
                };
                
                const placeholderResult = await sql`
                  INSERT INTO messages (
                    content, 
                    sender_type, 
                    sender_id, 
                    sender_name, 
                    metadata,
                    quoted_message_id
                  )
                  VALUES (
                    '正在思考...', 
                    'ai', 
                    ${bot.id}, 
                    ${bot.name},
                    ${JSON.stringify(loadingMetadata)},
                    ${quoted_message_id || null}
                  )
                  RETURNING *
                `;
                
                const placeholderMessage: Message = placeholderResult.rows[0] as any;
                messageId = placeholderMessage.id;
                
                // 发送机器人开始响应事件
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'ai_start', 
                  botId: bot.id,
                  botName: bot.name,
                  messageId
                })}\n\n`));

                // 获取流式响应
                const aiStream = await getAIResponseStream(bot, messageForAI, enhancedContext);
                const reader = aiStream.getReader();
                let fullContent = '';

                try {
                  // 读取并转发流式内容
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = new TextDecoder().decode(value);
                    fullContent += chunk;
                    
                    // 发送流式内容，包含botId用于区分
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      type: 'ai_chunk', 
                      content: chunk,
                      messageId: tempMessageId,
                      botId: bot.id
                    })}\n\n`));
                  }

                  // 更新占位消息为最终内容
                  const aiMetadata = { 
                    model: bot.model, 
                    bot_id: bot.id,
                    loading: false
                  };

                  if (!messageId) {
                    throw new Error('缺少占位消息ID，无法更新AI回复');
                  }

                  const aiMessageResult = await sql`
                    UPDATE messages
                    SET content = ${fullContent}, metadata = ${JSON.stringify(aiMetadata)}
                    WHERE id = ${messageId}
                    RETURNING *
                  `;
                  
                  if (aiMessageResult.rows.length === 0) {
                    throw new Error('更新AI回复失败：占位消息不存在');
                  }

                  const aiMessage: Message = aiMessageResult.rows[0] as any;

                  // 发送完成事件
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    type: 'ai_complete', 
                    message: aiMessage,
                    messageId: tempMessageId
                  })}\n\n`));

                  // 检查是否需要发送 Bark 通知
                  await checkAndSendNotification(aiMessage);
                  
                  console.log(`机器人 ${bot.name} 完成回复`);
                } catch (streamError) {
                  // 输出详细的流式读取异常日志
                  console.error(`机器人 ${bot.name} 流式读取异常:`, {
                    botId: bot.id,
                    botName: bot.name,
                    model: bot.model,
                    baseURL: bot.base_url || 'https://api.openai.com/v1',
                    messageContent: messageForAI.substring(0, 100),
                    contextCount: enhancedContext.length,
                    tempMessageId,
                    error: streamError instanceof Error ? {
                      name: streamError.name,
                      message: streamError.message,
                      stack: streamError.stack,
                    } : streamError,
                    timestamp: new Date().toISOString(),
                  });
                  
                  const errorMessage = streamError instanceof Error 
                    ? streamError.message 
                    : 'AI 回复失败';
                  
                  if (messageId) {
                    const errorMetadata = { 
                      model: bot.model, 
                      bot_id: bot.id,
                      loading: false,
                      error: true
                    };
                    
                    await sql`
                      UPDATE messages
                      SET content = ${`❌ ${bot.name} 错误: ${errorMessage}`}, metadata = ${JSON.stringify(errorMetadata)}
                      WHERE id = ${messageId}
                    `;
                  }
                  
                  // 发送错误事件
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    type: 'error', 
                    error: errorMessage,
                    messageId,
                    botId: bot.id
                  })}\n\n`));
                  
                  // 不抛出异常，让其他机器人继续
                } finally {
                  try {
                    reader.releaseLock();
                  } catch (e) {
                    // 忽略释放锁的错误
                  }
                }
              } catch (error) {
                // 捕获机器人处理的外层错误
                console.error(`机器人 ${bot.name} 处理异常:`, {
                  botId: bot.id,
                  botName: bot.name,
                  error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  } : error,
                  timestamp: new Date().toISOString(),
                });
                
                const errorMessage = error instanceof Error 
                  ? error.message 
                  : '发送消息失败';
                
                if (messageId) {
                  const errorMetadata = { 
                    model: bot.model, 
                    bot_id: bot.id,
                    loading: false,
                    error: true
                  };
                  
                  await sql`
                    UPDATE messages
                    SET content = ${`❌ ${bot.name} 错误: ${errorMessage}`}, metadata = ${JSON.stringify(errorMetadata)}
                    WHERE id = ${messageId}
                  `;
                }
                
                // 发送错误事件
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'error', 
                  error: errorMessage,
                  messageId,
                  botId: bot.id
                })}\n\n`));
                
                // 不抛出异常，让其他机器人继续
              }
            });
            
            // 3. 等待所有机器人完成（使用allSettled确保单个失败不影响其他）
            await Promise.allSettled(botPromises);
            
            // 4. 检查用户消息是否需要通知
            await checkAndSendNotification(userMessage);
            
            console.log('所有机器人处理完成，关闭流');
            controller.close();
          } catch (error) {
            // 处理整体流程错误
            console.error('流式响应处理异常:', {
              error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              } : error,
              timestamp: new Date().toISOString(),
            });
            
            const errorMessage = error instanceof Error 
              ? error.message 
              : '发送消息失败';
            
            // 发送全局错误事件
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: errorMessage
            })}\n\n`));
            
            controller.close();
          }
        },
      });

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 非流式响应（保持向后兼容）
    const aiMessages: Message[] = [];

    // 为每个被触发的机器人生成回复
    for (const bot of triggeredBots) {
      try {
        const aiResponse = await getAIResponse(bot, messageForAI, enhancedContext);
        
        const aiMetadata = { 
          model: bot.model, 
          bot_id: bot.id
        };

        const aiMessageResult = await sql`
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
            ${quoted_message_id || null}
          )
          RETURNING *
        `;
        
        const aiMessage: Message = aiMessageResult.rows[0] as any;
        aiMessages.push(aiMessage);

        // 检查是否需要发送 Bark 通知
        await checkAndSendNotification(aiMessage);
      } catch (error) {
        // 输出详细的异常日志
        console.error('AI 机器人接口请求异常:', {
          botId: bot.id,
          botName: bot.name,
          model: bot.model,
          baseURL: bot.base_url || 'https://api.openai.com/v1',
          messageContent: messageForAI.substring(0, 100),
          contextCount: enhancedContext.length,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : error,
          timestamp: new Date().toISOString(),
        });
        // 抛出异常，让前端能够捕获
        throw new Error(`AI 机器人 ${bot.name} 回复失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
    const errorMessage = error instanceof Error 
      ? error.message 
      : '发送消息失败';
    return NextResponse.json(
      { error: errorMessage },
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

// DELETE: 删除消息
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '消息 ID 不能为空' },
        { status: 400 }
      );
    }

    // 删除消息（quoted_message_id 有 ON DELETE SET NULL 约束，所以引用会被自动处理）
    const result = await sql`
      DELETE FROM messages WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '消息不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除消息失败:', error);
    return NextResponse.json(
      { error: '删除消息失败' },
      { status: 500 }
    );
  }
}
