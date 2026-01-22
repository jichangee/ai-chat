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
      api_key,
      base_url = 'https://api.openai.com/v1',
      is_active = true,
    } = body;

    if (!name || !system_prompt || !api_key) {
      return NextResponse.json(
        { error: '名称、系统提示词和 API Key 不能为空' },
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
        api_key,
        base_url,
        is_active
      )
      VALUES (
        ${name}, 
        ${avatar}, 
        ${system_prompt}, 
        ${trigger_keywords}, 
        ${model}, 
        ${temperature}, 
        ${api_key},
        ${base_url},
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
      api_key,
      base_url,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: '机器人 ID 不能为空' },
        { status: 400 }
      );
    }

    // 构建更新字段和值数组
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name');
      values.push(name);
    }
    if (avatar !== undefined) {
      updates.push('avatar');
      values.push(avatar);
    }
    if (system_prompt !== undefined) {
      updates.push('system_prompt');
      values.push(system_prompt);
    }
    if (trigger_keywords !== undefined) {
      updates.push('trigger_keywords');
      values.push(trigger_keywords);
    }
    if (model !== undefined) {
      updates.push('model');
      values.push(model);
    }
    if (temperature !== undefined) {
      updates.push('temperature');
      values.push(temperature);
    }
    if (api_key !== undefined) {
      updates.push('api_key');
      values.push(api_key);
    }
    if (base_url !== undefined) {
      updates.push('base_url');
      values.push(base_url);
    }
    if (is_active !== undefined) {
      updates.push('is_active');
      values.push(is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: '没有要更新的字段' },
        { status: 400 }
      );
    }

    // 构建 SET 子句，使用参数化查询
    const setClause = updates.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const query = `UPDATE ai_bots SET ${setClause} WHERE id = $${updates.length + 1} RETURNING *`;
    values.push(id);

    // 使用 @vercel/postgres 的 query 方法
    const result = await (sql as any).query(query, values);

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
