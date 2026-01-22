'use client';

import { useState, useEffect } from 'react';
import { PasswordDialog } from './password-dialog';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
      } catch (error) {
        console.error('检查认证状态失败:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  const handleVerified = () => {
    setIsAuthenticated(true);
  };

  // 正在检查时显示加载状态
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">正在验证...</div>
      </div>
    );
  }

  // 如果未认证，显示密码对话框
  if (!isAuthenticated) {
    return <PasswordDialog open={true} onVerified={handleVerified} />;
  }

  // 已认证，显示子组件
  return <>{children}</>;
}
