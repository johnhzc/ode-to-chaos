import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  logisticMap, logisticMapDerivative,
  cubicMap, cubicMapDerivative,
  tentMap, tentMapDerivative,
} from '@/lib/systems';
import { lyapunov1D } from '@/lib/math';
import MathTex from '@/components/MathTex';

// ===================== Map presets =====================

interface MapPreset {
  name: string;
  f: (mu: number) => (x: number) => number;
  df: (mu: number) => (x: number) => number;
  muMin: number;
  muMax: number;
  defaultMu: number;
  yMin: number;
  yMax: number;
  x0: number;
  equationTex: string;
  classicParams?: { name: string; mu: number }[];
}

const mapPresets: MapPreset[] = [
  {
    name: 'Logistic 映射',
    f: logisticMap,
    df: logisticMapDerivative,
    muMin: 0.5,
    muMax: 4.0,
    defaultMu: 3.5,
    yMin: 0,
    yMax: 1,
    x0: 0.3,
    equationTex: 'x_{n+1} = \\mu\\, x_n\\,(1 - x_n)',
    classicParams: [
      { name: '周期 1（不动点）· μ = 2.5', mu: 2.5 },
      { name: '周期 2 · μ = 3.2', mu: 3.2 },
      { name: '周期 4 · μ = 3.5', mu: 3.5 },
      { name: '倍周期累积点 · μ ≈ 3.5699', mu: 3.5699 },
      { name: '周期 3 窗口（Li–Yorke）· μ ≈ 3.828', mu: 3.828 },
      { name: '完全混沌 · μ = 4.0', mu: 4.0 },
    ],
  },
  {
    name: 'Cubic 映射 (Pitchfork)',
    f: cubicMap,
    df: cubicMapDerivative,
    muMin: -1,
    muMax: 3,
    defaultMu: 2.0,
    yMin: -1.6,
    yMax: 1.6,
    x0: 0.3,
    equationTex: 'x_{n+1} = \\alpha\\, x_n - x_n^{3}',
  },
  {
    name: 'Tent 映射',
    f: tentMap,
    df: tentMapDerivative,
    muMin: 0.5,
    muMax: 2.0,
    defaultMu: 1.5,
    yMin: 0,
    yMax: 1,
    x0: 0.3,
    equationTex: 'x_{n+1} = \\mu \\min(x_n,\\, 1 - x_n)',
  },
];

// Regime detection: iterate, drop transient, count distinct attractor points
function computeRegime(f: (x: number) => number, x0: number): { label: string; color: string } {
  let x = x0;
  for (let i = 0; i < 1000; i++) {
    x = f(x);
    if (!isFinite(x) || Math.abs(x) > 1e6) {
      return { label: '轨道发散', color: 'bg-amber-100 text-amber-700' };
    }
  }
  const samples: number[] = [];
  for (let i = 0; i < 400; i++) {
    x = f(x);
    samples.push(x);
  }
  const uniq = new Set(samples.map((v) => v.toFixed(3))).size;
  if (uniq === 1) return { label: '周期 1（稳定不动点）', color: 'bg-green-100 text-green-700' };
  if (uniq <= 24) return { label: `周期 ${uniq} 轨道`, color: 'bg-blue-100 text-blue-700' };
  return { label: `混沌 / 高周期（吸引子点数 ≈ ${uniq}）`, color: 'bg-red-100 text-red-700' };
}

// ===================== Cobweb plot =====================

