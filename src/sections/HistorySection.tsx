import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import RouteExplorer from '@/sections/RouteExplorer';

interface TimelineItem {
  year: string;
  event: string;
  desc: string;
  references: string[];
  summary: string;
}

const timeline: TimelineItem[] = [
  {
    year: '1687',
    event: '牛顿《自然哲学的数学原理》',
    desc: '微积分与运动定律的奠基，ODE 研究的开端',
    references: ['Newton I. Philosophiæ Naturalis Principia Mathematica. London, 1687.'],
    summary: '牛顿在《自然哲学的数学原理》中系统阐述了三大运动定律和万有引力定律，并发明了流数术（即微积分），为描述物体运动提供了精确的数学语言。微分方程作为连接物理定律与数学分析的核心工具由此诞生。牛顿的研究不仅奠定了经典力学的基础，也开创了用微分方程描述自然现象的传统。此后欧拉、伯努利等数学家继承并发展了这一方法，建立了一阶常微分方程的初等解法体系。',
  },
  {
    year: '1730s',
    event: '欧拉系统研究 ODE',
    desc: '积分因子法、降阶法、级数解法等经典方法',
    references: ['Euler L. Institutiones calculi integralis. St. Petersburg, 1768.'],
    summary: '欧拉是历史上最多产的数学家之一，他在常微分方程领域做出了奠基性贡献。他系统研究了可分离变量方程、齐次方程、线性方程等多种类型的解法，发明了积分因子法、常数变易法等经典技巧。欧拉还引入了指数函数 e^x 来表示微分方程的解，并发展了幂级数解法。他的工作使 ODE 从零散的解题技巧发展成为系统的数学分支，为后续分析力学和动力系统理论奠定了工具基础。',
  },
  {
    year: '1830s',
    event: '刘维尔与斯图姆',
    desc: '边值问题、特征值理论的建立',
    references: ['Sturm JCF, Liouville J. J. Math. Pures Appl., 1836–1837.'],
    summary: '斯图姆和刘维尔合作开创了边值问题和特征值理论的研究。他们证明了二阶线性微分方程在边界条件下的特征值存在定理，即斯图姆-刘维尔理论。这一理论在数学物理中具有核心地位，是量子力学中薛定谔方程、振动理论中模态分析的理论基础。特征值与特征函数的概念由此进入数学主流，深刻影响了泛函分析和谱理论的发展，也为后来动力系统中的稳定性分析提供了关键工具。',
  },
  {
    year: '1881–1886',
    event: '庞加莱《微分方程定义的积分曲线》',
    desc: '定性理论奠基：奇点分类、极限环、全局结构',
    references: ['Poincaré H. Mémoire sur les courbes définies par une équation différentielle. J. Math. Pures Appl., 1881–1886.'],
    summary: '庞加莱被誉为动力系统的创始人，他开创了微分方程定性理论这一全新方向。与前辈追求显式解不同，庞加莱关注解曲线的整体拓扑行为：奇点的分类与稳定性、极限环的存在性与个数、无穷远处的轨线结构等。他证明了著名的庞加莱-本迪克松定理，建立了平面系统的完整理论体系。庞加莱还最早研究了同宿轨线和异宿轨线，这些后来成为混沌理论的核心概念。他的几何直觉和拓扑方法彻底改变了微分方程的研究范式。',
  },
  {
    year: '1892',
    event: '李雅普诺夫《运动稳定性一般问题》',
    desc: 'Lyapunov 稳定性理论、直接法/间接法',
    references: ['Lyapunov AM. The General Problem of the Stability of Motion. Kharkov, 1892.'],
    summary: '李雅普诺夫在他的博士论文中建立了运动稳定性的一般理论，提出了两种判定稳定性的方法：第一方法（间接法，基于线性化系统的特征值）和第二方法（直接法，基于 Lyapunov 函数的构造）。直接法不需要求解方程，通过构造一个能量-like 的标量函数 V(x) 并判断其沿轨线的导数符号即可判定稳定性。这一方法成为非线性系统稳定性分析的最强大工具，在控制论、天体力学、生态学等领域得到广泛应用。',
  },
  {
    year: '1900s',
    event: '伯克霍夫与动力系统',
    desc: '动力系统概念化、遍历理论',
    references: ['Birkhoff GD. Dynamical Systems. AMS Colloquium Publications, 1927.'],
    summary: '伯克霍夫将庞加莱的定性理论进一步形式化，正式提出"动力系统"这一学科名称。他证明了伯克霍夫遍历定理，开创了遍历理论这一重要分支。伯克霍夫还系统研究了动力系统的周期轨道、回归性、极小集等概念，建立了拓扑动力系统和测度动力系统的基本框架。他的工作连接了微分方程、拓扑学和测度论，为20世纪中叶 Smale 等人的结构稳定性理论铺平了道路。',
  },
  {
    year: '1950s',
    event: 'Smale 微分动力系统',
    desc: '结构稳定性、马蹄映射、拓扑动力系统',
    references: ['Smale S. Differentiable dynamical systems. Bull. AMS, 1967, 73: 747–817.'],
    summary: 'Smale 在20世纪60年代建立了微分动力系统的现代理论。他提出了结构稳定性的概念——系统在微小扰动下保持拓扑性质不变，并证明了通有（generic）系统的结构稳定性定理。Smale 构造了著名的"马蹄映射"，证明了存在具有可数无穷多周期轨道和不可数无穷多非周期轨道的混沌不变集，这是混沌现象的严格数学证明的开端。Smale 的工作将动力系统从低维分析提升到高维拓扑的高度。',
  },
  {
    year: '1963',
    event: 'Lorenz 方程',
    desc: 'Edward Lorenz 发现确定性混沌，蝴蝶效应',
    references: ['Lorenz EN. Deterministic nonperiodic flow. J. Atmos. Sci., 1963, 20: 130–141.'],
    summary: '气象学家 Edward Lorenz 在数值求解大气对流简化模型时，意外发现确定性系统可以产生看似随机的不规则行为。他的三变量方程组（Lorenz 方程）对初值具有极端敏感性——"蝴蝶效应"一词由此而来。Lorenz 吸引子呈现出奇特的双叶蝴蝶形状，成为"奇怪吸引子"的典范。这一发现打破了拉普拉斯决定论的长期统治，证明了确定性并不等同于可预测性，开启了混沌科学的全新时代。',
  },
  {
    year: '1964',
    event: 'Sarkovskii 定理',
    desc: '周期轨道的蕴含关系，揭示一维映射的复杂结构',
    references: ['Sarkovskii AN. Coexistence of cycles of a continuous map of the line into itself. Ukr. Math. J., 1964, 16: 61–71.'],
    summary: 'Sarkovskii 发现了一个惊人的定理：对于一维连续映射，周期轨道的存在具有严格的蕴含关系——如果存在周期3轨道，则必然存在所有其他周期的轨道。这一蕴含序列为：3 ⊳ 5 ⊳ 7 ⊳ ... ⊳ 2·3 ⊳ 2·5 ⊳ ... ⊳ 2²·3 ⊳ ... ⊳ 2ⁿ ⊳ ... ⊳ 1。该定理深刻揭示了一维映射动力学中周期轨道的层级结构，是理解倍周期分岔通向混沌机制的关键理论基础，也是 Li-Yorke 定理的直接前身。',
  },
  {
    year: '1975',
    event: 'Li–Yorke 定理',
    desc: '"周期3意味着混沌"，一维连续映射的混沌判据',
    references: ['Li TY, Yorke JA. Period three implies chaos. Am. Math. Monthly, 1975, 82(10): 985–992.'],
    summary: 'Li 和 Yorke 发表了著名论文"Period three implies chaos"，首次在数学文献中使用"混沌"一词。他们证明：若一维连续映射存在周期3轨道，则必存在一个不可数的混沌不变集——其中包含不可数无穷多非周期轨道，且任意轨道的任意邻域中都存在被映射分开的点（对初值敏感依赖）。这一简洁而深刻的定理为混沌现象提供了易于验证的充分条件，在教育普及和工程应用中影响深远。',
  },
  {
    year: '1978',
    event: 'Feigenbaum 普适常数',
    desc: '倍周期分岔通向混沌的普适规律',
    references: ['Feigenbaum MJ. Quantitative universality for a class of nonlinear transformations. J. Stat. Phys., 1978, 19: 25–52.'],
    summary: 'Feigenbaum 在研究 Logistic 映射的倍周期分岔序列时，发现了一个惊人的普适常数 δ ≈ 4.6692... ——分岔参数间隔的收敛比。更不可思议的是，这个常数不仅适用于 Logistic 映射，对所有具有单峰极值点的一维映射都成立。这一发现揭示了混沌现象背后深层的普适规律，类似于物理学中的普适常数（如精细结构常数）。Feigenbaum 的常数可通过实验测量验证，在流体力学、电子学、生物学等多个领域得到了实证支持。',
  },
  {
    year: '1980s',
    event: '混沌控制与同步',
    desc: 'OGY 方法、Pecora-Carroll 同步、保密通信应用',
    references: ['Ott E, Grebogi C, Yorke JA. Controlling chaos. Phys. Rev. Lett., 1990, 64: 1196.',
      'Pecora LM, Carroll TL. Synchronization in chaotic systems. Phys. Rev. Lett., 1990, 64: 821.'],
    summary: '混沌控制理论在20世纪80年代末至90年代初迅速发展。OGY 方法（Ott-Grebogi-Yorke）利用混沌系统的丰富动力学结构，通过微小的参数扰动即可将混沌轨道稳定到嵌入在混沌吸引子中的不稳定周期轨道上。与此同时，Pecora 和 Carroll 发现了混沌同步现象——两个相同的混沌系统在耦合条件下可以实现完全同步。这两项突破催生了混沌保密通信、混沌神经网络、混沌密码学等新兴应用领域，将混沌从理论研究推向了工程实践。',
  },
];

