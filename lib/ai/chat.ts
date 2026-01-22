import OpenAI from 'openai';
import { AIBot, Message } from '@/types';

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    // 构建对话历史（取最近 10 条消息作为上下文）
    const recentContext = context.slice(-10);
    
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
    console.error('OpenAI API 错误:', error);
    throw new Error('AI 回复失败');
  }
}
