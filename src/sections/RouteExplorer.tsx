import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import MathTex from '@/components/MathTex';

interface DerivationBlock {
  text?: string;
  tex?: string;
}

interface RouteCase {
  name: string;
  reference: string;
  blocks: DerivationBlock[];
}

interface RouteStep {
  id: string;
  title: string;
  colorClass: string;
  hover: { label: string; tex: string }[];
  cases: RouteCase[];
}

const LOGISTIC_REF = 'May R M. Nature, 1976, 261: 459–467; Feigenbaum M J. J. Stat. Phys., 1978, 19: 25–52.';
const LORENZ_REF = 'Lorenz E N. J. Atmos. Sci., 1963, 20: 130–141; Sparrow C. The Lorenz Equations. Springer, 1982.';

const steps: RouteStep[] = [
  {
    id: 'model',
    title: '建立 ODE / 映射方程',
    colorClass: 'bg-primary/10',
    hover: [
      { label: '案例 A · Logistic 映射', tex: 'x_{n+1} = \\mu\\, x_n (1 - x_n)' },
      {
        label: '案例 B · Lorenz 系统',
        tex: '\\dot{x} = \\sigma(y-x),\\ \\dot{y} = x(\\rho - z) - y,\\ \\dot{z} = xy - \\beta z',
      },
    ],
    cases: [
      {
        name: '案例 A · Logistic 映射（离散）',
        reference: LOGISTIC_REF,
        blocks: [
          {
            text: '由种群增长模型出发：设 x_n 为第 n 代种群数量占环境承载力的比例，x_n ∈ [0,1]。每代的增长率既正比于当前种群，又受剩余资源 (1 − x_n) 限制：',
          },
          { tex: 'x_{n+1} = \\mu\\, x_n\\,(1 - x_n), \\qquad x_n \\in [0,1],\\ \\mu \\in [0,4]' },
          { text: '其中 μ 为增长参数。该映射是混沌研究的经典模型（May, 1976）。' },
        ],
      },
      {
        name: '案例 B · Lorenz 系统（连续）',
        reference: LORENZ_REF,
        blocks: [
          {
            text: '1963 年 Lorenz 对 Saltzman 的二维热对流 Boussinesq 方程作三模态 Galerkin 截断：x 表对流强度，y 表水平温差，z 表垂直温差的畸变，得到三维自治 ODE：',
          },
          {
            tex: '\\begin{cases} \\dot{x} = \\sigma(y - x) \\\\[4pt] \\dot{y} = x(\\rho - z) - y \\\\[4pt] \\dot{z} = xy - \\beta z \\end{cases} \\qquad \\sigma = 10,\\ \\beta = \\tfrac{8}{3},\\ \\rho = 28',
          },
          { text: 'σ 为 Prandtl 数，ρ 为归一化 Rayleigh 数，β 为几何因子。' },
        ],
      },
    ],
  },
  {
    id: 'standard',
    title: '标准形式获取',
    colorClass: 'bg-primary/10',
    hover: [
      { label: '案例 A', tex: 'x_{n+1} = f(x_n),\\quad f(x) = \\mu x(1-x)' },
      { label: '案例 B', tex: '\\dot{\\mathbf{X}} = F(\\mathbf{X}),\\quad \\mathbf{X} = (x,y,z)^{\\mathrm{T}}' },
    ],
    cases: [
      {
        name: '案例 A · Logistic 映射（离散）',
        reference: LOGISTIC_REF,
        blocks: [
          { text: '化为一维迭代映射的标准形式，并确认其将相空间映回自身：' },
          { tex: 'f(x) = \\mu x(1-x), \\qquad f^{\\prime}(x) = \\mu(1 - 2x)' },
          { tex: '\\max_{x\\in[0,1]} f = f\\!\\left(\\tfrac{1}{2}\\right) = \\frac{\\mu}{4} \\le 1 \\;\\Longrightarrow\\; f: [0,1] \\to [0,1]' },
          { text: 'f 为单峰映射（unimodal map），这是 Feigenbaum 普适性成立的关键结构。' },
        ],
      },
      {
        name: '案例 B · Lorenz 系统（连续）',
        reference: LORENZ_REF,
        blocks: [
          { text: '写成向量场标准形式并检验耗散性：' },
          { tex: '\\dot{\\mathbf{X}} = F(\\mathbf{X}), \\qquad \\mathbf{X} = (x,\\,y,\\,z)^{\\mathrm{T}} \\in \\mathbb{R}^{3}' },
          {
            tex: '\\nabla \\cdot F = \\frac{\\partial \\dot{x}}{\\partial x} + \\frac{\\partial \\dot{y}}{\\partial y} + \\frac{\\partial \\dot{z}}{\\partial z} = -(\\sigma + 1 + \\beta) = -\\tfrac{41}{3} < 0',
          },
          {
            text: '散度恒负 ⇒ 相体积以 e^{−(σ+1+β)t} 指数收缩，系统耗散，必然存在零体积的吸引集——这是奇异吸引子存在的前提。',
          },
        ],
      },
    ],
  },
  {
    id: 'fixedpoint',
    title: '驻点分析',
    colorClass: 'bg-blue-100',
    hover: [
      { label: '案例 A（不动点）', tex: 'x^{*} = f(x^{*})' },
      { label: '案例 B（平衡点）', tex: 'F(\\mathbf{X}^{*}) = \\mathbf{0}' },
    ],
    cases: [
      {
        name: '案例 A · Logistic 映射（离散）',
        reference: LOGISTIC_REF,
        blocks: [
          { text: '驻点（不动点）满足 x* = f(x*)：' },
          { tex: 'x^{*} = \\mu x^{*}(1 - x^{*}) \\;\\Longrightarrow\\; x^{*}\\bigl[\\mu(1-x^{*}) - 1\\bigr] = 0' },
          { tex: 'x_{1}^{*} = 0, \\qquad x_{2}^{*} = 1 - \\frac{1}{\\mu} \\quad (\\mu > 1)' },
          { text: 'μ ≤ 1 时只有原点一个驻点；μ > 1 时出现第二个驻点，驻点个数随参数改变——这本身就是分岔的前兆。' },
        ],
      },
      {
        name: '案例 B · Lorenz 系统（连续）',
        reference: LORENZ_REF,
        blocks: [
          { text: '令右端为零求解平衡点：' },
          { tex: '\\sigma(y-x) = 0,\\quad x(\\rho - z) - y = 0,\\quad xy - \\beta z = 0' },
          { tex: 'O = (0,\\,0,\\,0)' },
          {
            tex: 'C^{\\pm} = \\bigl(\\pm\\sqrt{\\beta(\\rho-1)},\\ \\pm\\sqrt{\\beta(\\rho-1)},\\ \\rho-1\\bigr) \\quad (\\rho > 1)',
          },
          {
            tex: '\\rho = 28:\\quad C^{\\pm} = (\\pm 6\\sqrt{2},\\ \\pm 6\\sqrt{2},\\ 27) \\approx (\\pm 8.485,\\ \\pm 8.485,\\ 27)',
          },
          { text: '共 3 个驻点：原点 O 与一对对称点 C±（对应稳态对流的两个旋转方向）。' },
        ],
      },
    ],
  },
  {
    id: 'jacobian',
    title: 'Jacobi 矩阵分析 / Lyapunov 直接法',
    colorClass: 'bg-blue-100',
    hover: [
      { label: '案例 A（乘子）', tex: '\\lambda(x^{*}) = f^{\\prime}(x^{*}) = \\mu(1 - 2x^{*})' },
      {
        label: '案例 B（Jacobi）',
        tex: 'J = \\begin{pmatrix} -\\sigma & \\sigma & 0 \\\\ \\rho - z & -1 & -x \\\\ y & x & -\\beta \\end{pmatrix}',
      },
    ],
    cases: [
      {
        name: '案例 A · Logistic 映射（离散）',
        reference: LOGISTIC_REF,
        blocks: [
          { text: '一维映射的 Jacobi"矩阵"退化为乘子（multiplier），即导数在驻点处的值：' },
          { tex: '\\lambda(x^{*}) = f^{\\prime}(x^{*}) = \\mu\\,(1 - 2x^{*})' },
          { tex: '\\lambda(x_{1}^{*}) = \\lambda(0) = \\mu' },
          { tex: '\\lambda(x_{2}^{*}) = \\lambda\\!\\left(1 - \\tfrac{1}{\\mu}\\right) = \\mu\\left(1 - 2 + \\tfrac{2}{\\mu}\\right) = 2 - \\mu' },
          { text: '乘子决定小扰动的演化：x_n − x* ≈ λⁿ (x₀ − x*)，故 |λ| 与 1 的大小关系即稳定性。' },
        ],
      },
      {
        name: '案例 B · Lorenz 系统（连续）',
        reference: LORENZ_REF,
        blocks: [
          { text: '对向量场求 Jacobi 矩阵：' },
          {
            tex: 'J(x,y,z) = \\begin{pmatrix} \\dfrac{\\partial \\dot{x}}{\\partial x} & \\dfrac{\\partial \\dot{x}}{\\partial y} & \\dfrac{\\partial \\dot{x}}{\\partial z} \\\\[10pt] \\dfrac{\\partial \\dot{y}}{\\partial x} & \\dfrac{\\partial \\dot{y}}{\\partial y} & \\dfrac{\\partial \\dot{y}}{\\partial z} \\\\[10pt] \\dfrac{\\partial \\dot{z}}{\\partial x} & \\dfrac{\\partial \\dot{z}}{\\partial y} & \\dfrac{\\partial \\dot{z}}{\\partial z} \\end{pmatrix} = \\begin{pmatrix} -\\sigma & \\sigma & 0 \\\\ \\rho - z & -1 & -x \\\\ y & x & -\\beta \\end{pmatrix}',
          },
          { text: '在原点 O 处特征多项式可因式分解：' },
          {
            tex: '\\det(\\lambda I - J|_{O}) = (\\lambda + \\beta)\\,\\bigl[\\lambda^{2} + (\\sigma + 1)\\,\\lambda + \\sigma(1 - \\rho)\\bigr] = 0',
          },
          { text: '对于 ρ < 1 的全局稳定性，线性化不够，需用 Lyapunov 直接法。构造正定函数：' },
          { tex: 'V(\\mathbf{X}) = \\frac{x^{2}}{2\\sigma} + \\frac{y^{2}}{2} + \\frac{z^{2}}{2} > 0 \\quad (\\mathbf{X} \\ne \\mathbf{0})' },
          {
            tex: '\\dot{V} = \\frac{x}{\\sigma}\\dot{x} + y\\dot{y} + z\\dot{z} = -x^{2} - y^{2} - \\beta z^{2} + (1 + \\rho)\\,xy',
          },
          {
            tex: '(1+\\rho)\\,xy \\le \\frac{1+\\rho}{2}(x^{2}+y^{2}) \\;\\Longrightarrow\\; \\dot{V} < 0 \\quad (\\rho < 1,\\ \\mathbf{X} \\ne \\mathbf{0})',
          },
          { text: 'V 正定且 V̇ 负定 ⇒ ρ < 1 时原点全局渐近稳定（Lyapunov 第二方法，1892）。' },
        ],
      },
    ],
  },
  {
    id: 'stability',
    title: '稳定性判断',
    colorClass: 'bg-blue-100',
    hover: [
      { label: '离散判据', tex: '|\\lambda(x^{*})| < 1 \\;\\Longleftrightarrow\\; \\text{渐近稳定}' },
      { label: '连续判据', tex: '\\operatorname{Re} \\lambda_{i} < 0\\ (\\forall i) \\;\\Longleftrightarrow\\; \\text{渐近稳定}' },
    ],
    cases: [
      {
        name: '案例 A · Logistic 映射（离散）',
        reference: LOGISTIC_REF,
        blocks: [
          { text: '逐驻点代入乘子判据 |λ| < 1：' },
          { tex: 'x_{1}^{*} = 0:\\quad |\\lambda| = \\mu < 1 \\;\\Longleftrightarrow\\; 0 < \\mu < 1 \\ \\text{时渐近稳定}' },
          {
            tex: 'x_{2}^{*} = 1 - \\tfrac{1}{\\mu}:\\quad |2 - \\mu| < 1 \\;\\Longleftrightarrow\\; 1 < \\mu < 3 \\ \\text{时渐近稳定}',
          },
          { tex: '\\mu > 3:\\quad \\text{两个驻点均不稳定，轨道进入周期 2 循环}' },
        ],
      },
      {
        name: '案例 B · Lorenz 系统（连续）',
        reference: LORENZ_REF,
        blocks: [
          { text: '原点 O 的特征值（σ=10, β=8/3）：' },
          { tex: '\\lambda_{1} = -\\beta, \\qquad \\lambda_{2,3} = \\frac{-(\\sigma+1) \\pm \\sqrt{(\\sigma+1)^{2} - 4\\sigma(1-\\rho)}}{2}' },
          {
            tex: '\\rho < 1:\\ \\text{全部 } \\operatorname{Re}\\lambda < 0 \\Rightarrow O \\text{ 全局渐近稳定；}\\quad \\rho > 1:\\ O \\text{ 变为鞍点（一正两负）}',
          },
          { text: '驻点 C± 在 ρ = 28 时的数值特征值：' },
          { tex: '\\lambda_{1} \\approx -13.8546, \\qquad \\lambda_{2,3} \\approx 0.0940 \\pm 10.1945\\,\\mathrm{i}' },
          {
            text: 'λ₂,₃ 实部为正 ⇒ C± 是不稳定焦点。三个驻点全部不稳定，但耗散性保证轨道有界——轨道只能在吸引集上永不停歇地游荡，这正是混沌吸引子的几何图像。',
          },
        ],
      },
    ],
  },
  {
    id: 'bifurcation',
    title: '分岔分析',
    colorClass: 'bg-amber-100',
    hover: [
      { label: '案例 A', tex: '\\delta = \\lim_{n\\to\\infty} \\frac{\\mu_n - \\mu_{n-1}}{\\mu_{n+1} - \\mu_n} \\approx 4.6692' },
      { label: '案例 B', tex: '\\rho_{H} = \\frac{\\sigma(\\sigma + \\beta + 3)}{\\sigma - \\beta - 1} \\approx 24.74' },
    ],
    cases: [
      {
        name: '案例 A · Logistic 映射（离散）',
        reference: LOGISTIC_REF,
        blocks: [
          { text: '随 μ 增大，系统经历一串结构突变：' },
          { tex: '\\mu = 1:\\ \\text{跨临界分岔（} x^{*}=0 \\text{ 与 } x^{*}=1-\\tfrac{1}{\\mu} \\text{ 交换稳定性）}' },
          { tex: '\\mu = 3:\\ \\text{首次倍周期分岔，周期 2 轨道诞生}' },
          { tex: '\\mu_{n} \\to \\mu_{\\infty} \\approx 3.5699\\ (\\text{倍周期级联的累积点})' },
          {
            tex: '\\delta = \\lim_{n \\to \\infty} \\frac{\\mu_n - \\mu_{n-1}}{\\mu_{n+1} - \\mu_n} \\approx 4.6692, \\qquad \\alpha \\approx 2.5029',
          },
          {
            text: 'δ（分岔间隔比）与 α（分支宽度比）是 Feigenbaum 普适常数：对一切单峰映射都取相同值，与具体函数形式无关（Feigenbaum, 1978）。',
          },
        ],
      },
      {
        name: '案例 B · Lorenz 系统（连续）',
        reference: LORENZ_REF,
        blocks: [
          { text: 'Lorenz 系统随 ρ 变化的主要分岔序列：' },
          { tex: '\\rho = 1:\\ \\text{叉式分岔（Pitchfork）——} O \\text{ 失稳，} C^{\\pm} \\text{ 诞生}' },
          { tex: '\\rho \\approx 13.926:\\ \\text{同宿分岔——不稳定周期轨道大量涌现（混沌前兆）}' },
          {
            tex: '\\rho_{H} = \\frac{\\sigma(\\sigma + \\beta + 3)}{\\sigma - \\beta - 1} = \\frac{10 \\times (10 + \\tfrac{8}{3} + 3)}{10 - \\tfrac{8}{3} - 1} \\approx 24.74',
          },
          { tex: '\\rho = \\rho_{H}:\\ C^{\\pm} \\text{ 经亚临界 Hopf 分岔失稳}' },
          {
            text: '在 24.06 < ρ < 24.74 区间，奇异吸引子与稳定的 C± 共存（亚临界 Hopf 的典型滞后现象）；ρ = 28 时只剩下混沌吸引子。',
          },
        ],
      },
    ],
  },
  {
    id: 'chaos',
    title: '混沌判据检测',
    colorClass: 'bg-red-100',
    hover: [
      { label: '案例 A', tex: '\\lambda_{L} = \\lim_{n\\to\\infty} \\frac{1}{n} \\sum_{i=0}^{n-1} \\ln\\left| f^{\\prime}(x_i) \\right| > 0' },
      { label: '案例 B', tex: '\\lambda_{1} \\approx 0.9056 > 0, \\qquad D_{KY} \\approx 2.06' },
    ],
    cases: [
      {
        name: '案例 A · Logistic 映射（离散）',
        reference: 'Li T Y, Yorke J A. Am. Math. Monthly, 1975, 82: 985–992; May R M. Nature, 1976.',
        blocks: [
          { text: '判据一：Lyapunov 指数——相邻轨道分离率的长期平均：' },
          {
            tex: '\\lambda_{L} = \\lim_{n \\to \\infty} \\frac{1}{n} \\sum_{i=0}^{n-1} \\ln \\left| f^{\\prime}(x_i) \\right| \\ > 0 \\ \\Longrightarrow\\ \\text{混沌}',
          },
          { tex: '\\mu = 4:\\ \\lambda_{L} = \\ln 2 \\approx 0.693 > 0 \\ (\\text{可解析求出})' },
          { text: '判据二：Li–Yorke 定理——周期 3 蕴含混沌：' },
          { tex: '\\mu \\approx 3.828:\\ \\text{存在周期 3 窗口} \\ \\Longrightarrow\\ \\text{必存在任意周期的轨道与混沌集}' },
          {
            text: '两个判据相互印证：μ > μ∞ 后 Lyapunov 谱随参数起伏，周期窗口（如周期 3）嵌在混沌带中，呈现"混沌中有秩序"的精细结构。',
          },
        ],
      },
      {
        name: '案例 B · Lorenz 系统（连续）',
        reference: LORENZ_REF,
        blocks: [
          { text: '判据一：Lyapunov 指数谱（数值方法，如 QR 算法沿切空间积分）：' },
          {
            tex: '\\rho = 28:\\quad (\\lambda_1,\\ \\lambda_2,\\ \\lambda_3) \\approx (0.9056,\\ 0,\\ -14.57)',
          },
          { tex: '\\lambda_{1} > 0 \\ \\Longrightarrow\\ \\text{对初值的敏感依赖（蝴蝶效应）}' },
          { text: '判据二：Kaplan–Yorke 维数——吸引子的分形特征：' },
          {
            tex: 'D_{KY} = 2 + \\frac{\\lambda_1 + \\lambda_2}{|\\lambda_3|} \\approx 2 + \\frac{0.9056}{14.57} \\approx 2.06',
          },
          {
            text: '维数非整数 ⇒ 吸引子为分形集合（奇异吸引子）；λ₂ = 0 对应沿流方向的中性方向，是连续自治系统的特征。正 Lyapunov 指数 + 分数维 + 有界耗散，三者共同确认混沌。',
          },
        ],
      },
    ],
  },
];

