/**
 * 检查消息是否匹配任何关键词
 * @param message 消息内容
 * @param keywords 关键词列表
 * @returns 是否匹配
 */
export function matchKeywords(message: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) {
    return false;
  }
  
  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
}

/**
 * 获取匹配的关键词
 * @param message 消息内容
 * @param keywords 关键词列表
 * @returns 匹配的关键词列表
 */
export function getMatchedKeywords(message: string, keywords: string[]): string[] {
  if (!keywords || keywords.length === 0) {
    return [];
  }
  
  const lowerMessage = message.toLowerCase();
  return keywords.filter(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
}
