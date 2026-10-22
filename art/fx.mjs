// Battle effects: hit sparks, swing trails, projectiles, dust and shockwaves, drawn with the same
// primitives as the fighters. One 96x96 cell per frame, one row per effect, centred on the middle.
import { C, Img, ellipse, capsule, poly, line, stamp, shade, part, blit } from './lib/raster.mjs';
import { lit } from './lib/humanoid.mjs';
import { writePng } from './lib/sheet.mjs';

export const FX_CELL = 96;
const CX = 48, CY = 48;

const col = (hex) => C(hex);

/** Star with `n` points between inner radius ri and outer ro, rotated by `rot` radians. */
function star(img, cx, cy, n, ro, ri, rot, c, ink = 0) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = rot + (i * Math.PI) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  poly(img, pts, () => c, ink || 0, 1);
}

function ring(img, cx, cy, rx, ry, thick, c) {
  ellipse(img, cx, cy, rx, ry, (i) => (i.q > ((Math.min(rx, ry) - thick) / Math.min(rx, ry)) ** 2 ? c : null));
}

// ------------------------------------------------------------------ sparks
function sparkLight(t) { // 0..1
  const img = new Img(FX_CELL, FX_CELL);
  const r = 8 + t * 14, fade = 1 - t;
  star(img, CX, CY, 6, r, r * 0.35, 0.3, col('#fff4b0'));
  star(img, CX, CY, 6, r * 0.62, r * 0.22, 0.3, col('#ffffff'));
  for (let i = 0; i < 6; i++) {
    const a = 0.3 + (i * Math.PI) / 3 + 0.5, d = r + 3 + t * 10;
    if (fade > 0.3) img.set(Math.round(CX + Math.cos(a) * d), Math.round(CY + Math.sin(a) * d), col('#ffd23a'));
  }
  return img;
}
function sparkHeavy(t) {
  const img = new Img(FX_CELL, FX_CELL);
  const r = 12 + t * 26;
  star(img, CX, CY, 8, r, r * 0.38, 0.1, col('#ff7a1a'));
  star(img, CX, CY, 8, r * 0.78, r * 0.3, 0.1, col('#ffb83a'));
  star(img, CX, CY, 8, r * 0.5, r * 0.2, 0.1, col('#fff2a8'));
  if (t > 0.2) ring(img, CX, CY, r * 1.1, r * 0.8, 2, col('#ffe27a'));
  for (let i = 0; i < 8; i++) {
    const a = 0.5 + (i * Math.PI) / 4, d = r + 4 + t * 14;
    ellipse(img, CX + Math.cos(a) * d, CY + Math.sin(a) * d, 1.6 - t, 1.6 - t, () => col('#ffd23a'));
  }
  return img;
}
function sparkBlock(t) {
  const img = new Img(FX_CELL, FX_CELL);
  const r = 14 + t * 8;
  // a hex shield flash facing right
  for (let k = 0; k < 2; k++) {
    ellipse(img, CX, CY, r - k * 4, r * 1.25 - k * 5, (i) => (i.q > 0.62 ? (k ? col('#ffffff') : col('#7fd8ff')) : null));
  }
  star(img, CX + 6, CY, 4, 8 - t * 5, 2, 0.8, col('#e8fbff'));
  return img;
}
function sparkSuper(t) {
  const img = new Img(FX_CELL, FX_CELL);
  const r = 16 + t * 30;
  star(img, CX, CY, 12, r, r * 0.45, 0.2, col('#8a2be2'));
  star(img, CX, CY, 12, r * 0.8, r * 0.38, 0.2, col('#c47bff'));
  star(img, CX, CY, 12, r * 0.55, r * 0.26, 0.2, col('#ffe8ff'));
  ring(img, CX, CY, r * 1.2, r * 1.05, 2, col('#ffd856'));
  return img;
}

// ------------------------------------------------------------------ swing trails
const TRAIL = {
  bean: ['#0e3a1c', '#2fae4c', '#b6ff9a'],
  flea: ['#6a2208', '#f2822a', '#ffe6a8'],
  ernesto: ['#3a1470', '#a45cf0', '#f0dcff'],
  elmacho: ['#5a0a14', '#e8303c', '#ffd2c0'],
  huesos: ['#2a0e5a', '#8a46d8', '#e4d2ff'],
};
/** Crescent facing right, sweeping from a0 to a1 degrees around a pivot at the left; `grow` 0..1 how much is drawn, `fade` 0..1 thinning. */
function slash(colors, R, thick, a0, a1, grow, fade) {
  const img = new Img(FX_CELL, FX_CELL);
  const px = CX - R * 0.55, py = CY;
  const head = a0 + (a1 - a0) * grow, tail = a0 + (a1 - a0) * Math.max(0, grow - 0.9 + fade * 0.5);
  const N = 18;
  const outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = ((tail + (head - tail) * u) * Math.PI) / 180;
    const w = thick * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - fade * 0.55) + 0.4;
    outer.push([px + Math.cos(a) * R, py + Math.sin(a) * R]);
    inner.push([px + Math.cos(a) * (R - w), py + Math.sin(a) * (R - w)]);
  }
  const body = [...outer, ...inner.reverse()];
  poly(img, body, (i) => (i.edge < 1.4 ? col(colors[0]) : i.edge < 2.6 ? col(colors[1]) : col(colors[2])), 0, 1);
  return img;
}