export default function RouteExplorer() {
  const [selected, setSelected] = useState<string>('model');
  const current = steps.find((s) => s.id === selected) || steps[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: step flow */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>ODE → 混沌 的完整分析路线</CardTitle>
          <p className="text-xs text-muted-foreground">
            悬停查看该步骤的案例方程 · 点击查看完整推导过程
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-1 text-sm">
            <div className="bg-primary/10 px-4 py-2 rounded-lg font-medium text-muted-foreground">
              物理系统建模
            </div>
            <span className="text-muted-foreground">↓</span>
            {steps.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center space-y-1 w-full">
                <HoverCard openDelay={100} closeDelay={150}>
                  <HoverCardTrigger asChild>
                    <button
                      onClick={() => setSelected(step.id)}
                      className={`${step.colorClass} px-4 py-2 rounded-lg font-medium transition-all w-full max-w-xs text-center hover:ring-2 hover:ring-primary/50 ${
                        selected === step.id ? 'ring-2 ring-primary shadow-md' : ''
                      }`}
                    >
                      <span className="mr-1 text-muted-foreground">{idx + 1}.</span>
                      {step.title}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" className="w-96 space-y-3">
                    {step.hover.map((h, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold text-primary mb-1">{h.label}</p>
                        <MathTex tex={h.tex} display className="text-sm" />
                      </div>
                    ))}
                  </HoverCardContent>
                </HoverCard>
                {idx < steps.length - 1 && <span className="text-muted-foreground">↓</span>}
              </div>
            ))}
            <span className="text-muted-foreground">↓</span>
            <div className="bg-red-100 px-4 py-2 rounded-lg font-medium text-muted-foreground">
              混沌控制与工程应用
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right: derivation detail */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline">步骤 {steps.findIndex((s) => s.id === current.id) + 1}</Badge>
            {current.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground">典型案例推导（文献标准过程）</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="0" key={current.id} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {current.cases.map((c, i) => (
                <TabsTrigger key={i} value={String(i)} className="text-xs">
                  {c.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {current.cases.map((c, i) => (
              <TabsContent key={i} value={String(i)} className="mt-4 space-y-2">
                {c.blocks.map((b, j) =>
                  b.tex ? (
                    <MathTex key={j} tex={b.tex} display className="text-[0.95rem]" />
                  ) : (
                    <p key={j} className="text-sm leading-relaxed text-foreground/90">
                      {b.text}
                    </p>
                  )
                )}
                <p className="text-xs text-muted-foreground pt-3 border-t">
                  参考文献：{c.reference}
                </p>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
