// Core numerical methods for ODE and dynamical systems

export type Vector2 = [number, number];
export type Vector3 = [number, number, number];
export type VectorN = number[];

export interface ODESystem2D {
  f: (x: number, y: number) => number;
  g: (x: number, y: number) => number;
}

export interface ODESystem3D {
  f: (x: number, y: number, z: number) => number;
  g: (x: number, y: number, z: number) => number;
  h: (x: number, y: number, z: number) => number;
}

// RK4 for 2D system
export function rk4Step2D(
  system: ODESystem2D,
  x: number,
  y: number,
  dt: number
): Vector2 {
  const k1x = system.f(x, y);
  const k1y = system.g(x, y);
  const k2x = system.f(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y);
  const k2y = system.g(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y);
  const k3x = system.f(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y);
  const k3y = system.g(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y);
  const k4x = system.f(x + dt * k3x, y + dt * k3y);
  const k4y = system.g(x + dt * k3x, y + dt * k3y);
  return [
    x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y),
  ];
}

// RK4 for 3D system
export function rk4Step3D(
  system: ODESystem3D,
  x: number,
  y: number,
  z: number,
  dt: number
): Vector3 {
  const k1x = system.f(x, y, z);
  const k1y = system.g(x, y, z);
  const k1z = system.h(x, y, z);
  const k2x = system.f(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, z + 0.5 * dt * k1z);
  const k2y = system.g(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, z + 0.5 * dt * k1z);
  const k2z = system.h(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, z + 0.5 * dt * k1z);
  const k3x = system.f(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, z + 0.5 * dt * k2z);
  const k3y = system.g(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, z + 0.5 * dt * k2z);
  const k3z = system.h(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, z + 0.5 * dt * k2z);
  const k4x = system.f(x + dt * k3x, y + dt * k3y, z + dt * k3z);
  const k4y = system.g(x + dt * k3x, y + dt * k3y, z + dt * k3z);
  const k4z = system.h(x + dt * k3x, y + dt * k3y, z + dt * k3z);
  return [
    x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y),
    z + (dt / 6) * (k1z + 2 * k2z + 2 * k3z + k4z),
  ];
}

// Integrate trajectory for 2D system
export function integrate2D(
  system: ODESystem2D,
  x0: number,
  y0: number,
  dt: number,
  steps: number
): Vector2[] {
  const traj: Vector2[] = [[x0, y0]];
  let [x, y] = [x0, y0];
  for (let i = 0; i < steps; i++) {
    [x, y] = rk4Step2D(system, x, y, dt);
    traj.push([x, y]);
    // Break if diverging
    if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) break;
  }
  return traj;
}

// Integrate trajectory for 3D system
export function integrate3D(
  system: ODESystem3D,
  x0: number,
  y0: number,
  z0: number,
  dt: number,
  steps: number
): Vector3[] {
  const traj: Vector3[] = [[x0, y0, z0]];
  let [x, y, z] = [x0, y0, z0];
  for (let i = 0; i < steps; i++) {
    [x, y, z] = rk4Step3D(system, x, y, z, dt);
    traj.push([x, y, z]);
    if (!isFinite(x) || !isFinite(y) || !isFinite(z) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6 || Math.abs(z) > 1e6) break;
  }
  return traj;
}

// Map world coordinates to canvas coordinates
export function worldToCanvas(
  wx: number,
  wy: number,
  canvasW: number,
  canvasH: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): [number, number] {
  const cx = ((wx - xMin) / (xMax - xMin)) * canvasW;
  const cy = canvasH - ((wy - yMin) / (yMax - yMin)) * canvasH;
  return [cx, cy];
}

// Linear system from matrix A = [[a, b], [c, d]]
export function linearSystem2D(a: number, b: number, c: number, d: number): ODESystem2D {
  return {
    f: (x, y) => a * x + b * y,
    g: (x, y) => c * x + d * y,
  };
}

// Jacobian at point for general 2D system (numerical)
export function numericalJacobian2D(
  system: ODESystem2D,
  x: number,
  y: number,
  h = 1e-6
): [[number, number], [number, number]] {
  const fx = (system.f(x + h, y) - system.f(x - h, y)) / (2 * h);
  const fy = (system.f(x, y + h) - system.f(x, y - h)) / (2 * h);
  const gx = (system.g(x + h, y) - system.g(x - h, y)) / (2 * h);
  const gy = (system.g(x, y + h) - system.g(x, y - h)) / (2 * h);
  return [[fx, fy], [gx, gy]];
}

// Eigenvalues of 2x2 matrix
export function eigenvalues2x2(a: number, b: number, c: number, d: number): [number, number] | [number, number, number, number] {
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  if (disc >= 0) {
    const sqrtDisc = Math.sqrt(disc);
    return [(tr + sqrtDisc) / 2, (tr - sqrtDisc) / 2];
  } else {
    const sqrtDisc = Math.sqrt(-disc);
    return [tr / 2, sqrtDisc / 2, tr / 2, -sqrtDisc / 2]; // [re1, im1, re2, im2]
  }
}

