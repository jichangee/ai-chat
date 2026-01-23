'use client';

import { useState, KeyboardEvent, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';
import { Message } from '@/types';

interface MessageInputProps {
  onSend: (content: string, quotedMessageId?: string) => void;
  disabled?: boolean;
  quotedMessage?: Message | null;
  onClearQuote?: () => void;
  availableBots?: Array<{ name: string }>;
}

export function MessageInput({ 
  onSend, 
  disabled, 
  quotedMessage, 
  onClearQuote,
  availableBots = []
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (content.trim() && !disabled) {
      onSend(content.trim(), quotedMessage?.id);
      setContent('');
      if (onClearQuote) {
        onClearQuote();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送消息，Shift + Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Shift + Enter 允许换行（默认行为）
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    
    // 检测@触发
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // 如果@后面没有空格，显示提及列表
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        setMentionPosition(lastAtIndex);
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
  };

  const insertMention = (botName: string) => {
    // 计算要替换的文本范围：从@位置到@+搜索文本的结束位置
    // 这包括@符号和用户输入的搜索文本
    const replaceStart = mentionPosition;
    const replaceEnd = mentionPosition + 1 + mentionSearch.length; // @符号(1) + 搜索文本长度
    
    // 构建新内容：
    // - @位置之前的内容保持不变
    // - 替换@到搜索文本结束之间的内容为 @机器人名称 
    // - 搜索文本之后的内容保持不变
    const beforeMention = content.slice(0, replaceStart);
    const afterMention = content.slice(replaceEnd);
    const mentionText = `@${botName} `;
    const newContent = `${beforeMention}${mentionText}${afterMention}`;
    
    setContent(newContent);
    setShowMentions(false);
    
    // 将焦点返回到文本框，并设置光标位置到插入文本的末尾
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = replaceStart + mentionText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // 过滤匹配的机器人
  const filteredBots = availableBots.filter(bot =>
    bot.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  return (
    <div className="border-t bg-background p-4">
      {/* 引用消息显示 */}
      {quotedMessage && (
        <div className="mb-2 p-2 bg-secondary rounded-lg flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">
              回复 {quotedMessage.sender_name}
            </div>
            <div className="text-sm text-foreground truncate">
              {quotedMessage.content}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-2 flex-shrink-0"
            onClick={onClearQuote}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* @ 提及列表 */}
      {showMentions && filteredBots.length > 0 && (
        <div className="mb-2 p-2 bg-card border rounded-lg max-h-40 overflow-y-auto">
          <div className="text-xs text-muted-foreground mb-2">选择要@的机器人：</div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={() => insertMention('all')}
            >
              @all (所有机器人)
            </Button>
            {filteredBots.map((bot, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8"
                onClick={() => insertMention(bot.name)}
              >
                @{bot.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (支持 @机器人名称 或 @all，Enter 发送，Shift + Enter 换行)"
          className="min-h-[60px] max-h-[120px] resize-none"
          disabled={disabled}
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          size="icon"
          className="h-[60px] w-[60px]"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
