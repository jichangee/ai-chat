# 部署指南

本文档介绍如何将 AI 群聊助手部署到 Vercel。

## 前置准备

1. GitHub 账号
2. Vercel 账号
3. OpenAI API Key
4. Bark 推送 URL（可选）

## 部署步骤

### 1. 创建 Git 仓库

```bash
cd ai-chat
git init
git add .
git commit -m "Initial commit"
```

将代码推送到 GitHub：

```bash
git remote add origin <你的仓库地址>
git branch -M main
git push -u origin main
```

### 2. 在 Vercel 创建 Postgres 数据库

1. 登录 Vercel Dashboard
2. 进入 Storage 标签页
3. 点击 "Create Database"
4. 选择 "Postgres"
5. 选择区域（建议选择离您最近的区域）
6. 创建数据库

### 3. 初始化数据库

1. 在 Vercel Dashboard 中，进入刚创建的数据库
2. 点击 "Query" 标签页
3. 复制 `lib/db/schema.sql` 文件的内容
4. 粘贴到查询编辑器中
5. 点击 "Run Query" 执行

或者使用 Vercel CLI：

```bash
npm i -g vercel
vercel link
vercel env pull .env.local

# 然后使用 psql 或其他数据库工具连接并执行 schema.sql
```

### 4. 部署到 Vercel

#### 方法一：通过 Vercel Dashboard（推荐）

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 点击 "Add New" -> "Project"
3. 导入您的 GitHub 仓库
4. 配置项目：
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. 配置环境变量（见下方）
6. 点击 "Deploy"

#### 方法二：使用 Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

### 5. 配置环境变量

在 Vercel Dashboard 的项目设置中，添加以下环境变量：

#### 必需的环境变量

```
# 数据库（会自动从 Storage 关联获取）
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# OpenAI
OPENAI_API_KEY=sk-xxx

# Cron Secret（用于保护定时任务端点）
CRON_SECRET=随机生成的密钥
```

#### 可选的环境变量

```
# Bark（也可以在界面中配置）
BARK_BASE_URL=https://api.day.app/your_key
```

**提示：** 
- 数据库环境变量会在您将 Postgres 数据库关联到项目时自动添加
- `CRON_SECRET` 可以使用以下命令生成：
  ```bash
  openssl rand -base64 32
  ```

### 6. 关联数据库到项目

1. 在 Vercel Dashboard 中打开您的项目
2. 进入 "Storage" 标签页
3. 点击 "Connect Store"
4. 选择之前创建的 Postgres 数据库
5. 确认连接

这将自动添加所需的数据库环境变量到您的项目。

### 7. 配置 Cron Jobs

Vercel 会自动读取 `vercel.json` 中的 cron 配置。我们已经配置了每小时执行一次 RSS 获取：

```json
{
  "crons": [{
    "path": "/api/cron/rss",
    "schedule": "0 * * * *"
  }]
}
```

**重要：** 为了保护 Cron 端点，请确保设置了 `CRON_SECRET` 环境变量。

### 8. 重新部署

配置完环境变量后，触发一次重新部署：

1. 在 Vercel Dashboard 中进入项目的 "Deployments" 标签页
2. 点击最新部署右侧的三个点
3. 选择 "Redeploy"

或者推送一个新的提交：

