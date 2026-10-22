// King of Fighters style toolkit: hue-shifted ramps, hard-banded cel shading (no dither), a smooth
// shape-union rasteriser for tapered limbs, a heroic-proportion rig with a two-part torso, and the
// stock poses every fighter shares (fighting-stance bounce, walk, jump, hit, knockdown ...).
import { C, rgbOf, pack, line, pointInPoly, stamp, part, mix } from './raster.mjs';
import { ik2, ANCHOR_X, ANCHOR_Y, deg, pose } from './rig.mjs';

// ---------------------------------------------------------------- colour

function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl(h, s, l) {
  h /= 360;
  const f = (p, q, t) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}
const arc = (from, to) => ((to - from + 540) % 360) - 180;
const toward = (h, t, d) => (h + Math.max(-d, Math.min(d, arc(h, t))) + 360) % 360;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * One material, five tones, hue-shifted the way pixel artists do it: shadows slide toward violet and
 * get richer, highlights slide toward warm yellow and get paler. `ink` is the outline colour.
 * o.k scales every lightness step, o.over replaces single tones.
 */
export function ramp(base, o = {}) {
  const [h, s, l] = toHsl(rgbOf(C(base)));
  const k = o.k ?? 1;
  const mk = (to, dh, dl, ds) => pack(...fromHsl(toward(h, to, dh), clamp01(s + ds), clamp01(l + dl * k)));
  const ink = pack(...fromHsl(toward(h, 275, 40), clamp01(Math.min(s, 0.55) + 0.04), Math.max(0.04, l - 0.34 * k)));
  return {
    h: mk(52, 16, 0.26, -0.14),
    l: mk(52, 8, 0.12, -0.03),
    m: C(base),
    s: mk(265, 14, -0.13, 0.05),
    d: mk(270, 26, -0.25, 0.07),
    ink,
    ...o.over,
  };
}

const unit = (x, y, z) => { const n = Math.hypot(x, y, z); return [x / n, y / n, z / n]; };
const LT = unit(-0.42, -0.66, 0.62); // light from the upper left, toward the viewer

/** Hard-banded cel paint: deep | shadow | mid | light | rim. No dither, ever. */
export const cel = (r, o = {}) => {
  const t = o.t ?? [-0.5, -0.06, 0.46, 0.93];
  return (i) => {
    const v = i.nx * LT[0] + i.ny * LT[1] + i.nz * LT[2];
    const key = v < t[0] ? 'd' : v < t[1] ? 's' : v < t[2] ? 'm' : v < t[3] ? 'l' : 'h';
    if (key === 'h' && o.noHi) return r.l;
    if (key === 'd' && o.noDeep) return r.s;
    return r[key];
  };
};

// ---------------------------------------------------------------- shape union

export const cap = (a, b, r0, r1 = r0) => ({ k: 'cap', a, b, r0, r1 });
export const ell = (c, rx, ry = rx, rot = 0) => ({ k: 'ell', c, rx, ry, cs: Math.cos(rot), sn: Math.sin(rot) });

function hit(s, px, py) {
  if (s.k === 'cap') {
    const vx = s.b[0] - s.a[0], vy = s.b[1] - s.a[1];
    const len2 = vx * vx + vy * vy || 1e-6;
    const t = Math.max(0, Math.min(1, ((px - s.a[0]) * vx + (py - s.a[1]) * vy) / len2));
    const r = s.r0 + (s.r1 - s.r0) * t;
    const dx = (px - (s.a[0] + vx * t)) / r, dy = (py - (s.a[1] + vy * t)) / r;
    const q = dx * dx + dy * dy;
    return q > 1 ? null : { q, nx: dx, ny: dy, nz: Math.sqrt(1 - q), t };
  }
  const ox = px - s.c[0], oy = py - s.c[1];
  const lx = (ox * s.cs + oy * s.sn) / s.rx, ly = (-ox * s.sn + oy * s.cs) / s.ry;
  const q = lx * lx + ly * ly;
  if (q > 1) return null;
  return { q, nx: lx * s.cs - ly * s.sn, ny: lx * s.sn + ly * s.cs, nz: Math.sqrt(1 - q), t: 0 };
}

