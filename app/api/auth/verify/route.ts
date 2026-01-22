import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// 验证密码
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: '密码不能为空' },
        { status: 400 }
      );
    }

    const correctPassword = process.env.AUTH_PASSWORD;

    // 如果没有配置密码，允许访问（向后兼容）
    if (!correctPassword) {
      return NextResponse.json(
        { error: '未配置访问密码，请在环境变量中设置 AUTH_PASSWORD' },
        { status: 500 }
      );
    }

    if (password !== correctPassword) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      );
    }

    // 设置认证 cookie（7天有效期）
    const cookieStore = await cookies();
    cookieStore.set('auth_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('验证密码失败:', error);
    return NextResponse.json(
      { error: '验证失败' },
      { status: 500 }
    );
  }
}
