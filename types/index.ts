// 消息类型
export type SenderType = 'user' | 'ai' | 'rss';

export interface Message {
  id: string;
  content: string;
  sender_type: SenderType;
  sender_id: string | null;
  sender_name: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// AI 机器人类型
export interface AIBot {
  id: string;
  name: string;
  avatar: string;
  system_prompt: string;
  trigger_keywords: string[];
  model: string;
  temperature: number;
  is_active: boolean;
  created_at: string;
}

// RSS 订阅源类型
export interface RSSFeed {
  id: string;
  name: string;
  url: string;
  last_fetched_at: string | null;
  last_item_date: string | null;
  is_active: boolean;
  created_at: string;
}

// 通知规则类型
export interface NotificationRule {
  id: string;
  keywords: string[];
  bark_url: string;
  is_active: boolean;
}

// RSS 条目类型
export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet?: string;
}