// ------------------------------------------------------------------ projectiles
function leaf(rot, flap) {
  const img = new Img(FX_CELL, FX_CELL);
  const L = 15, W = 6.5 - flap * 2;
  const pts = [];
  const cs = Math.cos(rot), sn = Math.sin(rot);
  for (let i = 0; i <= 10; i++) {
    const u = i / 10, x = (u - 0.5) * 2 * L, y = Math.sin(Math.PI * u) * W;
    pts.push([x, y]);
  }
  for (let i = 10; i >= 0; i--) {
    const u = i / 10, x = (u - 0.5) * 2 * L, y = -Math.sin(Math.PI * u) * W;
    pts.push([x, y]);
  }
  const rotd = pts.map(([x, y]) => [CX + x * cs - y * sn, CY + x * sn + y * cs]);
  const G = { d: '#10301d', s: '#1d5a2c', m: '#2e8c3a', l: '#5cc24c', h: '#a6ea6e', ink: '#0b2214' };
  poly(img, rotd, lit(G), G.ink, 4);
  line(img, CX - L * cs * 0.8, CY - L * sn * 0.8, CX + L * cs * 0.8, CY + L * sn * 0.8, col(G.s));
  // trailing sparkle
  for (let k = 1; k <= 3; k++) img.set(Math.round(CX - 22 - k * 5 + (k % 2)), Math.round(CY + (k % 2 ? -3 : 3)), col(k === 1 ? '#a6ea6e' : '#2e8c3a'));
  return img;
}
function skullShot(f) {
  const img = new Img(FX_CELL, FX_CELL);
  const P = { d: '#2a0a5a', s: '#5a1ea8', m: '#9a4ce8', l: '#c88cff', h: '#f0ddff' };
  // flame trail streaming left
  for (let i = 0; i < 5; i++) {
    const x = CX - 12 - i * 7, y = CY + Math.sin(f * 1.7 + i * 1.3) * (2 + i * 0.9);
    ellipse(img, x, y, 7 - i * 1.1, 5.4 - i * 0.8, (q) => (q.q < 0.35 ? col(P.h) : q.q < 0.7 ? col(P.l) : col(P.m)));
  }
  const B = { d: '#6e6c82', s: '#aaa8bc', m: '#dcd8cc', l: '#f2eee0', h: '#ffffff', ink: '#2a0a5a' };
  part(img, (L) => {
    ellipse(L, CX + 2, CY - 1, 12, 11, lit(B), B.ink);
    ellipse(L, CX + 6, CY + 9, 7, 4, lit(B), B.ink);
    ellipse(L, CX - 2, CY - 2, 3.4, 3.8, () => col('#120a1c'));
    ellipse(L, CX + 8, CY - 2, 3.4, 3.8, () => col('#120a1c'));
    L.set(CX - 2, CY - 2, col('#d27bff')); L.set(CX + 8, CY - 2, col('#d27bff'));
    for (let t = 1; t <= 9; t += 2) L.set(CX + t, CY + 9, col('#6e6c82'));
  }, { ink: C('#1a0a3a') });
  // music note
  const ny = CY - 18 - (f % 2);
  ellipse(img, CX + 6, ny + 4, 2.2, 1.8, () => col('#ffd856'));
  line(img, CX + 8, ny + 3, CX + 8, ny - 4, col('#ffd856'));
  line(img, CX + 8, ny - 4, CX + 11, ny - 2, col('#ffd856'));
  return img;
}
function spirit(f) {
  const img = new Img(FX_CELL, FX_CELL);
  const P = { d: '#143a2a', s: '#1e7a52', m: '#3ad08a', l: '#8affc0', h: '#e6fff2' };
  const Q = { d: '#2a0e5a', s: '#5a2aa8', m: '#9a5cf0', l: '#cfa8ff', h: '#f4eaff' };
  // wispy tail
  for (let i = 0; i < 6; i++) {
    const x = CX - 14 - i * 6, y = CY + 4 + Math.sin(f * 1.4 + i * 1.1) * (2 + i * 0.8);
    ellipse(img, x, y, 6 - i * 0.8, 4.2 - i * 0.55, (q) => (q.q < 0.4 ? col(Q.l) : col(Q.m)));
  }
  part(img, (L) => {
    ellipse(L, CX + 2, CY, 12.5, 12, (i) => shade({ d: Q.d, s: Q.s, m: Q.m, l: Q.l, h: Q.h }, i.nx, i.ny, i.nz, i.x, i.y), Q.d);
    ellipse(L, CX - 2, CY - 2, 3.6, 4.4, () => col('#08040f'));
    ellipse(L, CX + 8, CY - 2, 3.6, 4.4, () => col('#08040f'));
    L.set(CX - 2, CY - 2, col('#ffd24a')); L.set(CX + 8, CY - 2, col('#ffd24a'));
    ellipse(L, CX + 3, CY + 7, 5, 2.4, () => col('#08040f'));
  }, { ink: C('#1a0a3a') });
  return img;
}

