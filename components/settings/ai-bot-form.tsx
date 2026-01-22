'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AIBot } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AIBotFormProps {
  bot?: AIBot;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AIBotForm({ bot, open, onClose, onSuccess }: AIBotFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    system_prompt: '',
    trigger_keywords: '',
    model: 'gpt-3.5-turbo',
    temperature: '0.7',
    api_key: '',
    base_url: 'https://api.openai.com/v1',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 当弹窗打开或 bot 数据变化时，更新表单数据
  useEffect(() => {
    if (open) {
      if (bot) {
        // 编辑模式：使用 bot 的数据
        setFormData({
          name: bot.name || '',
          avatar: bot.avatar || '',
          system_prompt: bot.system_prompt || '',
          trigger_keywords: bot.trigger_keywords?.join(', ') || '',
          model: bot.model || 'gpt-3.5-turbo',
          temperature: bot.temperature?.toString() || '0.7',
          api_key: bot.api_key || '',
          base_url: bot.base_url || 'https://api.openai.com/v1',
          is_active: bot.is_active ?? true,
        });
      } else {
        // 添加模式：重置为默认值
        setFormData({
          name: '',
          avatar: '',
          system_prompt: '',
          trigger_keywords: '',
          model: 'gpt-3.5-turbo',
          temperature: '0.7',
          api_key: '',
          base_url: 'https://api.openai.com/v1',
          is_active: true,
        });
      }
      // 清除测试结果
      setTestResult(null);
    }
  }, [bot, open]);

  const handleTest = async () => {
    if (!formData.api_key || !formData.base_url) {
      setTestResult({
        success: false,
        message: '请先填写 API Key 和 Base URL',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/ai-bots/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: formData.api_key,
          base_url: formData.base_url,
          model: formData.model,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: result.message || '验证成功',
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || '验证失败',
        });
      }
    } catch (error) {
      console.error('测试失败:', error);
      setTestResult({
        success: false,
        message: '测试失败，请检查网络连接',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        trigger_keywords: formData.trigger_keywords
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k),
        temperature: parseFloat(formData.temperature),
      };

      const url = bot ? '/api/ai-bots' : '/api/ai-bots';
      const method = bot ? 'PUT' : 'POST';
      const body = bot ? { ...data, id: bot.id } : data;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(bot ? '更新成功' : '添加成功');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bot ? '编辑 AI 机器人' : '添加 AI 机器人'}</DialogTitle>
          <DialogDescription>
            配置 AI 机器人的名称、提示词和触发关键词
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例如：技术助手"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">头像 URL（可选）</Label>
            <Input
              id="avatar"
              value={formData.avatar}
              onChange={(e) =>
                setFormData({ ...formData, avatar: e.target.value })
              }
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_prompt">系统提示词 *</Label>
            <Textarea
              id="system_prompt"
              value={formData.system_prompt}
              onChange={(e) =>
                setFormData({ ...formData, system_prompt: e.target.value })
              }
              placeholder="例如：你是一个专业的技术助手，擅长解答编程问题..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trigger_keywords">触发关键词（逗号分隔，可选）</Label>
            <Input
              id="trigger_keywords"
              value={formData.trigger_keywords}
              onChange={(e) =>
                setFormData({ ...formData, trigger_keywords: e.target.value })
              }
              placeholder="例如：技术,编程,代码"
            />
            <p className="text-xs text-muted-foreground">
              当消息包含这些关键词时，机器人会自动回复。留空则只能通过@机器人名称触发
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">API Key *</Label>
            <Input
              id="api_key"
              type="password"
              value={formData.api_key}
              onChange={(e) => {
                setFormData({ ...formData, api_key: e.target.value });
                setTestResult(null); // 清除测试结果
              }}
              placeholder="sk-..."
              required
            />
            <p className="text-xs text-muted-foreground">
              每个机器人使用独立的 API Key
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_url">Base URL（可选）</Label>
            <div className="flex gap-2">
              <Input
                id="base_url"
                value={formData.base_url}
                onChange={(e) => {
                  setFormData({ ...formData, base_url: e.target.value });
                  setTestResult(null); // 清除测试结果
                }}
                placeholder="https://api.openai.com/v1"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || !formData.api_key || !formData.base_url}
              >
                {testing ? '测试中...' : '测试'}
              </Button>
            </div>
            {testResult && (
              <p
                className={`text-xs ${
                  testResult.success
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {testResult.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              如需使用代理或第三方服务，请修改此 URL
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">模型 *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                placeholder="例如：gpt-3.5-turbo"
                required
              />
              <p className="text-xs text-muted-foreground">
                请手动输入模型名称
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">温度（0-2）</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({ ...formData, temperature: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="rounded"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              启用此机器人
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
