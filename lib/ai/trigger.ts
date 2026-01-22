import { AIBot } from '@/types';

/**
 * 检查消息是否触发任何 AI 机器人
 * @param message 消息内容
 * @param bots AI 机器人列表
 * @returns 被触发的机器人列表
 */
export function checkAITriggers(message: string, bots: AIBot[]): AIBot[] {
  // 检查是否 @all
  const mentionsAll = /@all(?:\s|$)/i.test(message);
  if (mentionsAll) {
    console.log('检测到 @all，触发所有活跃机器人');
    return bots.filter(bot => bot.is_active);
  }

  // 检查是否 @ 特定机器人
  const mentionedBots = bots.filter(bot => {
    if (!bot.is_active) return false;
    
    // 检查是否被@了
    // 去除机器人名称的前后空格
    const botName = bot.name.trim();
    if (!botName) return false;
    
    // 转义机器人名称中的特殊字符，用于正则表达式
    const escapedName = botName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 使用更宽松的匹配：@机器人名称后跟空格、换行或字符串结尾
    // 这样可以支持中文名称，不依赖单词边界 \b
    const mentionPattern = new RegExp(`@${escapedName}(?:\\s|$|[，。！？、])`, 'i');
    const isMentioned = mentionPattern.test(message);
    
    if (isMentioned) {
      console.log(`检测到@提及: @${botName} 在消息 "${message}"`);
    }
    
    return isMentioned;
  });

  if (mentionedBots.length > 0) {
    return mentionedBots;
  }

  // 如果没有@，则使用传统的关键词触发方式
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

/**
 * 从消息中提取@的机器人名称
 * @param message 消息内容
 * @returns 被@的机器人名称列表
 */
export function extractMentions(message: string): string[] {
  const mentions: string[] = [];
  
  // 匹配 @all
  if (/@all\b/i.test(message)) {
    mentions.push('all');
  }
  
  // 匹配 @机器人名称
  const mentionPattern = /@(\S+)/g;
  let match;
  while ((match = mentionPattern.exec(message)) !== null) {
    if (match[1].toLowerCase() !== 'all') {
      mentions.push(match[1]);
    }
  }
  
  return mentions;
}
