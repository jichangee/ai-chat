import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { RSSFeed } from '@/types';

// GET: 获取所有 RSS 订阅源
export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM rss_feeds
      ORDER BY created_at DESC
    `;

    const feeds: RSSFeed[] = result.rows as any[];
    
    return NextResponse.json({ feeds });
  } catch (error) {
    console.error('获取 RSS 订阅源失败:', error);
    return NextResponse.json(
      { error: '获取 RSS 订阅源失败' },
      { status: 500 }
    );
  }
}

// POST: 添加新的 RSS 订阅源
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, is_active = true } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: '名称和 URL 不能为空' },
        { status: 400 }
      );
    }

    // 检查 URL 是否已存在
    const existingResult = await sql`
      SELECT id FROM rss_feeds WHERE url = ${url}
    `;

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: '该 RSS 订阅源已存在' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO rss_feeds (name, url, is_active)
      VALUES (${name}, ${url}, ${is_active})
      RETURNING *
    `;

    const feed: RSSFeed = result.rows[0] as any;
    
    return NextResponse.json({ feed }, { status: 201 });
  } catch (error) {
    console.error('添加 RSS 订阅源失败:', error);
    return NextResponse.json(
      { error: '添加 RSS 订阅源失败' },
      { status: 500 }
    );
  }
}

// PUT: 更新 RSS 订阅源
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, url, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: '订阅源 ID 不能为空' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (url !== undefined) {
      updates.push(`url = $${paramCount++}`);
      values.push(url);
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
      UPDATE rss_feeds
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await sql.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '订阅源不存在' },
        { status: 404 }
      );
    }

    const feed: RSSFeed = result.rows[0] as any;
    
    return NextResponse.json({ feed });
  } catch (error) {
    console.error('更新 RSS 订阅源失败:', error);
    return NextResponse.json(
      { error: '更新 RSS 订阅源失败' },
      { status: 500 }
    );
  }
}

// DELETE: 删除 RSS 订阅源
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '订阅源 ID 不能为空' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM rss_feeds WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '订阅源不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除 RSS 订阅源失败:', error);
    return NextResponse.json(
      { error: '删除 RSS 订阅源失败' },
      { status: 500 }
    );
  }
}
