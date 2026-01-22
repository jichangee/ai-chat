# 升级到 v2.1.0

本文档说明如何从 v2.0.0 升级到 v2.1.0。

## 新功能概览

v2.1.0 引入了以下新功能：

1. **@提及功能** - 可以 @机器人名称 或 @all
2. **引用回复功能** - 可以引用任何历史消息
3. **上下文控制** - AI 上下文限制为最近 5 条消息

## 升级步骤

### 1. 更新代码

```bash
# 拉取最新代码
git pull origin main

# 安装依赖（如有新增）
pnpm install
```

### 2. 运行数据库迁移

```bash
# 运行迁移脚本
pnpm db:migrate
```

迁移脚本会自动：
- 添加 `messages.quoted_message_id` 字段
- 创建相关索引
- 迁移现有数据（如有必要）

### 3. 重启应用

```bash
# 开发环境
pnpm dev

# 生产环境（Vercel 会自动重新部署）
```

### 4. 测试新功能

1. **测试 @提及功能**
   - 在消息中输入 `@` 查看自动补全
   - 发送 `@机器人名称 测试消息`
   - 发送 `@all 测试消息`

2. **测试引用功能**
   - 鼠标悬停在任何消息上
   - 点击引用按钮
   - 发送回复

3. **验证上下文**
   - 发送多条消息
   - 观察 AI 是否只记得最近 5 条
   - 使用引用功能测试引入远期消息

## 数据库变更详情

### 新增字段

```sql
ALTER TABLE messages 
ADD COLUMN quoted_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;
```

### 新增索引

```sql
CREATE INDEX idx_messages_quoted_message_id ON messages(quoted_message_id);
```

## 兼容性说明

### 向后兼容

✅ **完全向后兼容**

- 现有消息不受影响
- 现有机器人配置不需要修改
- 关键词触发方式仍然有效
- 没有破坏性变更

### 可选迁移

如果你的 `messages` 表的 `metadata` 字段中存储了 `quoted_message_id`，迁移脚本会自动将其转移到新字段。

## 功能使用

### @提及

```
# @特定机器人
@技术助手 帮我看看这个代码

# @所有机器人
@all 这个方案怎么样？
```

### 引用回复

1. 鼠标悬停在消息上
2. 点击引用图标（↩️）
3. 输入你的回复
4. 发送

### 自动补全

1. 输入 `@`
2. 系统显示可用机器人列表
3. 点击选择或继续输入筛选

## 常见问题

### Q: 升级后旧消息能被引用吗？

A: 可以，所有消息都可以被引用。

### Q: @功能是否会影响关键词触发？

A: 如果消息中有 @，会优先使用 @提及触发；没有 @ 时才使用关键词触发。

### Q: 上下文5条会影响对话质量吗？

A: 不会。通过引用功能，你可以主动添加重要的历史消息到上下文中。

### Q: 迁移失败怎么办？

A: 如果迁移失败，可以手动执行 SQL：

```sql
-- 手动添加字段
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS quoted_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- 手动添加索引
CREATE INDEX IF NOT EXISTS idx_messages_quoted_message_id ON messages(quoted_message_id);
```

### Q: 需要重新配置 AI 机器人吗？

A: 不需要，现有配置完全兼容。

## 回滚步骤

如果需要回滚到 v2.0.0：

```bash
# 1. 回滚代码
git checkout v2.0.0

# 2. 重新安装依赖
pnpm install

# 3. 删除新字段（可选）
# 注意：这会删除所有引用关系
```

```sql
ALTER TABLE messages DROP COLUMN IF EXISTS quoted_message_id;
```

## 性能影响

### Token 使用

- 默认上下文从 10 条减少到 5 条，**节省约 50% token**
- 引用消息会额外增加 1 条消息的 token

### 查询性能

- 新增索引提高了引用消息的查询速度
- 对整体性能无负面影响

### 响应速度

- 由于上下文减少，AI 响应速度会**略有提升**

## 更多信息

- 详细功能说明：[MENTION_QUOTE_GUIDE.md](./MENTION_QUOTE_GUIDE.md)
- 完整更新日志：[CHANGELOG.md](./CHANGELOG.md)
- 项目文档：[README.md](./README.md)

## 问题反馈

如有任何问题，请在 GitHub Issues 中反馈。
