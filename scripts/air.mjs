// Aero prints: air drawn as tone, not as lines.
//
// Air is invisible; what we can show is what it does. Brightness is air
// speed: still air is ink, fast air is chalk, and the grain in between is
// produced by error diffusion (Atkinson's 1-bit Macintosh dither), so every
// gradient reads like a printed photograph rather than a pattern.
import { solve, smooth, hash } from './flow.mjs';

export { smooth, hash };

// ---------------------------------------------------------------- dithering

/** Atkinson error diffusion: 3/4 of the error is passed on, which keeps
 *  highlights and shadows clean and leaves mid-tones as an organic grain. */
export function atkinson(values, W, H) {
  const e = Float32Array.from(values);
  const out = new Uint8Array(W * H);
  const push = (x, y, v) => { if (x >= 0 && x < W && y < H) e[y * W + x] += v; };
  // Serpentine scan: alternate direction each row so the diffused error
  // doesn't comb into diagonal worms.
  for (let y = 0; y < H; y++) {
    const dir = y % 2 ? -1 : 1;
    for (let n = 0; n < W; n++) {
      const x = dir > 0 ? n : W - 1 - n;
      const i = y * W + x;
      const on = e[i] >= 0.5 ? 1 : 0;
      out[i] = on;
      const err = (e[i] - on) / 8;
      push(x + dir, y, err); push(x + 2 * dir, y, err);
      push(x - dir, y + 1, err); push(x, y + 1, err); push(x + dir, y + 1, err);
      push(x, y + 2, err);
    }
  }
  return out;
}

/** Atkinson diffusion onto several tones (levels in 0..1, ascending).
 *  Returns the index of the chosen level per cell. */
export function atkinsonLevels(values, W, H, levels) {
  const e = Float32Array.from(values);
  const out = new Uint8Array(W * H);
  const push = (x, y, v) => { if (x >= 0 && x < W && y < H) e[y * W + x] += v; };
  for (let y = 0; y < H; y++) {
    const dir = y % 2 ? -1 : 1;
    for (let n = 0; n < W; n++) {
      const x = dir > 0 ? n : W - 1 - n;
      const i = y * W + x;
      let best = 0;
      for (let l = 1; l < levels.length; l++) if (Math.abs(levels[l] - e[i]) < Math.abs(levels[best] - e[i])) best = l;
      out[i] = best;
      const err = (e[i] - levels[best]) / 8;
      push(x + dir, y, err); push(x + 2 * dir, y, err);
      push(x - dir, y + 1, err); push(x, y + 1, err); push(x + dir, y + 1, err);
      push(x, y + 2, err);
    }
  }
  return out;
}

// ---------------------------------------------------------------- shapes

export function stampInto(mask, W, H, b, value = 1) {
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (!b.bits[y * b.w + x]) continue;
    const gx = b.x + x; const gy = b.y + y;
    if (gx >= 0 && gx < W && gy >= 0 && gy < H) mask[gy * W + gx] = value;
  }
}

/** Distance in cells to the nearest set cell (two-pass chamfer). */
export function distance(mask, W, H) {
  const d = new Float32Array(W * H).fill(1e9);
  for (let i = 0; i < W * H; i++) if (mask[i]) d[i] = 0;
  const a = 1, b = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x > 0) d[i] = Math.min(d[i], d[i - 1] + a);
    if (y > 0) {
      d[i] = Math.min(d[i], d[i - W] + a);
      if (x > 0) d[i] = Math.min(d[i], d[i - W - 1] + b);
      if (x < W - 1) d[i] = Math.min(d[i], d[i - W + 1] + b);
    }
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (x < W - 1) d[i] = Math.min(d[i], d[i + 1] + a);
    if (y < H - 1) {
      d[i] = Math.min(d[i], d[i + W] + a);
      if (x < W - 1) d[i] = Math.min(d[i], d[i + W + 1] + b);
      if (x > 0) d[i] = Math.min(d[i], d[i + W - 1] + b);
    }
  }
  return d;
}

// ---------------------------------------------------------------- flow

/**
 * Potential flow around bodies plus a von Karman street behind each one.
 * Returns the stream function and the air speed in every cell (free stream
 * speed is 1).
 */