function CobwebCanvas({
  f,
  x0,
  nIter,
  xMin,
  xMax,
}: {
  f: (x: number) => number;
  x0: number;
  nIter: number;
  xMin: number;
  xMax: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 40;
    const gw = w - 2 * pad;
    const gh = h - 2 * pad;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    const toCanvas = (x: number, y: number): [number, number] => [
      pad + ((x - xMin) / (xMax - xMin)) * gw,
      h - pad - ((y - xMin) / (xMax - xMin)) * gh,
    ];

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad); ctx.stroke();

    ctx.fillStyle = '#555';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= 5; i++) {
      const val = xMin + (i / 5) * (xMax - xMin);
      const cx = pad + (i / 5) * gw;
      ctx.beginPath(); ctx.moveTo(cx, h - pad - 4); ctx.lineTo(cx, h - pad + 4); ctx.stroke();
      ctx.fillText(val.toFixed(1), cx, h - pad + 6);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const val = xMin + (i / 5) * (xMax - xMin);
      const cy = h - pad - (i / 5) * gh;
      ctx.beginPath(); ctx.moveTo(pad - 4, cy); ctx.lineTo(pad + 4, cy); ctx.stroke();
      ctx.fillText(val.toFixed(1), pad - 6, cy);
    }
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('xₙ', w - pad + 15, h - pad - 5);
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('xₙ₊₁', pad - 5, pad - 5);

    // y = x line
    ctx.strokeStyle = '#999';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const [x0c, y0c] = toCanvas(xMin, xMin);
    const [x1c, y1c] = toCanvas(xMax, xMax);
    ctx.moveTo(x0c, y0c);
    ctx.lineTo(x1c, y1c);
    ctx.stroke();
    ctx.setLineDash([]);

    // f(x) curve
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 400; i++) {
      const x = xMin + (i / 400) * (xMax - xMin);
      const y = f(x);
      if (!isFinite(y)) { started = false; continue; }
      const [cx, cy] = toCanvas(x, y);
      if (!started) { ctx.moveTo(cx, cy); started = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Cobweb
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let x = x0;
    let [cx, cy] = toCanvas(x, 0);
    ctx.moveTo(cx, cy);
    for (let i = 0; i < nIter; i++) {
      const y = f(x);
      if (!isFinite(y) || Math.abs(y) > 1e6) break;
      [cx, cy] = toCanvas(x, y);
      ctx.lineTo(cx, cy);
      [cx, cy] = toCanvas(y, y);
      ctx.lineTo(cx, cy);
      x = y;
    }
    ctx.stroke();

    const [sx, sy] = toCanvas(x0, 0);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [f, x0, nIter, xMin, xMax]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={500}
      className="w-full border rounded-lg"
      style={{ maxWidth: '500px', aspectRatio: '1/1' }}
    />
  );
}

// ===================== Interactive bifurcation diagram =====================

