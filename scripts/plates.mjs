// Aero plates: the compositions behind every image. Each returns a field of
// values (0 = still air, 1 = fastest), the cells that are solid letters, and
// how it is dithered. toRaw() prints one in two inks or in four.
import { create as createFont } from 'fontkitten';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dither, textBitmap } from './flow.mjs';
import { atkinsonLevels, distance, flowField, hash, smooth, stampInto, windMarks } from './air.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const display = createFont(await readFile(resolve(root, 'assets/fonts/PixelifySans.ttf')));

export const INKS = {
  two: { levels: [0, 1], colours: [[8, 8, 8], [245, 245, 240]] },
  four: { levels: [0, 0.3, 0.6, 1], colours: [[8, 8, 8], [58, 58, 55], [142, 142, 136], [245, 245, 240]] },
};

// Ordered (Bayer) dither between neighbouring tones: the regular grain of study 07.
function bayerLevels(values, W, H, levels) {
  const out = new Uint8Array(W * H); const n = levels.length - 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = Math.min(1, Math.max(0, values[y * W + x])) * n;
    const band = Math.min(n - 1, Math.floor(v));
    out[y * W + x] = band + (dither(v - band, x, y) ? 1 : 0);
  }
  return out;
}

/** Dither a composition into an RGB buffer of W x H cells. */
export function toRaw({ values, letters, ordered = false }, W, H, inks) {
  const idx = ordered ? bayerLevels(values, W, H, inks.levels) : atkinsonLevels(values, W, H, inks.levels);
  const top = inks.levels.length - 1;
  const raw = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) raw.set(inks.colours[letters?.[i] ? top : idx[i]], i * 3);
  return raw;
}

const frame = (x, y, W, H, m) => smooth(0, m, x) * smooth(0, m, W - 1 - x) * smooth(0, m * 0.6, y) * smooth(0, m * 0.6, H - 1 - y);
const tonemap = (raw, top) => top * (1 - Math.exp(-raw * 1.8));

// Letters keep a band of clear ink around them, so type never sits on grain.
function clearAround(values, letters, W, H, inner, outer) {
  const d = distance(letters, W, H);
  for (let i = 0; i < W * H; i++) values[i] *= smooth(inner, outer, d[i]);
}

// ---------------------------------------------------------------- Aero
// Plate 1, Pressure. Study 07: brightness is air speed, the wake glows
// where it is turbulent, ordered dither. Letters keep one cell of clear air,
// and the wake dissipates before the frame so no vortex is cut.
export function study07(W, H, { k = 4, xr = 0.12 } = {}) {
  const word = textBitmap(display, 'Aero', k);
  const body = { ...word, x: Math.round(W * xr), y: Math.round(H / 2 - word.h / 2) };
  const f = flowField({ W, H, bodies: [body], street: { strength: 3, decay: 9, iterations: 900 } });
  const tail = body.x + body.w; const centre = body.y + body.h / 2;
  const values = new Float32Array(W * H); const letters = new Uint8Array(W * H);
  stampInto(letters, W, H, body);
  const d = distance(letters, W, H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (f.solid[i] || d[i] < 1.5) continue;
    const down = Math.max(0, x - tail);
    const inWake = Math.exp(-(((y - centre) / (body.h * 0.5 + down * 0.05)) ** 2));
    // the wake dissipates before the edge, so no vortex is cut by the frame
    const settle = 1 - smooth(W * 0.8, W - 3, x);
    values[i] = Math.min(0.85, Math.max(0, f.speed[i] - 1) * 2.6 + inWake * Math.min(1, down / 40) * 0.55) * settle;
  }
  for (let x = 0; x < W; x++) { values[x] = 1; values[(H - 1) * W + x] = 1; }
  return { values, letters, ordered: true };
}

// ---------------------------------------------------------------- Core
// Core is the manifold every service is released from: each running
// service is a jet leaving the name. A stopped service is no longer fed, so
// its jet has come loose from the name and drifts downstream as a fading puff.
export function core(W, H, { k = 4, top = 1 } = {}) {
  const word = textBitmap(display, 'Core', k);
  const body = { ...word, x: Math.round(W * 0.1), y: Math.round(H / 2 - word.h / 2) };
  const ox = body.x + body.w + 3; const centre = body.y + body.h / 2;
  const jets = [-0.34, -0.2, -0.07, 0.06, 0.19, 0.33].map((a, n) => ({
    a, y: centre + (n - 2.5) * (body.h / 7), stopped: false,
    reach: W * (0.9 + 0.3 * hash(n + 11)), power: 0.75 + 0.35 * hash(n + 5),
  }));
  const values = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = ox; x < W; x++) {
    let v = 0;
    for (const j of jets) {
      const dx = x - ox; const along = dx / Math.cos(j.a);
      const cy = j.y + Math.tan(j.a) * dx;
      let width = 0.8 + along * 0.05;
      let life = Math.exp(-along / j.reach);
      if (j.stopped) {
        // the last of the smoke: detached from the source, spread wider
        const tailEnd = W * 0.16; const head = W * 0.42;
        width *= 1.5;
        life = smooth(tailEnd, tailEnd + 22, along) * (1 - smooth(head - 30, head, along)) * 0.55;
      }
      // a jet that climbs toward the edge thins out before it gets there
      life *= 1 - smooth(H * 0.26, H * 0.44, Math.abs(cy - H / 2));
      const across = (y - cy) / width;
      v += Math.exp(-across * across) * j.power * Math.min(1, 1.6 / Math.sqrt(width)) * life * smooth(0, 6, dx);
    }
    values[y * W + x] = Math.min(top, v) * frame(x, y, W, H, 12);
  }
  const letters = new Uint8Array(W * H); stampInto(letters, W, H, body);
  clearAround(values, letters, W, H, 2, 4);
  return { values, letters };
}

