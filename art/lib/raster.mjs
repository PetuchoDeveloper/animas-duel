// Tiny pixel-art rasteriser. Every pixel is a packed 0xAARRGGBB number (0 = transparent),
// every primitive samples at pixel centres so shapes may sit on fractional coordinates
// and still land on a crisp grid.

const hexCache = new Map();

/** '#rrggbb' | number -> packed opaque colour */
export function C(c) {
  if (typeof c === 'number') return c;
  let v = hexCache.get(c);
  if (v === undefined) {
    v = (0xff000000 | parseInt(c.slice(1), 16)) >>> 0;
    hexCache.set(c, v);
  }
  return v;
}

export const rgbOf = (c) => [(c >>> 16) & 255, (c >>> 8) & 255, c & 255];
export const pack = (r, g, b) => ((0xff << 24) | (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b)) >>> 0;
const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

export function mix(a, b, t) {
  const [r1, g1, b1] = rgbOf(C(a));
  const [r2, g2, b2] = rgbOf(C(b));
  return pack(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export class Img {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Uint32Array(w * h);
    this.ink = new Uint32Array(w * h); // outline colour owed by the material that wrote the pixel
  }
  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x, y) {
    return this.inside(x, y) ? this.px[y * this.w + x] : 0;
  }
  set(x, y, c, ink = 0) {
    if (!this.inside(x, y)) return;
    this.px[y * this.w + x] = C(c);
    this.ink[y * this.w + x] = ink ? C(ink) : 0;
  }
  clone() {
    const o = new Img(this.w, this.h);
    o.px.set(this.px);
    o.ink.set(this.ink);
    return o;
  }
}

// ---------------------------------------------------------------- shading

const L = normalize3(-0.32, -0.74, 0.6);
const R = normalize3(0.75, 0.55, 0.1); // bounce light from lower right

function normalize3(x, y, z) {
  const n = Math.hypot(x, y, z) || 1;
  return [x / n, y / n, z / n];
}

const BAYER = [0, 2, 3, 1];

/**
 * ramp: { d: deepest shadow, s: shadow, m: mid, l: light, h: highlight, ink }
 * Returns the colour for surface normal n = [nx, ny, nz] at pixel (x, y).
 */
export function shade(ramp, nx, ny, nz, x, y, opt = {}) {
  const i = nx * L[0] + ny * L[1] + nz * L[2];
  const bounce = nx * R[0] + ny * R[1] + nz * R[2];
  const t = opt.bands || [-0.2, 0.18, 0.6, 0.9];
  let level;
  if (i < t[0]) level = 0;
  else if (i < t[1]) level = 1;
  else if (i < t[2]) level = 2;
  else if (i < t[3]) level = 3;
  else level = 4;
  if (opt.dither) {
    // 2x2 ordered dither across the nearest band boundary
    const w = opt.dither === true ? 0.07 : opt.dither;
    for (let k = 0; k < 4; k++) {
      if (Math.abs(i - t[k]) < w) {
        const thr = ((BAYER[(y & 1) * 2 + (x & 1)] + 0.5) / 4) * 2 - 1;
        level = (i - t[k]) / w > thr ? k + 1 : k;
        break;
      }
    }
  }
  // reflected light keeps the deepest shadow from going flat
  if (opt.rim !== false && level === 0 && bounce > 0.7) level = 1;
  const key = ['d', 's', 'm', 'l', 'h'][level];
  return ramp[key] ?? ramp.m;
}

/** Flat colour helper so call sites read the same as shaded ones. */
export const flat = (c, ink) => () => ({ c, ink });

// ---------------------------------------------------------------- primitives
// Each primitive takes a `paint(info) -> colour | {c, ink}` callback. `info` carries a
// pseudo surface normal (nx, ny, nz) and a few useful scalars.

function put(img, x, y, res, ink) {
  if (res == null) return;
  if (typeof res === 'object') img.set(x, y, res.c, res.ink ?? ink);
  else img.set(x, y, res, ink);
}

export function ellipse(img, cx, cy, rx, ry, paint, ink = 0) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const q = dx * dx + dy * dy;
      if (q > 1) continue;
      put(img, x, y, paint({ x, y, nx: dx, ny: dy, nz: Math.sqrt(1 - q), q, dx, dy }), ink);
    }
  }
}

export function capsule(img, ax, ay, bx, by, r0, r1, paint, ink = 0) {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy || 1e-6;
  const rmax = Math.max(r0, r1);
  const x0 = Math.floor(Math.min(ax, bx) - rmax);
  const x1 = Math.ceil(Math.max(ax, bx) + rmax);
  const y0 = Math.floor(Math.min(ay, by) - rmax);
  const y1 = Math.ceil(Math.max(ay, by) + rmax);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let t = ((px - ax) * vx + (py - ay) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const cx = ax + vx * t;
      const cy = ay + vy * t;
      const r = r0 + (r1 - r0) * t;
      const dx = (px - cx) / r;
      const dy = (py - cy) / r;
      const q = dx * dx + dy * dy;
      if (q > 1) continue;
      put(img, x, y, paint({ x, y, nx: dx, ny: dy, nz: Math.sqrt(1 - q), q, t, dx, dy }), ink);
    }
  }
}