// Real eigenvectors of 2x2 matrix (one per real eigenvalue), normalized to max |component| = 1.
// Returns null entries for complex eigenvalue pairs (no real eigen-directions).
export function eigenvectors2x2(
  a: number,
  b: number,
  c: number,
  d: number
): { lambda: number; vec: [number, number] }[] | null {
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const lambdas = [(tr + sqrtDisc) / 2, (tr - sqrtDisc) / 2];
  // NOTE: characteristic eq is λ² - tr·λ + det = 0 -> λ = (tr ± √disc)/2
  return lambdas.map((lambda) => {
    let v: [number, number];
    if (Math.abs(b) > 1e-12) {
      v = [b, lambda - a];
    } else if (Math.abs(c) > 1e-12) {
      v = [lambda - d, c];
    } else {
      // diagonal matrix
      v = Math.abs(lambda - a) < 1e-12 ? [1, 0] : [0, 1];
    }
    const m = Math.max(Math.abs(v[0]), Math.abs(v[1]));
    if (m < 1e-12) v = [1, 0];
    else v = [v[0] / m, v[1] / m];
    return { lambda, vec: v };
  });
}

// Fixed point classification for linear 2D system
export function classifyFixedPoint(
  a: number, b: number, c: number, d: number
): {
  type: string;
  stability: string;
  description: string;
  eigenvalues: string;
} {
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;

  let type = '';
  let stability = '';
  let description = '';
  let evStr = '';

  if (det < 0) {
    const sqrtDisc = Math.sqrt(disc);
    type = '鞍点 (Saddle)';
    stability = '不稳定';
    description = '异号实特征值，轨线沿稳定流形趋近、不稳定流形远离';
    evStr = `${((tr + sqrtDisc) / 2).toFixed(3)}, ${((tr - sqrtDisc) / 2).toFixed(3)}`;
  } else if (det > 0) {
    if (disc > 0) {
      if (tr < 0) {
        type = '稳定结点';
        stability = '渐近稳定';
        description = '同号负实根，所有轨线趋于原点';
      } else {
        type = '不稳定结点';
        stability = '不稳定';
        description = '同号正实根，所有轨线远离原点';
      }
      const sqrtDisc = Math.sqrt(disc);
      evStr = `${((tr + sqrtDisc) / 2).toFixed(3)}, ${((tr - sqrtDisc) / 2).toFixed(3)}`;
    } else if (disc < 0) {
      if (tr < 0) {
        type = '稳定焦点';
        stability = '渐近稳定';
        description = '共轭复根实部<0，螺旋趋近原点';
      } else if (tr > 0) {
        type = '不稳定焦点';
        stability = '不稳定';
        description = '共轭复根实部>0，螺旋远离原点';
      } else {
        type = '中心 (Center)';
        stability = 'Lyapunov稳定';
        description = '纯虚根，闭轨线族（结构不稳定）';
      }
      const re = (tr / 2).toFixed(3);
      const im = (Math.sqrt(-disc) / 2).toFixed(3);
      evStr = `${re} ± ${im}i`;
    } else {
      if (tr < 0) {
        type = '稳定退化结点';
        stability = '渐近稳定';
        description = '负实重根';
      } else {
        type = '不稳定退化结点';
        stability = '不稳定';
        description = '正实重根';
      }
      evStr = `${(tr / 2).toFixed(3)} (重根)`;
    }
  } else {
    type = '非双曲/高阶奇点';
    stability = '不确定';
    description = 'det=0，有零特征值，需高阶分析';
    evStr = '含零特征值';
  }

  return { type, stability, description, eigenvalues: evStr };
}

// Compute Lyapunov exponent for 1D map
export function lyapunov1D(
  f: (x: number) => number,
  df: (x: number) => number,
  x0: number,
  nTransient = 1000,
  nCompute = 5000
): number {
  let x = x0;
  for (let i = 0; i < nTransient; i++) {
    x = f(x);
    if (!isFinite(x)) return NaN;
  }
  let sum = 0;
  for (let i = 0; i < nCompute; i++) {
    x = f(x);
    const d = df(x);
    if (d === 0) return -Infinity;
    if (!isFinite(d)) return NaN;
    sum += Math.log(Math.abs(d));
  }
  return sum / nCompute;
}

// Simple 3D rotation for visualization
export function rotate3D(
  x: number,
  y: number,
  z: number,
  thetaX: number,
  thetaY: number
): [number, number, number] {
  // Rotate around Y axis
  let x1 = x * Math.cos(thetaY) + z * Math.sin(thetaY);
  let z1 = -x * Math.sin(thetaY) + z * Math.cos(thetaY);
  // Rotate around X axis
  let y1 = y * Math.cos(thetaX) - z1 * Math.sin(thetaX);
  let z2 = y * Math.sin(thetaX) + z1 * Math.cos(thetaX);
  return [x1, y1, z2];
}

// Project 3D to 2D with perspective
export function project3D(
  x: number,
  y: number,
  z: number,
  thetaX: number,
  thetaY: number,
  scale: number,
  offsetX: number,
  offsetY: number
): [number, number] {
  const [rx, ry, rz] = rotate3D(x, y, z, thetaX, thetaY);
  const perspective = 800 / (800 + rz);
  return [offsetX + rx * scale * perspective, offsetY + ry * scale * perspective];
}
