import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HistorySection from '@/sections/HistorySection';
import FixedPointSection from '@/sections/FixedPointSection';
import IterationSection from '@/sections/IterationSection';
import ChaosSection from '@/sections/ChaosSection';

export default function Home() {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                从 ODE 到混沌的动力学分析
              </h1>
              <p className="text-sm text-muted-foreground">
                常微分方程 · 驻点分类 · 离散映射 · 混沌吸引子
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              实时数值仿真
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="history" className="py-3">
              <span className="flex flex-col items-center gap-1">
                <span className="text-base">📚</span>
                <span className="text-xs">历史与路线</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="fixedpoint" className="py-3">
              <span className="flex flex-col items-center gap-1">
                <span className="text-base">📐</span>
                <span className="text-xs">驻点分析</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="iteration" className="py-3">
              <span className="flex flex-col items-center gap-1">
                <span className="text-base">🔄</span>
                <span className="text-xs">离散映射</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="chaos" className="py-3">
              <span className="flex flex-col items-center gap-1">
                <span className="text-base">🦋</span>
                <span className="text-xs">混沌系统</span>
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-8">
            <HistorySection />
          </TabsContent>
          <TabsContent value="fixedpoint" className="mt-8">
            <FixedPointSection />
          </TabsContent>
          <TabsContent value="iteration" className="mt-8">
            <IterationSection />
          </TabsContent>
          <TabsContent value="chaos" className="mt-8">
            <ChaosSection />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        <p>
          基于 React + TypeScript + Canvas 构建 · 数值方法：RK4 积分 · 参考文献见原文档
        </p>
      </footer>
    </div>
  );
}
