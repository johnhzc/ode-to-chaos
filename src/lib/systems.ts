import type { ODESystem2D, ODESystem3D } from './math';
import { classifyFixedPoint } from './math';

// Format number for LaTeX output
function fmt(n: number): string {
  const r = Math.round(n * 1000) / 1000;
  return Number.isInteger(r) ? String(r) : String(r);
}

export interface NonlinearFixedPoint {
  x: number;
  y: number;
  coordTex: string;
  jacTex: string;
  jacobian: [[number, number], [number, number]];
  eigenTex: string;
  type: string;
  stability: string;
}

export interface NonlinearPreset {
  name: string;
  system: ODESystem2D;
  equationTex: string;
  jacGeneralTex: string;
  fixedPoints: NonlinearFixedPoint[];
}

// Build a fixed point record: classify it from its Jacobian and format eigenvalues in LaTeX
function makeFP(
  x: number,
  y: number,
  coordTex: string,
  jacobian: [[number, number], [number, number]],
  jacTex: string
): NonlinearFixedPoint {
  const [[a, b], [c, d]] = jacobian;
  const cls = classifyFixedPoint(a, b, c, d);
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  let eigenTex: string;
  if (disc >= 0) {
    const s = Math.sqrt(disc);
    eigenTex = `\\lambda_{1,2} = ${fmt((tr + s) / 2)},\\ ${fmt((tr - s) / 2)}`;
  } else {
    const re = tr / 2;
    const im = Math.sqrt(-disc) / 2;
    eigenTex = `\\lambda_{1,2} = ${fmt(re)} \\pm ${fmt(im)}\\,\\mathrm{i}`;
  }
  return { x, y, coordTex, jacTex, jacobian, eigenTex, type: cls.type, stability: cls.stability };
}

// ============ Linear 2D Systems (for fixed point demo) ============

export const saddleSystem = (): ODESystem2D => ({
  f: (x, _y) => x,
  g: (_x, y) => -y,
});

export const stableNodeSystem = (): ODESystem2D => ({
  f: (x, _y) => -2 * x,
  g: (_x, y) => -3 * y,
});

export const unstableNodeSystem = (): ODESystem2D => ({
  f: (x, _y) => 2 * x,
  g: (_x, y) => 3 * y,
});

export const stableFocusSystem = (): ODESystem2D => ({
  f: (x, y) => -x + 2 * y,
  g: (x, y) => -2 * x - y,
});

export const unstableFocusSystem = (): ODESystem2D => ({
  f: (x, y) => x + 2 * y,
  g: (x, y) => -2 * x + y,
});

export const centerSystem = (): ODESystem2D => ({
  f: (_x, y) => y,
  g: (x, _y) => -x,
});

export const degenerateNodeSystem = (): ODESystem2D => ({
  f: (x, y) => -x + y,
  g: (_x, y) => -y,
});

// ============ Nonlinear Systems ============

// Van der Pol oscillator
export const vanDerPol = (mu: number): ODESystem2D => ({
  f: (_x, y) => y,
  g: (x, y) => mu * (1 - x * x) * y - x,
});

// Duffing oscillator (autonomous, no forcing)
export const duffingAutonomous = (delta: number, alpha: number, beta: number): ODESystem2D => ({
  f: (_x, y) => y,
  g: (x, y) => -delta * y - alpha * x - beta * x * x * x,
});

// ============ Lorenz System (3D) ============
export const lorenzSystem = (sigma: number, rho: number, beta: number): ODESystem3D => ({
  f: (x, y, _z) => sigma * (y - x),
  g: (x, y, z) => x * (rho - z) - y,
  h: (x, y, z) => x * y - beta * z,
});

// ============ Rossler System (3D) ============
export const rosslerSystem = (a: number, b: number, c: number): ODESystem3D => ({
  f: (_x, y, z) => -y - z,
  g: (x, y, _z) => x + a * y,
  h: (x, _y, z) => b + z * (x - c),
});

// ============ Discrete Maps ============

// Logistic map
export const logisticMap = (mu: number) => (x: number) => mu * x * (1 - x);
export const logisticMapDerivative = (mu: number) => (x: number) => mu * (1 - 2 * x);

// Cubic map for pitchfork demo
export const cubicMap = (alpha: number) => (x: number) => alpha * x - x * x * x;
export const cubicMapDerivative = (alpha: number) => (x: number) => alpha - 3 * x * x;

// Tent map
export const tentMap = (mu: number) => (x: number) =>
  x < 0.5 ? mu * x : mu * (1 - x);
