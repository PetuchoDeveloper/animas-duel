// What El Macho throws into the arena: a rolling barrel (four frames) and a falling anvil.
import { Img, C, poly, line, part } from './lib/raster.mjs';
import { lit } from './lib/humanoid.mjs';

const WOOD = { d: '#3a1e0c', s: '#6a3a18', m: '#9a5a26', l: '#c88444', h: '#e8b070', ink: '#2a1408' };
const IRON = { d: '#1a1a26', s: '#363a4e', m: '#5a607a', l: '#8c94b0', h: '#c8d0e8', ink: '#0c0c14' };
const g = (hex) => C(hex);

export const BARREL = { w: 32, h: 32, frames: 4 };
export const ANVIL = { w: 32, h: 40 };

function barrel(angle) {
  const img = new Img(BARREL.w, BARREL.h);
  const c = 15.5, R = 14.5;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  for (let y = 0; y < BARREL.h; y++) for (let x = 0; x < BARREL.w; x++) {
    const dx = x + 0.5 - 16, dy = y + 0.5 - 16, d = Math.hypot(dx, dy);
    if (d > R + 0.5) continue;
    const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
    const lightSide = dx + dy < -4;
    let col;
    if (d > R - 1) col = g(IRON.ink);
    else if (d > R - 3.2) col = g(lightSide ? IRON.l : IRON.s);
    else if (d < 2.5) col = g(IRON.m);
    else col = g(Math.floor((v + 40) / 4.5) % 2 ? (lightSide ? WOOD.l : WOOD.m) : (lightSide ? WOOD.m : WOOD.s));
    img.set(x, y, col);
  }
  // the gold M brand turns with the barrel so it reads as rolling
  const p = (px, py) => [16 + px * ca - py * sa, 16 + px * sa + py * ca];
  const M = [[-5, 5], [-5, -5], [0, 0], [5, -5], [5, 5]].map(([px, py]) => p(px * 0.9, py * 0.9));
  for (let i = 0; i < M.length - 1; i++) {
    line(img, Math.round(M[i][0]), Math.round(M[i][1]), Math.round(M[i + 1][0]), Math.round(M[i + 1][1]), g('#ffd856'));
    line(img, Math.round(M[i][0]) + 1, Math.round(M[i][1]), Math.round(M[i + 1][0]) + 1, Math.round(M[i + 1][1]), g('#e2b028'));
  }
  return img;
}

function anvil() {
  const img = new Img(ANVIL.w, ANVIL.h);
  part(img, (L) => {
    poly(L, [[1, 14], [9, 8], [30, 8], [30, 16], [22, 18], [20, 28], [27, 32], [28, 38], [5, 38], [6, 32], [12, 28], [12, 18], [8, 17]], lit(IRON, { dither: true }), IRON.ink, 4);
  });
  for (let x = 10; x < 30; x++) { img.set(x, 9, g(IRON.h)); img.set(x, 10, g(IRON.l)); }
  line(img, 14, 24, 18, 24, g('#ffd856')); line(img, 14, 24, 14, 20, g('#ffd856')); line(img, 18, 24, 18, 20, g('#ffd856')); line(img, 14, 20, 16, 22, g('#ffd856')); line(img, 18, 20, 16, 22, g('#ffd856'));
  return img;
}

export function paintHazards() {
  const sheet = new Img(BARREL.w * BARREL.frames + ANVIL.w, ANVIL.h);
  for (let f = 0; f < BARREL.frames; f++) {
    const b = barrel((f / BARREL.frames) * (Math.PI / 2));
    for (let y = 0; y < BARREL.h; y++) for (let x = 0; x < BARREL.w; x++) sheet.px[y * sheet.w + f * BARREL.w + x] = b.px[y * BARREL.w + x];
  }
  const a = anvil();
  for (let y = 0; y < ANVIL.h; y++) for (let x = 0; x < ANVIL.w; x++) sheet.px[y * sheet.w + BARREL.w * BARREL.frames + x] = a.px[y * ANVIL.w + x];
  return sheet;
}
