import Parser from 'rss-parser';
import { RSSItem } from '@/types';

const parser = new Parser();

/**
 * 解析 RSS 订阅源
 * @param url RSS 订阅源 URL
 * @returns RSS 条目列表
 */
export async function parseRSSFeed(url: string): Promise<RSSItem[]> {
  try {
    const feed = await parser.parseURL(url);
    
    return feed.items.map(item => ({
      title: item.title || '无标题',
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      content: item.content || item.contentSnippet || '',
      contentSnippet: item.contentSnippet || '',
    }));
  } catch (error) {
    console.error('RSS 解析错误:', error);
    throw new Error('RSS 订阅源解析失败');
  }
}

/**
 * 过滤新的 RSS 条目
 * @param items RSS 条目列表
 * @param lastItemDate 上次获取的最新条目时间
 * @returns 新的 RSS 条目列表
 */
export function filterNewItems(items: RSSItem[], lastItemDate: string | null): RSSItem[] {
  if (!lastItemDate) {
    // 如果是第一次获取，只返回最新的 5 条
    return items.slice(0, 5);
  }
  
  const lastDate = new Date(lastItemDate);
  return items.filter(item => {
    const itemDate = new Date(item.pubDate);
    return itemDate > lastDate;
  });
}

/**
 * 格式化 RSS 条目为聊天消息
 * @param item RSS 条目
 * @param feedName 订阅源名称
 * @returns 格式化的消息内容
 */
export function formatRSSItemAsMessage(item: RSSItem, feedName: string): string {
  const snippet = item.contentSnippet || item.content;
  const truncated = snippet.length > 200 ? snippet.substring(0, 200) + '...' : snippet;
  
  return `📰 ${item.title}\n\n${truncated}\n\n🔗 ${item.link}`;
}