export const tentMapDerivative = (mu: number) => (x: number) =>
  x < 0.5 ? mu : -mu;

// Henon map (2D)
export const henonMap = (a: number, b: number) => (x: number, y: number): [number, number] =>
  [1 - a * x * x + y, b * x];

// ============ Duffing Forced (non-autonomous, need special handling) ============
// We'll treat it as 3D: x, v, phi where phi = omega * t mod 2pi
export const duffingForced3D = (
  delta: number,
  alpha: number,
  beta: number,
  gamma: number,
  omega: number
): ODESystem3D => ({
  f: (_x, v, _phi) => v,
  g: (x, v, phi) => -delta * v - alpha * x - beta * x * x * x + gamma * Math.cos(phi),
  h: (_x, _v, _phi) => omega,
});

// ============ Pendulum ============
export const pendulum = (delta: number): ODESystem2D => ({
  f: (_theta, omega) => omega,
  g: (theta, omega) => -delta * omega - Math.sin(theta),
});

// ============ Predator-Prey (Lotka-Volterra) ============
export const lotkaVolterra = (a: number, b: number, c: number, d: number): ODESystem2D => ({
  f: (x, y) => a * x - b * x * y,
  g: (x, y) => c * x * y - d * y,
});

// System presets for dropdown selection
export const linearPresets = [
  { name: '鞍点 (Saddle)', a: 1, b: 0, c: 0, d: -1 },
  { name: '稳定结点', a: -2, b: 0, c: 0, d: -3 },
  { name: '不稳定结点', a: 2, b: 0, c: 0, d: 3 },
  { name: '稳定焦点', a: -1, b: 2, c: -2, d: -1 },
  { name: '不稳定焦点', a: 1, b: 2, c: -2, d: 1 },
  { name: '中心 (Center)', a: 0, b: 1, c: -1, d: 0 },
  { name: '稳定退化结点', a: -1, b: 1, c: 0, d: -1 },
  { name: '不稳定退化结点', a: 1, b: 1, c: 0, d: 1 },
];

// ===== Parametric nonlinear system factories =====
// Each def owns slider specs; build() recomputes equations + analytically solved
// fixed points (with Jacobian classification) for the current parameter values.

export interface NonlinearParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface NonlinearSystemDef {
  name: string;
  viewRange: number;
  params: NonlinearParamSpec[];
  build: (v: Record<string, number>) => NonlinearPreset;
}

