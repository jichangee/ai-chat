import OpenAI from 'openai';
import { AIBot, Message } from '@/types';

/**
 * 获取 AI 回复
 * @param bot AI 机器人配置
 * @param message 用户消息
 * @param context 上下文消息（最近的对话）
 * @returns AI 回复内容
 */
export async function getAIResponse(
  bot: AIBot,
  message: string,
  context: Message[] = []
): Promise<string> {
  try {
    // 使用机器人自己的 API Key 和 Base URL
    if (!bot.api_key) {
      throw new Error('机器人未配置 API Key');
    }

    // 动态创建 OpenAI 客户端，使用机器人的配置
    const openai = new OpenAI({
      apiKey: bot.api_key,
      baseURL: bot.base_url || 'https://api.openai.com/v1',
    });

    // 构建对话历史（取最近 5 条消息作为上下文）
    const recentContext = context.slice(-5);
    
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: bot.system_prompt },
      ...recentContext.map(msg => ({
        role: (msg.sender_type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: bot.model,
      temperature: bot.temperature,
      messages,
    });

    return completion.choices[0]?.message?.content || '抱歉，我现在无法回复。';
  } catch (error) {
    // 输出详细的异常日志
    console.error('AI API 请求异常:', {
      botId: bot.id,
      botName: bot.name,
      model: bot.model,
      baseURL: bot.base_url || 'https://api.openai.com/v1',
      messageLength: message.length,
      contextLength: context.length,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      timestamp: new Date().toISOString(),
    });
    
    // 提供更友好的错误信息
    if (error instanceof Error && error.message.includes('API Key')) {
      throw error;
    }
    
    throw new Error('AI 回复失败，请检查机器人的 API Key 配置');
  }
}

/**
 * 获取 AI 流式回复
 * @param bot AI 机器人配置
 * @param message 用户消息
 * @param context 上下文消息（最近的对话）
 * @returns 流式响应
 */
export async function getAIResponseStream(
  bot: AIBot,
  message: string,
  context: Message[] = []
): Promise<ReadableStream<Uint8Array>> {
  // 使用机器人自己的 API Key 和 Base URL
  if (!bot.api_key) {
    throw new Error('机器人未配置 API Key');
  }

  // 动态创建 OpenAI 客户端，使用机器人的配置
  const openai = new OpenAI({
    apiKey: bot.api_key,
    baseURL: bot.base_url || 'https://api.openai.com/v1',
  });

  // 构建对话历史（取最近 5 条消息作为上下文）
  const recentContext = context.slice(-5);
  
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: bot.system_prompt },
    ...recentContext.map(msg => ({
      role: (msg.sender_type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: bot.model,
      temperature: bot.temperature,
      messages,
      stream: true,
    });

    // 将 OpenAI 流转换为 ReadableStream
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          // 输出详细的流式响应异常日志
          console.error('AI 流式响应读取异常:', {
            botId: bot.id,
            botName: bot.name,
            model: bot.model,
            baseURL: bot.base_url || 'https://api.openai.com/v1',
            messageLength: message.length,
            contextLength: context.length,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            } : error,
            timestamp: new Date().toISOString(),
          });
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'AI 回复失败，请检查机器人的 API Key 配置';
          controller.error(new Error(errorMessage));
        }
      },
    });
  } catch (error) {
    // 输出详细的流式响应创建异常日志
    console.error('AI 流式响应创建异常:', {
      botId: bot.id,
      botName: bot.name,
      model: bot.model,
      baseURL: bot.base_url || 'https://api.openai.com/v1',
      messageLength: message.length,
      contextLength: context.length,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      timestamp: new Date().toISOString(),
    });
    
    // 提供更友好的错误信息
    if (error instanceof Error && error.message.includes('API Key')) {
      throw error;
    }
    
    throw new Error('AI 回复失败，请检查机器人的 API Key 配置');
  }
}