/** Even-odd polygon fill; normals come from the distance to the nearest edge (pillow shading). */
export function poly(img, pts, paint, ink = 0, depth = 3.2) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (!pointInPoly(px, py, pts)) continue;
      // nearest edge point -> inward direction
      let best = Infinity, bx = 0, by = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        const ex = x2 - x1, ey = y2 - y1;
        const t = Math.max(0, Math.min(1, ((px - x1) * ex + (py - y1) * ey) / (ex * ex + ey * ey || 1e-6)));
        const qx = x1 + ex * t, qy = y1 + ey * t;
        const d = Math.hypot(px - qx, py - qy);
        if (d < best) { best = d; bx = px - qx; by = py - qy; }
      }
      const k = Math.min(1, best / depth);
      const len = Math.hypot(bx, by) || 1;
      const nx = (-bx / len) * (1 - k);
      const ny = (-by / len) * (1 - k);
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      put(img, x, y, paint({ x, y, nx, ny, nz, edge: best }), ink);
    }
  }
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Axis-aligned filled rectangle, integer coordinates. */
export function rect(img, x, y, w, h, c, ink = 0) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) img.set(Math.round(x) + i, Math.round(y) + j, c, ink);
}

/** Bresenham line of single pixels. */
export function line(img, x0, y0, x1, y1, c, ink = 0) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    img.set(x0, y0, c, ink);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// ---------------------------------------------------------------- hand-drawn sprites

/**
 * Stamp a hand-authored sprite. `rows` is an array of strings; '.' and ' ' are transparent,
 * every other character is looked up in `pal`. (x, y) is where the sprite's (ax, ay) pivot lands.
 */
export function stamp(img, rows, pal, x, y, opt = {}) {
  const { ax = 0, ay = 0, flip = false, ink = 0, rot = 0 } = opt;
  let grid = rows.map((r) => [...r]);
  let w = Math.max(...grid.map((r) => r.length));
  grid = grid.map((r) => r.concat(Array(w - r.length).fill('.')));
  let px = ax, py = ay;
  // quarter turns clockwise, carrying the pivot along
  for (let k = 0; k < ((rot % 4) + 4) % 4; k++) {
    const h = grid.length;
    const next = Array.from({ length: w }, (_, j) => Array.from({ length: h }, (_, i) => grid[h - 1 - i][j]));
    [px, py] = [h - 1 - py, px];
    grid = next;
    w = h;
  }
  const h = grid.length;
  w = grid[0].length;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ch = grid[j][i];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (col == null) throw new Error(`stamp: no palette entry for "${ch}"`);
      const ii = flip ? w - 1 - i : i;
      const pivX = flip ? w - 1 - px : px;
      img.set(Math.round(x) + ii - pivX, Math.round(y) + j - py, col, ink);
    }
  }
}

// ---------------------------------------------------------------- compositing

/**
 * Lay `layer` over `dst`. Before the layer's own pixels land, a 1px outline (in each
 * material's ink colour) is cut around its silhouette, so overlapping limbs separate cleanly.
 */
export function compose(dst, layer, opt = {}) {
  const { outline = true } = opt;
  if (outline) {
    const w = layer.w, h = layer.h;
    const mark = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (layer.px[y * w + x]) continue;
        let ink = 0;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const i = ny * w + nx;
          if (layer.px[i]) { ink = layer.ink[i] || opt.ink || C('#1b1020'); break; }
        }
        if (ink) mark.push(y * w + x, ink);
      }
    }
    for (let k = 0; k < mark.length; k += 2) dst.px[mark[k]] = mark[k + 1];
  }
  for (let i = 0; i < layer.px.length; i++) {
    if (layer.px[i]) { dst.px[i] = layer.px[i]; dst.ink[i] = layer.ink[i]; }
  }
}

/** Draw into a scratch layer then compose it (outlined) onto `dst`. */
export function part(dst, draw, opt = {}) {
  const layer = new Img(dst.w, dst.h);
  draw(layer);
  compose(dst, layer, opt);
  return dst;
}

/** Overwrite helper: copy src pixels into dst with an offset (no outline). */
export function blit(dst, src, ox = 0, oy = 0) {
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const c = src.px[y * src.w + x];
      if (c) dst.set(x + ox, y + oy, c, src.ink[y * src.w + x]);
    }
  }
}

export function toRgba(img) {
  const out = new Uint8ClampedArray(img.w * img.h * 4);
  for (let i = 0; i < img.px.length; i++) {
    const c = img.px[i];
    if (!c) continue;
    out[i * 4] = (c >>> 16) & 255;
    out[i * 4 + 1] = (c >>> 8) & 255;
    out[i * 4 + 2] = c & 255;
    out[i * 4 + 3] = (c >>> 24) & 255;
  }
  return out;
}

/** Nearest-neighbour upscale for previews. */
export function upscale(img, k, bg) {
  const o = new Img(img.w * k, img.h * k);
  for (let y = 0; y < o.h; y++) {
    for (let x = 0; x < o.w; x++) {
      const c = img.px[Math.floor(y / k) * img.w + Math.floor(x / k)];
      o.px[y * o.w + x] = c || (bg ? C(bg) : 0);
    }
  }
  return o;
}
