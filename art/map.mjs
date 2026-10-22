// The story map: three sombreros floating over the road the hero climbs. `paintMap()` returns the
// 480x270 backdrop (with the road bed but no hats), the hat sprites and the road as a polyline;
// the interface animates the lit petals, the hero token and the locks on top.
import { Img, C, ellipse, poly, line, rect, stamp, part, mix } from './lib/raster.mjs';
import { lit } from './lib/humanoid.mjs';
import { vgrad, glow, rng, ridge, stars, cloud, noise2, bayer } from './lib/scene.mjs';

export const W = 480, H = 270;
/** Where the hero stands on each sombrero, and the hat's brim centre (its sprite sits above). */
export const NODES = [{ x: 96, y: 206 }, { x: 236, y: 152 }, { x: 384, y: 102 }];
const CONTROL = [[20, 248], [58, 230], [96, 206], [150, 200], [192, 178], [214, 164], [236, 152], [284, 148], [322, 130], [352, 114], [384, 102]];
export const HAT = { w: 72, h: 52 };

const g = (hex) => C(hex);

/** A soft halo that tints whatever is already painted, so it has no hard rim against the sky. */
function halo(img, cx, cy, r, hex, squash = 1, k = 0.85) {
  const col = g(hex);
  for (let y = Math.floor(cy - r * squash); y <= Math.ceil(cy + r * squash); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot((x + 0.5 - cx) / r, (y + 0.5 - cy) / (r * squash));
      if (d >= 1 || !img.get(x, y)) continue;
      const level = Math.floor((1 - d) ** 1.7 * k * 6 + bayer(x, y));
      if (level > 0) img.set(x, y, mix(img.get(x, y), col, Math.min(6, level) / 6));
    }
  }
}

/** Catmull-Rom through the control points, resampled to roughly one point every 3 px. */
function road() {
  const P = [CONTROL[0], ...CONTROL, CONTROL[CONTROL.length - 1]];
  const pts = [];
  for (let i = 1; i < P.length - 2; i++) {
    for (let t = 0; t < 1; t += 0.04) {
      const f = (k) => 0.5 * ((2 * P[i][k]) + (-P[i - 1][k] + P[i + 1][k]) * t + (2 * P[i - 1][k] - 5 * P[i][k] + 4 * P[i + 1][k] - P[i + 2][k]) * t * t + (-P[i - 1][k] + 3 * P[i][k] - 3 * P[i + 1][k] + P[i + 2][k]) * t * t * t);
      pts.push([f(0), f(1)]);
    }
  }
  pts.push(CONTROL[CONTROL.length - 1]);
  const out = [pts[0]];
  for (const p of pts) { const q = out[out.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 3) out.push(p); }
  return out.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}
export const ROAD = road();
/** Index into ROAD closest to each node. */
const near = (n) => (p) => Math.hypot(p[0] - n.x, p[1] - n.y);
export const NODE_AT = NODES.map((n) => { const d = ROAD.map(near(n)); return d.indexOf(Math.min(...d)); });

const RAMPS = {
  velvet: { d: '#05030a', s: '#0e0818', m: '#1e1236', l: '#34205c', h: '#5a3a90', ink: '#05030a' },
  gold: { d: '#5e3f06', s: '#a8760e', m: '#e2b028', l: '#ffd856', h: '#fff0a0', ink: '#42290a' },
  felt: { d: '#2e2a38', s: '#4a4458', m: '#6c657e', l: '#948ca8', h: '#c4bcd8', ink: '#1a1622' },
  shard: { d: '#1a0c28', s: '#32164a', m: '#56246e', l: '#8a3c92', h: '#d070b8', ink: '#0c0414' },
  crack: { d: '#0a5a6a', s: '#18a0b0', m: '#40e0e0', l: '#a0fff0', h: '#ffffff', ink: '#0a5a6a' },
};

