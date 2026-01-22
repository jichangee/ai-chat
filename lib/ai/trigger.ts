import { AIBot } from '@/types';

/**
 * 检查消息是否触发任何 AI 机器人
 * @param message 消息内容
 * @param bots AI 机器人列表
 * @returns 被触发的机器人列表
 */
export function checkAITriggers(message: string, bots: AIBot[]): AIBot[] {
  const triggeredBots = bots.filter(bot => {
    if (!bot.is_active) return false;
    
    // 如果没有设置触发关键词，则不触发
    if (!bot.trigger_keywords || bot.trigger_keywords.length === 0) {
      return false;
    }
    
    // 检查消息是否包含任何触发关键词
    return bot.trigger_keywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  });
  
  return triggeredBots;
}