// ------------------------------------------------------------------ dust and rings
function dust(t) {
  const img = new Img(FX_CELL, FX_CELL);
  const D = { d: '#6a5a78', s: '#9a8aa8', m: '#c8bcd2', l: '#eee6f4' };
  const k = 1 - t * 0.6;
  for (const [dx, dy, r] of [[-14, 0, 5], [-6, -4, 6.5], [4, -2, 7], [14, 1, 5]]) {
    const rr = r * (0.5 + t) * k, x = CX + dx * (1 + t * 1.2), y = CY + 14 - dy - t * 6;
    ellipse(img, x, y, rr, rr * 0.8, (i) => shade(D, i.nx, i.ny, i.nz, i.x, i.y, { rim: false }));
  }
  return img;
}
function shock(t) {
  const img = new Img(FX_CELL, FX_CELL);
  const rx = 10 + t * 38, ry = rx * 0.32;
  ring(img, CX, CY + 18, rx, ry, 3 - t * 2, col('#fff4b0'));
  ring(img, CX, CY + 18, rx * 0.8, ry * 0.8, 2, col('#ffb83a'));
  return img;
}

// ------------------------------------------------------------------ sheet
export function effects() {
  const rows = {};
  const tt = (n) => Array.from({ length: n }, (_, i) => i / (n - 1));
  rows.sparkLight = { fps: 24, frames: tt(4).map(sparkLight) };
  rows.sparkHeavy = { fps: 24, frames: tt(5).map(sparkHeavy) };
  rows.sparkBlock = { fps: 24, frames: tt(3).map(sparkBlock) };
  rows.sparkSuper = { fps: 20, frames: tt(6).map(sparkSuper) };
  rows.dust = { fps: 16, frames: tt(5).map(dust) };
  rows.shock = { fps: 20, frames: tt(5).map(shock) };
  rows.leaf = { fps: 20, frames: [0, 1, 2, 3].map((i) => leaf((i * Math.PI) / 4, i % 2)) };
  rows.skull = { fps: 14, frames: [0, 1, 2, 3].map(skullShot) };
  rows.spirit = { fps: 14, frames: [0, 1, 2, 3].map(spirit) };
  for (const [id, colors] of Object.entries(TRAIL)) {
    rows[`slashLight_${id}`] = { fps: 30, frames: [[0.45, 0], [0.85, 0.1], [1, 0.45], [1, 0.8]].map(([g, f]) => slash(colors, 34, 8, -75, 45, g, f)) };
    rows[`slashHeavy_${id}`] = { fps: 24, frames: [[0.4, 0], [0.75, 0], [1, 0.25], [1, 0.55], [1, 0.85]].map(([g, f]) => slash(colors, 44, 13, -100, 70, g, f)) };
  }
  return rows;
}

export function packEffects() {
  const rows = effects();
  const names = Object.keys(rows);
  const cols = Math.max(...names.map((n) => rows[n].frames.length));
  const sheet = new Img(cols * FX_CELL, names.length * FX_CELL);
  const meta = { cell: FX_CELL, rows: {} };
  names.forEach((n, r) => {
    rows[n].frames.forEach((f, c) => blit(sheet, f, c * FX_CELL, r * FX_CELL));
    meta.rows[n] = { row: r, frames: rows[n].frames.length, fps: rows[n].fps };
  });
  return { sheet, meta };
}

if (process.argv[1].endsWith('fx.mjs') && process.argv[2]) {
  const { sheet } = packEffects();
  writePng(process.argv[2], sheet);
  console.log('wrote', process.argv[2]);
}