function bounds(s) {
  if (s.k === 'cap') {
    const r = Math.max(s.r0, s.r1);
    return [Math.min(s.a[0], s.b[0]) - r, Math.min(s.a[1], s.b[1]) - r, Math.max(s.a[0], s.b[0]) + r, Math.max(s.a[1], s.b[1]) + r];
  }
  const r = Math.max(s.rx, s.ry);
  return [s.c[0] - r, s.c[1] - r, s.c[0] + r, s.c[1] + r];
}

/** Fill the union of shapes. Each pixel takes the normal of whichever shape it sits deepest inside, so joints stay smooth. */
export function blob(L, shapes, paint, ink = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of shapes) {
    const b = bounds(s);
    x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
  }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      let best = null;
      for (const s of shapes) {
        const h = hit(s, x + 0.5, y + 0.5);
        if (h && (!best || h.q < best.q)) best = h;
      }
      if (!best) continue;
      const res = paint({ x, y, ...best });
      if (res == null) continue;
      if (typeof res === 'object') L.set(x, y, res.c, res.ink ?? ink);
      else L.set(x, y, res, ink);
    }
  }
}

const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function profile(radii, u) {
  if (radii.length === 1) return radii[0];
  const p = Math.max(0, Math.min(1, u)) * (radii.length - 1);
  const i = Math.min(radii.length - 2, Math.floor(p));
  return radii[i] + (radii[i + 1] - radii[i]) * (p - i);
}

/**
 * A two-bone limb as a run of capsules whose radius follows `radii` evenly from root to tip.
 * o.from / o.to keep only the part of the chain between those fractions (a sleeve, a trouser leg).
 */
export function limbShapes(a, e, h, radii, K = 5, o = {}) {
  const l1 = dist(a, e), l2 = dist(e, h), tot = l1 + l2 || 1;
  const pts = [];
  for (let j = 0; j <= K; j++) pts.push({ p: lerp2(a, e, j / K), u: (l1 * j) / K / tot });
  for (let j = 1; j <= K; j++) pts.push({ p: lerp2(e, h, j / K), u: (l1 + (l2 * j) / K) / tot });
  const from = o.from ?? 0, to = o.to ?? 1, grow = o.grow ?? 0;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i + 1].u < from - 1e-6 || pts[i].u > to + 1e-6) continue;
    out.push(cap(pts[i].p, pts[i + 1].p, profile(radii, pts[i].u) + grow, profile(radii, pts[i + 1].u) + grow));
  }
  return out;
}

/** Point at fraction u (0..1) along the two bones a -> e -> h, with the limb radius there. */
export function limbAt(a, e, h, radii, u) {
  const l1 = dist(a, e), l2 = dist(e, h), tot = l1 + l2 || 1;
  const d = u * tot;
  const p = d <= l1 ? lerp2(a, e, d / (l1 || 1)) : lerp2(e, h, (d - l1) / (l2 || 1));
  const q = d <= l1 ? [e[0] - a[0], e[1] - a[1]] : [h[0] - e[0], h[1] - e[1]];
  const n = Math.hypot(q[0], q[1]) || 1;
  return { p, dir: [q[0] / n, q[1] / n], r: profile(radii, u) };
}

/** Single tapered bar through a point list (used for tails, scarves, capes). */
export function ribbon(pts, radii) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(cap(pts[i], pts[i + 1], profile(radii, i / (pts.length - 1)), profile(radii, (i + 1) / (pts.length - 1))));
  return out;
}

/**
 * Painter's brush for faces: fill polygon `pts` with `color`, but only on pixels the layer already owns,
 * so a highlight or shadow plane can never leak past the silhouette it is painted on.
 */
export function paintOver(L, pts, color, ink) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      if (!L.get(x, y) || !pointInPoly(x + 0.5, y + 0.5, pts)) continue;
      L.set(x, y, color, ink ?? L.ink[y * L.w + x]);
    }
  }
}