function BifurcationDiagram({
  f,
  muMin,
  muMax,
  yMin,
  yMax,
  x0,
  mu,
  onPick,
}: {
  f: (mu: number) => (x: number) => number;
  muMin: number;
  muMax: number;
  yMin: number;
  yMax: number;
  x0: number;
  mu: number;
  onPick: (mu: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const W = 700;
  const H = 400;
  const PAD = 40;
  const COLS = 500;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    setProgress(0);

    const gw = W - 2 * PAD;
    const gh = H - 2 * PAD;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Axes
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAD, H - PAD); ctx.lineTo(W - PAD, H - PAD); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD, PAD); ctx.lineTo(PAD, H - PAD); ctx.stroke();

    ctx.fillStyle = '#aaa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= 7; i++) {
      const val = muMin + (i / 7) * (muMax - muMin);
      const cx = PAD + (i / 7) * gw;
      ctx.fillText(val.toFixed(1), cx, H - PAD + 4);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const val = yMin + (i / 4) * (yMax - yMin);
      const cy = H - PAD - (i / 4) * gh;
      ctx.fillText(val.toFixed(1), PAD - 4, cy);
    }
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('μ', W / 2, H - PAD + 20);
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('x（吸引子采样）', 0, 0);
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#64748b';
    ctx.fillText('点击图中任意位置跳转到对应 μ', PAD + 4, PAD - 8);

    const y2c = (x: number) => H - PAD - ((x - yMin) / (yMax - yMin)) * gh;

    let col = 0;
    const computeColumn = () => {
      if (cancelled) return;
      const muI = muMin + (col / (COLS - 1)) * (muMax - muMin);
      const fm = f(muI);
      let x = x0;
      for (let j = 0; j < 400; j++) {
        x = fm(x);
        if (!isFinite(x) || Math.abs(x) > 1e6) { col++; setProgress(col / COLS); if (col < COLS) setTimeout(computeColumn, 0); return; }
      }
      ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
      const cx = PAD + (col / (COLS - 1)) * gw;
      for (let j = 0; j < 90; j++) {
        x = fm(x);
        if (x >= yMin && x <= yMax) {
          ctx.fillRect(cx, y2c(x), 1.5, 1.5);
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
  }, [f, muMin, muMax, yMin, yMax, x0]);

  const lineLeftPct = ((PAD + ((mu - muMin) / (muMax - muMin)) * (W - 2 * PAD)) / W) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Label className="font-semibold">分岔图（横轴 μ，纵轴吸引子 x 值）</Label>
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
          const m = muMin + ((px - PAD) / (W - 2 * PAD)) * (muMax - muMin);
          onPick(Math.min(muMax, Math.max(muMin, m)));
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full border rounded-lg"
          style={{ aspectRatio: `${W}/${H}` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
          style={{ left: `${lineLeftPct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        红线 = 当前 μ = {mu.toFixed(4)} · 单线 = 不动点，线分裂 = 倍周期，弥漫点云 = 混沌，空白带 = 周期窗口
      </p>
    </div>
  );
}

// ===================== Interactive Lyapunov exponent curve =====================

function LyapunovDiagram({
  f,
  df,
  muMin,
  muMax,
  x0,
  mu,
  lamNow,
  onPick,
}: {
  f: (mu: number) => (x: number) => number;
  df: (mu: number) => (x: number) => number;
  muMin: number;
  muMax: number;
  x0: number;
  mu: number;
  lamNow: number;
  onPick: (mu: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 700;
  const H = 300;
  const PAD = 40;
  const LAM_MIN = -2;
  const LAM_MAX = 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gw = W - 2 * PAD;
    const gh = H - 2 * PAD;
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, W, H);

    const y2c = (lam: number) => H - PAD - ((lam - LAM_MIN) / (LAM_MAX - LAM_MIN)) * gh;

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAD, H - PAD); ctx.lineTo(W - PAD, H - PAD); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD, PAD); ctx.lineTo(PAD, H - PAD); ctx.stroke();

    ctx.fillStyle = '#555';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= 7; i++) {
      const val = muMin + (i / 7) * (muMax - muMin);
      const cx = PAD + (i / 7) * gw;
      ctx.fillText(val.toFixed(1), cx, H - PAD + 4);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 6; i++) {
      const val = LAM_MIN + (i / 6) * (LAM_MAX - LAM_MIN);
      ctx.fillText(val.toFixed(1), PAD - 4, y2c(val));
    }
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('μ', W / 2, H - PAD + 20);
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('λ（Lyapunov 指数）', 0, 0);
    ctx.restore();

    // Zero line
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD, y2c(0));
    ctx.lineTo(W - PAD, y2c(0));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#dc2626';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('λ = 0（混沌阈值）', PAD + 6, y2c(0) - 3);

    // Curve
    const N = 400;
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < N; i++) {
      const m = muMin + (i / N) * (muMax - muMin);
      const lam = lyapunov1D(f(m), df(m), x0, 400, 1500);
      if (!isFinite(lam)) { started = false; continue; }
      const lamClamped = Math.max(LAM_MIN, Math.min(LAM_MAX, lam));
      const cx = PAD + (i / N) * gw;
      const cy = y2c(lamClamped);
      if (!started) { ctx.moveTo(cx, cy); started = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, df, muMin, muMax, x0]);

  const lineLeftPct = ((PAD + ((mu - muMin) / (muMax - muMin)) * (W - 2 * PAD)) / W) * 100;

  return (
    <div className="space-y-2">
      <Label className="font-semibold">
        Lyapunov 指数谱 λ(μ) —— 当前 λ ≈ {isFinite(lamNow) ? lamNow.toFixed(4) : 'N/A'}
      </Label>
      <div
        className="relative cursor-crosshair"
        style={{ maxWidth: `${W}px` }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const m = muMin + ((px - PAD) / (W - 2 * PAD)) * (muMax - muMin);
          onPick(Math.min(muMax, Math.max(muMin, m)));
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full border rounded-lg"
          style={{ aspectRatio: `${W}/${H}` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
          style={{ left: `${lineLeftPct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        λ &gt; 0 ⇒ 混沌（对初值敏感依赖）· λ &lt; 0 ⇒ 周期轨道 · 点击跳转对应 μ
      </p>
    </div>
  );
}

// ===================== Section =====================

export default function IterationSection() {
  const [presetIdx, setPresetIdx] = useState(0);
  const preset = mapPresets[presetIdx];
  const [mu, setMu] = useState(preset.defaultMu);
  const [x0, setX0] = useState(preset.x0);
  const [nIter, setNIter] = useState(50);
  const [classicKey, setClassicKey] = useState('custom');
  const [regime, setRegime] = useState(() => computeRegime(preset.f(preset.defaultMu), preset.x0));
  const [lamNow, setLamNow] = useState(() =>
    lyapunov1D(preset.f(preset.defaultMu), preset.df(preset.defaultMu), preset.x0, 400, 1500)
  );

  // Recompute regime & Lyapunov when mu or map changes (cheap for 1D maps)
  useEffect(() => {
    const fm = preset.f(mu);
    setRegime(computeRegime(fm, x0));
    setLamNow(lyapunov1D(fm, preset.df(mu), x0, 400, 1500));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetIdx, mu, x0]);

  const handleMapChange = (idx: number) => {
    setPresetIdx(idx);
    setMu(mapPresets[idx].defaultMu);
    setX0(mapPresets[idx].x0);
    setClassicKey('custom');
  };

  const pickMu = (m: number) => {
    setMu(m);
    setClassicKey('custom');
  };

  // Live theory numbers for Logistic map
  const isLogistic = presetIdx === 0;
  const lam2 = 2 - mu; // multiplier at x* = 1 - 1/μ

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">离散迭代映射：xₙ₊₁ = f(xₙ)</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          蛛网图看迭代几何，分岔图看全局路径，Lyapunov 指数给定量判据。
          选择经典参数或点击分岔图，观察周期性向混沌的转变。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={String(presetIdx)} onValueChange={(v) => handleMapChange(Number(v))}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mapPresets.map((p, i) => (
                  <SelectItem key={i} value={String(i)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {preset.classicParams && (
              <Select
                value={classicKey}
                onValueChange={(v) => {
                  setClassicKey(v);
                  if (v !== 'custom' && preset.classicParams) {
                    setMu(preset.classicParams[Number(v)].mu);
                  }
                }}
              >
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="选择经典参数" />
                </SelectTrigger>
                <SelectContent>
                  {preset.classicParams.map((p, i) => (
                    <SelectItem key={i} value={String(i)}>{p.name}</SelectItem>
                  ))}
                  <SelectItem value="custom">自定义（拖动滑杆 / 点击图）</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Badge variant="outline" className={regime.color}>{regime.label}</Badge>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <Label className="font-semibold">蛛网图（Cobweb Plot）</Label>
              <CobwebCanvas
                f={preset.f(mu)}
                x0={x0}
                nIter={nIter}
                xMin={preset.yMin}
                xMax={preset.yMax}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">参数控制（实时重算）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>μ = {mu.toFixed(4)}</Label>
                  <Slider
                    value={[mu]}
                    min={preset.muMin}
                    max={preset.muMax}
                    step={(preset.muMax - preset.muMin) / 1000}
                    onValueChange={([v]) => { setMu(v); setClassicKey('custom'); }}
                  />
                </div>
                <div>
                  <Label>初值 x₀ = {x0.toFixed(3)}</Label>
                  <Slider
                    value={[x0]}
                    min={preset.yMin}
                    max={preset.yMax}
                    step={(preset.yMax - preset.yMin) / 1000}
                    onValueChange={([v]) => setX0(v)}
                  />
                </div>
                <div>
                  <Label>迭代次数 = {nIter}</Label>
                  <Slider value={[nIter]} min={5} max={200} step={1} onValueChange={([v]) => setNIter(v)} />
                </div>
              </CardContent>
            </Card>
          </div>

          <BifurcationDiagram
            f={preset.f}
            muMin={preset.muMin}
            muMax={preset.muMax}
            yMin={preset.yMin}
            yMax={preset.yMax}
            x0={preset.x0}
            mu={mu}
            onPick={pickMu}
          />

          <LyapunovDiagram
            f={preset.f}
            df={preset.df}
            muMin={preset.muMin}
            muMax={preset.muMax}
            x0={preset.x0}
            mu={mu}
            lamNow={lamNow}
            onPick={pickMu}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>映射方程</CardTitle>
            </CardHeader>
            <CardContent>
              <MathTex tex={preset.equationTex} display />
              <div className="text-sm mt-2">
                <MathTex tex={`\\mu = ${mu.toFixed(4)}`} display className="text-sm" />
              </div>
            </CardContent>
          </Card>

          {isLogistic && (
            <Card>
              <CardHeader>
                <CardTitle>不动点与乘子（实时）</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <MathTex tex="x^{*} = \mu x^{*}(1-x^{*})" display className="text-sm" />
                <MathTex tex="x_1^{*} = 0, \qquad x_2^{*} = 1 - \frac{1}{\mu}" display className="text-sm" />
                <MathTex tex="\lambda(x^{*}) = f^{\prime}(x^{*}) = \mu(1 - 2x^{*})" display className="text-sm" />
                <MathTex
                  tex={`\\lambda(0) = ${mu.toFixed(3)}, \\qquad \\lambda(x_2^{*}) = 2-\\mu = ${lam2.toFixed(3)}`}
                  display
                  className="text-sm"
                />
                <Badge
                  variant="outline"
                  className={Math.abs(lam2) < 1 && mu > 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                >
                  {mu <= 1
                    ? Math.abs(mu) < 1
                      ? 'x* = 0 渐近稳定（|λ| < 1）'
                      : '不动点均不稳定'
                    : Math.abs(lam2) < 1
                      ? 'x* = 1−1/μ 渐近稳定（|2−μ| < 1）'
                      : '两个不动点均不稳定 → 周期轨道或混沌'}
                </Badge>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>周期 → 混沌路径（Logistic）</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• μ &lt; 1：x* = 0 稳定</p>
              <p>• 1 &lt; μ &lt; 3：x* = 1 − 1/μ 稳定</p>
              <p>• μ = 3：首次倍周期分岔</p>
              <p>• μ = 3.449…, 3.544…：周期 2 → 4 → 8 …</p>
              <p>• μ∞ ≈ 3.5699：倍周期累积点</p>
              <p>• μ ≈ 3.828：周期 3 窗口（Li–Yorke）</p>
              <p>• μ = 4：完全混沌</p>
              <MathTex
                tex="\delta = \lim_{n\to\infty}\frac{\mu_n-\mu_{n-1}}{\mu_{n+1}-\mu_n} \approx 4.6692"
                display
                className="text-sm pt-1"
              />
              <MathTex
                tex="\mu = 4:\ \lambda_L = \ln 2 \approx 0.693 > 0"
                display
                className="text-sm"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
