import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { AIBot } from '@/types';

// GET: 获取所有 AI 机器人
export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM ai_bots
      ORDER BY created_at DESC
    `;

    const bots: AIBot[] = result.rows as any[];
    
    return NextResponse.json({ bots });
  } catch (error) {
    console.error('获取 AI 机器人失败:', error);
    return NextResponse.json(
      { error: '获取 AI 机器人失败' },
      { status: 500 }
    );
  }
}

// POST: 创建新的 AI 机器人
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      avatar = '',
      system_prompt,
      trigger_keywords = [],
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      is_active = true,
    } = body;

    if (!name || !system_prompt) {
      return NextResponse.json(
        { error: '名称和系统提示词不能为空' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO ai_bots (
        name, 
        avatar, 
        system_prompt, 
        trigger_keywords, 
        model, 
        temperature, 
        is_active
      )
      VALUES (
        ${name}, 
        ${avatar}, 
        ${system_prompt}, 
        ${trigger_keywords}, 
        ${model}, 
        ${temperature}, 
        ${is_active}
      )
      RETURNING *
    `;

    const bot: AIBot = result.rows[0] as any;
    
    return NextResponse.json({ bot }, { status: 201 });
  } catch (error) {
    console.error('创建 AI 机器人失败:', error);
    return NextResponse.json(
      { error: '创建 AI 机器人失败' },
      { status: 500 }
    );
  }
}

// PUT: 更新 AI 机器人
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      avatar,
      system_prompt,
      trigger_keywords,
      model,
      temperature,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: '机器人 ID 不能为空' },
        { status: 400 }
      );
    }

    // 构建更新字段
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (avatar !== undefined) {
      updates.push(`avatar = $${paramCount++}`);
      values.push(avatar);
    }
    if (system_prompt !== undefined) {
      updates.push(`system_prompt = $${paramCount++}`);
      values.push(system_prompt);
    }
    if (trigger_keywords !== undefined) {
      updates.push(`trigger_keywords = $${paramCount++}`);
      values.push(trigger_keywords);
    }
    if (model !== undefined) {
      updates.push(`model = $${paramCount++}`);
      values.push(model);
    }
    if (temperature !== undefined) {
      updates.push(`temperature = $${paramCount++}`);
      values.push(temperature);
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
      UPDATE ai_bots
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await sql.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '机器人不存在' },
        { status: 404 }
      );
    }

    const bot: AIBot = result.rows[0] as any;
    
    return NextResponse.json({ bot });
  } catch (error) {
    console.error('更新 AI 机器人失败:', error);
    return NextResponse.json(
      { error: '更新 AI 机器人失败' },
      { status: 500 }
    );
  }
}

// DELETE: 删除 AI 机器人
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '机器人 ID 不能为空' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM ai_bots WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '机器人不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除 AI 机器人失败:', error);
    return NextResponse.json(
      { error: '删除 AI 机器人失败' },
      { status: 500 }
    );
  }
}
