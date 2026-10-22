// Scene-painting helpers for the stage backdrops: dithered gradients, silhouettes, noise.
import { C, Img, ellipse, poly, line, rect, shade } from './raster.mjs';

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

/** Deterministic PRNG so every build produces the same pixels. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Vertical gradient through an ordered list of colours with crisp bands and dithered seams. */
export function vgrad(img, x0, y0, x1, y1, colors, zone = 0.45) {
  const n = colors.length;
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    const v = Math.min(n - 1 - 1e-6, t * (n - 1));
    const i = Math.floor(v);
    const f = Math.max(0, Math.min(1, (v - i - 0.5 + zone / 2) / zone));
    for (let x = x0; x < x1; x++) img.set(x, y, f > bayer(x, y) ? colors[i + 1] : colors[i]);
  }
}

/** Radial glow: colours listed from the outer rim to the centre, dithered between steps. */
export function glow(img, cx, cy, r, colors, squash = 1) {
  const n = colors.length;
  for (let y = Math.floor(cy - r * squash); y <= Math.ceil(cy + r * squash); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot((x + 0.5 - cx) / r, (y + 0.5 - cy) / (r * squash));
      if (d >= 1) continue;
      const idx = Math.floor((1 - d) * n - 0.5 + bayer(x, y));
      if (idx >= 0) img.set(x, y, colors[Math.min(n - 1, idx)]);
    }
  }
}

/** Value noise in [0,1], cheap and tileless: good for rock and cloud texture. */
export function noise2(seed) {
  const r = rng(seed);
  const grid = new Float32Array(64 * 64).map(() => r());
  const g = (x, y) => grid[((y & 63) * 64 + (x & 63)) >>> 0];
  return (x, y, scale = 8) => {
    const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = g(ix, iy) + (g(ix + 1, iy) - g(ix, iy)) * sx;
    const b = g(ix, iy + 1) + (g(ix + 1, iy + 1) - g(ix, iy + 1)) * sx;
    return a + (b - a) * sy;
  };
}

/** Fill everything under a ridge line (array of [x, y]) down to `bottom`. */
export function ridge(img, pts, bottom, c, topC) {
  for (let x = pts[0][0]; x <= pts[pts.length - 1][0]; x++) {
    let k = 0;
    while (k < pts.length - 2 && pts[k + 1][0] < x) k++;
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    const y = y0 + ((y1 - y0) * (x - x0)) / Math.max(1, x1 - x0);
    for (let yy = Math.round(y); yy < bottom; yy++) img.set(x, yy, topC && yy === Math.round(y) ? topC : c);
  }
}

export function stars(img, r, count, y0, y1, colors) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * img.w), y = Math.floor(y0 + r() * (y1 - y0));
    if (img.get(x, y)) {
      const big = r() < 0.12;
      img.set(x, y, colors[Math.floor(r() * colors.length)]);
      if (big) { img.set(x + 1, y, colors[0]); img.set(x - 1, y, colors[0]); img.set(x, y + 1, colors[0]); img.set(x, y - 1, colors[0]); }
    }
  }
}

/** Soft cloud: stacked ellipses, lit from above, dithered underside. */
export function cloud(img, cx, cy, w, h, ramp, r) {
  const blobs = 5 + Math.floor(w / 24);
  for (let i = 0; i < blobs; i++) {
    const bx = cx + (r() - 0.5) * w * 0.8, by = cy + (r() - 0.5) * h * 0.5;
    const rx = w * (0.14 + r() * 0.12), ry = h * (0.35 + r() * 0.25);
    ellipse(img, bx, by, rx, ry, (i2) => {
      const lvl = i2.ny < -0.35 ? 'l' : i2.ny < 0.15 ? 'm' : bayer(i2.x, i2.y) > 0.55 ? 's' : 'm';
      return ramp[lvl];
    });
  }
}

export { C, Img, ellipse, poly, line, rect, shade };