/** Flat silhouette: one colour, no shading. */
export function flatPoly(L, pts, color, ink) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) if (pointInPoly(x + 0.5, y + 0.5, pts)) L.set(x, y, color, ink);
}

// ---------------------------------------------------------------- the skull

const SKULL_EYES = {
  neutral: { n: ['vv', 'vh'], f: ['vv', 'vh'] },
  blink: { n: ['xx'], f: ['xx'] },
  yell: { n: ['vvv', 'vhv', 'vvv'], f: ['vvv', 'vhv', 'vvv'] },
  hurt: { n: ['h.h', '.h.', 'h.h'], f: ['h.h', '.h.', 'h.h'] },
  smug: { n: ['.v.', 'v.v'], f: ['.v.', 'v.v'] },
  ko: { n: ['h.h', '.h.', 'h.h'], f: ['h.h', '.h.', 'h.h'] },
};

/**
 * A calavera head facing right, centred on (hx, hy): cranium, brow, round sockets with a glow, a nose hole,
 * cheekbone ridge, a grin of teeth and a short jaw that drops when he shouts.
 *   o.bone  ramp for the bone     o.glow  ramp of the eye glow     o.dark  socket colour
 * Draws into its own outlined layer on `img`; the caller draws any hat or hood afterwards.
 */
export function drawSkull(img, head, face, o) {
  const [hx, hy] = head;
  const { bone, glow } = o;
  const dark = o.dark ?? C('#1a1030');
  const shade = mix(bone.m, bone.s, 0.55);
  const pal = { x: dark, v: glow.m, h: glow.h, g: glow.l };
  const at = (pts) => pts.map(([x, y]) => [hx + x, hy + y]);
  const px = (L, dx, dy, c) => L.set(Math.round(hx + dx), Math.round(hy + dy), c);
  const open = face === 'yell' ? 2.4 : face === 'hurt' ? 1.2 : face === 'ko' ? 1.8 : 0;
  part(img, (L) => {
    // cranium, brow, cheekbone and upper jaw as one flat silhouette
    flatPoly(L, at([[-1, -9.4], [3, -9], [6.2, -7], [7.8, -3.8], [8, -1.6], [7.2, 0.2], [7.8, 2.4], [8.4, 4.6], [7.4, 5.4], [6.6, 6.2], [2, 6.6], [-2, 6.4], [-4.6, 4.4], [-6.6, 0.6], [-6.8, -4.6], [-4.8, -7.8]]), bone.m, bone.ink);
    paintOver(L, at([[-5, -7.8], [3, -9], [6.2, -7], [3, -5.4], [-4, -4.6]]), bone.l); // lit crown
    paintOver(L, at([[-6.8, -4.6], [-6.6, 0.6], [-4.6, 4.4], [-3, 0], [-4.6, -4]]), shade); // temple and back of the skull
    paintOver(L, at([[-1, 3], [6.8, 2.8], [7.8, 2.4], [8.4, 4.6], [7.4, 5.4], [-1, 5.2]]), shade); // hollow under the cheekbone
    // lower jaw: short and square, dropped when he shouts
    flatPoly(L, at([[1.2, 5.8 + open], [7.4, 5.6 + open], [7, 7.4 + open], [4.6, 9 + open], [-0.2, 8.8 + open], [-3, 6.8 + open]]), bone.m, bone.ink);
    paintOver(L, at([[1.2, 7.8 + open], [4.6, 9 + open], [-0.2, 8.8 + open], [-3, 6.8 + open], [-2, 7.6 + open]]), shade);
    if (open) flatPoly(L, at([[1.6, 5.6], [7.6, 5.4], [7.4, 6 + open], [1.6, 6.2 + open]]), dark);
    // round eye sockets, a triangular nose hole, brow ridge and cheekbone highlights
    blob(L, [ell([hx - 3.2, hy - 1.8], 3, 3.3, -0.2)], () => dark, dark);
    blob(L, [ell([hx + 4.4, hy - 1.6], 2.7, 3.1, 0.2)], () => dark, dark);
    flatPoly(L, at([[5.4, 1.4], [7.8, 1.4], [6.6, 3.8]]), dark, dark);
    for (let i = 0; i < 4; i++) { px(L, -5.4 + i, -5 + i * 0.15, bone.h); px(L, 2.8 + i, -4.6 - i * 0.1, bone.h); }
    for (let i = 0; i < 6; i++) px(L, -1 + i * 1.1, 3 - i * 0.05, bone.h);
    // grin: upper teeth with dark gaps between them, a dark line between the jaws, lower teeth
    for (let i = 0; i < 7; i++) px(L, 1.4 + i, 5.8, dark);
    for (let i = 0; i < 7; i++) { px(L, 1.4 + i, 4.2, i % 2 ? bone.d : bone.h); px(L, 1.4 + i, 5, i % 2 ? bone.d : bone.l); }
    for (let i = 0; i < 6; i++) px(L, 1.8 + i, 6.6 + open, i % 2 ? bone.d : bone.h);
    const e = SKULL_EYES[face] ?? SKULL_EYES.neutral;
    stamp(L, e.n, pal, hx - 4.2, hy - 2.8);
    stamp(L, e.f, pal, hx + 3.4, hy - 2.6);
  });
}