/** One sombrero: brim, crown, band. `kind` picks velvet, torn felt or the shattered Mictlán hat. */
function hat(kind) {
  const img = new Img(HAT.w, HAT.h);
  const cx = HAT.w / 2, by = HAT.h - 12;
  const crown = kind === 0 ? RAMPS.velvet : kind === 1 ? RAMPS.felt : RAMPS.shard;
  const r = rng(40 + kind);
  part(img, (L) => {
    ellipse(L, cx, by, 33, 9, lit(crown, { dither: true }), crown.ink);
    poly(L, [[cx - 15, by - 1], [cx - 12, by - 22], [cx - 6, by - 31], [cx + 6, by - 31], [cx + 12, by - 22], [cx + 15, by - 1]], lit(crown, { dither: true }), crown.ink, 3);
    ellipse(L, cx, by - 31, 7, 3, lit(crown), crown.ink);
  });
  // band
  const band = kind === 0 ? RAMPS.gold : kind === 1 ? RAMPS.felt : RAMPS.crack;
  for (let y = by - 12; y < by - 6; y++) for (let x = Math.round(cx - 15 + (by - y) * 0.2); x < Math.round(cx + 15 - (by - y) * 0.2); x++) img.set(x, y, g(y === by - 12 ? band.l : y > by - 8 ? band.s : band.m));
  if (kind === 0) for (let x = cx - 12; x <= cx + 12; x += 6) { ellipse(img, x, by - 9, 1.6, 1.6, () => g('#fff0a0')); }
  if (kind === 0) { line(img, cx - 32, by + 2, cx + 32, by + 2, g('#a8760e')); }
  // torn felt: frayed brim and glowing cracks
  if (kind === 1) {
    for (let x = cx - 32; x < cx + 32; x += 3) if (r() < 0.5) img.set(Math.round(x), by + 8 + Math.floor(r() * 2), g('#6c657e'));
    let x = cx - 4;
    for (let y = by - 30; y < by - 12; y += 2) { x += Math.round((r() - 0.5) * 4); img.set(x, y, g('#40e0e0')); img.set(x, y + 1, g('#a0fff0')); }
    let bx = cx + 18;
    for (let k = 0; k < 6; k++) { bx += 1 + Math.round(r()); img.set(bx, by + 2 + (k % 2), g('#40e0e0')); }
  }
  // Mictlan: the hat is in pieces; a few shards float off with violet fire
  if (kind === 2) {
    for (const [dx, dy] of [[-30, -16], [30, -20], [-24, -34], [26, -6]]) {
      part(img, (L) => poly(L, [[cx + dx, by + dy], [cx + dx + 5, by + dy - 3], [cx + dx + 7, by + dy + 3], [cx + dx + 1, by + dy + 5]], lit(RAMPS.shard), RAMPS.shard.ink, 2));
    }
    for (const [dx, dy] of [[-8, -34], [8, -36], [0, -38]]) { img.set(cx + dx, by + dy, g('#d070b8')); img.set(cx + dx, by + dy - 1, g('#fff0ff')); }
  }
  return img;
}

