'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { NotificationRule } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, X, Plus } from 'lucide-react';

interface NotificationFormProps {
  onSuccess?: () => void;
}

export function NotificationForm({ onSuccess }: NotificationFormProps) {
  const [rule, setRule] = useState<NotificationRule | null>(null);
  const [barkUrl, setBarkUrl] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // 加载通知规则
  useEffect(() => {
    loadRule();
  }, []);

  const loadRule = async () => {
    try {
      const response = await fetch('/api/notification');
      if (response.ok) {
        const data = await response.json();
        setRule(data.rule);
        setBarkUrl(data.rule.bark_url || '');
        setKeywords(data.rule.keywords || []);
        setIsActive(data.rule.is_active || false);
      }
    } catch (error) {
      console.error('加载通知规则失败:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notification', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bark_url: barkUrl,
          keywords,
          is_active: isActive,
        }),
      });

      if (response.ok) {
        toast.success('保存成功');
        loadRule();
        onSuccess?.();
      } else {
        const error = await response.json();
        toast.error(error.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!barkUrl) {
      toast.error('请先输入 Bark URL');
      return;
    }

    setTesting(true);
    try {
      const response = await fetch('/api/notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bark_url: barkUrl }),
      });

      if (response.ok) {
        toast.success('测试通知已发送，请检查您的设备');
      } else {
        const error = await response.json();
        toast.error(error.error || '发送失败');
      }
    } catch (error) {
      console.error('发送失败:', error);
      toast.error('发送失败');
    } finally {
      setTesting(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>通知设置</CardTitle>
        <CardDescription>
          配置 Bark 推送和关键词触发规则
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="bark_url">Bark 推送 URL</Label>
          <div className="flex gap-2">
            <Input
              id="bark_url"
              value={barkUrl}
              onChange={(e) => setBarkUrl(e.target.value)}
              placeholder="https://api.day.app/your_key"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || !barkUrl}
            >
              {testing ? '发送中...' : '测试'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            在 Bark 应用中获取您的推送 URL
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">通知关键词</Label>
          <div className="flex gap-2">
            <Input
              id="keywords"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="输入关键词后按回车添加"
            />
            <Button type="button" size="icon" onClick={addKeyword}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            当消息包含这些关键词时会触发 Bark 推送通知
          </p>
          
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="pl-3 pr-1">
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="ml-2 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="is_active" className="cursor-pointer">
            启用通知
          </Label>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
