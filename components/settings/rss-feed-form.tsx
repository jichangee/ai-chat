'use client';

import { useState } from 'react';
import { RSSFeed } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RSSFeedFormProps {
  feed?: RSSFeed;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RSSFeedForm({ feed, open, onClose, onSuccess }: RSSFeedFormProps) {
  const [formData, setFormData] = useState({
    name: feed?.name || '',
    url: feed?.url || '',
    is_active: feed?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = feed ? '/api/rss' : '/api/rss';
      const method = feed ? 'PUT' : 'POST';
      const body = feed ? { ...formData, id: feed.id } : formData;

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{feed ? '编辑 RSS 订阅' : '添加 RSS 订阅'}</DialogTitle>
          <DialogDescription>
            配置 RSS 订阅源的名称和 URL
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
              placeholder="例如：Hacker News"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">RSS URL *</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              placeholder="https://example.com/feed.xml"
              required
              disabled={!!feed}
            />
            {feed && (
              <p className="text-xs text-muted-foreground">
                URL 不可修改
              </p>
            )}
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
              启用此订阅源
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
