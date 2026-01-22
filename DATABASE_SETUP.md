# 数据库设置指南

本项目使用 Vercel Postgres (Neon) 作为数据库。

## 步骤 1: 创建 Vercel Postgres 数据库

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的项目
3. 点击 "Storage" 标签
4. 点击 "Create Database"
5. 选择 "Postgres"
6. 选择区域（建议选择离你最近的区域）
7. 点击 "Create"

## 步骤 2: 获取数据库连接信息

创建完成后，Vercel 会自动将以下环境变量添加到你的项目中：

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

这些环境变量会自动在生产环境中可用。

## 步骤 3: 本地开发环境配置

1. 在 Vercel Dashboard 的 Storage 页面，点击你的数据库
2. 点击 ".env.local" 标签
3. 复制显示的环境变量
4. 在项目根目录创建 `.env.local` 文件
5. 粘贴环境变量

示例：
```bash
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
```

## 步骤 4: 初始化数据库表

### 方法 1: 使用 Vercel Postgres 查询编辑器

1. 在 Vercel Dashboard 中打开你的数据库
2. 点击 "Query" 标签
3. 复制 `lib/db/schema.sql` 文件中的 SQL 代码
4. 粘贴到查询编辑器中
5. 点击 "Run Query" 执行

### 方法 2: 使用 psql 命令行（需要本地安装 PostgreSQL）

```bash
# 从 .env.local 获取 POSTGRES_URL_NON_POOLING
psql "your_postgres_url_non_pooling" -f lib/db/schema.sql
```

### 方法 3: 使用数据库管理工具

使用 pgAdmin、DBeaver 或其他 PostgreSQL 客户端：

1. 使用 `POSTGRES_URL_NON_POOLING` 连接到数据库
2. 打开 `lib/db/schema.sql` 文件
3. 执行 SQL 脚本

## 步骤 5: 验证表创建

执行以下 SQL 验证表是否创建成功：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

应该看到以下表：
- `messages`
- `ai_bots`
- `rss_feeds`
- `notification_rules`

## 表结构说明

### messages (消息表)
存储所有聊天消息，包括用户消息、AI 回复和 RSS 更新。

### ai_bots (AI 机器人表)
存储 AI 机器人的配置，包括名称、提示词、触发关键词等。

### rss_feeds (RSS 订阅表)
存储 RSS 订阅源的配置和最后获取时间。

### notification_rules (通知规则表)
存储 Bark 推送通知的配置和关键词规则。

## 常见问题

### Q: 如何重置数据库？

在 Vercel Postgres Query 编辑器中执行：

```sql
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS ai_bots CASCADE;
DROP TABLE IF EXISTS rss_feeds CASCADE;
DROP TABLE IF EXISTS notification_rules CASCADE;
```

然后重新运行 `schema.sql` 脚本。

### Q: 如何备份数据？

使用 pg_dump 工具：

```bash
pg_dump "your_postgres_url_non_pooling" > backup.sql
```

### Q: 如何查看表数据？

```sql
-- 查看所有消息
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;

-- 查看所有 AI 机器人
SELECT * FROM ai_bots;

-- 查看所有 RSS 订阅
SELECT * FROM rss_feeds;

-- 查看通知规则
SELECT * FROM notification_rules;
```
