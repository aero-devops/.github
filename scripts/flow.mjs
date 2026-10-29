// Shared building blocks for the Aero plates: the 8x8 Bayer threshold,
// Pixelify Sans rasterized onto the cell grid, and the stream-function
// solver for uniform flow around solid bodies. See DESIGN_SYSTEM.md.

const BAYER = (() => {
  const b = [[0, 2], [3, 1]];
  let m = b;
  while (m.length < 8) {
    const n = m.length;
    const next = Array.from({ length: n * 2 }, () => new Array(n * 2));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = m[y][x] * 4;
      next[y][x] = v; next[y][x + n] = v + 2; next[y + n][x] = v + 3; next[y + n][x + n] = v + 1;
    }
    m = next;
  }
  return m.map((row) => row.map((v) => (v + 0.5) / 64));
})();

export function dither(value, x, y) {
  return value > BAYER[y & 7][x & 7];
}

// Rasterize Pixelify Sans onto the cell grid. One font pixel (~91 units) is
// exactly `k` cells, so letterforms share the grid with the smoke.
const FONT_PIXEL = 91;
function polygons(svgPath) {
  const polys = [];
  let cur = null;
  for (const [, cmd, a, b] of svgPath.matchAll(/([MLZ])\s*(-?[\d.]+)?\s*(-?[\d.]+)?/g)) {
    if (cmd === 'M') { cur = [[+a, +b]]; polys.push(cur); }
    else if (cmd === 'L') cur.push([+a, +b]);
  }
  return polys;
}
function inside(polys, x, y) {
  let hit = false;
  for (const p of polys) for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i]; const [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
export function textBitmap(font, text, k, tracking = 1) {
  const unit = FONT_PIXEL / k;
  const top = 640; const bottom = -20;
  const rows = Math.round((top - bottom) / unit);
  const glyphs = font.glyphsForString(text);
  const cols = Math.ceil(glyphs.reduce((w, g) => w + g.advanceWidth + tracking * FONT_PIXEL, 0) / unit);
  const bits = new Uint8Array(cols * rows);
  let origin = 0;
  for (const glyph of glyphs) {
    const polys = polygons(glyph.path.toSVG());
    const span = Math.ceil(glyph.advanceWidth / unit);
    const start = Math.round(origin / unit);
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < span; cx++) {
      const ux = (cx + 0.5) * unit; const uy = top - (cy + 0.5) * unit;
      if (start + cx < cols && inside(polys, ux, uy)) bits[cy * cols + start + cx] = 1;
    }
    origin += glyph.advanceWidth + tracking * FONT_PIXEL;
  }
  return trim({ w: cols, h: rows, bits });
}
function trim(b) {
  let x0 = b.w, x1 = -1, y0 = b.h, y1 = -1;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (b.bits[y * b.w + x]) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const w = x1 - x0 + 1; const h = y1 - y0 + 1; const bits = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) bits[y * w + x] = b.bits[(y + y0) * b.w + x + x0];
  return { w, h, bits };
}

// Solve the stream function psi for uniform flow between two walls around
// solid bodies (Laplace with psi constant on each body), by SOR.
export function solve(W, H, solid, bodyPsi, iterations) {
  const psi = new Float64Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    psi[i] = solid[i] ? bodyPsi[solid[i]] : H - 1 - y;
  }
  const omega = 1.92;
  for (let it = 0; it < iterations; it++) {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (solid[i]) continue;
      const avg = (psi[i - 1] + psi[i + 1] + psi[i - W] + psi[i + W]) / 4;
      psi[i] += omega * (avg - psi[i]);
    }
  }
  return psi;
}

export const smooth = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

export const hash = (n) => {
  let h = (Math.round(n * 7919) * 0x27d4eb2d + 0x165667b1) | 0;
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16; h = Math.imul(h, 0x27d4eb2d);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};