// ---------------------------------------------------------------- the rig

/**
 * S: { thigh, shin, torso, neck, headR, upper, fore, hipH, shoulderDrop, shoulderDepth, hipDepth }
 * Pose targets are local px relative to the feet anchor (+x forward, +y down, ground is y = 0):
 *   root [x, y]   pelvis offset from its standing spot
 *   lean          whole-torso forward lean in degrees (negative leans back)
 *   bend          extra degrees of the chest over the pelvis (a twist or a crunch)
 *   twist         px the shoulders swing round (front shoulder forward, back shoulder back)
 *   head [x, y]   head offset      handF/handB, footF/footB   limb targets
 *   bendF/bendB/kneeF/kneeB  which way the elbow/knee folds (+1 / -1)
 */
export function solve2(S, p) {
  const pelvis = [ANCHOR_X + p.root[0], ANCHOR_Y - S.hipH + p.root[1]];
  const a0 = deg(p.lean), a1 = deg(p.lean + (p.bend ?? 0));
  const up0 = [Math.sin(a0), -Math.cos(a0)], up1 = [Math.sin(a1), -Math.cos(a1)];
  const side1 = [Math.cos(a1), Math.sin(a1)];
  const waist = [pelvis[0] + up0[0] * S.torso * 0.42, pelvis[1] + up0[1] * S.torso * 0.42];
  const neck = [waist[0] + up1[0] * S.torso * 0.58, waist[1] + up1[1] * S.torso * 0.58];
  const chest = [waist[0] + up1[0] * S.torso * 0.3, waist[1] + up1[1] * S.torso * 0.3];
  const lift = S.neck + S.headR * 0.95;
  const head = [neck[0] + up1[0] * lift + p.head[0], neck[1] + up1[1] * lift + p.head[1]];
  const tw = p.twist ?? 0;
  const sh = (d) => [
    neck[0] - up1[0] * S.shoulderDrop + side1[0] * (S.shoulderDepth + tw) * d,
    neck[1] - up1[1] * S.shoulderDrop + side1[1] * (S.shoulderDepth + tw) * d,
  ];
  const shF = sh(1), shB = sh(-1);
  const hipF = [pelvis[0] + S.hipDepth, pelvis[1]], hipB = [pelvis[0] - S.hipDepth, pelvis[1]];
  const tgt = (t) => [ANCHOR_X + t[0], ANCHOR_Y + t[1]];
  const hF = tgt(p.handF), hB = tgt(p.handB), fF = tgt(p.footF), fB = tgt(p.footB);
  const armF = ik2(shF[0], shF[1], hF[0], hF[1], S.upper, S.fore, p.bendF ?? (hF[0] >= shF[0] - 2 ? 1 : -1));
  const armB = ik2(shB[0], shB[1], hB[0], hB[1], S.upper, S.fore, p.bendB ?? (hB[0] >= shB[0] - 2 ? 1 : -1));
  const legF = ik2(hipF[0], hipF[1], fF[0], fF[1], S.thigh, S.shin, p.kneeF ?? -1);
  const legB = ik2(hipB[0], hipB[1], fB[0], fB[1], S.thigh, S.shin, p.kneeB ?? -1);
  return { pelvis, waist, chest, neck, head, up0, up1, side1, shF, shB, armF, armB, hipF, hipB, legF, legB, a0, a1 };
}

