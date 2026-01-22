-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'ai', 'rss')),
  sender_id VARCHAR(255),
  sender_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  quoted_message_id UUID REFERENCES messages(id) ON DELETE SET NULL
);

-- 创建 AI 机器人表
CREATE TABLE IF NOT EXISTS ai_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  avatar VARCHAR(500) DEFAULT '',
  system_prompt TEXT NOT NULL,
  trigger_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  model VARCHAR(100) NOT NULL DEFAULT 'gpt-3.5-turbo',
  temperature FLOAT DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  api_key TEXT NOT NULL,
  base_url VARCHAR(500) DEFAULT 'https://api.openai.com/v1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建 RSS 订阅表
CREATE TABLE IF NOT EXISTS rss_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL UNIQUE,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  last_item_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建通知规则表
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  bark_url VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_quoted_message_id ON messages(quoted_message_id);
CREATE INDEX IF NOT EXISTS idx_ai_bots_is_active ON ai_bots(is_active);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_is_active ON rss_feeds(is_active);

-- 创建应用设置表（用于存储 API Key 等配置）
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- 插入默认通知规则（如果不存在）
INSERT INTO notification_rules (keywords, bark_url, is_active)
SELECT ARRAY[]::TEXT[], '', false
WHERE NOT EXISTS (SELECT 1 FROM notification_rules);
