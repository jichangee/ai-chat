'use client';

import { useState } from 'react';
import { AIBot } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    name: bot?.name || '',
    avatar: bot?.avatar || '',
    system_prompt: bot?.system_prompt || '',
    trigger_keywords: bot?.trigger_keywords?.join(', ') || '',
    model: bot?.model || 'gpt-3.5-turbo',
    temperature: bot?.temperature?.toString() || '0.7',
    is_active: bot?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

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
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败');
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
            <Label htmlFor="trigger_keywords">触发关键词（逗号分隔）*</Label>
            <Input
              id="trigger_keywords"
              value={formData.trigger_keywords}
              onChange={(e) =>
                setFormData({ ...formData, trigger_keywords: e.target.value })
              }
              placeholder="例如：技术,编程,代码"
              required
            />
            <p className="text-xs text-muted-foreground">
              当消息包含这些关键词时，机器人会自动回复
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">模型</Label>
              <Select
                value={formData.model}
                onValueChange={(value) =>
                  setFormData({ ...formData, model: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
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