/** Point in the torso's own frame: u along the shoulders (forward +), v up the spine, measured from `o`. */
export const onTorso = (J, o, u, v) => [o[0] + J.side1[0] * u + J.up1[0] * v, o[1] + J.side1[1] * u + J.up1[1] * v];

/** Foot pointing angle in degrees (0 = toes forward, -90 = toes up): flat on the ground, else follows the shin. */
export function footAngle(l, given) {
  if (given != null) return given;
  if (l.hy >= ANCHOR_Y - 3) return 0;
  const shin = (Math.atan2(l.hy - l.ey, l.hx - l.ex) * 180) / Math.PI;
  return (shin - 90) * 0.6;
}

export const REST = {
  root: [0, 0], lean: 0, bend: 0, twist: 0, head: [0, 0],
  handF: [14, -40], handB: [8, -38], footF: [8, 0], footB: [-8, 0], face: 'neutral',
};
const P = (o) => pose(REST, o);

const at = (a, b) => [a[0] + b[0], a[1] + b[1]];

/**
 * Stock poses scaled by the skeleton:
 *   stance     half the foot spacing in a fighting stance        crouch   how far the pelvis drops
 *   guard      [front, back] resting fist targets (local)        stride   walk half-stride
 *   lean       idle torso lean in degrees                         blink    idle frame 3 is a blink
 */