```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

## 验证部署

### 1. 检查应用是否正常运行

访问您的 Vercel 部署 URL，应该能看到聊天界面。

### 2. 测试数据库连接

1. 进入设置页面
2. 尝试添加一个 AI 机器人
3. 如果成功创建，说明数据库连接正常

### 3. 测试 Cron Job

查看 Vercel Dashboard 中的 "Cron" 标签页，确认定时任务已配置：

- Path: `/api/cron/rss`
- Schedule: `0 * * * *`（每小时）

您可以在 "Logs" 标签页中查看 Cron 执行日志。

### 4. 测试 Bark 通知

1. 进入设置 -> 通知设置
2. 输入您的 Bark URL
3. 点击"测试"按钮
4. 检查是否收到推送通知

## 使用指南

### 添加 AI 机器人

1. 进入设置页面
2. 切换到 "AI 机器人" 标签页
3. 点击 "添加机器人"
4. 填写配置：
   - **名称**：机器人的显示名称
   - **系统提示词**：定义机器人的角色和行为
   - **触发关键词**：用逗号分隔，消息包含这些词时会触发
   - **模型**：选择 OpenAI 模型
   - **温度**：0-2，控制回复的随机性

示例配置：

```
名称：技术助手
系统提示词：你是一个专业的技术助手，擅长解答编程、架构和技术相关问题。回答要简洁准确。
触发关键词：技术,编程,代码,bug,报错
模型：gpt-3.5-turbo
温度：0.7
```

### 添加 RSS 订阅

1. 进入设置页面
2. 切换到 "RSS 订阅" 标签页
3. 点击 "添加订阅"
4. 输入名称和 RSS URL
5. 保存后，系统会每小时自动获取更新

推荐的 RSS 源：
- Hacker News: https://news.ycombinator.com/rss
- GitHub Trending: https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml
- V2EX: https://www.v2ex.com/index.xml

### 配置通知

1. 进入设置 -> 通知设置
2. 获取 Bark URL：
   - 在 iOS 设备上安装 Bark 应用
   - 打开应用获取您的推送 URL
3. 设置关键词：
   - 添加您关心的关键词
   - 当消息包含这些词时会触发推送
4. 启用通知

## 常见问题

### Q: 数据库连接失败

**A:** 
1. 检查环境变量是否正确配置
2. 确认数据库已关联到项目
3. 查看 Vercel 的部署日志排查错误

### Q: AI 不回复消息

**A:**
1. 检查 OPENAI_API_KEY 是否正确
2. 确认 AI 机器人已启用
3. 检查消息是否包含触发关键词
4. 查看 API 调用日志

### Q: RSS 没有自动更新

**A:**
1. 确认 Cron Job 已配置
2. 检查 RSS 订阅源是否启用
3. 查看 Cron 执行日志
4. 可以手动点击"手动获取"按钮测试

### Q: Bark 推送不工作

**A:**
1. 确认 Bark URL 正确
2. 检查通知规则是否启用
3. 确认消息包含了配置的关键词
4. 使用"测试"按钮验证 Bark URL

## 性能优化

### 数据库索引

已在 `schema.sql` 中创建了必要的索引：
- `messages.created_at`：加速消息列表查询
- `messages.sender_type`：加速按类型过滤
- `ai_bots.is_active`：加速活跃机器人查询
- `rss_feeds.is_active`：加速活跃订阅源查询

### 消息分页

默认加载最近 50 条消息，可以根据需要调整：

```typescript
// 在 app/page.tsx 中
const response = await fetch('/api/messages?limit=100');
```

### Cron 频率

默认每小时执行一次 RSS 获取，可以在 `vercel.json` 中调整：

```json
{
  "crons": [{
    "path": "/api/cron/rss",
    "schedule": "*/30 * * * *"  // 改为每30分钟
  }]
}
```

## 成本估算

### Vercel

- **Hobby 计划**（免费）：
  - 100 GB 带宽/月
  - 适合个人使用

- **Pro 计划**（$20/月）：
  - 1 TB 带宽/月
  - 更好的性能和支持

### Vercel Postgres

- **Free 计划**：
  - 256 MB 存储
  - 60 小时计算时间/月
  - 适合轻度使用

- **Pro 计划**（起价 $0.10/GB）：
  - 按使用量计费

### OpenAI API

- **GPT-3.5-turbo**：$0.002/1K tokens
- **GPT-4**：$0.03/1K tokens（输入）

估算成本（按月）：
- 每天 100 条消息
- 平均每条 500 tokens
- 使用 GPT-3.5-turbo
- 成本约：100 × 30 × 0.5 × 0.002 = **$3/月**

## 安全建议

1. **保护环境变量**：
   - 不要将 `.env.local` 提交到 Git
   - 使用 Vercel 的环境变量管理

2. **Cron 端点保护**：
   - 已配置 `CRON_SECRET` 验证
   - 防止未授权访问

3. **API 限流**：
   - 考虑添加请求频率限制
   - 防止滥用和成本失控

4. **数据备份**：
   - 定期备份 Postgres 数据库
   - Vercel 提供自动备份功能（Pro 计划）

## 更新应用

```bash
git pull origin main  # 拉取最新代码
git add .
git commit -m "Update"
git push
```

Vercel 会自动检测提交并重新部署。

## 支持

如有问题，请查看：
- [Vercel 文档](https://vercel.com/docs)
- [Next.js 文档](https://nextjs.org/docs)
- [OpenAI API 文档](https://platform.openai.com/docs)
