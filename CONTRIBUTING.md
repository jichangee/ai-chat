# 开发指南

## 本地开发环境设置

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 并填入必要的配置：

- `POSTGRES_URL`: Vercel Postgres 连接 URL
- `OPENAI_API_KEY`: OpenAI API 密钥
- `CRON_SECRET`: 随机生成的密钥（用于保护 Cron 端点）
- `BARK_BASE_URL`: （可选）Bark 推送 URL

### 3. 初始化数据库

如果使用本地开发数据库或 Vercel Postgres：

```bash
npm run db:init
```

或者手动执行 `lib/db/schema.sql` 中的 SQL 语句。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
ai-chat/
├── app/                      # Next.js App Router
│   ├── api/                 # API 路由
│   │   ├── messages/        # 消息 API
│   │   ├── ai-bots/         # AI 机器人 API
│   │   ├── rss/             # RSS 订阅 API
│   │   ├── notification/    # 通知 API
│   │   └── cron/            # Cron 任务
│   ├── settings/            # 设置页面
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 主页（聊天界面）
│   └── globals.css          # 全局样式
├── components/              # React 组件
│   ├── ui/                  # shadcn/ui 基础组件
│   ├── chat/                # 聊天相关组件
│   └── settings/            # 设置相关组件
├── lib/                     # 工具库
│   ├── db/                  # 数据库
│   ├── ai/                  # AI 相关
│   ├── rss/                 # RSS 解析
│   ├── notification/        # 通知系统
│   └── utils.ts             # 工具函数
├── types/                   # TypeScript 类型定义
├── scripts/                 # 脚本
└── public/                  # 静态资源
```

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **数据库**: Vercel Postgres (PostgreSQL)
- **AI**: OpenAI API
- **RSS**: rss-parser
- **部署**: Vercel

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码（如果配置）

### 命名约定

- **文件名**: kebab-case (例如: `message-list.tsx`)
- **组件名**: PascalCase (例如: `MessageList`)
- **函数名**: camelCase (例如: `sendMessage`)
- **常量**: UPPER_SNAKE_CASE (例如: `API_BASE_URL`)

### Git 提交规范

使用语义化提交消息：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具相关

示例：
```
feat: 添加消息搜索功能
fix: 修复 RSS 解析错误
docs: 更新部署文档
```

## API 设计

### RESTful 风格

- `GET /api/resource`: 获取资源列表
- `POST /api/resource`: 创建资源
- `PUT /api/resource`: 更新资源
- `DELETE /api/resource?id=xxx`: 删除资源

### 响应格式

成功响应：
```json
{
  "data": {...},
  "message": "操作成功"
}
```

错误响应：
```json
{
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

## 数据库

### 迁移

目前使用简单的 SQL 脚本进行数据库初始化。未来可以考虑使用 Prisma 或其他 ORM。

### 查询优化

- 使用索引加速常见查询
- 避免 N+1 查询问题
- 使用连接池（Vercel Postgres 自动处理）

## 测试

### 本地测试

1. **测试聊天功能**：
   - 发送消息
   - 测试 AI 触发
   - 验证消息显示

2. **测试 AI 机器人**：
   - 创建/编辑/删除机器人
   - 测试不同的触发关键词
   - 验证 AI 回复

3. **测试 RSS 订阅**：
   - 添加订阅源
   - 手动获取更新
   - 验证消息展示

4. **测试 Bark 通知**：
   - 配置 Bark URL
   - 添加关键词
   - 测试推送

### 端点测试

使用 curl 或 Postman 测试 API：

```bash
# 获取消息
curl http://localhost:3000/api/messages

# 发送消息
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "测试消息"}'

# 手动获取 RSS
curl -X POST http://localhost:3000/api/rss/fetch
```

## 常见问题

### Q: 本地开发时 API 调用失败

**A:** 检查：
1. 开发服务器是否正常运行
2. 环境变量是否正确配置
3. 数据库是否已初始化

### Q: 样式不生效

**A:** 
1. 检查 Tailwind CSS 配置
2. 确认组件导入路径正确
3. 重启开发服务器

### Q: TypeScript 类型错误

**A:**
1. 检查 `types/index.ts` 中的类型定义
2. 运行 `npm run lint` 查看详细错误
3. 确保依赖版本兼容

## 贡献流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 性能优化建议

1. **代码分割**：使用动态导入减少初始加载
2. **图片优化**：使用 Next.js Image 组件
3. **API 缓存**：合理使用 SWR 或 React Query
4. **数据库查询**：添加索引，优化查询
5. **边缘函数**：考虑使用 Vercel Edge Functions

## 安全注意事项

1. **永远不要**提交 `.env.local` 文件
2. **永远不要**在客户端暴露 API 密钥
3. **验证**所有用户输入
4. **使用**环境变量管理敏感信息
5. **限制** API 调用频率

## 资源链接

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Vercel 文档](https://vercel.com/docs)
- [OpenAI API 文档](https://platform.openai.com/docs)
