#!/usr/bin/env node

/**
 * 数据库迁移脚本
 * 
 * 使用方法：
 * 1. 确保已配置好 .env.local 中的数据库连接
 * 2. 运行：npm run db:migrate
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

async function runMigrations() {
  try {
    console.log('开始运行数据库迁移...\n');

    const migrationsDir = path.join(__dirname, '../lib/db/migrations');
    
    // 检查迁移目录是否存在
    if (!fs.existsSync(migrationsDir)) {
      console.log('没有找到迁移文件目录');
      return;
    }

    // 读取所有迁移文件
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // 按文件名排序

    if (files.length === 0) {
      console.log('没有需要运行的迁移文件');
      return;
    }

    console.log(`找到 ${files.length} 个迁移文件:\n`);

    // 逐个执行迁移文件
    for (const file of files) {
      console.log(`正在执行: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(filePath, 'utf8');
      
      try {
        await sql.query(migrationSQL);
        console.log(`✅ ${file} 执行成功\n`);
      } catch (error) {
        // 如果是字段已存在的错误，可以忽略
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${file} 已经应用过，跳过\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message);
    console.error('\n详细错误:', error);
    console.error('\n请检查：');
    console.error('1. .env.local 文件是否存在且配置正确');
    console.error('2. 数据库连接信息是否正确');
    console.error('3. SQL 语法是否正确');
    process.exit(1);
  }
}

// 检查环境变量
if (!process.env.POSTGRES_URL) {
  console.error('❌ 错误：未找到 POSTGRES_URL 环境变量');
  console.error('\n请确保：');
  console.error('1. 已创建 .env.local 文件');
  console.error('2. 已配置 POSTGRES_URL 等数据库连接信息');
  process.exit(1);
}

runMigrations();
