import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// 检查认证状态
export async function GET(request: NextRequest) {
  try {
    const correctPassword = process.env.AUTH_PASSWORD;

    // 如果没有配置密码，允许访问（向后兼容）
    if (!correctPassword) {
      return NextResponse.json({ authenticated: true });
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    return NextResponse.json({
      authenticated: authToken?.value === 'authenticated',
    });
  } catch (error) {
    console.error('检查认证状态失败:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