// ---------------------------------------------------------------- Shell
// The charge is the word. The S is whole; in every later letter more pixels
// have been carried off downstream, and the pieces gather into the wave.
export function shell(W, H, { k = 4, flown = 0.9, wave = 1, text = 'Shell', x0r = 0.14, beam = true, freq = 0.045, ampMax = 0.26, ampRate = null, edge = 10, gatherLen = 0.16, flyLen = 28, waveHalf = 1.1 } = {}) {
  const word = textBitmap(display, text, k);
  const x0 = Math.round(W * x0r); const y0 = Math.round(H / 2 - word.h / 2);
  const centre = y0 + word.h / 2; const x1 = x0 + word.w;
  const values = new Float32Array(W * H);
  for (let x = 0; beam && x < x0 - 2; x++) for (let y = 0; y < H; y++) {
    const dy = (y - centre) / (0.7 + 1.6 * smooth(x0 * 0.5, x0, x));
    values[y * W + x] = Math.exp(-dy * dy) * (0.35 + 0.8 * smooth(0, x0, x)) * smooth(0, 10, x);
  }
  const letters = new Uint8Array(W * H);
  for (let y = 0; y < word.h; y++) for (let x = 0; x < word.w; x++) {
    if (!word.bits[y * word.w + x]) continue;
    const t = x / word.w;
    const gx = x0 + x; const gy = y0 + y; const key = gy * 4099 + gx;
    if (hash(key) < 0.62 * Math.pow(smooth(0.18, 1, t), 1.3)) {
      const fly = Math.round(x1 - gx + 3 + hash(key + 1) * flyLen * (0.4 + t));
      if (gx + fly < W) values[gy * W + gx + fly] = Math.max(values[gy * W + gx + fly], flown);
      continue;
    }
    letters[gy * W + gx] = 1;
  }
  for (let x = x1 + 1; x < W; x++) {
    const s = x - x1;
    const gather = Math.exp(-s / (W * gatherLen));
    const amp = Math.min(H * ampMax, s * (ampRate ?? 0.075 * (0.045 / freq)));
    const cy = centre + amp * Math.sin(s * freq);
    const half = waveHalf + (word.h * 0.38) * gather + s * 0.006;
    const bright = (0.5 + 0.35 * (1 - gather)) * Math.exp(-s / (W * 1.3)) * wave;
    for (let y = Math.floor(cy - half * 2); y <= Math.ceil(cy + half * 2); y++) {
      if (y < 0 || y >= H) continue;
      const i = y * W + x; const d = (y - cy) / half;
      values[i] = Math.max(values[i], Math.exp(-d * d * 1.4) * bright * (0.55 + 0.45 * (1 - gather)));
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) values[y * W + x] *= frame(x, y, W, H, edge);
  for (let i = 0; i < W * H; i++) if (letters[i]) values[i] = 0;
  return { values, letters };
}

// ---------------------------------------------------------------- Wind
// Marks traced along the real flow off an unseen obstacle. In four tones
// the calm far field drops to graphite and only disturbed air reaches chalk,
// so the picture gains depth: a quiet plane behind a lively one.
export function wind(W, H, { calmTone = 1 } = {}) {
  const ghost = { w: 10, h: Math.round(H * 0.22), x: Math.round(W * 0.2), y: Math.round(H * 0.39) };
  ghost.bits = new Uint8Array(ghost.w * ghost.h).fill(1);
  const f = flowField({ W, H, bodies: [ghost], street: { strength: 3.4, decay: 7, growth: 0.04 } });
  const values = new Float32Array(W * H);
  windMarks(f, values, { spacing: 4, length: 11, seed: 7, calm: calmTone < 1 ? 0.55 : 0.82 });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const disturbed = Math.min(1, Math.abs(f.speed[i] - 1) * 4 + Math.abs(f.v[i]) * 3);
    values[i] *= (calmTone + (1 - calmTone) * disturbed) * frame(x, y, W, H, 16);
  }
  return { values };
}

// ---------------------------------------------------------------- mark
// The mark is Plate 3 in one letter: the lowercase a is whole on its left,
// losing pixels on its right, and what it loses gathers into a short wave.
export function mark(W, H, { k = 10 } = {}) {
  return shell(W, H, {
    text: 'a', k, x0r: 0.08, beam: false, freq: (Math.PI * 2) / (W * 0.46), ampMax: 0.14,
    ampRate: 0.5, edge: 3, gatherLen: 0.06, flyLen: W * 0.3, flown: 0.55, wave: 1.5, waveHalf: W / 48,
  });
}

// The mark: the lowercase a, whole, centred, nothing else.
export function markSmall(W, H, { k = 4 } = {}) {
  const word = textBitmap(display, 'a', k);
  const letters = new Uint8Array(W * H);
  stampInto(letters, W, H, { ...word, x: Math.round(W / 2 - word.w / 2), y: Math.round(H / 2 - word.h / 2) });
  return { values: new Float32Array(W * H), letters };
}
