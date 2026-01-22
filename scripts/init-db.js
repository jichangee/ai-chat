#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 
 * 使用方法：
 * 1. 确保已配置好 .env.local 中的数据库连接
 * 2. 运行：npm run db:init
 */

const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

// 加载 .env.local 文件
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');

    // 读取 schema.sql 文件
    const schemaPath = path.join(__dirname, '../lib/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 将 SQL 脚本按分号分割成单独的语句
    // 简单方法：移除注释，然后按分号分割
    const lines = schema.split('\n');
    let fullSchema = '';
    
    for (const line of lines) {
      // 跳过纯注释行
      if (line.trim().startsWith('--')) {
        continue;
      }
      // 移除行内注释
      const commentIndex = line.indexOf('--');
      if (commentIndex >= 0) {
        fullSchema += line.substring(0, commentIndex) + '\n';
      } else {
        fullSchema += line + '\n';
      }
    }
    
    // 按分号分割
    const statements = fullSchema
      .split(';')
      .map(s => s.trim().replace(/\n+/g, ' '))
      .filter(s => s.length > 0 && !s.match(/^\s*$/));

    console.log(`找到 ${statements.length} 条 SQL 语句，开始执行...`);

    // 执行每个 SQL 语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await sql.query(statement);
          console.log(`✅ 执行语句 ${i + 1}/${statements.length}`);
        } catch (error) {
          // 忽略 "already exists" 错误
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate') ||
              error.message?.includes('does not exist')) {
            console.log(`⚠️  语句 ${i + 1} 跳过（已存在或无需执行）`);
          } else {
            console.warn(`⚠️  语句 ${i + 1} 执行警告:`, error.message);
            console.warn(`    SQL: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('\n✅ 数据库初始化成功！');
    console.log('\n下一步：');
    console.log('1. 运行 npm run dev 启动开发服务器');
    console.log('2. 访问 http://localhost:3000');
    console.log('3. 进入设置页面配置 AI 机器人和 RSS 订阅');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    console.error('\n请检查：');
    console.error('1. .env.local 文件是否存在且配置正确');
    console.error('2. 数据库连接信息是否正确');
    console.error('3. 网络连接是否正常');
    process.exit(1);
  }
}

// 检查环境变量
if (!process.env.POSTGRES_URL) {
  console.error('❌ 错误：未找到 POSTGRES_URL 环境变量');
  console.error('\n请确保：');
  console.error('1. 已创建 .env.local 文件');
  console.error('2. 已配置 POSTGRES_URL 等数据库连接信息');
  console.error('\n参考 .env.local.example 文件');
  process.exit(1);
}

initDatabase();
