# 数据库迁移指南

如果您已经部署了旧版本的应用，需要执行以下迁移来支持新功能。

## 迁移 001：为 AI 机器人添加 API Key 和 Base URL 配置

**变更内容：**
- 每个 AI 机器人现在使用独立的 API Key
- 支持自定义 Base URL（方便使用代理或第三方服务）
- 模型改为手动输入（支持更多模型）

### 迁移步骤

#### 方法 1：使用 Vercel Postgres 查询编辑器

1. 在 Vercel Dashboard 中打开您的数据库
2. 点击 "Query" 标签
3. 复制并执行以下 SQL：

```sql
-- 添加 api_key 字段
ALTER TABLE ai_bots 
ADD COLUMN IF NOT EXISTS api_key TEXT;

-- 添加 base_url 字段
ALTER TABLE ai_bots 
ADD COLUMN IF NOT EXISTS base_url VARCHAR(500) DEFAULT 'https://api.openai.com/v1';
```

4. 如果您之前在环境变量中配置了全局的 `OPENAI_API_KEY`，可以批量设置：

```sql
-- 将环境变量中的 API Key 设置到所有现有机器人
UPDATE ai_bots 
SET api_key = '你的-api-key' 
WHERE api_key IS NULL;
```

5. （可选）如果需要强制 api_key 为必填，在确保所有机器人都有 API Key 后执行：

```sql
ALTER TABLE ai_bots 
ALTER COLUMN api_key SET NOT NULL;
```

#### 方法 2：使用 psql 命令行

```bash
psql "your_postgres_url_non_pooling" -f lib/db/migrations/001_add_api_key_base_url_to_bots.sql
```

### 迁移后操作

1. 进入应用的设置页面
2. 编辑每个现有的 AI 机器人
3. 为每个机器人配置独立的 API Key
4. （可选）配置自定义 Base URL
5. 确认模型名称正确

**注意：** 
- 不再需要全局的 API Key 配置
- 如果您之前在数据库的 `app_settings` 表中存储了全局 API Key，现在可以删除该记录（可选）
- 每个机器人使用独立的 API Key，支持不同的服务提供商

### 回滚（如果需要）

如果需要回滚此迁移：

```sql
ALTER TABLE ai_bots DROP COLUMN IF EXISTS api_key;
ALTER TABLE ai_bots DROP COLUMN IF EXISTS base_url;
```

**注意：** 回滚后您需要重新在环境变量中配置全局的 `OPENAI_API_KEY`。

## 后续迁移

未来的迁移脚本将在此处列出。
