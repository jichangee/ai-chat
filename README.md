# AI 群聊助手

一个基于 Next.js 的个人 AI 群聊助手，支持多个 AI 机器人、RSS 订阅和 Bark 推送通知。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 功能特性

- 📱 **群聊式界面** - 类似微信的聊天体验
- 🤖 **多 AI 机器人** - 支持配置多个 AI，每个拥有独立的人格和触发关键词
- 💬 **@提及功能** - 支持 @机器人名称 或 @all 来直接召唤AI
- 📝 **引用回复** - 可以引用任何消息进行回复，提供上下文
- 📰 **RSS 订阅** - 自动获取订阅源更新并推送到聊天
- 🔔 **Bark 通知** - 关键词触发推送通知到 iOS 设备
- 🎨 **现代 UI** - 基于 shadcn/ui，支持深色模式
- 📱 **响应式设计** - 完美支持移动端和桌面端

## 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **数据库**: Vercel Postgres (Neon)
- **AI**: OpenAI API
- **部署**: Vercel

## 快速开始

### 前置要求

- Node.js >= 18.17.0
- npm >= 9.0.0
- Vercel 账号（用于数据库和部署）
- OpenAI API Key

### 安装

1. 克隆项目：

```bash
git clone <your-repo-url>
cd ai-chat
```

2. 安装依赖：

```bash
npm install
```

3. 配置环境变量：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 填入必要的配置：

```env
# 数据库（从 Vercel Postgres 获取）
POSTGRES_URL="..."
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."

# Cron Secret（随机生成）
CRON_SECRET="..."
```

**注意**：OpenAI API Key 在配置每个 AI 机器人时单独配置，不需要在环境变量中设置。

4. 初始化数据库：

```bash
npm run db:init
```

5. 启动开发服务器：

```bash
npm run dev
```

6. 访问 http://localhost:3000

## 数据库迁移

如果您从旧版本升级，请查看 [MIGRATION.md](./MIGRATION.md) 了解数据库迁移步骤。

## 部署到 Vercel

详细部署指南请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 快速部署

1. 点击下方按钮一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/ai-chat)

2. 配置环境变量
3. 关联 Postgres 数据库
4. 初始化数据库表结构

## 使用指南

### 与 AI 机器人对话

AI 机器人有三种触发方式：

1. **关键词触发**：消息中包含机器人配置的触发关键词
2. **@提及触发**：在消息中 `@机器人名称`，例如：`@技术助手 帮我解决这个bug`
3. **@所有机器人**：使用 `@all` 可以同时触发所有活跃的 AI 机器人

**引用回复**：
- 鼠标悬停在任何消息上，点击引用按钮（回复图标）
- 引用后发送的消息会携带被引用消息的上下文
- AI 机器人会看到完整的引用内容，方便进行针对性回复

**上下文限制**：
- AI 机器人最多查看最近 5 条消息作为上下文
- 引用的消息会额外添加到上下文中
- 这样可以控制 token 使用，避免上下文过长

**使用示例**：

```
用户：@技术助手 这个代码有什么问题？
技术助手：[回复]

用户：@all 大家怎么看这个方案？
所有机器人：[分别回复]

用户：[引用某条消息] 能详细解释一下这部分吗？
```

### 配置 AI 机器人

1. 进入设置页面
2. 点击「添加机器人」
3. 配置机器人信息：
   - **名称**: 机器人的显示名称
   - **系统提示词**: 定义机器人的角色和行为
   - **触发关键词**: 消息包含这些词时会触发（逗号分隔）
   - **API Key**: 该机器人使用的 OpenAI API Key（格式：`sk-...`）
   - **Base URL**: 可选，如需使用代理或第三方服务可修改（默认：`https://api.openai.com/v1`）
   - **模型**: 手动输入模型名称（如：gpt-3.5-turbo、gpt-4、claude-3-opus 等）
   - **温度**: 控制回复的随机性（0-2）

**示例配置**：

```
名称：技术助手
系统提示词：你是一个专业的技术助手，擅长解答编程、架构和技术相关问题。
触发关键词：技术,编程,代码,bug
API Key：sk-xxxxxxxxxxxxxxxxxxxxxxxx
Base URL：https://api.openai.com/v1
模型：gpt-3.5-turbo
温度：0.7
```

**注意**：
- 每个机器人使用独立的 API Key，可以配置不同的服务提供商
- Base URL 支持自定义，方便使用代理或兼容 OpenAI API 的第三方服务
- 模型名称需手动输入，支持任何兼容 OpenAI API 格式的模型

### 添加 RSS 订阅

1. 进入设置页面
2. 切换到「RSS 订阅」标签
3. 点击「添加订阅」
4. 输入订阅源名称和 URL
5. 系统会每小时自动获取更新

**推荐订阅源**：

- Hacker News: `https://news.ycombinator.com/rss`
- GitHub Trending: `https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml`
- V2EX: `https://www.v2ex.com/index.xml`

### 配置推送通知

1. 在 iOS 设备上安装 [Bark](https://apps.apple.com/app/bark/id1403753865) 应用
2. 获取您的 Bark 推送 URL
3. 进入设置 → 通知设置
4. 输入 Bark URL 并测试
5. 添加关键词（消息包含这些词时会推送）
6. 启用通知

## 项目结构

```
ai-chat/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── settings/          # 设置页面
│   └── page.tsx           # 聊天主页
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 组件
│   ├── chat/             # 聊天组件
│   └── settings/         # 设置组件
├── lib/                   # 工具库
│   ├── db/               # 数据库
│   ├── ai/               # AI 集成
│   ├── rss/              # RSS 解析
│   └── notification/     # 通知系统
└── types/                 # TypeScript 类型
```

## 开发

查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解开发指南。

### 可用脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 运行 ESLint
npm run db:init      # 初始化数据库
```

## 常见问题

### AI 不回复消息？

- 检查机器人的 API Key 是否正确配置
- 确认机器人已启用
- 确认消息包含触发关键词
- 检查 Base URL 是否正确（如使用了自定义 URL）
- 查看浏览器控制台或服务器日志

### RSS 不更新？

- 确认订阅源已启用
- 检查 RSS URL 是否有效
- Vercel Cron Jobs 每小时执行一次
- 可以手动点击「刷新」按钮测试

### Bark 推送不工作？

- 确认 Bark URL 正确
- 检查通知规则是否启用
- 确认消息包含配置的关键词
- 使用「测试」按钮验证配置

更多问题请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 路线图

- [x] @机器人功能
- [x] 引用回复功能
- [x] 上下文控制（限制5条）
- [ ] 消息搜索功能
- [ ] 导出聊天记录
- [ ] 支持多个"群聊"
- [ ] AI 机器人之间的对话
- [ ] 更丰富的消息类型（图片、视频）
- [ ] Webhook 集成

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可

[MIT](./LICENSE)

## 致谢

- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vercel](https://vercel.com/)
- [OpenAI](https://openai.com/)
- [Bark](https://github.com/Finb/Bark)
