import { useRef, useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { integrate2D, classifyFixedPoint, linearSystem2D, eigenvectors2x2 } from '@/lib/math';
import { linearPresets, nonlinearSystemDefs } from '@/lib/systems';
import type { ODESystem2D } from '@/lib/math';
import type { NonlinearFixedPoint } from '@/lib/systems';
import MathTex from '@/components/MathTex';

// Format a linear coefficient as a LaTeX term with correct sign handling
function linTerm(coef: number, v: string, first: boolean): string {
  const abs = Math.abs(coef);
  const c = Math.abs(abs - 1) < 1e-12 ? '' : abs.toFixed(2);
  if (first) return coef < 0 ? `-${c}${v}` : `${c}${v}`;
  return coef < 0 ? ` - ${c}${v}` : ` + ${c}${v}`;
}

function signedNum(coef: number, v: string): string {
  const abs = Math.abs(coef).toFixed(2);
  return coef < 0 ? ` - ${abs}${v}` : ` + ${abs}${v}`;
}

// Compute eigenvalue info for fixed point styling
function getFixedPointStyle(a: number, b: number, c: number, d: number): {
  isAttractor: boolean;
  isRepeller: boolean;
  isCenter: boolean;
  hasComplex: boolean;
} {
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  const isAttractor = det > 0 && tr < 0;
  const isRepeller = det > 0 && tr > 0;
  const isCenter = det > 0 && Math.abs(tr) < 1e-9 && disc < 0;
  const hasComplex = disc < 0;
  return { isAttractor, isRepeller, isCenter, hasComplex };
}

export interface CanvasFixedPoint {
  x: number;
  y: number;
  jacobian: [[number, number], [number, number]];
}

interface PhasePortraitCanvasProps {
  system: ODESystem2D;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  dt: number;
  steps: number;
  nArrows: number;
  showNullclines: boolean;
  showEigenvectors: boolean;
  fixedPoints: CanvasFixedPoint[];
}

function PhasePortraitCanvas({
  system,
  xMin,
  xMax,
  yMin,
  yMax,
  dt,
  steps,
  nArrows,
  showNullclines,
  showEigenvectors,
  fixedPoints,
}: PhasePortraitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 40;
    const dw = w - 2 * pad;
    const dh = h - 2 * pad;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    const w2c = (wx: number, wy: number): [number, number] => [
      pad + ((wx - xMin) / (xMax - xMin)) * dw,
      h - pad - ((wy - yMin) / (yMax - yMin)) * dh,
    ];

    // Grid
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = pad + (i / 10) * dw;
      const y = pad + (i / 10) * dh;
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    }

    // Axes with labels
    const [ox, oy] = w2c(0, 0);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pad, oy); ctx.lineTo(w - pad, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, pad); ctx.lineTo(ox, h - pad); ctx.stroke();

    ctx.fillStyle = '#555';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const nTicks = 5;
    for (let i = 0; i <= nTicks; i++) {
      const wx = xMin + (i / nTicks) * (xMax - xMin);
      const cx = pad + (i / nTicks) * dw;
      ctx.beginPath(); ctx.moveTo(cx, oy - 4); ctx.lineTo(cx, oy + 4); ctx.stroke();
      ctx.fillText(wx.toFixed(1), cx, oy + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= nTicks; i++) {
      const wy = yMin + (i / nTicks) * (yMax - yMin);
      const cy = h - pad - (i / nTicks) * dh;
      ctx.beginPath(); ctx.moveTo(ox - 4, cy); ctx.lineTo(ox + 4, cy); ctx.stroke();
      ctx.fillText(wy.toFixed(1), ox - 6, cy);
    }

    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('x', w - pad + 15, oy - 5);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('y', ox - 5, pad - 5);

    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`[${xMin.toFixed(1)}, ${xMax.toFixed(1)}] × [${yMin.toFixed(1)}, ${yMax.toFixed(1)}]`, pad, pad - 2);

    // Nullclines
    if (showNullclines) {
      ctx.lineWidth = 2;
      const nullclinePoints: { px: number; py: number; converging: boolean }[] = [];
      for (let px = 0; px < dw; px += 2) {
        const wx = xMin + (px / dw) * (xMax - xMin);
        for (let py = 0; py < dh; py += 2) {
          const wy = yMin + ((dh - py) / dh) * (yMax - yMin);
          const val = system.f(wx, wy);
          if (Math.abs(val) < 0.08) {
            const dist = Math.sqrt(wx * wx + wy * wy);
            const towardOrigin = dist > 0.1 && (wx * system.f(wx + 0.01, wy) + wy * system.g(wx, wy + 0.01)) < 0;
            nullclinePoints.push({ px: pad + px, py: pad + py, converging: towardOrigin });
          }
        }
      }
      for (const p of nullclinePoints) {
        ctx.fillStyle = p.converging ? '#3b82f6' : '#dc2626';
        ctx.fillRect(p.px, p.py, 2, 2);
      }

      const yNullclinePoints: { px: number; py: number; converging: boolean }[] = [];
      for (let px = 0; px < dw; px += 2) {
        const wx = xMin + (px / dw) * (xMax - xMin);
        for (let py = 0; py < dh; py += 2) {
          const wy = yMin + ((dh - py) / dh) * (yMax - yMin);
          const val = system.g(wx, wy);
          if (Math.abs(val) < 0.08) {
            const dist = Math.sqrt(wx * wx + wy * wy);
            const towardOrigin = dist > 0.1 && (wx * system.f(wx + 0.01, wy) + wy * system.g(wx, wy + 0.01)) < 0;
            yNullclinePoints.push({ px: pad + px, py: pad + py, converging: towardOrigin });
          }
        }
      }
      for (const p of yNullclinePoints) {
        ctx.fillStyle = p.converging ? '#3b82f6' : '#dc2626';
        ctx.fillRect(p.px, p.py, 2, 2);
      }
    }

    // Eigenvector trend lines (invariant manifolds) at each fixed point
    if (showEigenvectors) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad, pad, dw, dh);
      ctx.clip();
      const L = (xMax - xMin) * 2;
      for (const fp of fixedPoints) {
        const [[ja, jb], [jc, jd]] = fp.jacobian;
        const vecs = eigenvectors2x2(ja, jb, jc, jd);
        if (!vecs) continue; // complex eigenvalues: no real trend lines
        for (const { lambda, vec } of vecs) {
          const [ax, ay] = w2c(fp.x - vec[0] * L, fp.y - vec[1] * L);
          const [bx, by] = w2c(fp.x + vec[0] * L, fp.y + vec[1] * L);
          ctx.strokeStyle = lambda < -1e-9 ? '#2563eb' : lambda > 1e-9 ? '#dc2626' : '#888888';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          // arrowheads at both ends
          for (const [ex, ey, sx, sy] of [[bx, by, ax, ay], [ax, ay, bx, by]] as const) {
            const ang = Math.atan2(ey - sy, ex - sx);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath();
            const dir = lambda > 1e-9 ? 1 : -1; // unstable: arrows point away; stable: toward fp
            const tipX = dir > 0 ? ex : (ex + sx) / 2;
            const tipY = dir > 0 ? ey : (ey + sy) / 2;
            const baseAng = Math.atan2(ey - sy, ex - sx) + (dir > 0 ? 0 : Math.PI);
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX - 8 * Math.cos(baseAng - 0.4), tipY - 8 * Math.sin(baseAng - 0.4));
            ctx.lineTo(tipX - 8 * Math.cos(baseAng + 0.4), tipY - 8 * Math.sin(baseAng + 0.4));
            ctx.fill();
            void ang;
          }
        }
      }
      ctx.restore();
    }

    // Vector field arrows
    ctx.strokeStyle = '#94a3b8';
    ctx.fillStyle = '#94a3b8';
    const arrowLen = 10;
    for (let i = 0; i < nArrows; i++) {
      for (let j = 0; j < nArrows; j++) {
        const wx = xMin + ((i + 0.5) / nArrows) * (xMax - xMin);
        const wy = yMin + ((j + 0.5) / nArrows) * (yMax - yMin);
        const dx = system.f(wx, wy);
        const dy = system.g(wx, wy);
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag < 1e-6) continue;
        const ndx = (dx / mag) * arrowLen;
        const ndy = (dy / mag) * arrowLen;
        const [cx, cy] = w2c(wx, wy);
        ctx.beginPath();
        ctx.moveTo(cx - ndx / 2, cy + ndy / 2);
        ctx.lineTo(cx + ndx / 2, cy - ndy / 2);
        ctx.stroke();
        const angle = Math.atan2(-ndy, ndx);
        ctx.beginPath();
        ctx.moveTo(cx + ndx / 2, cy - ndy / 2);
        ctx.lineTo(cx + ndx / 2 - 4 * Math.cos(angle - 0.5), cy - ndy / 2 + 4 * Math.sin(angle - 0.5));
        ctx.lineTo(cx + ndx / 2 - 4 * Math.cos(angle + 0.5), cy - ndy / 2 + 4 * Math.sin(angle + 0.5));
        ctx.fill();
      }
    }

    // Sample trajectories
    const colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#db2777'];
    const seeds: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * 2 * Math.PI;
      seeds.push([Math.cos(angle) * 0.3 * (xMax - xMin), Math.sin(angle) * 0.3 * (yMax - yMin)]);
    }
    for (let i = 0; i < 4; i++) {
      seeds.push([
        xMin + Math.random() * (xMax - xMin) * 0.8 + (xMax - xMin) * 0.1,
        yMin + Math.random() * (yMax - yMin) * 0.8 + (yMax - yMin) * 0.1,
      ]);
    }

    seeds.forEach(([sx, sy], idx) => {
      const traj = integrate2D(system, sx, sy, dt, steps);
      if (traj.length < 2) return;
      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      let first = true;
      const canvasPoints: [number, number][] = [];
      for (const [tx, ty] of traj) {
        if (tx < xMin - 1 || tx > xMax + 1 || ty < yMin - 1 || ty > yMax + 1) break;
        const [cx, cy] = w2c(tx, ty);
        canvasPoints.push([cx, cy]);
        if (first) {
          ctx.moveTo(cx, cy);
          first = false;
        } else {
          ctx.lineTo(cx, cy);
        }
      }
      ctx.stroke();

      for (const frac of [0.3, 0.6]) {
        const i2 = Math.floor(canvasPoints.length * frac);
        if (i2 > 0 && i2 < canvasPoints.length - 1) {
          const [x1, y1] = canvasPoints[i2 - 1];
          const [x2, y2] = canvasPoints[i2 + 1];
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const ax = canvasPoints[i2][0];
          const ay = canvasPoints[i2][1];
          ctx.fillStyle = colors[idx % colors.length];
          ctx.beginPath();
          ctx.moveTo(ax + 6 * Math.cos(angle), ay + 6 * Math.sin(angle));
          ctx.lineTo(ax + 6 * Math.cos(angle + 2.5), ay + 6 * Math.sin(angle + 2.5));
          ctx.lineTo(ax + 6 * Math.cos(angle - 2.5), ay + 6 * Math.sin(angle - 2.5));
          ctx.fill();
        }
      }

      const [scx, scy] = w2c(sx, sy);
      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineWidth = 2;
      ctx.strokeRect(scx - 5, scy - 5, 10, 10);
    });

    // All fixed points with style based on each one's Jacobian eigenvalues
    for (const fp of fixedPoints) {
      const [[ja, jb], [jc, jd]] = fp.jacobian;
      const fpStyle = getFixedPointStyle(ja, jb, jc, jd);
      const [ocx, ocy] = w2c(fp.x, fp.y);
      if (ocx < pad || ocx > w - pad || ocy < pad || ocy > h - pad) continue;
      const r = 7;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(fpStyle.hasComplex ? [3, 2] : []);
      if (fpStyle.isAttractor) {
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(ocx, ocy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.stroke();
      } else if (fpStyle.isRepeller) {
        ctx.fillStyle = '#fafafa';
        ctx.beginPath(); ctx.arc(ocx, ocy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#dc2626'; ctx.stroke();
      } else if (fpStyle.isCenter) {
        ctx.fillStyle = '#fafafa';
        ctx.beginPath(); ctx.arc(ocx, ocy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#16a34a'; ctx.stroke();
      } else {
        ctx.fillStyle = '#fafafa';
        ctx.beginPath(); ctx.arc(ocx, ocy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#333'; ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }, [system, xMin, xMax, yMin, yMax, dt, steps, nArrows, showNullclines, showEigenvectors, fixedPoints]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={520}
      className="w-full border rounded-lg"
      style={{ maxWidth: '640px', aspectRatio: '16/13' }}
    />
  );
}

export default function FixedPointSection() {
  const [presetType, setPresetType] = useState<'linear' | 'nonlinear'>('linear');
  const [presetIndex, setPresetIndex] = useState(0);
  const [defIdx, setDefIdx] = useState(0);
  const [nlParams, setNlParams] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const p of nonlinearSystemDefs[0].params) init[p.key] = p.defaultValue;
    return init;
  });
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [d, setD] = useState(-1);
  const [dt] = useState(0.02);
  const [steps] = useState(800);
  const [nArrows, setNArrows] = useState(12);
  const [showNullclines, setShowNullclines] = useState(false);
  const [showEigenvectors, setShowEigenvectors] = useState(true);
  const [xRange, setXRange] = useState(2);
  const [yRange] = useState(2);

  const def = nonlinearSystemDefs[defIdx];
  const built = useMemo(() => def.build(nlParams), [def, nlParams]);

  const system: ODESystem2D = presetType === 'linear' ? linearSystem2D(a, b, c, d) : built.system;
  const fixedPoints: CanvasFixedPoint[] =
    presetType === 'linear'
      ? [{ x: 0, y: 0, jacobian: [[a, b], [c, d]] }]
      : built.fixedPoints.map((fp) => ({ x: fp.x, y: fp.y, jacobian: fp.jacobian }));

  const classification = classifyFixedPoint(a, b, c, d);

  const handleLinearPreset = (idx: number) => {
    const p = linearPresets[idx];
    setA(p.a);
    setB(p.b);
    setC(p.c);
    setD(p.d);
    setPresetIndex(idx);
  };

  const handleDefChange = (idx: number) => {
    setDefIdx(idx);
    const init: Record<string, number> = {};
    for (const p of nonlinearSystemDefs[idx].params) init[p.key] = p.defaultValue;
    setNlParams(init);
    setXRange(nonlinearSystemDefs[idx].viewRange);
  };

  // ===== Linear eigenvalue/eigenvector derivation (live) =====
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  const eigenvecs = eigenvectors2x2(a, b, c, d);
  const l1 = (tr + Math.sqrt(Math.abs(disc))) / 2;
  const l2 = (tr - Math.sqrt(Math.abs(disc))) / 2;
  const imPart = Math.sqrt(Math.abs(disc)) / 2;

  const renderLinearDerivation = () => {
    const step1 = `\\det(A - \\lambda I) = \\begin{vmatrix} ${a.toFixed(2)}-\\lambda & ${b.toFixed(2)} \\\\ ${c.toFixed(2)} & ${d.toFixed(2)}-\\lambda \\end{vmatrix} = 0`;
    const step2 = `\\lambda^{2}${signedNum(-tr, '\\lambda')}${signedNum(det, '')} = 0, \\qquad \\Delta = (\\operatorname{tr}A)^{2} - 4\\det A = ${disc.toFixed(3)}`;
    const step3 =
      disc >= 0
        ? `\\lambda_{1,2} = \\frac{\\operatorname{tr}A \\pm \\sqrt{\\Delta}}{2} \\;\\Rightarrow\\; \\lambda_1 = ${l1.toFixed(3)},\\ \\lambda_2 = ${l2.toFixed(3)}`
        : `\\lambda_{1,2} = \\tfrac{\\operatorname{tr}A}{2} \\pm \\tfrac{\\sqrt{|\\Delta|}}{2}\\,\\mathrm{i} = ${(tr / 2).toFixed(3)} \\pm ${imPart.toFixed(3)}\\,\\mathrm{i}`;
    const step4 = eigenvecs
      ? `\\mathbf{v}_{1} = \\begin{pmatrix} ${eigenvecs[0].vec[0].toFixed(3)} \\\\ ${eigenvecs[0].vec[1].toFixed(3)} \\end{pmatrix} (\\lambda_1=${eigenvecs[0].lambda.toFixed(3)}), \\quad \\mathbf{v}_{2} = \\begin{pmatrix} ${eigenvecs[1].vec[0].toFixed(3)} \\\\ ${eigenvecs[1].vec[1].toFixed(3)} \\end{pmatrix} (\\lambda_2=${eigenvecs[1].lambda.toFixed(3)})`
      : '\\Delta < 0 \\Rightarrow \\text{无实特征向量：不存在不变直线，轨线沿螺线演化}';
    const step5 = eigenvecs
      ? `\\mathbf{X}(t) = c_1\\, e^{${l1.toFixed(3)}\\, t}\\, \\mathbf{v}_{1} + c_2\\, e^{${l2.toFixed(3)}\\, t}\\, \\mathbf{v}_{2}`
      : `\\mathbf{X}(t) = e^{${(tr / 2).toFixed(3)}\\, t} \\left[ \\mathbf{u} \\cos\\left(${imPart.toFixed(3)}\\, t\\right) + \\mathbf{w} \\sin\\left(${imPart.toFixed(3)}\\, t\\right) \\right]`;

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">特征值与特征向量：标准推导步骤（实时）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium mt-2">第 1 步 · 写出特征方程 det(A − λI) = 0</p>
          <div className="flex items-center gap-2">
            <div className="flex-1"><MathTex tex={step1} display /></div>
            <span className="text-xs text-muted-foreground select-none">(4)</span>
          </div>
          <p className="font-medium">第 2 步 · 展开为 λ 的二次方程，计算判别式</p>
          <div className="flex items-center gap-2">
            <div className="flex-1"><MathTex tex={step2} display /></div>
            <span className="text-xs text-muted-foreground select-none">(5)</span>
          </div>
          <p className="font-medium">第 3 步 · 求解特征值</p>
          <div className="flex items-center gap-2">
            <div className="flex-1"><MathTex tex={step3} display /></div>
            <span className="text-xs text-muted-foreground select-none">(6)</span>
          </div>
          <p className="font-medium">第 4 步 · 对每个 λᵢ 解 (A − λᵢI)vᵢ = 0，得特征向量（即相图中的趋势线方向）</p>
          <div className="flex items-center gap-2">
            <div className="flex-1"><MathTex tex={step4} display /></div>
            <span className="text-xs text-muted-foreground select-none">(7)</span>
          </div>
          <p className="font-medium">第 5 步 · 写出通解并判定稳定性</p>
          <div className="flex items-center gap-2">
            <div className="flex-1"><MathTex tex={step5} display /></div>
            <span className="text-xs text-muted-foreground select-none">(8)</span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            结论：{classification.type}，{classification.stability}。
            {eigenvecs
              ? '蓝线 = 稳定特征方向（λ<0，轨线沿它趋近驻点），红线 = 不稳定特征方向（λ>0，轨线沿它远离驻点）。'
              : '复特征值对应螺旋轨线，实部符号决定向内或向外。'}
          </p>
        </CardContent>
      </Card>
    );
  };

  // ===== Equation card =====
  const renderEquation = () => {
    if (presetType === 'linear') {
      const sysTex = `\\begin{cases} \\dot{x} = ${linTerm(a, 'x', true)}${linTerm(b, 'y', false)} \\\\[4pt] \\dot{y} = ${linTerm(c, 'x', true)}${linTerm(d, 'y', false)} \\end{cases}`;
      const matTex = `\\dot{\\mathbf{X}} = A\\,\\mathbf{X}, \\qquad A = \\begin{pmatrix} ${a.toFixed(2)} & ${b.toFixed(2)} \\\\ ${c.toFixed(2)} & ${d.toFixed(2)} \\end{pmatrix}`;
      const trDetTex = `\\operatorname{tr} A = ${tr.toFixed(2)}, \\qquad \\det A = ${det.toFixed(2)}`;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex-1"><MathTex tex={sysTex} display /></div>
            <span className="text-xs text-muted-foreground select-none">(1)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1"><MathTex tex={matTex} display /></div>
            <span className="text-xs text-muted-foreground select-none">(2)</span>
          </div>
          <MathTex tex={trDetTex} display className="text-sm" />
        </div>
      );
    } else {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex-1"><MathTex tex={built.equationTex} display /></div>
            <span className="text-xs text-muted-foreground select-none">(1)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-sm"><MathTex tex={built.jacGeneralTex} display /></div>
            <span className="text-xs text-muted-foreground select-none">(2)</span>
          </div>
          <p className="text-center text-xs text-muted-foreground pt-1">
            {built.name} · 驻点个数：{built.fixedPoints.length}
          </p>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">驻点（平衡点）分析与相图</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          通过 Jacobi 矩阵的特征值与特征向量对驻点分类：特征向量给出相图的趋势线（不变流形），
          特征值符号决定沿趋势线的走向。拖动滑杆可观察参数实时演化。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <PhasePortraitCanvas
            system={system}
            xMin={-xRange}
            xMax={xRange}
            yMin={-yRange}
            yMax={yRange}
            dt={dt}
            steps={steps}
            nArrows={nArrows}
            showNullclines={showNullclines}
            showEigenvectors={showEigenvectors}
            fixedPoints={fixedPoints}
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">系统方程</CardTitle>
            </CardHeader>
            <CardContent>{renderEquation()}</CardContent>
          </Card>
          {presetType === 'linear' && renderLinearDerivation()}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>系统选择</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={presetType === 'linear' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPresetType('linear')}
                >
                  线性系统
                </Button>
                <Button
                  variant={presetType === 'nonlinear' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPresetType('nonlinear');
                    setXRange(def.viewRange);
                  }}
                >
                  非线性系统
                </Button>
              </div>

              {presetType === 'linear' ? (
                <Select
                  value={String(presetIndex)}
                  onValueChange={(v) => handleLinearPreset(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择预设" />
                  </SelectTrigger>
                  <SelectContent>
                    {linearPresets.map((p, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={String(defIdx)} onValueChange={(v) => handleDefChange(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择系统" />
                  </SelectTrigger>
                  <SelectContent>
                    {nonlinearSystemDefs.map((s, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {presetType === 'linear' ? (
            <Card>
              <CardHeader>
                <CardTitle>矩阵参数 A = [[a,b],[c,d]]（实时演化）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>a = {a.toFixed(2)}</Label>
                  <Slider value={[a]} min={-5} max={5} step={0.1} onValueChange={([v]) => setA(v)} />
                </div>
                <div>
                  <Label>b = {b.toFixed(2)}</Label>
                  <Slider value={[b]} min={-5} max={5} step={0.1} onValueChange={([v]) => setB(v)} />
                </div>
                <div>
                  <Label>c = {c.toFixed(2)}</Label>
                  <Slider value={[c]} min={-5} max={5} step={0.1} onValueChange={([v]) => setC(v)} />
                </div>
                <div>
                  <Label>d = {d.toFixed(2)}</Label>
                  <Slider value={[d]} min={-5} max={5} step={0.1} onValueChange={([v]) => setD(v)} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>参数滑杆（实时演化）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {def.params.map((p) => (
                  <div key={p.key}>
                    <Label>
                      {p.label} = {(nlParams[p.key] ?? p.defaultValue).toFixed(2)}
                    </Label>
                    <Slider
                      value={[nlParams[p.key] ?? p.defaultValue]}
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      onValueChange={([v]) => setNlParams({ ...nlParams, [p.key]: v })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>驻点分类结果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {presetType === 'linear' ? (
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">驻点：</span>
                    <MathTex tex="(0,\,0)" />
                    <span className="text-xs text-muted-foreground">（齐次线性系统唯一驻点）</span>
                  </div>
                  <div>
                    <span className="font-medium">类型：</span>
                    <span className="text-primary font-semibold">{classification.type}</span>
                  </div>
                  <div>
                    <span className="font-medium">稳定性：</span>
                    <span>{classification.stability}</span>
                  </div>
                  <div>
                    <span className="font-medium">特征值：</span>
                    <span className="font-mono text-xs">{classification.eigenvalues}</span>
                  </div>
                  <div className="text-muted-foreground">{classification.description}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {built.fixedPoints.map((fp: NonlinearFixedPoint, i: number) => (
                    <div key={i} className="border rounded-md p-2 space-y-1 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          驻点 {i + 1}：<MathTex tex={fp.coordTex} />
                        </span>
                        <span className="text-primary font-semibold text-xs">{fp.type}</span>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">稳定性：</span>
                        <span>{fp.stability}</span>
                      </div>
                      <div className="text-xs overflow-x-auto">
                        <MathTex tex={fp.jacTex} />
                      </div>
                      <div className="text-xs overflow-x-auto">
                        <MathTex tex={fp.eigenTex} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t text-xs space-y-1">
                <p>图例：● 实心 = 吸引子 (Re λ &lt; 0)</p>
                <p>○ 红空心 = 排斥子 (Re λ &gt; 0)</p>
                <p>○ 绿空心 = 中心 (Re λ = 0, Lyapunov 稳定)</p>
                <p>◌ 虚线 = 复特征值 (Im λ ≠ 0)</p>
                <p>— 蓝线 = 稳定特征方向（趋势线，λ &lt; 0）</p>
                <p>— 红线 = 不稳定特征方向（趋势线，λ &gt; 0）</p>
                <p>□ 空心方块 = 轨线初始点</p>
                <p>蓝点划线 = 收敛零倾线 / 红点划线 = 发散零倾线</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>视图控制</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>X/Y 范围: {xRange.toFixed(1)}</Label>
                <Slider value={[xRange]} min={0.5} max={5} step={0.1} onValueChange={([v]) => { setXRange(v); }} />
              </div>
              <div>
                <Label>向量场密度: {nArrows}</Label>
                <Slider value={[nArrows]} min={5} max={20} step={1} onValueChange={([v]) => setNArrows(v)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="eigenvectors"
                  checked={showEigenvectors}
                  onChange={(e) => setShowEigenvectors(e.target.checked)}
                />
                <Label htmlFor="eigenvectors">显示特征向量趋势线</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="nullclines"
                  checked={showNullclines}
                  onChange={(e) => setShowNullclines(e.target.checked)}
                />
                <Label htmlFor="nullclines">显示零倾线</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
