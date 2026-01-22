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

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');

    // 读取 schema.sql 文件
    const schemaPath = path.join(__dirname, '../lib/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 执行 SQL 脚本
    console.log('执行 SQL 脚本...');
    await sql.query(schema);

    console.log('✅ 数据库初始化成功！');
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