const comparisonData = [
  {
    aspect: '叠加原理',
    linear: '✅ 成立：若 x₁, x₂ 是解，则 c₁x₁ + c₂x₂ 也是解',
    nonlinear: '❌ 不成立：解的线性组合一般不是解',
  },
  {
    aspect: '解的存在唯一性',
    linear: '✅ 全局存在且唯一（系数连续时）',
    nonlinear: '⚠️ 局部存在唯一；可能有限时间爆破或多解',
  },
  {
    aspect: '平衡点个数',
    linear: '唯一（齐次时仅原点）或无穷多',
    nonlinear: '可有多个孤立平衡点，形成复杂结构',
  },
  {
    aspect: '稳定性',
    linear: '由特征值完全决定',
    nonlinear: '局部可用线性化（Hartman-Grobman），全局需 Lyapunov 或其他方法',
  },
  {
    aspect: '周期行为',
    linear: '仅共振时可能有周期解',
    nonlinear: '可产生自激振荡（极限环）、准周期、混沌',
  },
  {
    aspect: '可积性',
    linear: '一般可解析求解',
    nonlinear: '绝大多数不可积，需数值方法',
  },
  {
    aspect: '结构稳定性',
    linear: '完全由特征值实部决定',
    nonlinear: '可能出现分岔：参数微小变化导致拓扑结构突变',
  },
];