function backdrop() {
  const img = new Img(W, H);
  const r = rng(77), n = noise2(9);
  vgrad(img, 0, 0, W, 176, ['#07051c', '#0e0a30', '#1a1042', '#2c1a5a', '#4a2468', '#7a2c6c', '#b04468', '#e07a50'], 0.5);
  stars(img, r, 110, 0, 110, [g('#fff4d0'), g('#c8d0ff'), g('#ffe0a0')]);
  // moon over the village, abyss glow over Mictlan
  glow(img, 58, 44, 46, [g('#1c1244'), g('#2a1a58'), g('#40286a')]);
  ellipse(img, 58, 44, 17, 17, (i) => (i.ny > 0.35 && i.nx > 0.3 ? g('#cdb97e') : i.nx < -0.4 ? g('#fff6d8') : g('#f2e6bc')));
  halo(img, 392, 80, 120, '#e0502c', 0.9, 0.95);
  // storm over the cracked sombrero
  cloud(img, 236, 74, 150, 30, { l: g('#58407c'), m: g('#3a2a5c'), s: g('#261a42') }, rng(5));
  cloud(img, 300, 56, 100, 22, { l: g('#46346c'), m: g('#2e2250'), s: g('#1e1640') }, rng(6));
  let bx = 240;
  for (let y = 84; y < 122; y += 3) { bx += Math.round((r() - 0.5) * 6); img.set(bx, y, g('#f4eaff')); img.set(bx + 1, y, g('#c8b4ff')); }
  // far hills
  ridge(img, [[0, 150], [50, 138], [110, 150], [170, 134], [240, 146], [310, 128], [380, 140], [440, 126], [480, 134]], 190, g('#1c1448'), g('#34246a'));
  // the land: three regions blend left to right
  vgrad(img, 0, 168, W, H, ['#241648', '#1a1038', '#120a28', '#0a0618'], 0.5);
  ridge(img, [[0, 176], [70, 168], [140, 180], [210, 172], [290, 178], [360, 166], [420, 176], [480, 170]], 190, g('#1e1440'), g('#3a2870'));
  // marigold fields under the first sombrero: rows that open up toward the viewer
  for (let row = 0, y = 242; y < H; row++, y += 5 + Math.floor(row / 3)) {
    const step = 4 + Math.floor(row / 2);
    for (let x = (row % 2) * 2; x < 190; x += step) {
      const jx = Math.round((r() - 0.5) * 2), size = row > 6 ? 2 : 1;
      const c = r() < 0.55 ? '#f08a24' : r() < 0.5 ? '#ffc247' : '#c8581a';
      for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) img.set(x + jx + dx, y + dy, g(c));
      if (size === 2) img.set(x + jx, y - 1, g('#ffe27a'));
    }
  }
  // crags of the cracked highlands, cut by glowing seams
  for (let k = 0; k < 9; k++) {
    const x = 190 + k * 16 + Math.floor(r() * 8), base = 214 + Math.floor(r() * 44), w = 14 + Math.floor(r() * 12), h = 16 + Math.floor(r() * 22);
    poly(img, [[x, base], [x + w * 0.35, base - h], [x + w * 0.7, base - h * 0.6], [x + w, base]], (i) => (i.nx < -0.1 ? g('#4a3a72') : g('#2a1e4a')), 0, 1);
    line(img, x + 3, base - 1, x + w * 0.35, base - h + 2, g('#18a0b0'));
  }
  for (let k = 0; k < 7; k++) {
    let x = 196 + Math.floor(r() * 130), y = 200 + Math.floor(r() * 50);
    for (let s2 = 0; s2 < 9; s2++) { img.set(x, y, g('#18a0b0')); img.set(x + 1, y, g('#40e0e0')); x += Math.round((r() - 0.5) * 4); y += 1 + Math.floor(r() * 2); }
  }
  // scorched ground near Mictlan with embers in its fissures
  for (let k = 0; k < 10; k++) {
    let x = 340 + Math.floor(r() * 140), y = 188 + Math.floor(r() * 70);
    for (let s2 = 0; s2 < 10; s2++) { img.set(x, y, g('#7a1c46')); img.set(x + 1, y, g('#e0502c')); x += Math.round((r() - 0.4) * 4); y += 1 + Math.floor(r() * 2); }
  }
  // the little town under the first sombrero: a skyline with lit windows and a church tower
  const town = g('#0e0824'), edge = g('#2a1c52');
  for (let k = 0, x = 2; x < 160; k++) {
    const w = 10 + Math.floor(r() * 9), h = 20 + Math.floor(r() * 26), top = 236 - h;
    rect(img, x, top, w, h + 30, town); rect(img, x + w - 1, top, 1, h + 30, edge);
    if (r() < 0.5) poly(img, [[x - 1, top], [x + w / 2, top - 7], [x + w + 1, top]], () => town, 0, 1);
    for (let wy = top + 4; wy < 236; wy += 6) for (let wx = x + 2; wx < x + w - 2; wx += 5) if (r() < 0.6) { img.set(wx, wy, g(r() < 0.7 ? '#ffc247' : '#ff8a3a')); img.set(wx, wy + 1, g('#c8741a')); }
    x += w + 1 + Math.floor(r() * 3);
  }
  rect(img, 40, 176, 12, 70, town); poly(img, [[38, 176], [46, 156], [54, 176]], () => town, 0, 1); rect(img, 45, 146, 2, 10, town); rect(img, 42, 150, 8, 2, town);
  rect(img, 44, 184, 4, 7, g('#ffc247'));
  // chains hanging into the abyss, and its floating shards
  for (const cxn of [350, 372, 404, 426]) for (let y = 60; y < 120; y += 4) { img.set(cxn + Math.round(Math.sin(y * 0.4) * 1.5), y, g('#6a5a8a')); img.set(cxn + Math.round(Math.sin(y * 0.4) * 1.5), y + 1, g('#a898c8')); }
  for (const [sx, sy, sz] of [[330, 70, 6], [440, 84, 7], [420, 138, 5], [346, 150, 6], [458, 130, 4]]) part(img, (L) => poly(L, [[sx, sy], [sx + sz, sy - 2], [sx + sz + 2, sy + sz], [sx + 1, sy + sz + 2]], lit(RAMPS.shard), RAMPS.shard.ink, 2));
  // the road bed: a dark dithered trail the lit petals will sit on
  for (const [x, y] of ROAD) for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (((Math.round(x) + dx + Math.round(y) + dy) & 1) === 0 && Math.abs(dy) + Math.abs(dx) * 0.5 <= 2.6) img.set(Math.round(x) + dx, Math.round(y) + dy, g('#3a2438'));
  return img;
}

