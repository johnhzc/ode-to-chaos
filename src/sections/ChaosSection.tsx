import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { project3D, worldToCanvas, rk4Step3D } from '@/lib/math';
import { lorenzSystem, duffingForced3D } from '@/lib/systems';
import MathTex from '@/components/MathTex';

// ===================== Lorenz =====================

const LORENZ_PRESETS = [
  { name: 'ρ = 0.8 · 原点全局稳定', rho: 0.8 },
  { name: 'ρ = 10 · 稳定对流（收敛到 C±）', rho: 10 },
  { name: 'ρ = 24.5 · 亚稳混沌共存区', rho: 24.5 },
  { name: 'ρ = 28 · 经典混沌蝴蝶', rho: 28 },
  { name: 'ρ = 100 · 周期窗口', rho: 100 },
  { name: 'ρ = 350 · 大 ρ 极限环', rho: 350 },
];

interface LorenzData {
  points: [number, number, number][];
  center: [number, number, number];
  scale: number;
  regime: string;
  regimeColor: string;
}

function computeLorenz(rho: number): LorenzData {
  const sigma = 10;
  const beta = 8 / 3;
  const system = lorenzSystem(sigma, rho, beta);
  const dt = 0.008;

  // transient
  let s: [number, number, number] = [0.5, 0.5, Math.max(1, rho * 0.7)];
  for (let i = 0; i < 12000; i++) s = rk4Step3D(system, s[0], s[1], s[2], dt);

  // sample trajectory
  const points: [number, number, number][] = [];
  for (let i = 0; i < 14000; i++) {
    s = rk4Step3D(system, s[0], s[1], s[2], dt);
    points.push(s);
  }

  // regime detection via z-maxima
  const zmax: number[] = [];
  let prevD = 0;
  for (let i = 1; i < points.length; i++) {
    const d = points[i][2] - points[i - 1][2];
    if (prevD > 0 && d <= 0) zmax.push(points[i - 1][2]);
    prevD = d;
  }
  let regime = '混沌（奇异吸引子）';
  let regimeColor = 'bg-red-100 text-red-700';
  if (zmax.length === 0) {
    regime = rho <= 1 ? '收敛到原点（稳定）' : '收敛到 C±（稳定焦点）';
    regimeColor = 'bg-green-100 text-green-700';
  } else {
    const lo = Math.min(...zmax);
    const hi = Math.max(...zmax);
    const uniq = new Set(zmax.map((z) => z.toFixed(2))).size;
    if (hi - lo < Math.max(0.5, rho * 0.01)) {
      regime = '周期极限环';
      regimeColor = 'bg-blue-100 text-blue-700';
    } else if (uniq <= 30) {
      regime = `周期轨道（z 极大值约 ${uniq} 种）`;
      regimeColor = 'bg-blue-100 text-blue-700';
    }
  }

  // auto-fit view: center at trajectory mean, scale by max deviation
  const n = points.length;
  const center: [number, number, number] = [0, 0, 0];
  for (const p of points) {
    center[0] += p[0] / n;
    center[1] += p[1] / n;
    center[2] += p[2] / n;
  }
  let maxDev = 1;
  for (const p of points) {
    maxDev = Math.max(
      maxDev,
      Math.abs(p[0] - center[0]),
      Math.abs(p[1] - center[1]),
      Math.abs(p[2] - center[2])
    );
  }
  const scale = 190 / maxDev;
  return { points, center, scale, regime, regimeColor };
}

function LorenzCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rho, setRho] = useState(28);
  const [rhoDraft, setRhoDraft] = useState(28);
  const [presetKey, setPresetKey] = useState('3');
  const [rotating, setRotating] = useState(true);
  const [data, setData] = useState<LorenzData>(() => computeLorenz(28));
  // User drag rotation offsets (kept in a ref: mutate without re-render)
  const userRotRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ px: number; py: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { px: e.clientX, py: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.px;
    const dy = e.clientY - drag.py;
    drag.px = e.clientX;
    drag.py = e.clientY;
    userRotRef.current.y += dx * 0.008; // horizontal drag -> orbit around vertical axis
    // clamp pitch to avoid flipping
    userRotRef.current.x = Math.max(
      -1.2,
      Math.min(1.2, userRotRef.current.x + dy * 0.008)
    );
  };
  const endDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer was not captured; ignore
    }
    setDragging(false);
  };

  // Recompute only when committed (slider release / preset select)
  useEffect(() => {
    setData(computeLorenz(rho));
  }, [rho]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const draw = (tms: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      const thetaY = 0.5 + userRotRef.current.y + (rotating ? tms * 0.00012 : 0);
      const thetaX = 0.35 + userRotRef.current.x;
      const { points, center, scale } = data;
      const ox = w / 2;
      const oy = h / 2 + 10;
      const n = points.length;

      ctx.lineWidth = 1;
      let prev: [number, number] | null = null;
      for (let i = 0; i < n; i++) {
        const [x, y, z] = points[i];
        const p = project3D(
          x - center[0], y - center[1], z - center[2],
          thetaX, thetaY, scale, ox, oy
        );
        if (prev) {
          const t = i / n;
          ctx.strokeStyle = `hsl(${200 + t * 80}, 70%, ${45 + t * 30}%)`;
          ctx.beginPath();
          ctx.moveTo(prev[0], prev[1]);
          ctx.lineTo(p[0], p[1]);
          ctx.stroke();
        }
        prev = p;
      }

      // Analytic fixed points
      const beta = 8 / 3;
      const fps: [number, number, number][] = [[0, 0, 0]];
      if (rho > 1) {
        const r = Math.sqrt(beta * (rho - 1));
        fps.push([r, r, rho - 1], [-r, -r, rho - 1]);
      }
      for (const [fx, fy, fz] of fps) {
        const p = project3D(
          fx - center[0], fy - center[1], fz - center[2],
          thetaX, thetaY, scale, ox, oy
        );
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`RK4 直接积分 · ρ = ${rho.toFixed(2)} · 视图自适应缩放`, 10, 16);
      ctx.fillText('黄点 = 解析驻点 O, C±', 10, 32);
    };

    const loop = (tms: number) => {
      draw(tms);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rotating, data, rho]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={presetKey}
          onValueChange={(v) => {
            setPresetKey(v);
            if (v !== 'custom') {
              const p = LORENZ_PRESETS[Number(v)];
              setRho(p.rho);
              setRhoDraft(p.rho);
            }
          }}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder="选择经典参数" />
          </SelectTrigger>
          <SelectContent>
            {LORENZ_PRESETS.map((p, i) => (
              <SelectItem key={i} value={String(i)}>{p.name}</SelectItem>
            ))}
            <SelectItem value="custom">自定义（拖动滑杆）</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className={data.regimeColor}>{data.regime}</Badge>
      </div>
      <canvas
        ref={canvasRef}
        width={700}
        height={500}
        className="w-full border rounded-lg"
        style={{
          maxWidth: '700px',
          aspectRatio: '7/5',
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      />
      <p className="text-xs text-muted-foreground text-center -mt-2">
        🖱️ 在图中按住拖动可手动旋转视角（自动旋转时同样生效）
      </p>
      <div className="space-y-2">
        <Label>ρ（Rayleigh 数）= {rhoDraft.toFixed(1)} · 松开滑杆后重算</Label>
        <Slider
          value={[rhoDraft]}
          min={0.5}
          max={360}
          step={0.5}
          onValueChange={([v]) => setRhoDraft(v)}
          onValueCommit={([v]) => {
            setRho(v);
            setPresetKey('custom');
          }}
        />
      </div>
      <div className="flex gap-2 justify-center">
        <Button onClick={() => setRotating(!rotating)}>
          {rotating ? '暂停旋转' : '恢复旋转'}
        </Button>
      </div>
    </div>
  );
}

// ===================== Duffing =====================

const DUFFING_PRESETS = [
  { name: '周期 1 · 弱驱动 (δ=0.15, γ=0.10, ω=1.0)', delta: 0.15, gamma: 0.10, omega: 1.0 },
  { name: '周期 3 · 中驱动 (δ=0.15, γ=0.25, ω=1.0)', delta: 0.15, gamma: 0.25, omega: 1.0 },
  { name: '周期 5 · 旧参数 (δ=0.20, γ=0.30, ω=1.2)', delta: 0.20, gamma: 0.30, omega: 1.2 },
  { name: '混沌 · 经典 (δ=0.15, γ=0.30, ω=1.0)', delta: 0.15, gamma: 0.30, omega: 1.0 },
  { name: '混沌 · 强驱动 (δ=0.30, γ=0.50, ω=1.2)', delta: 0.30, gamma: 0.50, omega: 1.2 },
];

interface DuffingData {
  traj: [number, number][];
  poincare: [number, number][];
  uniqueCount: number;
  regime: string;
  regimeColor: string;
}

function computeDuffing(delta: number, gamma: number, omega: number): DuffingData {
  const alpha = -1, beta = 1;
  const system = duffingForced3D(delta, alpha, beta, gamma, omega);
  const T = (2 * Math.PI) / omega;
  const stepsPerPeriod = 300;
  const dt = T / stepsPerPeriod;

  let x = 0.1, v = 0, phi = 0;
  for (let i = 0; i < 300 * stepsPerPeriod; i++) {
    [x, v, phi] = rk4Step3D(system, x, v, phi, dt);
  }
  const traj: [number, number][] = [];
  const poincare: [number, number][] = [];
  for (let p = 0; p < 500; p++) {
    for (let i = 0; i < stepsPerPeriod; i++) {
      [x, v, phi] = rk4Step3D(system, x, v, phi, dt);
      if (i % 3 === 0) traj.push([x, v]);
    }
    poincare.push([x, v]);
  }

  const uniqueCount = new Set(
    poincare.map(([px, pv]) => `${px.toFixed(3)},${pv.toFixed(3)}`)
  ).size;
  let regime: string;
  let regimeColor: string;
  if (uniqueCount <= 20) {
    regime = `周期轨道（Poincaré 点数 ≈ ${uniqueCount}）`;
    regimeColor = 'bg-blue-100 text-blue-700';
  } else if (uniqueCount <= 300) {
    regime = '高周期 / 过渡区';
    regimeColor = 'bg-amber-100 text-amber-700';
  } else {
    regime = `混沌（Poincaré 点数 ≈ ${uniqueCount}，分形散布）`;
    regimeColor = 'bg-red-100 text-red-700';
  }
  return { traj, poincare, uniqueCount, regime, regimeColor };
}

// ---- Duffing phase portrait + Poincaré canvas (pure, driven by props) ----
function DuffingPhaseCanvas({
  data,
  showTraj,
  showPoincare,
}: {
  data: DuffingData;
  showTraj: boolean;
  showPoincare: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 45;
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    const xMin = -2, xMax = 2, vMin = -2, vMax = 2;
    const w2c = (wx: number, wy: number): [number, number] => {
      const [cx, cy] = worldToCanvas(wx, wy, w - 2 * pad, h - 2 * pad, xMin, xMax, vMin, vMax);
      return [cx + pad, cy + pad];
    };

    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 8; i++) {
      const gx = pad + (i / 8) * (w - 2 * pad);
      const gy = pad + (i / 8) * (h - 2 * pad);
      ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, h - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(w - pad, gy); ctx.stroke();
    }

    if (showTraj) {
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      data.traj.forEach(([tx, tv], i) => {
        const [cx, cy] = w2c(tx, tv);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    }

    if (showPoincare) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
      for (const [px, pv] of data.poincare) {
        const [cx, cy] = w2c(px, pv);
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    const [ox, oy] = w2c(0, 0);
    ctx.beginPath(); ctx.moveTo(pad, oy); ctx.lineTo(w - pad, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, pad); ctx.lineTo(ox, h - pad); ctx.stroke();

    ctx.fillStyle = '#555';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const val = xMin + (i / 4) * (xMax - xMin);
      const [cx] = w2c(val, 0);
      ctx.beginPath(); ctx.moveTo(cx, oy - 4); ctx.lineTo(cx, oy + 4); ctx.stroke();
      ctx.fillText(val.toFixed(0), cx, oy + 6);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const val = vMin + (i / 4) * (vMax - vMin);
      const [, cy] = w2c(0, val);
      ctx.beginPath(); ctx.moveTo(ox - 4, cy); ctx.lineTo(ox + 4, cy); ctx.stroke();
      ctx.fillText(val.toFixed(0), ox - 6, cy);
    }
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('x', w - pad + 15, oy - 5);
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('ẋ', ox - 5, pad - 5);

    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('蓝线 = 相轨线（舍去 300 周期瞬态） · 红点 = Poincaré 截面（每周期精确采样 × 500）', pad, pad - 6);
  }, [data, showTraj, showPoincare]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={500}
      className="w-full border rounded-lg"
      style={{ maxWidth: '600px', aspectRatio: '6/5' }}
    />
  );
}

// ---- Duffing bifurcation diagram: x_Poincaré vs γ, computed column by column ----
function DuffingBifurcation({
  delta,
  omega,
  gamma,
  onPick,
}: {
  delta: number;
  omega: number;
  gamma: number;
  onPick: (g: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const W = 640;
  const H = 360;
  const PAD = 48;
  const G_MAX = 0.6;
  const COLS = 240;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    setProgress(0);

    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, H);

    const g2x = (g: number) => PAD + (g / G_MAX) * (W - 2 * PAD);
    const x2y = (xv: number) => H - PAD - ((xv + 1.8) / 3.6) * (H - 2 * PAD);

    // Axes & grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, H - PAD); ctx.lineTo(W - PAD, H - PAD); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD, PAD); ctx.lineTo(PAD, H - PAD); ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= 6; i++) {
      const g = (i / 6) * G_MAX;
      const cx = g2x(g);
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath(); ctx.moveTo(cx, PAD); ctx.lineTo(cx, H - PAD); ctx.stroke();
      ctx.fillText(g.toFixed(1), cx, H - PAD + 6);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const xv of [-1.5, -1, -0.5, 0, 0.5, 1, 1.5]) {
      const cy = x2y(xv);
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath(); ctx.moveTo(PAD, cy); ctx.lineTo(W - PAD, cy); ctx.stroke();
      ctx.fillText(xv.toFixed(1), PAD - 6, cy);
    }
    ctx.textAlign = 'center';
    ctx.fillText('γ（驱动幅度）', W / 2, H - PAD + 24);
    ctx.save();
    ctx.translate(14, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('x（Poincaré 采样）', 0, 0);
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#64748b';
    ctx.fillText('点击图中任意位置跳转到对应 γ', PAD + 4, PAD - 8);

    // Compute columns progressively (keep UI responsive)
    let col = 0;
    const computeColumn = () => {
      if (cancelled) return;
      const g = (col / (COLS - 1)) * G_MAX;
      const system = duffingForced3D(delta, -1, 1, g, omega);
      const T = (2 * Math.PI) / omega;
      const spp = 200;
      const dt = T / spp;
      let x = 0.1, v = 0, phi = 0;
      for (let i = 0; i < 120 * spp; i++) {
        [x, v, phi] = rk4Step3D(system, x, v, phi, dt);
      }
      ctx.fillStyle = 'rgba(96, 165, 250, 0.55)';
      const cx = g2x(g);
      for (let p = 0; p < 40; p++) {
        for (let i = 0; i < spp; i++) {
          [x, v, phi] = rk4Step3D(system, x, v, phi, dt);
        }
        if (Math.abs(x) <= 1.8) {
          ctx.fillRect(cx, x2y(x), 1.6, 1.6);
        }
      }
      col++;
      setProgress(col / COLS);
      if (col < COLS) setTimeout(computeColumn, 0);
    };
    computeColumn();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delta, omega]);

  const lineLeftPct = ((PAD + (gamma / G_MAX) * (W - 2 * PAD)) / W) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Label className="font-semibold">分岔图（横轴 γ，纵轴 Poincaré 截面 x 值）</Label>
        {progress < 1 && (
          <span className="text-xs text-muted-foreground">
            正在逐列直接计算… {(progress * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <div
        className="relative cursor-crosshair"
        style={{ maxWidth: `${W}px` }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const g = ((px - PAD) / (W - 2 * PAD)) * G_MAX;
          onPick(Math.min(G_MAX, Math.max(0, g)));
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full border rounded-lg"
          style={{ aspectRatio: `${W}/${H}` }}
        />
        {/* current γ marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
          style={{ left: `${lineLeftPct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        红线 = 当前 γ = {gamma.toFixed(3)} · 单带 = 周期轨道，带分裂 = 倍周期，弥漫点云 = 混沌
      </p>
    </div>
  );
}

// ---- Duffing explorer: state owner ----
function DuffingExplorer() {
  const [delta, setDelta] = useState(0.15);
  const [gamma, setGamma] = useState(0.3);
  const [omega, setOmega] = useState(1.0);
  const [drafts, setDrafts] = useState({ delta: 0.15, gamma: 0.3, omega: 1.0 });
  const [presetKey, setPresetKey] = useState('3');
  const [showTraj, setShowTraj] = useState(true);
  const [showPoincare, setShowPoincare] = useState(true);
  const [data, setData] = useState<DuffingData>(() => computeDuffing(0.15, 0.3, 1.0));

  useEffect(() => {
    setData(computeDuffing(delta, gamma, omega));
  }, [delta, gamma, omega]);

  const gammaC = delta * ((2 * Math.SQRT2) / (3 * Math.PI * omega)) * Math.cosh((Math.PI * omega) / 2);
  const melnikovOK = gamma > gammaC;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={presetKey}
          onValueChange={(v) => {
            setPresetKey(v);
            if (v !== 'custom') {
              const p = DUFFING_PRESETS[Number(v)];
              setDelta(p.delta);
              setGamma(p.gamma);
              setOmega(p.omega);
              setDrafts({ delta: p.delta, gamma: p.gamma, omega: p.omega });
            }
          }}
        >
          <SelectTrigger className="w-80">
            <SelectValue placeholder="选择经典参数" />
          </SelectTrigger>
          <SelectContent>
            {DUFFING_PRESETS.map((p, i) => (
              <SelectItem key={i} value={String(i)}>{p.name}</SelectItem>
            ))}
            <SelectItem value="custom">自定义（拖动滑杆 / 点击分岔图）</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className={data.regimeColor}>{data.regime}</Badge>
      </div>

      <DuffingPhaseCanvas data={data} showTraj={showTraj} showPoincare={showPoincare} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>δ（阻尼）= {drafts.delta.toFixed(3)}</Label>
          <Slider
            value={[drafts.delta]}
            min={0.05}
            max={0.4}
            step={0.005}
            onValueChange={([v]) => setDrafts({ ...drafts, delta: v })}
            onValueCommit={([v]) => { setDelta(v); setPresetKey('custom'); }}
          />
        </div>
        <div>
          <Label>γ（驱动幅度）= {drafts.gamma.toFixed(3)}</Label>
          <Slider
            value={[drafts.gamma]}
            min={0}
            max={0.6}
            step={0.005}
            onValueChange={([v]) => setDrafts({ ...drafts, gamma: v })}
            onValueCommit={([v]) => { setGamma(v); setPresetKey('custom'); }}
          />
        </div>
        <div>
          <Label>ω（驱动频率）= {drafts.omega.toFixed(3)}</Label>
          <Slider
            value={[drafts.omega]}
            min={0.5}
            max={2}
            step={0.01}
            onValueChange={([v]) => setDrafts({ ...drafts, omega: v })}
            onValueCommit={([v]) => { setOmega(v); setPresetKey('custom'); }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">松开滑杆后重算（每次约 24 万步 RK4 直接积分）</p>

      <div className="flex gap-4 justify-center text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showTraj} onChange={(e) => setShowTraj(e.target.checked)} />
          相轨线
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showPoincare} onChange={(e) => setShowPoincare(e.target.checked)} />
          Poincaré 截面
        </label>
      </div>

      <DuffingBifurcation
        delta={delta}
        omega={omega}
        gamma={gamma}
        onPick={(g) => {
          setGamma(g);
          setDrafts({ ...drafts, gamma: g });
          setPresetKey('custom');
        }}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Melnikov 混沌判据（实时计算）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <MathTex
            tex="\frac{\gamma}{\delta} > \frac{2\sqrt{2}}{3\pi\omega}\,\cosh\!\left(\frac{\pi\omega}{2}\right)"
            display
          />
          <MathTex
            tex={`\\frac{\\gamma}{\\delta} = ${(gamma / delta).toFixed(3)} \\quad ${melnikovOK ? '>' : '\\le'} \\quad \\gamma_c = ${gammaC.toFixed(3)}`}
            display
          />
          <Badge variant="outline" className={melnikovOK ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
            {melnikovOK ? '满足 Melnikov 条件：同宿轨道横截相交，可出现混沌' : '未达 Melnikov 阈值：同宿轨道未横截'}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== Smale horseshoe =====================
// f(x,y) = (x/3, 2y)          for y <= 1/2
// f(x,y) = (1 - x/3, 2(1-y))  for y > 1/2
function HorseshoeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [depth, setDepth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 50;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const w2c = (wx: number, wy: number): [number, number] => [
      pad + wx * (w - 2 * pad),
      h - pad - wy * (h - 2 * pad),
    ];

    const f = (x: number, y: number): [number, number] =>
      y <= 0.5 ? [x / 3, 2 * y] : [1 - x / 3, 2 * (1 - y)];

    const N = 6000;

    ctx.fillStyle = 'rgba(103, 232, 249, 0.5)';
    for (let i = 0; i < N; i++) {
      let x = Math.random();
      let y = Math.random();
      for (let d = 0; d < depth; d++) [x, y] = f(x, y);
      const [cx, cy] = w2c(x, y);
      ctx.fillRect(cx, cy, 1.6, 1.6);
    }

    ctx.fillStyle = 'rgba(251, 146, 60, 0.5)';
    for (let i = 0; i < N; i++) {
      const x0 = Math.random();
      const y0 = Math.random();
      let x = x0;
      let y = y0;
      let ok = true;
      for (let d = 0; d < depth; d++) {
        if (x <= 1 / 3) {
          [x, y] = [3 * x, y / 2];
        } else if (x >= 2 / 3) {
          [x, y] = [3 * (1 - x), 1 - y / 2];
        } else {
          ok = false;
          break;
        }
      }
      if (ok) {
        const [cx, cy] = w2c(x0, y0);
        ctx.fillRect(cx, cy, 1.6, 1.6);
      }
    }

    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    const [sx0, sy0] = w2c(0, 0);
    const [sx1, sy1] = w2c(1, 1);
    ctx.strokeRect(sx0, sy1, sx1 - sx0, sy0 - sy1);

    ctx.fillStyle = '#aaa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('0', sx0, sy0 + 4);
    ctx.fillText('1', sx1, sy0 + 4);
    ctx.fillText('x', sx1 + 12, sy0 + 2);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('0', sx0 - 4, sy0);
    ctx.fillText('1', sx0 - 4, sy1);
    ctx.fillText('y', sx0 - 8, sy1 - 10);

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText(`青点 = f^${depth}(D) 正向迭代（竖直 Cantor 丝，宽 3^-${depth}）`, pad, 22);
    ctx.fillStyle = '#fb923c';
    ctx.fillText(`橙点 = 幸存 ${depth} 次逆迭代的点（水平条带，高 2^-${depth}）`, pad, 38);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('两族交集 ≈ 不变集 Λ（Cantor 集 × Cantor 集）', pad, 54);
  }, [depth]);

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={500}
        className="w-full border rounded-lg"
        style={{ maxWidth: '600px', aspectRatio: '6/5' }}
      />
      <div className="flex gap-2 justify-center items-center">
        <Button onClick={() => setDepth(Math.max(1, depth - 1))}>减少迭代</Button>
        <span className="px-3 py-2 bg-muted rounded text-sm">迭代深度 n = {depth}</span>
        <Button onClick={() => setDepth(Math.min(7, depth + 1))}>加深迭代</Button>
      </div>
    </div>
  );
}

// ===================== Section =====================

export default function ChaosSection() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">混沌系统案例：Lorenz、Duffing 与 Smale 马蹄</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          全部图像由数值直接计算生成：RK4 积分 ODE、逐周期精确采样 Poincaré 截面、
          逐点迭代分段马蹄映射。选择预设或拖动滑杆，观察周期性向混沌的转变。
        </p>
      </div>

      <Tabs defaultValue="lorenz" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="lorenz">Lorenz 吸引子</TabsTrigger>
          <TabsTrigger value="duffing">Duffing 振子</TabsTrigger>
          <TabsTrigger value="horseshoe">Smale 马蹄</TabsTrigger>
        </TabsList>

        <TabsContent value="lorenz" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex justify-center">
              <LorenzCanvas />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Lorenz 系统（1963）</CardTitle>
                </CardHeader>
                <CardContent>
                  <MathTex
                    tex="\begin{cases} \dot{x} = \sigma(y - x) \\ \dot{y} = x(\rho - z) - y \\ \dot{z} = xy - \beta z \end{cases}"
                    display
                    className="text-sm"
                  />
                  <div className="text-sm mt-2 space-y-1">
                    <p>σ = 10（Prandtl 数，固定）</p>
                    <p>β = 8/3 ≈ 2.667（固定）</p>
                    <p>ρ（Rayleigh 数）可调：周期 ↔ 混沌</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>ρ 的分岔地图</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>• ρ &lt; 1：原点全局渐近稳定</p>
                  <p>• 1 &lt; ρ &lt; 24.74：C± 稳定（稳定对流）</p>
                  <p>• 24.06 &lt; ρ &lt; 24.74：混沌与稳定 C± 共存</p>
                  <p>• ρ = 28：经典混沌蝴蝶</p>
                  <p>• 99.65 &lt; ρ &lt; 100.75：周期窗口</p>
                  <p>• 大 ρ（如 350）：稳定极限环</p>
                  <p className="text-xs text-muted-foreground pt-1">
                    Lyapunov 指数（ρ=28）: 0.906, 0, −14.57 · D_KY ≈ 2.06
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="duffing" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex justify-center">
              <DuffingExplorer />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>受迫 Duffing 方程</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <MathTex
                    tex="\ddot{x} + \delta\,\dot{x} + \alpha x + \beta x^{3} = \gamma \cos(\omega t)"
                    display
                  />
                  <MathTex tex="V(x) = \tfrac{1}{2}\alpha x^{2} + \tfrac{1}{4}\beta x^{4}" display />
                  <p>α = −1 &lt; 0 时为 W 形双稳势阱</p>
                  <p className="text-xs text-muted-foreground">
                    周期→混沌路径：驱动幅度 γ 增大时，Poincaré 截面从孤立点（周期轨道）
                    逐渐散布成分形点云（混沌）。
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>观察要点</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>• 周期 1 → 周期 3 → 周期 5 → 混沌（选预设逐项切换）</p>
                  <p>• 周期轨道的 Poincaré 点是有限孤立点</p>
                  <p>• 混沌时 Poincaré 点形成分形结构的点云</p>
                  <p>• 滑杆连续调节 γ 可观察转变的中间形态</p>
                  <p>• Melnikov 判据卡片随参数实时更新</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="horseshoe" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex justify-center">
              <HorseshoeCanvas />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Smale 马蹄映射（直接迭代）</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>单位正方形 D = [0,1]² 上的分段映射：</p>
                  <MathTex
                    tex="f(x,y) = \begin{cases} \left(\dfrac{x}{3},\ 2y\right), & y \le \tfrac{1}{2} \\[10pt] \left(1-\dfrac{x}{3},\ 2(1-y)\right), & y > \tfrac{1}{2} \end{cases}"
                    display
                    className="text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    水平压缩 1/3、竖直拉伸 2 倍并折叠回 D。图中每个像素点都是对随机初始点直接迭代/逆迭代得到的真实像点，不是示意图。
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>不变集 Λ 的性质</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <MathTex tex="\Lambda = \bigcap_{n=-\infty}^{\infty} f^{n}(D)" display />
                  <p>• 拓扑共轭于双边符号动力系统 Σ₂</p>
                  <p>• 含可数无穷多周期轨道</p>
                  <p>• 含不可数无穷多非周期轨道</p>
                  <p>• 混沌三要素均满足：对初值敏感依赖、拓扑传递性、周期轨道稠密</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