export default function HistorySection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogItem, setDialogItem] = useState<TimelineItem | null>(null);

  const handleClick = (item: TimelineItem) => {
    setDialogItem(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">从 ODE 到混沌：研究历史与路线</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          从牛顿力学建立微积分开始，到庞加莱的定性理论，再到 Lorenz 发现确定性混沌，
          动力系统研究走过了一条从求解到定性、从线性到非线性、从有序到混沌的道路。
        </p>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="history">研究历史时间线</TabsTrigger>
          <TabsTrigger value="comparison">线性 vs 非线性</TabsTrigger>
          <TabsTrigger value="route">分析路线总览</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-6">
          <div className="relative border-l-2 border-primary/30 ml-4 space-y-4">
            {timeline.map((item, idx) => (
              <div
                key={idx}
                className="relative pl-6 cursor-pointer transition-all"
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={() => handleClick(item)}
              >
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                <Card className={activeIndex === idx ? 'ring-2 ring-primary/50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{item.year}</Badge>
                      <span className="font-semibold">{item.event}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                    {activeIndex === idx && (
                      <div className="mt-2 pt-2 border-t border-dashed">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-primary">参考文献：</span>
                          {item.references.join('; ')}
                        </p>
                        <p className="text-xs text-blue-500 mt-1">点击查看详细摘要 →</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>线性 ODE 与非线性 ODE 的核心差异</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">特征维度</th>
                      <th className="text-left py-2 px-3 text-blue-600">线性系统</th>
                      <th className="text-left py-2 px-3 text-amber-600">非线性系统</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-3 font-medium">{row.aspect}</td>
                        <td className="py-3 px-3">{row.linear}</td>
                        <td className="py-3 px-3">{row.nonlinear}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">线性系统特征</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• 特征值完全决定局部拓扑结构</p>
                <p>• 叠加原理：通解 = 特解 + 齐次通解</p>
                <p>{'• 可用矩阵指数 e^{At} 统一表示解'}</p>
                <p>• 稳定性判据：Re(λ) &lt; 0 ⇔ 渐近稳定</p>
                <p>• 无自激振荡，无混沌</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-600">非线性系统特征</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• 多平衡点、极限环、同宿/异宿轨线</p>
                <p>• 参数变化可导致分岔（Bifurcation）</p>
                <p>• 对初值敏感依赖 → 混沌</p>
                <p>• 奇异吸引子（Strange Attractor）</p>
                <p>• 拓扑混合、稠密周期轨道</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="route" className="mt-6">
          <RouteExplorer />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline">{dialogItem?.year}</Badge>
              {dialogItem?.event}
            </DialogTitle>
            <DialogDescription>
              <p className="text-sm text-muted-foreground mt-2">{dialogItem?.desc}</p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-1">详细摘要</h4>
              <p className="text-sm leading-relaxed">{dialogItem?.summary}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">参考文献</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {dialogItem?.references.map((ref, i) => (
                  <li key={i}>• {ref}</li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
