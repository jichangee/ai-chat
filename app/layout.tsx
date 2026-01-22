import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/auth/auth-guard";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 群聊助手",
  description: "个人 AI 群聊助手，支持多个 AI 机器人、RSS 订阅和 Bark 推送通知",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthGuard>
          {children}
        </AuthGuard>
        <Toaster />
      </body>
    </html>
  );
}
