'use client';

import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.sender_type === 'user';
  const isAI = message.sender_type === 'ai';
  const isRSS = message.sender_type === 'rss';

  return (
    <div
      className={cn(
        'flex mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3',
          isUser && 'bg-primary text-primary-foreground',
          isAI && 'bg-secondary text-secondary-foreground',
          isRSS && 'bg-accent text-accent-foreground border border-border'
        )}
      >
        {/* 发送者信息 */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">{message.sender_name}</span>
            {isAI && <Badge variant="outline" className="text-xs">AI</Badge>}
            {isRSS && <Badge variant="outline" className="text-xs">RSS</Badge>}
          </div>
        )}

        {/* 消息内容 */}
        <div className="whitespace-pre-wrap break-words text-sm">
          {message.content}
        </div>

        {/* 时间戳 */}
        <div
          className={cn(
            'text-xs mt-2 opacity-70',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {formatDate(message.created_at)}
        </div>
      </div>
    </div>
  );
}
