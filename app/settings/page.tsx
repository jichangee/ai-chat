'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AIBot, RSSFeed } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { AIBotForm } from '@/components/settings/ai-bot-form';
import { RSSFeedForm } from '@/components/settings/rss-feed-form';
import { NotificationForm } from '@/components/settings/notification-form';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ai');
  
  // AI 机器人状态
  const [bots, setBots] = useState<AIBot[]>([]);
  const [selectedBot, setSelectedBot] = useState<AIBot | undefined>();
  const [showBotForm, setShowBotForm] = useState(false);
  
  // RSS 订阅状态
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<RSSFeed | undefined>();
  const [showFeedForm, setShowFeedForm] = useState(false);
  const [fetchingRSS, setFetchingRSS] = useState(false);

  // 加载 AI 机器人
  const loadBots = async () => {
    try {
      const response = await fetch('/api/ai-bots');
      if (response.ok) {
        const data = await response.json();
        setBots(data.bots);
      }
    } catch (error) {
      console.error('加载 AI 机器人失败:', error);
    }
  };

  // 加载 RSS 订阅
  const loadFeeds = async () => {
    try {
      const response = await fetch('/api/rss');
      if (response.ok) {
        const data = await response.json();
        setFeeds(data.feeds);
      }
    } catch (error) {
      console.error('加载 RSS 订阅失败:', error);
    }
  };

  // 删除 AI 机器人
  const deleteBot = async (id: string) => {
    if (!confirm('确定要删除这个 AI 机器人吗？')) return;

    try {
      const response = await fetch(`/api/ai-bots?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadBots();
      } else {
        const error = await response.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 删除 RSS 订阅
  const deleteFeed = async (id: string) => {
    if (!confirm('确定要删除这个 RSS 订阅吗？')) return;

    try {
      const response = await fetch(`/api/rss?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadFeeds();
      } else {
        const error = await response.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 手动获取 RSS
  const fetchRSS = async () => {
    setFetchingRSS(true);
    try {
      const response = await fetch('/api/rss/fetch', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        loadFeeds();
      } else {
        const error = await response.json();
        alert(error.error || '获取失败');
      }
    } catch (error) {
      console.error('获取失败:', error);
      alert('获取失败');
    } finally {
      setFetchingRSS(false);
    }
  };

  useEffect(() => {
    loadBots();
    loadFeeds();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">设置</h1>
      </header>

      <div className="container max-w-4xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai">AI 机器人</TabsTrigger>
            <TabsTrigger value="rss">RSS 订阅</TabsTrigger>
            <TabsTrigger value="notification">通知设置</TabsTrigger>
          </TabsList>

          {/* AI 机器人标签页 */}
          <TabsContent value="ai" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                管理您的 AI 机器人
              </p>
              <Button
                onClick={() => {
                  setSelectedBot(undefined);
                  setShowBotForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                添加机器人
              </Button>
            </div>

            <div className="space-y-4">
              {bots.map((bot) => (
                <Card key={bot.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {bot.name}
                          {bot.is_active ? (
                            <Badge variant="default">启用</Badge>
                          ) : (
                            <Badge variant="secondary">禁用</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {bot.system_prompt.substring(0, 100)}
                          {bot.system_prompt.length > 100 && '...'}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedBot(bot);
                            setShowBotForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteBot(bot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">触发关键词：</span>
                        {bot.trigger_keywords?.map((keyword) => (
                          <Badge key={keyword} variant="outline" className="ml-2">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      <div>
                        <span className="text-muted-foreground">模型：</span>
                        <span className="ml-2">{bot.model}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {bots.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    暂无 AI 机器人，点击上方按钮添加
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* RSS 订阅标签页 */}
          <TabsContent value="rss" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                管理您的 RSS 订阅源
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchRSS}
                  disabled={fetchingRSS}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${fetchingRSS ? 'animate-spin' : ''}`} />
                  手动获取
                </Button>
                <Button
                  onClick={() => {
                    setSelectedFeed(undefined);
                    setShowFeedForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加订阅
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {feeds.map((feed) => (
                <Card key={feed.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {feed.name}
                          {feed.is_active ? (
                            <Badge variant="default">启用</Badge>
                          ) : (
                            <Badge variant="secondary">禁用</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-2 break-all">
                          {feed.url}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedFeed(feed);
                            setShowFeedForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteFeed(feed.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {feed.last_fetched_at && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        最后获取：{new Date(feed.last_fetched_at).toLocaleString('zh-CN')}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}

              {feeds.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    暂无 RSS 订阅，点击上方按钮添加
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 通知设置标签页 */}
          <TabsContent value="notification">
            <NotificationForm />
          </TabsContent>
        </Tabs>
      </div>

      {/* AI 机器人表单对话框 */}
      <AIBotForm
        bot={selectedBot}
        open={showBotForm}
        onClose={() => {
          setShowBotForm(false);
          setSelectedBot(undefined);
        }}
        onSuccess={loadBots}
      />

      {/* RSS 订阅表单对话框 */}
      <RSSFeedForm
        feed={selectedFeed}
        open={showFeedForm}
        onClose={() => {
          setShowFeedForm(false);
          setSelectedFeed(undefined);
        }}
        onSuccess={loadFeeds}
      />
    </div>
  );
}
