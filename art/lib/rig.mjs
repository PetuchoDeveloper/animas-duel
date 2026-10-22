// Posing helpers: two-bone IK, pose interpolation and the frame canvas every character draws on.
import { Img } from './raster.mjs';

/** Every fighter frame is drawn on a CELL_W x CELL_H canvas with the feet anchored at (ANCHOR_X, ANCHOR_Y). */
export const CELL_W = 160;
export const CELL_H = 144;
export const ANCHOR_X = 80;
export const ANCHOR_Y = 130;

export function newFrame() {
  return new Img(CELL_W, CELL_H);
}

/**
 * Two-bone IK. Shoulder/hip (sx, sy) reaching for (tx, ty). `bend` picks which way the
 * joint folds (+1 = clockwise on screen). Out-of-reach targets are pulled in.
 */
export function ik2(sx, sy, tx, ty, l1, l2, bend = 1) {
  let dx = tx - sx;
  let dy = ty - sy;
  let d = Math.hypot(dx, dy) || 1e-6;
  const max = l1 + l2 - 0.01;
  const min = Math.abs(l1 - l2) + 0.01;
  const dd = Math.max(min, Math.min(max, d));
  const base = Math.atan2(dy, dx);
  tx = sx + Math.cos(base) * dd;
  ty = sy + Math.sin(base) * dd;
  const cosA = (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const ang = base + bend * a;
  return { ex: sx + Math.cos(ang) * l1, ey: sy + Math.sin(ang) * l1, hx: tx, hy: ty };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => t * t * (3 - 2 * t);
export const deg = (d) => (d * Math.PI) / 180;

/** Recursively lerp two plain pose objects (numbers and nested arrays/objects). Non-numbers snap to `b` once t >= 0.5. */
export function lerpPose(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerpPose(v, b[i], t));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out[k] = k in a && k in b ? lerpPose(a[k], b[k], t) : k in b ? b[k] : a[k];
    }
    return out;
  }
  return t >= 0.5 ? b : a;
}

/** Sample a list of keyposes at `n` evenly spaced points along the sequence (first and last included). */
export function sampleKeys(keys, n, easing = ease) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = n === 1 ? 0 : (i / (n - 1)) * (keys.length - 1);
    const k = Math.min(keys.length - 2, Math.floor(p));
    out.push(keys.length === 1 ? keys[0] : lerpPose(keys[k], keys[k + 1], easing(p - k)));
  }
  return out;
}

/** Layer a partial pose on top of a base pose (one level deep merge). */
export function pose(base, over = {}) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] ? { ...base[k], ...v } : v;
  }
  return out;
}
