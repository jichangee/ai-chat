'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Message, AIBot } from '@/types';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, RefreshCw } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [bots, setBots] = useState<AIBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);

  // 加载消息
  const loadMessages = async () => {
    try {
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载AI机器人列表
  const loadBots = async () => {
    try {
      const response = await fetch('/api/ai-bots');
      if (response.ok) {
        const data = await response.json();
        setBots(data.bots || []);
      }
    } catch (error) {
      console.error('加载机器人列表失败:', error);
    }
  };

  // 发送消息（支持流式响应）
  const handleSendMessage = async (content: string, quotedMessageId?: string) => {
    setSending(true);
    
    // 检查是否触发了AI机器人（前端检测仅用于决定是否使用流式响应）
    // 实际的触发检测在后端进行，这里只做初步判断
    const triggeredBots = bots.filter(bot => {
      if (!bot.is_active) return false;
      // 转义机器人名称中的特殊字符
      const escapedName = bot.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mentionPattern = new RegExp(`@${escapedName}(?:\\s|$|[，。！？、])`, 'i');
      const mentionsAll = /@all(?:\s|$)/i.test(content);
      return mentionsAll || mentionPattern.test(content) || 
        (bot.trigger_keywords && bot.trigger_keywords.length > 0 && 
         bot.trigger_keywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase())));
    });

    // 创建临时用户消息ID（用于非流式响应）
    const tempUserMessageId = `temp-user-${Date.now()}`;
    const tempUserMessage: Message = {
      id: tempUserMessageId,
      content,
      sender_type: 'user',
      sender_id: null,
      sender_name: '我',
      created_at: new Date().toISOString(),
      quoted_message_id: quotedMessageId || null,
    };

    // 立即添加用户消息（优化用户体验）
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content,
          quoted_message_id: quotedMessageId,
          stream: triggeredBots.length > 0 // 如果触发了AI机器人，使用流式响应
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '发送消息失败');
      }

      // 检查是否是流式响应
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // 流式响应处理 - 支持多机器人并发
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('无法读取流式响应');
        }

        // 使用Map管理多个AI消息状态
        interface AIMessageState {
          id: string;
          botId: string;
          botName: string;
          content: string;
          loading: boolean;
          hasError: boolean;
        }
        
        const aiMessagesMap = new Map<string, AIMessageState>();
        let userMessage: Message | null = null;
        let buffer = '';
        let globalError = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'user') {
                    // 更新用户消息（用服务器返回的真实消息替换临时消息）
                    userMessage = data.message;
                    setMessages((prev) => {
                      const hasTempMessage = prev.some(msg => msg.id === tempUserMessageId);
                      if (hasTempMessage) {
                        return prev.map(msg => 
                          msg.id === tempUserMessageId ? userMessage! : msg
                        );
                      } else {
                        const hasRealMessage = prev.some(msg => msg.id === userMessage!.id);
                        if (!hasRealMessage) {
                          return [...prev, userMessage!];
                        }
                        return prev;
                      }
                    });
                    
                  } else if (data.type === 'ai_start') {
                    // AI开始响应，创建loading消息
                    const state: AIMessageState = {
                      id: data.messageId,
                      botId: data.botId,
                      botName: data.botName,
                      content: '正在思考...',
                      loading: true,
                      hasError: false
                    };
                    aiMessagesMap.set(data.messageId, state);
                    
                    // 添加loading消息到UI
                    const loadingMessage: Message = {
                      id: data.messageId,
                      content: '正在思考...',
                      sender_type: 'ai',
                      sender_id: data.botId,
                      sender_name: data.botName,
                      created_at: new Date().toISOString(),
                      quoted_message_id: quotedMessageId || null,
                      metadata: { loading: true },
                    };
                    setMessages((prev) => [...prev, loadingMessage]);
                    console.log(`AI机器人 ${data.botName} 开始响应`);
                    
                  } else if (data.type === 'ai_chunk') {
                    // 流式更新AI消息内容
                    const state = aiMessagesMap.get(data.messageId);
                    if (state && !state.hasError) {
                      // 更新该机器人的消息内容
                      if (state.loading) {
                        // 第一个chunk，替换"正在思考..."
                        state.content = data.content;
                        state.loading = false;
                      } else {
                        // 后续chunk，追加内容
                        state.content += data.content;
                      }
                      
                      setMessages((prev) => prev.map(msg => 
                        msg.id === data.messageId 
                          ? { ...msg, content: state.content, metadata: { ...msg.metadata, loading: false } }
                          : msg
                      ));
                    }
                    
                  } else if (data.type === 'ai_complete') {
                    // AI响应完成，更新最终消息
                    const state = aiMessagesMap.get(data.messageId);
                    if (state && data.message) {
                      aiMessagesMap.delete(data.messageId);
                      
                      // 用数据库返回的最终消息替换临时消息
                      setMessages((prev) => prev.map(msg => 
                        msg.id === data.messageId ? data.message : msg
                      ));
                      console.log(`AI机器人 ${state.botName} 完成响应`);
                    }
                    
                  } else if (data.type === 'error') {
                    // 处理错误
                    if (data.messageId) {
                      // 特定机器人的错误
                      const state = aiMessagesMap.get(data.messageId);
                      if (state) {
                        state.hasError = true;
                        state.loading = false;
                        
                        const botName = state.botName || '未知机器人';
                        const errorContent = `❌ ${botName} 错误: ${data.error}`;
                        
                        setMessages((prev) => prev.map(msg => {
                          if (msg.id === data.messageId) {
                            return {
                              ...msg,
                              content: errorContent,
                              metadata: { ...msg.metadata, loading: false, error: true },
                            };
                          }
                          return msg;
                        }));
                        
                        console.error(`AI机器人 ${botName} 错误:`, data.error);
                        // 不抛出异常，让其他机器人继续
                      }
                    } else {
                      // 全局错误
                      globalError = true;
                      toast.error(`错误: ${data.error}`);
                      throw new Error(data.error);
                    }
                  }
                } catch (parseError) {
                  console.error('解析流式数据失败:', parseError);
                  // 如果是JSON解析错误，继续处理下一行
                  if (!(parseError instanceof SyntaxError)) {
                    throw parseError;
                  }
                }
              }
            }
          }
        } catch (streamError) {
          console.error('流式读取错误:', streamError);
          globalError = true;
          
          // 更新所有仍在loading的消息为错误状态
          const errorMessageIds = Array.from(aiMessagesMap.keys());
          if (errorMessageIds.length > 0) {
            setMessages((prev) => prev.map(msg => {
              if (errorMessageIds.includes(msg.id)) {
                const state = aiMessagesMap.get(msg.id);
                const botName = state?.botName || '未知机器人';
                return {
                  ...msg,
                  content: `❌ ${botName} 错误: ${streamError instanceof Error ? streamError.message : '未知错误'}`,
                  metadata: { ...msg.metadata, loading: false, error: true },
                };
              }
              return msg;
            }));
          }
          
          // 只有在全局错误时才抛出异常
          if (globalError) {
            throw streamError;
          }
        } finally {
          // 确保释放reader
          try {
            reader.releaseLock();
          } catch (e) {
            // 忽略释放锁的错误
          }
          // 清理Map
          aiMessagesMap.clear();
        }
      } else {
        // 非流式响应（向后兼容）
        const data = await response.json();
        
        // 检查是否有错误
        if (data.error) {
          throw new Error(data.error);
        }
        
        // 更新临时用户消息为真实消息，并添加AI回复
        setMessages((prev) => {
          // 用服务器返回的真实消息替换临时消息
          const updatedPrev = prev.map(msg => 
            msg.id === tempUserMessageId ? data.userMessage : msg
          );
          // 添加AI消息
          return [...updatedPrev, ...data.aiMessages];
        });
      }
      
      setQuotedMessage(null);
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : '发送消息失败';
      
      // 移除临时消息（如果存在）
      setMessages((prev) => prev.filter(msg => msg.id !== tempUserMessageId));
      
      // 显示错误提示
      toast.error(`错误: ${errorMessage}`);
      
      // 抛出异常，确保调用者能够处理
      throw error;
    } finally {
      setSending(false);
    }
  };

  // 处理引用消息
  const handleQuoteMessage = (message: Message) => {
    setQuotedMessage(message);
  };

  // 清除引用
  const handleClearQuote = () => {
    setQuotedMessage(null);
  };

  // 刷新消息
  const handleRefresh = () => {
    setLoading(true);
    loadMessages();
  };

  useEffect(() => {
    loadMessages();
    loadBots();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">AI 群聊助手</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      {loading && messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 消息加载骨架屏 */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[80%] ${i % 2 === 0 ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* 头像骨架 */}
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  {/* 名称骨架 */}
                  <Skeleton className="h-4 w-20" />
                  {/* 消息内容骨架 */}
                  <Skeleton className={`h-16 w-full ${i % 3 === 0 ? 'w-3/4' : i % 3 === 1 ? 'w-full' : 'w-5/6'}`} />
                  {/* 时间骨架 */}
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <MessageList 
          messages={messages} 
          onQuote={handleQuoteMessage}
        />
      )}

      {/* Input */}
      <MessageInput 
        onSend={handleSendMessage} 
        disabled={sending}
        quotedMessage={quotedMessage}
        onClearQuote={handleClearQuote}
        availableBots={bots.map(bot => ({ name: bot.name }))}
      />
    </div>
  );
}