export function stock2(S, o = {}) {
  const stance = o.stance ?? 12;
  const crouch = o.crouch ?? 5;
  const sh = S.hipH + S.torso; // shoulder height above the ground when standing
  const gF = o.guard?.[0] ?? [S.upper + S.fore * 0.55, -(sh - 6 - crouch)];
  const gB = o.guard?.[1] ?? [S.upper * 0.7, -(sh - 13 - crouch)];
  const lean0 = o.lean ?? 7;
  const base = (x = {}) => P({ handF: gF, handB: gB, footF: [stance, 0], footB: [-stance, 0], root: [0, crouch], lean: lean0, ...x });

  // fighting-stance bounce: down, settle, up, settle
  const bob = [0, 0.9, 1.6, 1.2, 0.2, -0.5];
  const idle = bob.map((b, i) => base({
    root: [0, crouch - b * 0.9],
    lean: lean0 + (i % 6 < 3 ? 0.4 * i : 0.4 * (6 - i)),
    handF: at(gF, [0.4 * b, -b * 0.8]),
    handB: at(gB, [0.2 * b, -b * 0.6]),
    head: [0, -b * 0.35],
    footF: [stance + (b > 1 ? 0.5 : 0), 0],
    face: i === 4 && o.blink ? 'blink' : 'neutral',
  }));

  const stride = o.stride ?? 12;
  const walk = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const fl = (x) => -Math.max(0, Math.cos(x)) * 7;
    walk.push(base({
      root: [0, crouch - 1 + 1.6 * Math.abs(Math.sin(a))],
      lean: lean0 + 3,
      footF: [stance + stride * Math.sin(a), fl(a)],
      footB: [-stance + stride * Math.sin(a + Math.PI), fl(a + Math.PI)],
      handF: at(gF, [-2.2 * Math.sin(a), 0.8 * Math.cos(a * 2)]),
      handB: at(gB, [-2.2 * Math.sin(a + Math.PI), 0.8 * Math.cos(a * 2)]),
      head: [0, 0.4 * Math.cos(a * 2)],
    }));
  }

  const jump = [
    base({ root: [0, -9], lean: 8, footF: [10, -14], footB: [-6, -16], handF: at(gF, [3, -6]), handB: at(gB, [2, -6]), kneeF: -1, kneeB: -1 }),
    base({ root: [0, -4], lean: 5, footF: [13, -16], footB: [-3, -19], handF: at(gF, [4, -8]), handB: at(gB, [2, -8]) }),
    base({ root: [0, -7], lean: 1, footF: [9, -5], footB: [-7, -9], handF: at(gF, [2, -16]), handB: at(gB, [-2, -16]) }),
  ];
  const land = [base({ root: [0, crouch + 9], lean: 14, footF: [stance + 8, 0], footB: [-stance - 8, 0], handF: at(gF, [2, 10]), handB: at(gB, [0, 10]) })];

  const hit = [
    base({ root: [-4, crouch - 1], lean: -9, head: [-3, -1], footF: [stance - 1, 0], footB: [-stance - 4, 0], handF: at(gF, [-10, 2]), handB: at(gB, [-11, 4]), face: 'hurt', bend: -4 }),
    base({ root: [-7, crouch], lean: -16, head: [-5, 1], footF: [stance - 2, 0], footB: [-stance - 6, 0], handF: at(gF, [-15, 6]), handB: at(gB, [-16, 9]), face: 'hurt', bend: -7 }),
    base({ root: [-4, crouch + 1], lean: -6, head: [-2, 1], handF: at(gF, [-6, 3]), handB: at(gB, [-8, 4]), face: 'hurt', bend: -2 }),
  ];

  // lying on the back: the body sits S.hipH - 24 below its standing pelvis, head away from the opponent
  const lie = S.hipH - 24 - (o.lieLift ?? 0);
  const L = S.torso;
  const ko = [
    P({ root: [-10, -14], lean: -40, bend: -6, head: [-3, 0], footF: [9, -16], footB: [3, -9], handF: [-8, -sh - 2], handB: [-14, -sh + 6], face: 'ko' }),
    P({ root: [-16, S.hipH * 0.35], lean: -70, bend: -6, footF: [12, -16], footB: [4, -11], handF: [-16, -sh + 14], handB: [-26, -sh + 20], face: 'ko' }),
    P({ root: [-16, lie], lean: -88, footF: [S.thigh + S.shin * 0.72, -4], footB: [S.thigh + S.shin * 0.46, -9], handF: [-L - 8, -5], handB: [-L - 2, -9], face: 'ko' }),
    P({ root: [-16, lie], lean: -90, footF: [S.thigh + S.shin * 0.76, -3], footB: [S.thigh + S.shin * 0.5, -8], handF: [-L - 12, -5], handB: [-L - 5, -9], face: 'ko' }),
    P({ root: [-16, lie], lean: -90, footF: [S.thigh + S.shin * 0.76, -3], footB: [S.thigh + S.shin * 0.5, -8], handF: [-L - 12, -4], handB: [-L - 5, -8], face: 'ko' }),
  ];
  const getup = [
    P({ root: [-14, S.hipH - 29 - (o.lieLift ?? 0)], lean: -64, footF: [S.thigh + 6, -6], footB: [S.thigh, -2], handF: [-8, -8], handB: [-20, -12], face: 'hurt' }),
    P({ root: [-7, 9], lean: -28, footF: [stance + 4, 0], footB: [-stance, 0], handF: [5, -14], handB: [-9, -14], face: 'hurt' }),
    base({ root: [-2, crouch + 1], lean: lean0 - 2, handF: at(gF, [-2, 6]), handB: at(gB, [-4, 6]) }),
  ];
  const dodge = [
    base({ root: [5, crouch + 6], lean: 20, footF: [stance + 8, 0], footB: [-stance - 4, 0], handF: at(gF, [0, 12]), handB: at(gB, [-4, 12]) }),
    base({ root: [16, crouch + 10], lean: 42, footF: [stance + 16, 0], footB: [-stance - 12, -2], handF: at(gF, [4, 18]), handB: at(gB, [0, 20]) }),
    base({ root: [7, crouch + 6], lean: 22, footF: [stance + 8, 0], footB: [-stance - 4, 0], handF: at(gF, [0, 12]), handB: at(gB, [-4, 12]) }),
  ];
  const guard = [
    base({ root: [-1, crouch + 2], lean: lean0 - 3, footF: [stance + 3, 0], footB: [-stance - 3, 0], handF: [S.upper * 0.8 + 3, -(sh - 6 - crouch)], handB: [S.upper * 0.55 + 3, -(sh - 11 - crouch)], face: 'neutral' }),
    base({ root: [-2, crouch + 2.5], lean: lean0 - 4, footF: [stance + 3, 0], footB: [-stance - 3, 0], handF: [S.upper * 0.8 + 4, -(sh - 7 - crouch)], handB: [S.upper * 0.55 + 4, -(sh - 12 - crouch)] }),
  ];
  const reach = S.upper + S.fore;
  const win = [
    base({ root: [0, crouch + 4], lean: 6, handF: at(gF, [0, 12]), handB: at(gB, [-2, 12]), face: 'smug' }),
    base({ root: [0, -8], lean: -2, footF: [7, -8], footB: [-7, -8], handF: [10, -(sh + reach - 4)], handB: [-6, -(sh + reach - 20)], face: 'smug' }),
    base({ root: [0, -2], lean: -3, handF: [11, -(sh + reach - 6)], handB: [-6, -(sh + reach - 24)], face: 'smug' }),
    base({ root: [0, 2], lean: -2, handF: [11, -(sh + reach - 10)], handB: [-7, -(sh + reach - 26)], face: 'smug' }),
  ];
  return { idle, walk, jump, land, hit, ko, getup, dodge, guard, win, P: base, gF, gB, stance, sh, crouch, lean0 };
}

