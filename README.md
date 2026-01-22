# AI 群聊助手

一个基于 Next.js 的个人 AI 群聊助手，支持多个 AI 机器人、RSS 订阅和 Bark 推送通知。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 功能特性

- 📱 **群聊式界面** - 类似微信的聊天体验
- 🤖 **多 AI 机器人** - 支持配置多个 AI，每个拥有独立的人格和触发关键词
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
cp .env.local.example .env.local
```

编辑 `.env.local` 填入必要的配置：

```env
# 数据库（从 Vercel Postgres 获取）
POSTGRES_URL="..."
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."

# OpenAI API Key
OPENAI_API_KEY="sk-..."

# Cron Secret（随机生成）
CRON_SECRET="..."
```

4. 初始化数据库：

```bash
npm run db:init
```

5. 启动开发服务器：

```bash
npm run dev
```

6. 访问 http://localhost:3000

## 部署到 Vercel

详细部署指南请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 快速部署

1. 点击下方按钮一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/ai-chat)

2. 配置环境变量
3. 关联 Postgres 数据库
4. 初始化数据库表结构

## 使用指南

### 配置 AI 机器人

1. 进入设置页面
2. 切换到「AI 机器人」标签
3. 点击「添加机器人」
4. 配置机器人信息：
   - **名称**: 机器人的显示名称
   - **系统提示词**: 定义机器人的角色和行为
   - **触发关键词**: 消息包含这些词时会触发（逗号分隔）
   - **模型**: 选择 OpenAI 模型（GPT-4/GPT-3.5）
   - **温度**: 控制回复的随机性（0-2）

**示例配置**：

```
名称：技术助手
系统提示词：你是一个专业的技术助手，擅长解答编程、架构和技术相关问题。
触发关键词：技术,编程,代码,bug
模型：gpt-3.5-turbo
温度：0.7
```

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

- 检查 OpenAI API Key 是否正确配置
- 确认机器人已启用
- 确认消息包含触发关键词
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

- [ ] 消息搜索功能
- [ ] 导出聊天记录
- [ ] 支持多个"群聊"
- [ ] @机器人功能
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
