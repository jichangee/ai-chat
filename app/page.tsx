'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Message } from '@/types';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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

  // 发送消息
  const handleSendMessage = async (content: string) => {
    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const data = await response.json();
        // 添加用户消息和 AI 回复到消息列表
        setMessages((prev) => [
          ...prev,
          data.userMessage,
          ...data.aiMessages,
        ]);
      } else {
        const error = await response.json();
        alert(error.error || '发送消息失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      alert('发送消息失败');
    } finally {
      setSending(false);
    }
  };

  // 刷新消息
  const handleRefresh = () => {
    setLoading(true);
    loadMessages();
  };

  useEffect(() => {
    loadMessages();
    
    // 定时刷新消息（每30秒）
    const interval = setInterval(loadMessages, 30000);
    
    return () => clearInterval(interval);
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
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>加载中...</p>
        </div>
      ) : (
        <MessageList messages={messages} />
      )}

      {/* Input */}
      <MessageInput onSend={handleSendMessage} disabled={sending} />
    </div>
  );
}
