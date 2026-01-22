-- 迁移脚本：为 ai_bots 表添加 api_key 和 base_url 字段
-- 适用于已有数据库的用户

-- 添加 api_key 字段（临时允许 NULL）
ALTER TABLE ai_bots 
ADD COLUMN IF NOT EXISTS api_key TEXT;

-- 添加 base_url 字段
ALTER TABLE ai_bots 
ADD COLUMN IF NOT EXISTS base_url VARCHAR(500) DEFAULT 'https://api.openai.com/v1';

-- 注意：执行此迁移后，您需要为每个现有的机器人配置 API Key
-- 可以通过设置页面编辑每个机器人来添加 API Key

-- 如果您想要为所有现有机器人设置相同的 API Key，可以运行：
-- UPDATE ai_bots SET api_key = 'your-api-key-here' WHERE api_key IS NULL;

-- 最后，如果需要强制 api_key 为必填字段，可以运行（在确保所有机器人都有 API Key 后）：
-- ALTER TABLE ai_bots ALTER COLUMN api_key SET NOT NULL;