export function flowField({ W, H, bodies, street = {} }) {
  const solid = new Uint8Array(W * H);
  const bodyPsi = [0];
  bodies.forEach((body, n) => {
    const hull = { ...body, bits: new Uint8Array(body.w * body.h) };
    for (let y = 0; y < body.h; y++) {
      let a = -1, z = -1;
      for (let x = 0; x < body.w; x++) if (body.bits[y * body.w + x]) { if (a < 0) a = x; z = x; }
      for (let x = a; a >= 0 && x <= z; x++) hull.bits[y * body.w + x] = 1;
    }
    stampInto(solid, W, H, hull, n + 1);
    bodyPsi.push(H - 1 - (body.y + body.h / 2));
  });
  for (let x = 0; x < W; x++) { solid[x] = 255; solid[(H - 1) * W + x] = 254; }
  bodyPsi[255] = H - 1; bodyPsi[254] = 0;
  const psi = solve(W, H, solid, bodyPsi, street.iterations ?? 1400);

  const vortices = [];
  for (const body of bodies) {
    if (!street.strength) break;
    const tail = body.x + body.w; const centre = body.y + body.h / 2;
    const h = body.h * 0.9; const l = h / 0.281;
    for (let n = 0; tail + l * (n * 0.5 + 0.35) < W + l; n++) {
      const upper = n % 2 === 0;
      vortices.push({
        x: tail + l * (n * 0.5 + 0.35), y: centre + (upper ? -h / 2 : h / 2),
        g: (upper ? -1 : 1) * street.strength * Math.exp(-n / (street.decay ?? 9)),
        rc: h * 0.32 + n * h * (street.growth ?? 0.03),
      });
    }
  }
  for (let y = 1; y < H - 1 && vortices.length; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (solid[i]) continue;
    let add = 0;
    for (const v of vortices) {
      const dx = x - v.x; const dy = y - v.y; const r2 = dx * dx + dy * dy;
      if (r2 < 25 * v.rc * v.rc) add += v.g * v.rc * Math.exp(-r2 / (2 * v.rc * v.rc));
    }
    psi[i] += add * smooth(0, 4, y) * smooth(0, 4, H - 1 - y);
  }

  const speed = new Float32Array(W * H);
  const u = new Float32Array(W * H); const v = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (solid[i]) continue;
    // psi increases upward (psi = H-1-y in free stream), so u = -dpsi/dy_down
    u[i] = (psi[i - W] - psi[i + W]) / 2;
    v[i] = (psi[i + 1] - psi[i - 1]) / 2;
    speed[i] = Math.hypot(u[i], v[i]);
  }
  return { W, H, psi, solid, speed, u, v, vortices };
}

/**
 * Wind marks: short strokes that follow the flow from jittered seed points,
 * bright at the head and fading toward the tail, longer where air is fast.
 */
export function windMarks(field, ink, { spacing = 6, length = 10, seed = 1, weight = 1, calm = 0 } = {}) {
  const { W, H, u, v, solid } = field;
  for (let gy = 0; gy < H; gy += spacing) for (let gx = 0; gx < W; gx += spacing) {
    const k = gy * 7919 + gx * 104729 + seed;
    let x = gx + hash(k) * spacing; let y = gy + hash(k + 1) * spacing;
    const i0 = (y | 0) * W + (x | 0);
    if (!u[i0] && !v[i0]) continue;
    // In calm air most seeds stay empty; disturbed air keeps every mark.
    const disturbance = Math.min(1, Math.abs(Math.hypot(u[i0], v[i0]) - 1) * 4 + Math.abs(v[i0]) * 3);
    if (hash(k + 3) < calm * (1 - disturbance)) continue;
    const w = weight * (0.45 + 0.55 * disturbance);
    const steps = Math.round(length * (0.5 + hash(k + 2)) * Math.min(2, Math.hypot(u[i0], v[i0])));
    for (let s = 0; s < steps; s++) {
      const i = (y | 0) * W + (x | 0);
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || solid[i]) break;
      const sp = Math.hypot(u[i], v[i]) || 1;
      const t = s / steps;
      ink[i] = Math.max(ink[i], w * (0.35 + 0.65 * t));
      x += u[i] / sp * 0.8; y += v[i] / sp * 0.8;
    }
  }
}
