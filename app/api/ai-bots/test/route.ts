import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * POST: 测试 API Key 和 Base URL 是否正确
 */
export async function POST(request: NextRequest) {
  let normalizedBaseUrl = '';
  let model = 'gpt-3.5-turbo';
  let originalBaseUrl = '';
  
  try {
    const body = await request.json();
    const { api_key, base_url, model: modelParam = 'gpt-3.5-turbo' } = body;
    model = modelParam;
    originalBaseUrl = base_url || '';

    if (!api_key) {
      return NextResponse.json(
        { error: 'API Key 不能为空' },
        { status: 400 }
      );
    }

    if (!base_url) {
      return NextResponse.json(
        { error: 'Base URL 不能为空' },
        { status: 400 }
      );
    }

    // 规范化 base_url：移除末尾的斜杠，但保留路径
    normalizedBaseUrl = base_url.trim();
    // 移除末尾的斜杠（如果有）
    normalizedBaseUrl = normalizedBaseUrl.replace(/\/+$/, '');
    
    // 如果 base_url 不包含路径（只有域名），默认添加 /v1
    // 例如：https://api.openai.com -> https://api.openai.com/v1
    // 但 https://api.openai.com/v1 保持不变
    if (!normalizedBaseUrl.match(/\/v\d+$/) && !normalizedBaseUrl.includes('/v1/')) {
      // 检查是否是标准域名格式（不包含路径）
      const urlPattern = /^https?:\/\/[^\/]+$/;
      if (urlPattern.test(normalizedBaseUrl)) {
        normalizedBaseUrl = normalizedBaseUrl + '/v1';
      }
    }

    // 创建 OpenAI 客户端
    const openai = new OpenAI({
      apiKey: api_key,
      baseURL: normalizedBaseUrl,
    });

    // 尝试调用 API 验证配置
    // 使用一个简单的测试请求，最小化 token 使用
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'user', content: 'Hi' }
      ],
      max_tokens: 5, // 最小化 token 使用
    });

    // 如果成功，返回成功消息
    return NextResponse.json({
      success: true,
      message: 'API Key 和 Base URL 验证成功',
    });
  } catch (error: any) {
    console.error('API 测试失败:', error);
    
    // 提供更友好的错误信息
    let errorMessage = '验证失败';
    
    // 检查错误状态码
    const statusCode = error?.status || error?.response?.status || error?.code;
    
    if (statusCode === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized') || error?.message?.includes('Invalid API Key')) {
      errorMessage = 'API Key 无效或已过期';
    } else if (statusCode === 404 || error?.message?.includes('404')) {
      // 404 可能是模型不存在或端点路径错误
      const errorMsg = error?.message || error?.error?.message || '';
      const baseUrl = normalizedBaseUrl || originalBaseUrl || '未知';
      
      if (errorMsg.toLowerCase().includes('model') || errorMsg.toLowerCase().includes('not found')) {
        errorMessage = `模型 "${model}" 不存在或不可用。请检查：\n1. 模型名称是否正确\n2. 该模型是否在您的账户中可用\n3. Base URL 是否正确（当前：${baseUrl}）`;
      } else {
        errorMessage = `Base URL 端点路径错误（404）。\n当前 Base URL：${baseUrl}\n请确保 Base URL 格式正确，例如：\n- OpenAI: https://api.openai.com/v1\n- 第三方服务: https://your-service.com/v1`;
      }
    } else if (statusCode === 403 || error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
      errorMessage = 'API Key 没有权限访问此资源';
    } else if (statusCode === 429 || error?.message?.includes('429') || error?.message?.includes('rate limit')) {
      errorMessage = 'API 请求频率过高，请稍后再试';
    } else if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('ECONNREFUSED') || error?.message?.includes('getaddrinfo')) {
      errorMessage = '无法连接到 Base URL，请检查网络连接或 URL 是否正确';
    } else if (error?.message?.includes('timeout') || error?.message?.includes('ETIMEDOUT')) {
      errorMessage = '连接超时，请检查网络或 Base URL 是否可访问';
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 400 }
    );
  }
}
