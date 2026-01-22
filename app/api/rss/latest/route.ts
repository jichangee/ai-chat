import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { parseRSSFeed, formatRSSItemAsMessage } from '@/lib/rss/parser';
import { RSSFeed } from '@/types';

// GET: 获取指定RSS源的最新一条消息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feedId = searchParams.get('feedId');

    if (!feedId) {
      return NextResponse.json(
        { error: 'RSS源ID不能为空' },
        { status: 400 }
      );
    }

    // 获取RSS源信息
    const feedResult = await sql`
      SELECT * FROM rss_feeds WHERE id = ${feedId}
    `;

    if (feedResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'RSS源不存在' },
        { status: 404 }
      );
    }

    const feed: RSSFeed = feedResult.rows[0] as any;

    // 解析RSS源，获取最新一条
    const items = await parseRSSFeed(feed.url);
    
    if (items.length === 0) {
      return NextResponse.json(
        { error: '该RSS源暂无内容' },
        { status: 404 }
      );
    }

    // 获取最新一条
    const latestItem = items[0];
    const messageContent = formatRSSItemAsMessage(latestItem, feed.name);

    return NextResponse.json({
      content: messageContent,
      metadata: {
        title: latestItem.title,
        link: latestItem.link,
        pubDate: latestItem.pubDate,
        feedName: feed.name,
        feedId: feed.id,
      },
    });
  } catch (error) {
    console.error('获取最新RSS消息失败:', error);
    return NextResponse.json(
      { error: '获取最新RSS消息失败' },
      { status: 500 }
    );
  }
}
