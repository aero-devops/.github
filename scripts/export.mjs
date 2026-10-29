// Renders every Aero image from the plates in plates.mjs.
// Run from organization-foundry: npm run export
// AERO_ROOT overrides the workspace folder that holds core/, shell/, site/.
import sharp from 'sharp';
import { create as createFont } from 'fontkitten';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INKS, core, markSmall, shell, study07, toRaw, wind } from './plates.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = process.env.AERO_ROOT ? resolve(process.env.AERO_ROOT) : resolve(root, '..');
const mono = createFont(await readFile(resolve(root, 'assets/fonts/SpaceMono-Regular.ttf')));
const [INK, , ASH, CHALK] = INKS.four.colours;
const rgb = (c) => `rgb(${c.join(',')})`;

function text(content, x, y, size) {
  const scale = size / mono.unitsPerEm;
  let cursor = x; const paths = [];
  for (const glyph of mono.glyphsForString(content)) {
    const outline = glyph.path.toSVG();
    if (outline) paths.push(`<path d="${outline}" transform="translate(${cursor.toFixed(2)} ${y}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})"/>`);
    cursor += glyph.advanceWidth * scale;
  }
  return { svg: paths.join(''), width: cursor - x };
}

async function save(buffer, destination) {
  const file = resolve(workspace, destination);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buffer);
  console.log(`${destination}  ${buffer.length} bytes`);
}

/**
 * A plate: the picture, and under it a caption strip in still air. The
 * strip names the plate in ash and says what the software does in chalk.
 */
async function render({ width, height, cell, plate, inks, caption, destination }) {
  const W = width / cell;
  const H = Math.round(height / cell) - (caption ? 26 : 0);
  const raw = toRaw(plate(W, H), W, H, INKS[inks]);
  let image = sharp(raw, { raw: { width: W, height: H, channels: 3 } }).resize(W * cell, H * cell, { kernel: 'nearest' });
  if (caption) {
    const picture = await image.png().toBuffer();
    const margin = 16 * cell; const baseline = H * cell + 13 * cell; const size = 4.5 * cell;
    const name = text(caption.name, margin, baseline, size);
    const line = text(caption.line, 0, baseline, size);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="${rgb(INK)}"/>
      <g fill="${rgb(ASH)}">${name.svg}</g>
      <g fill="${rgb(CHALK)}" transform="translate(${(width - margin - line.width).toFixed(2)} 0)">${line.svg}</g>
    </svg>`;
    image = sharp(Buffer.from(svg)).composite([{ input: picture, left: 0, top: 0 }]);
  }
  const colours = inks === 'two' && !caption ? 2 : 4;
  await save(await image.png({ palette: true, colors: colours, compressionLevel: 9 }).toBuffer(), destination);
}

const ORG = 'Tools for running and observing applications on machines you choose.';
const CORE = 'Core starts, stops and watches named services from one local dashboard.';
const SHELL = 'Shell runs one process, keeps its output, and stops it on request.';

// Plate 1, Pressure: the organization.
await render({ width: 1600, height: 600, cell: 4, inks: 'four', plate: (W, H) => study07(W, H), caption: { name: 'Plate 1   Pressure', line: ORG }, destination: 'organization-foundry/assets/org-banner.png' });
// Plate 4, Wind: the website's link card. No name in the picture, so the caption carries it.
await render({ width: 1280, height: 640, cell: 4, inks: 'four', plate: (W, H) => wind(W, H, { calmTone: 0.38 }), caption: { name: 'Aero   Plate 4   Wind', line: ORG }, destination: 'organization-foundry/assets/website-social.png' });
// Plate 2, Release: Core.
await render({ width: 1600, height: 600, cell: 4, inks: 'two', plate: (W, H) => core(W, H), caption: { name: 'Plate 2   Release', line: CORE }, destination: 'core/docs/banner.png' });
await render({ width: 1280, height: 640, cell: 4, inks: 'two', plate: (W, H) => core(W, H), caption: { name: 'Plate 2   Release', line: CORE }, destination: 'core/docs/social-preview.png' });
// Plate 3, Break-up: Shell.
await render({ width: 1600, height: 600, cell: 4, inks: 'two', plate: (W, H) => shell(W, H), caption: { name: 'Plate 3   Break-up', line: SHELL }, destination: 'shell/docs/banner.png' });
await render({ width: 1280, height: 640, cell: 4, inks: 'two', plate: (W, H) => shell(W, H), caption: { name: 'Plate 3   Break-up', line: SHELL }, destination: 'shell/docs/social-preview.png' });

// The mark is the lowercase a and nothing else: the avatar, and the favicon
// drawn on its own coarser grid.
await render({ width: 512, height: 512, cell: 4, inks: 'two', plate: (W, H) => markSmall(W, H, { k: 12 }), destination: 'organization-foundry/assets/avatar.png' });
await render({ width: 64, height: 64, cell: 2, inks: 'two', plate: (W, H) => markSmall(W, H), destination: 'organization-foundry/assets/favicon.png' });

// The website's plates, captions set in HTML.
await render({ width: 1600, height: 560, cell: 4, inks: 'four', plate: (W, H) => study07(W, H, { k: 5, xr: 0.1 }), destination: 'site/assets/plate-1-wide.png' });
await render({ width: 720, height: 720, cell: 4, inks: 'four', plate: (W, H) => study07(W, H, { k: 3, xr: 0.1 }), destination: 'site/assets/plate-1-narrow.png' });
await render({ width: 1600, height: 480, cell: 4, inks: 'two', plate: (W, H) => core(W, H), destination: 'site/assets/plate-2.png' });
await render({ width: 1600, height: 480, cell: 4, inks: 'two', plate: (W, H) => shell(W, H), destination: 'site/assets/plate-3.png' });
await render({ width: 1600, height: 480, cell: 4, inks: 'four', plate: (W, H) => wind(W, H, { calmTone: 0.38 }), destination: 'site/assets/plate-4.png' });
for (const [from, to] of [['organization-foundry/assets/website-social.png', 'site/assets/social.png'], ['organization-foundry/assets/favicon.png', 'site/assets/favicon.png'], ['organization-foundry/assets/favicon.png', 'core/public/favicon.png']]) {
  await save(await readFile(resolve(workspace, from)), to);
}
