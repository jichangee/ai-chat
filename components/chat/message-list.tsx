'use client';

import { useEffect, useRef, useLayoutEffect } from 'react';
import { Message } from '@/types';
import { MessageItem } from './message-item';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
  messages: Message[];
  onQuote?: (message: Message) => void;
}

export function MessageList({ messages, onQuote }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 滚动到底部的函数
  const scrollToBottom = () => {
    if (containerRef.current) {
      // 查找Radix UI ScrollArea的viewport元素
      const viewport = containerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
        return;
      }
    }
    // 备用方案：如果找不到viewport，尝试滚动内部容器
    if (scrollRef.current) {
      const parent = scrollRef.current.parentElement;
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  };

  // 自动滚动到底部
  // 使用useLayoutEffect确保在DOM更新后立即滚动
  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 额外的useEffect用于流式更新时的滚动（监听消息内容变化）
  useEffect(() => {
    // 使用setTimeout确保DOM渲染完成
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 10);
    return () => clearTimeout(timer);
  }, [messages]);

  // 根据ID查找消息
  const findMessageById = (id: string) => {
    return messages.find(msg => msg.id === id);
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      <ScrollArea className="h-full px-4">
        <div ref={scrollRef} className="min-h-full">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>暂无消息，开始聊天吧</p>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((message) => (
                <MessageItem 
                  key={message.id} 
                  message={message} 
                  onQuote={onQuote}
                  quotedMessage={message.quoted_message_id ? findMessageById(message.quoted_message_id) : null}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