// ---------------------------------------------------------------- limb builders

/** A thin band across a limb at fraction u (cuffs, wraps, bracers). */
function band(img, a, e, h, radii, u, ramp, w = 1.5, grow = 0.6) {
  const { p, dir, r } = limbAt(a, e, h, radii, u);
  const n = [-dir[1], dir[0]];
  part(img, (L) => blob(L, [cap([p[0] - n[0] * (r + grow), p[1] - n[1] * (r + grow)], [p[0] + n[0] * (r + grow), p[1] + n[1] * (r + grow)], w)], cel(ramp), ramp.ink));
}

/**
 * Draw an arm from the shoulder `sh` through IK result `a` (ex, ey, hx, hy).
 *   radii   thickness profile            skin    bare skin ramp
 *   sleeve  { ramp, to, grow, cuff }     sleeve covers the arm from the shoulder to fraction `to`
 *   hand    'fist' | 'open' | null       glove   ramp for the hand if it is gloved (else `skin`)
 *   wrap    { ramp, len }                a wrist wrap just behind the hand
 *   size    fist scale
 */
export function drawArm(img, sh, a, o) {
  const E = [a.ex, a.ey], H = [a.hx, a.hy];
  const k = o.scale ?? 1;
  part(img, (L) => blob(L, limbShapes(sh, E, H, o.radii), cel(o.skin), o.skin.ink));
  if (o.sleeve) {
    const sl = o.sleeve;
    part(img, (L) => blob(L, limbShapes(sh, E, H, o.radii, 5, { to: sl.to, grow: sl.grow ?? 0.7 }), cel(sl.ramp), sl.ramp.ink));
    if (sl.cuff) band(img, sh, E, H, o.radii, sl.to, sl.cuff, 1.4, sl.grow ?? 0.7);
  }
  const dx = H[0] - E[0], dy = H[1] - E[1], d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  if (o.wrap) {
    part(img, (L) => blob(L, [cap([H[0] - ux * (o.wrap.len ?? 5.6), H[1] - uy * (o.wrap.len ?? 5.6)], [H[0] - ux, H[1] - uy], 4.4 * k, 4.3 * k)], cel(o.wrap.ramp), o.wrap.ramp.ink));
  }
  if (o.hand === 'fist') {
    const hand = o.glove ?? o.skin, big = (o.size ?? 1) * k;
    part(img, (L) => {
      blob(L, [cap([H[0] + ux * 0.5, H[1] + uy * 0.5], [H[0] + ux * 5.2 * big, H[1] + uy * 5.2 * big], 4.4 * big, 4.8 * big)], cel(hand), hand.ink);
      for (const off of [-2.2, 0.2, 2.6]) {
        const c = [H[0] + ux * 3 * big - uy * off, H[1] + uy * 3 * big + ux * off];
        L.set(Math.round(c[0]), Math.round(c[1]), hand.d);
        L.set(Math.round(c[0] + ux * 1.4), Math.round(c[1] + uy * 1.4), hand.d);
      }
    });
  } else if (o.hand === 'open') {
    const hand = o.glove ?? o.skin;
    part(img, (L) => blob(L, [cap([H[0], H[1]], [H[0] + ux * 5.5, H[1] + uy * 5.5], 3, 2.2), cap([H[0] + ux * 1, H[1] + uy * 1], [H[0] + ux * 4 - uy * 2.4, H[1] + uy * 4 + ux * 2.4], 1.4, 1.1)], cel(hand), hand.ink));
  }
}

