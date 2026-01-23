import { AIBot } from '@/types';

/**
 * 检查消息是否触发任何 AI 机器人
 * @param message 消息内容
 * @param bots AI 机器人列表
 * @returns 被触发的机器人列表
 */
export function checkAITriggers(message: string, bots: AIBot[]): AIBot[] {
  console.log('=== 开始检查AI触发 ===');
  console.log('消息内容:', message);
  console.log('机器人数量:', bots.length);
  console.log('机器人列表:', bots.map(b => ({ 
    name: b.name, 
    is_active: b.is_active, 
    keywords: b.trigger_keywords 
  })));
  
  // 检查是否 @all
  const mentionsAll = /@all(?:\s|$)/i.test(message);
  if (mentionsAll) {
    console.log('检测到 @all，触发所有活跃机器人');
    const allBots = bots.filter(bot => bot.is_active);
    console.log('触发结果:', allBots.map(b => b.name));
    return allBots;
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
    console.log('通过@触发:', mentionedBots.map(b => b.name));
    return mentionedBots;
  }

  // 如果没有@，则使用传统的关键词触发方式
  const triggeredBots = bots.filter(bot => {
    if (!bot.is_active) {
      console.log(`机器人 ${bot.name} 未激活，跳过`);
      return false;
    }
    
    // 如果没有设置触发关键词，则总是触发（回复所有消息）
    if (!bot.trigger_keywords || bot.trigger_keywords.length === 0) {
      console.log(`机器人 ${bot.name} 没有设置关键词，将回复所有消息`);
      return true;
    }
    
    // 过滤掉空字符串和只包含空白的关键词
    const validKeywords = bot.trigger_keywords
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    // 如果没有有效关键词（只有空字符串），则总是触发
    if (validKeywords.length === 0) {
      console.log(`机器人 ${bot.name} 没有有效关键词（只有空字符串），将回复所有消息`);
      return true;
    }
    
    console.log(`机器人 ${bot.name} 的有效关键词:`, validKeywords);
    
    // 检查消息是否包含任何触发关键词
    const matched = validKeywords.some(keyword => {
      const isMatch = message.toLowerCase().includes(keyword.toLowerCase());
      if (isMatch) {
        console.log(`机器人 ${bot.name} 匹配到关键词: "${keyword}"`);
      }
      return isMatch;
    });
    
    if (!matched) {
      console.log(`机器人 ${bot.name} 没有匹配到任何关键词，跳过`);
    }
    
    return matched;
  });
  
  console.log('通过关键词触发:', triggeredBots.map(b => b.name));
  console.log('=== 检查完成，共触发', triggeredBots.length, '个机器人 ===');
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
