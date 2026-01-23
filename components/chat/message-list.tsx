'use client';

import { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { Message } from '@/types';
import { MessageItem } from './message-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  onQuote?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  hasMoreHistory?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function MessageList({ 
  messages, 
  onQuote, 
  onDelete, 
  hasMoreHistory = false,
  loadingMore = false,
  onLoadMore 
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const previousMessagesLengthRef = useRef(0);
  const anchorMessageRef = useRef<string | null>(null);

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

  // 保持滚动位置（加载历史消息时）
  const maintainScrollPosition = (anchorId: string) => {
    setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      
      const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (!viewport) return;

      const anchorElement = document.querySelector(`[data-message-id="${anchorId}"]`) as HTMLElement;
      if (anchorElement) {
        // 计算锚点元素的新位置，并调整滚动位置
        const newOffsetTop = anchorElement.offsetTop;
        const scrollDiff = newOffsetTop - viewport.scrollTop;
        viewport.scrollTop = viewport.scrollTop + scrollDiff;
        anchorElement.removeAttribute('data-anchor');
      }
    }, 50);
  };

  // 自动滚动到底部（仅在初始加载或新消息添加到末尾时）
  useLayoutEffect(() => {
    const currentLength = messages.length;
    const previousLength = previousMessagesLengthRef.current;
    
    if (isInitialLoad && currentLength > 0) {
      // 初始加载，滚动到底部
      scrollToBottom();
      setIsInitialLoad(false);
      previousMessagesLengthRef.current = currentLength;
    } else if (currentLength > previousLength) {
      // 消息数量增加
      const anchorElement = document.querySelector('[data-anchor="true"]') as HTMLElement;
      if (anchorElement) {
        // 加载历史消息，保持滚动位置
        const anchorId = anchorElement.getAttribute('data-message-id');
        if (anchorId) {
          maintainScrollPosition(anchorId);
        }
      } else {
        // 新消息添加到末尾，滚动到底部
        scrollToBottom();
      }
      previousMessagesLengthRef.current = currentLength;
    }
  }, [messages.length, isInitialLoad]);

  // 监听滚动事件，检测是否滚动到顶部
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;

    const handleScroll = () => {
      // 当滚动到顶部附近（距离顶部50px内）时显示加载更多按钮
      const scrollTop = viewport.scrollTop;
      setShowLoadMore(scrollTop < 50 && hasMoreHistory && !loadingMore);
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [hasMoreHistory, loadingMore]);

  // 根据ID查找消息
  const findMessageById = (id: string) => {
    return messages.find(msg => msg.id === id);
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden relative">
      <ScrollArea className="h-full px-4">
        <div ref={scrollRef} className="min-h-full">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>暂无消息，开始聊天吧</p>
            </div>
          ) : (
            <div className="py-4">
              {/* 加载更多历史消息按钮 */}
              {showLoadMore && hasMoreHistory && (
                <div className="flex justify-center mb-4">
                  <Button
                    variant="outline"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        加载中...
                      </>
                    ) : (
                      '加载更多历史消息'
                    )}
                  </Button>
                </div>
              )}
              
              {messages.map((message) => (
                <MessageItem 
                  key={message.id} 
                  message={message} 
                  onQuote={onQuote}
                  onDelete={onDelete}
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
