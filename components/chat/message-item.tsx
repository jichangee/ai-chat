'use client';

import { Message } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Reply } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageItemProps {
  message: Message;
  onQuote?: (message: Message) => void;
  quotedMessage?: Message | null;
}

export function MessageItem({ message, onQuote, quotedMessage }: MessageItemProps) {
  const isUser = message.sender_type === 'user';
  const isAI = message.sender_type === 'ai';
  const isRSS = message.sender_type === 'rss';

  // 检查当前消息是否引用了其他消息
  const hasQuote = message.quoted_message_id && quotedMessage;

  return (
    <div
      className={cn(
        'flex mb-4 group',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3 relative',
          isUser && 'bg-primary text-primary-foreground',
          isAI && 'bg-secondary text-secondary-foreground',
          isRSS && 'bg-accent text-accent-foreground border border-border',
          message.metadata?.error && 'border-2 border-destructive'
        )}
      >
        {/* 引用的消息 */}
        {hasQuote && quotedMessage && (
          <div className="mb-2 p-2 bg-background/50 rounded border-l-2 border-foreground/20">
            <div className="text-xs opacity-70 mb-1">
              回复 {quotedMessage.sender_name}
            </div>
            <div className="text-xs opacity-80 line-clamp-2">
              {quotedMessage.content}
            </div>
          </div>
        )}

        {/* 发送者信息 */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">{message.sender_name}</span>
            {isAI && <Badge variant="outline" className="text-xs">AI</Badge>}
            {isRSS && <Badge variant="outline" className="text-xs">RSS</Badge>}
          </div>
        )}

        {/* 消息内容 */}
        <div className="break-words text-sm">
          {message.metadata?.loading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>{message.content}</span>
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // 自定义样式以匹配主题
                p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                code: ({ node, inline, ...props }: any) => {
                  if (inline) {
                    return <code className={`${isUser ? 'bg-primary-foreground/20' : 'bg-background/50'} px-1 py-0.5 rounded text-xs`} {...props} />;
                  }
                  return <code className={`block ${isUser ? 'bg-primary-foreground/20' : 'bg-background/50'} p-2 rounded text-xs overflow-x-auto`} {...props} />;
                },
                pre: ({ children }) => <pre className="mb-2 last:mb-0">{children}</pre>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                blockquote: ({ children }) => <blockquote className={`border-l-4 ${isUser ? 'border-primary-foreground/30' : 'border-foreground/20'} pl-4 italic mb-2 last:mb-0`}>{children}</blockquote>,
                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 last:mb-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mb-2 last:mb-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mb-2 last:mb-0">{children}</h3>,
                a: ({ children, href }) => <a href={href} className="underline hover:opacity-80" target="_blank" rel="noopener noreferrer">{children}</a>,
                table: ({ children }) => <div className="overflow-x-auto mb-2 last:mb-0"><table className="min-w-full border-collapse">{children}</table></div>,
                th: ({ children }) => <th className={`border ${isUser ? 'border-primary-foreground/30' : 'border-foreground/20'} px-2 py-1 text-left`}>{children}</th>,
                td: ({ children }) => <td className={`border ${isUser ? 'border-primary-foreground/30' : 'border-foreground/20'} px-2 py-1`}>{children}</td>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* 时间戳和操作 */}
        <div className="flex items-center justify-between mt-2 gap-2">
          <div
            className={cn(
              'text-xs opacity-70',
              isUser ? 'text-right' : 'text-left'
            )}
          >
            {formatDate(message.created_at)}
          </div>
          
          {/* 引用按钮 */}
          {onQuote && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onQuote(message)}
              title="引用回复"
            >
              <Reply className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
