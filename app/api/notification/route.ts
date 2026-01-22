import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { sendBarkNotification } from '@/lib/notification/bark';
import { NotificationRule } from '@/types';

// GET: 获取通知规则
export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM notification_rules LIMIT 1
    `;

    if (result.rows.length === 0) {
      // 如果没有规则，创建默认规则
      const createResult = await sql`
        INSERT INTO notification_rules (keywords, bark_url, is_active)
        VALUES (ARRAY[]::TEXT[], '', false)
        RETURNING *
      `;
      
      const rule: NotificationRule = createResult.rows[0] as any;
      return NextResponse.json({ rule });
    }

    const rule: NotificationRule = result.rows[0] as any;
    
    return NextResponse.json({ rule });
  } catch (error) {
    console.error('获取通知规则失败:', error);
    return NextResponse.json(
      { error: '获取通知规则失败' },
      { status: 500 }
    );
  }
}

// PUT: 更新通知规则
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, bark_url, is_active } = body;

    // 获取现有规则
    const existingResult = await sql`
      SELECT id FROM notification_rules LIMIT 1
    `;

    let result;
    
    if (existingResult.rows.length === 0) {
      // 创建新规则
      result = await sql`
        INSERT INTO notification_rules (keywords, bark_url, is_active)
        VALUES (
          ${keywords || []}, 
          ${bark_url || ''}, 
          ${is_active !== undefined ? is_active : false}
        )
        RETURNING *
      `;
    } else {
      // 更新现有规则
      const id = existingResult.rows[0].id;
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (keywords !== undefined) {
        updates.push(`keywords = $${paramCount++}`);
        values.push(keywords);
      }
      if (bark_url !== undefined) {
        updates.push(`bark_url = $${paramCount++}`);
        values.push(bark_url);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(is_active);
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { error: '没有要更新的字段' },
          { status: 400 }
        );
      }

      values.push(id);
      const query = `
        UPDATE notification_rules
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      result = await sql.query(query, values);
    }

    const rule: NotificationRule = result.rows[0] as any;
    
    return NextResponse.json({ rule });
  } catch (error) {
    console.error('更新通知规则失败:', error);
    return NextResponse.json(
      { error: '更新通知规则失败' },
      { status: 500 }
    );
  }
}

// POST: 测试 Bark 通知
export async function POST(request: NextRequest) {
  try {
    const { bark_url } = await request.json();

    if (!bark_url) {
      return NextResponse.json(
        { error: 'Bark URL 不能为空' },
        { status: 400 }
      );
    }

    await sendBarkNotification(
      bark_url,
      '测试通知',
      '这是来自 AI 群聊助手的测试通知',
      {
        group: 'ai-chat-test',
      }
    );

    return NextResponse.json({ success: true, message: '测试通知已发送' });
  } catch (error) {
    console.error('发送测试通知失败:', error);
    return NextResponse.json(
      { error: '发送测试通知失败' },
      { status: 500 }
    );
  }
}