export const nonlinearSystemDefs: NonlinearSystemDef[] = [
  {
    name: '范德波尔振荡器',
    viewRange: 2.5,
    params: [
      { key: 'mu', label: 'μ（非线性阻尼强度）', min: 0.05, max: 3, step: 0.05, defaultValue: 1 },
    ],
    build: ({ mu }) => ({
      name: `范德波尔振荡器 (μ=${mu.toFixed(2)})`,
      system: vanDerPol(mu),
      equationTex: `\\begin{cases} \\dot{x} = y \\\\[4pt] \\dot{y} = ${mu.toFixed(2)}\\,(1-x^{2})\\,y - x \\end{cases}`,
      jacGeneralTex:
        'J(x,y) = \\begin{pmatrix} 0 & 1 \\\\ -1-2\\mu xy & \\mu(1-x^{2}) \\end{pmatrix}',
      fixedPoints: [
        makeFP(0, 0, '(0,\\,0)', [[0, 1], [-1, mu]],
          `J(0,0) = \\begin{pmatrix} 0 & 1 \\\\ -1 & ${mu.toFixed(2)} \\end{pmatrix}`),
      ],
    }),
  },
  {
    name: 'Duffing 振子（β=1）',
    viewRange: 2.2,
    params: [
      { key: 'delta', label: 'δ（阻尼）', min: 0, max: 1, step: 0.02, defaultValue: 0.2 },
      { key: 'alpha', label: 'α（线性刚度，<0 为双势阱）', min: -1.5, max: 1.5, step: 0.1, defaultValue: -1 },
    ],
    build: ({ delta, alpha }) => {
      const sign = alpha < 0 ? '+' : '-';
      const fixedPoints: NonlinearFixedPoint[] = [
        makeFP(0, 0, '(0,\\,0)', [[0, 1], [-alpha, -delta]],
          `J(0,0) = \\begin{pmatrix} 0 & 1 \\\\ ${(-alpha).toFixed(2)} & ${(-delta).toFixed(2)} \\end{pmatrix}`),
      ];
      if (alpha < 0) {
        const xs = Math.sqrt(-alpha);
        const xTex = `\\sqrt{${(-alpha).toFixed(2)}}`;
        const jac: [[number, number], [number, number]] = [[0, 1], [2 * alpha, -delta]];
        const jacTex = `J = \\begin{pmatrix} 0 & 1 \\\\ ${(2 * alpha).toFixed(2)} & ${(-delta).toFixed(2)} \\end{pmatrix}`;
        fixedPoints.unshift(makeFP(xs, 0, `(${xTex},\\,0)`, jac, jacTex));
        fixedPoints.unshift(makeFP(-xs, 0, `(-${xTex},\\,0)`, jac, jacTex));
      }
      return {
        name: `Duffing 振子 (δ=${delta.toFixed(2)}, α=${alpha.toFixed(2)})`,
        system: duffingAutonomous(delta, alpha, 1),
        equationTex: `\\begin{cases} \\dot{x} = y \\\\[4pt] \\dot{y} = -${delta.toFixed(2)}\\,y ${sign} ${Math.abs(alpha).toFixed(2)}\\,x - x^{3} \\end{cases}`,
        jacGeneralTex:
          'J(x,y) = \\begin{pmatrix} 0 & 1 \\\\ -\\alpha - 3\\beta x^{2} & -\\delta \\end{pmatrix}',
        fixedPoints,
      };
    },
  },
  {
    name: '阻尼单摆',
    viewRange: 4.2,
    params: [
      { key: 'delta', label: 'δ（阻尼系数）', min: 0, max: 2, step: 0.05, defaultValue: 0.5 },
    ],
    build: ({ delta }) => ({
      name: `阻尼单摆 (δ=${delta.toFixed(2)})`,
      system: pendulum(delta),
      equationTex: `\\begin{cases} \\dot{\\theta} = \\omega \\\\[4pt] \\dot{\\omega} = -${delta.toFixed(2)}\\,\\omega - \\sin\\theta \\end{cases}`,
      jacGeneralTex:
        'J(\\theta,\\omega) = \\begin{pmatrix} 0 & 1 \\\\ -\\cos\\theta & -\\delta \\end{pmatrix}',
      fixedPoints: [
        makeFP(-Math.PI, 0, '(-\\pi,\\,0)', [[0, 1], [1, -delta]],
          `J(-\\pi,0) = \\begin{pmatrix} 0 & 1 \\\\ 1 & ${(-delta).toFixed(2)} \\end{pmatrix}`),
        makeFP(0, 0, '(0,\\,0)', [[0, 1], [-1, -delta]],
          `J(0,0) = \\begin{pmatrix} 0 & 1 \\\\ -1 & ${(-delta).toFixed(2)} \\end{pmatrix}`),
        makeFP(Math.PI, 0, '(\\pi,\\,0)', [[0, 1], [1, -delta]],
          `J(\\pi,0) = \\begin{pmatrix} 0 & 1 \\\\ 1 & ${(-delta).toFixed(2)} \\end{pmatrix}`),
      ],
    }),
  },
  {
    name: 'Lotka–Volterra 捕食模型',
    viewRange: 2.2,
    params: [
      { key: 'a', label: 'a（猎物增长率）', min: 0.2, max: 2, step: 0.1, defaultValue: 1 },
      { key: 'd', label: 'd（捕食者死亡率）', min: 0.2, max: 2, step: 0.1, defaultValue: 1 },
    ],
    build: ({ a, d }) => ({
      name: `Lotka–Volterra (a=${a.toFixed(1)}, d=${d.toFixed(1)})`,
      system: lotkaVolterra(a, 1, 1, d),
      equationTex: `\\begin{cases} \\dot{x} = ${a.toFixed(1)}\\,x - xy \\\\[4pt] \\dot{y} = xy - ${d.toFixed(1)}\\,y \\end{cases}`,
      jacGeneralTex:
        'J(x,y) = \\begin{pmatrix} a - y & -x \\\\ y & x - d \\end{pmatrix}',
      fixedPoints: [
        makeFP(0, 0, '(0,\\,0)', [[a, 0], [0, -d]],
          `J(0,0) = \\begin{pmatrix} ${a.toFixed(1)} & 0 \\\\ 0 & ${(-d).toFixed(1)} \\end{pmatrix}`),
        makeFP(d, a, `(${d.toFixed(1)},\\,${a.toFixed(1)})`, [[0, -d], [a, 0]],
          `J(${d.toFixed(1)},${a.toFixed(1)}) = \\begin{pmatrix} 0 & ${(-d).toFixed(1)} \\\\ ${a.toFixed(1)} & 0 \\end{pmatrix}`),
      ],
    }),
  },
];
