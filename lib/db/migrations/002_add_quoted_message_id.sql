-- 添加引用消息ID字段到messages表
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS quoted_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- 创建索引以提高引用消息的查询性能
CREATE INDEX IF NOT EXISTS idx_messages_quoted_message_id ON messages(quoted_message_id);

-- 迁移metadata中的quoted_message_id到新字段
UPDATE messages
SET quoted_message_id = (metadata->>'quoted_message_id')::UUID
WHERE metadata->>'quoted_message_id' IS NOT NULL;
