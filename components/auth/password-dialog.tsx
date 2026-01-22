'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

interface PasswordDialogProps {
  open: boolean;
  onVerified: () => void;
}

export function PasswordDialog({ open, onVerified }: PasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error('请输入密码');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || '密码错误');
        setPassword('');
        return;
      }

      toast.success('验证成功');
      onVerified();
    } catch (error) {
      console.error('验证失败:', error);
      toast.error('验证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} modal={true}>
      <DialogContent 
        className="sm:max-w-[425px] [&>button]:hidden" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <DialogTitle>需要验证</DialogTitle>
          </div>
          <DialogDescription>
            请输入访问密码以继续使用
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              disabled={loading}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? '验证中...' : '确认'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