/** Small map icons, 16x16 each, packed in a row: lock, check, Macho mask. */
function icons() {
  const img = new Img(16 * 3, 16);
  const P = { k: g('#120a1c'), g: g('#ffd856'), G: g('#a8760e'), y: g('#fff0a0'), w: g('#fbf8ee'), r: g('#d8281e'), R: g('#8a1410'), n: g('#4cd070'), N: g('#1c7a38') };
  stamp(img, [
    '................',
    '.....kkkkkk.....',
    '....kGggggGk....',
    '...kGk....kGk...',
    '...kGk....kGk...',
    '..kkkkkkkkkkkk..',
    '..kggggggggggk..',
    '..kgyggggggGgk..',
    '..kggggkkggGgk..',
    '..kggggkkggGgk..',
    '..kgggggkgGGgk..',
    '..kgggggkgGGgk..',
    '..kGGGGGGGGGGk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
  ], P, 0, 0);
  stamp(img, [
    '................',
    '.....kkkkkk.....',
    '...kkggggggkk...',
    '..kgggggggnngk..',
    '.kgggggggnnNgk..',
    '.kggnggggnnNgk..',
    '.kgnnnggnnNggk..',
    '.kgnNnnnnNgggk..',
    '.kggnNnnNggggk..',
    '.kgggnnNgggGgk..',
    '..kgggNggggGk...',
    '...kkgggggGkk...',
    '.....kkkkkk.....',
    '................',
    '................',
    '................',
  ], P, 16, 0);
  stamp(img, [
    '................',
    '..kkkkkkkkkkkk..',
    '.krrrrrrrrrrrrk.',
    '.krrrrrrrrrrrRk.',
    '.krkkkrrrrkkkRk.',
    '.krkwkkrrkkwkRk.',
    '.krkkkkrrkkkkRk.',
    '.krrrrrrrrrrrRk.',
    '..krrrRggRrrRk..',
    '..kkrrRggRrRkk..',
    '...kkrrrrrRkk...',
    '....kkkkkkkk....',
    '................',
    '................',
    '................',
    '................',
  ], P, 32, 0);
  return img;
}

export function paintMap() {
  const sheet = new Img(HAT.w * 3, HAT.h);
  for (let i = 0; i < 3; i++) {
    const h = hat(i);
    for (let y = 0; y < HAT.h; y++) for (let x = 0; x < HAT.w; x++) sheet.px[y * sheet.w + i * HAT.w + x] = h.px[y * HAT.w + x];
  }
  return { back: backdrop(), hats: sheet, icons: icons() };
}
