import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

/**
 * 数据库初始化 API
 * 用于在运行时初始化数据库表
 * 
 * 注意：此端点应该在生产环境中被保护或移除
 */
export async function POST(request: NextRequest) {
  try {
    // 读取 schema.sql 文件
    const schemaPath = path.join(process.cwd(), 'lib/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 将 SQL 脚本按分号分割成单独的语句
    // 移除注释，然后按分号分割
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

    const results = [];
    
    // 执行每个 SQL 语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await sql.query(statement);
          results.push({ index: i + 1, success: true });
        } catch (error: any) {
          // 忽略 "already exists" 错误
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate') ||
              error.message?.includes('does not exist')) {
            results.push({ index: i + 1, success: true, skipped: true });
          } else {
            results.push({ 
              index: i + 1, 
              success: false, 
              error: error.message,
              sql: statement.substring(0, 100)
            });
          }
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({ 
      success: failedCount === 0, 
      message: `数据库初始化完成：成功 ${successCount}，失败 ${failedCount}`,
      results
    });
  } catch (error: any) {
    console.error('数据库初始化失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '数据库初始化失败' 
      },
      { status: 500 }
    );
  }
}
