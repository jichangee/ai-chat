/**
 * 发送 Bark 通知
 * @param barkUrl Bark 推送 URL
 * @param title 通知标题
 * @param body 通知内容
 * @param options 额外选项
 */
export async function sendBarkNotification(
  barkUrl: string,
  title: string,
  body: string,
  options?: {
    group?: string;
    icon?: string;
    sound?: string;
    url?: string;
  }
): Promise<void> {
  if (!barkUrl) {
    console.warn('Bark URL 未配置，跳过推送');
    return;
  }

  try {
    // 构建 Bark URL
    const encodedTitle = encodeURIComponent(title);
    const encodedBody = encodeURIComponent(body);
    let url = `${barkUrl}/${encodedTitle}/${encodedBody}`;
    
    // 添加可选参数
    const params = new URLSearchParams();
    if (options?.group) params.append('group', options.group);
    if (options?.icon) params.append('icon', options.icon);
    if (options?.sound) params.append('sound', options.sound);
    if (options?.url) params.append('url', options.url);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Bark 推送失败: ${response.statusText}`);
    }
    
    console.log('Bark 通知发送成功');
  } catch (error) {
    console.error('Bark 推送错误:', error);
    // 静默处理错误，不影响主流程
  }
}