/**
 * Draw a leg from the hip through IK result `l`.
 *   skin   bare leg ramp         pants { ramp, to, grow, cuff }   covers the leg from the hip to fraction `to`
 *   boot   { ramp, shaft, cuff, len, r }   shaft = how many px of shin it covers   shoe-only if shaft is 0
 */
export function drawLeg(img, hip, l, o) {
  const E = [l.ex, l.ey], H = [l.hx, l.hy];
  part(img, (L) => blob(L, limbShapes(hip, E, H, o.radii), cel(o.skin), o.skin.ink));
  if (o.pants) {
    const pn = o.pants;
    part(img, (L) => blob(L, limbShapes(hip, E, H, o.radii, 5, { to: pn.to ?? 1, grow: pn.grow ?? 0.7 }), cel(pn.ramp), pn.ramp.ink));
    if (pn.stripe) part(img, (L) => line(L, hip[0] - 1, hip[1] + 4, E[0] - 1, E[1] - 1, pn.stripe));
    if (pn.cuff && (pn.to ?? 1) < 1) band(img, hip, E, H, o.radii, pn.to, pn.cuff, 1.4, pn.grow ?? 0.7);
  }
  const dx = H[0] - E[0], dy = H[1] - E[1], d = Math.hypot(dx, dy) || 1;
  const sx = dx / d, sy = dy / d;
  const fa = (footAngle(l, o.angle) * Math.PI) / 180;
  const fx = Math.cos(fa), fy = Math.sin(fa);
  const b = o.boot;
  if (b) {
    part(img, (L) => {
      const sh = b.shaft ?? 10, rr = b.r ?? 5;
      const shapes = [cap([H[0] - fx * 2.6, H[1] - fy * 2.6 + 0.4], [H[0] + fx * (b.len ?? 10), H[1] + fy * (b.len ?? 10) + 1.2], rr - 0.8, rr - 1.9)];
      if (sh > 0) shapes.push(cap([H[0] - sx * sh, H[1] - sy * sh], H, rr + 0.8, rr));
      blob(L, shapes, cel(b.ramp), b.ramp.ink);
      if (sh > 0 && b.cuff) {
        const top = [H[0] - sx * sh, H[1] - sy * sh];
        blob(L, [cap([top[0] - sy * (rr + 1), top[1] + sx * (rr + 1)], [top[0] + sy * (rr + 1), top[1] - sx * (rr + 1)], 1.4)], cel(b.cuff), b.cuff.ink);
      }
    });
  }
}

export { line };
