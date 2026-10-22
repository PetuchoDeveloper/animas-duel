// El Frijolito: a hooded green bean, small and quick. Pod, face and fists are drawn from
// shapes plus hand-placed pixels; poses only move joints, the drawing code never changes.
import { C, ellipse, capsule, poly, line, stamp, part, shade } from '../lib/raster.mjs';
import { newFrame, ik2, ANCHOR_X, ANCHOR_Y, pose, sampleKeys, deg } from '../lib/rig.mjs';

const GREEN = { d: '#10301d', s: '#1d5a2c', m: '#2e8c3a', l: '#5cc24c', h: '#a6ea6e', ink: '#0b2214' };
const LEAF = { d: '#0f2c1c', s: '#17482a', m: '#23703a', l: '#3b9f46', h: '#6fcb5c', ink: '#0b2214' };
const SKIN = { d: '#3f6a2a', s: '#6fa83a', m: '#a2d84e', l: '#c6ee6a', h: '#e6fb9a', ink: '#17381a' };
const BEAK = { d: '#6a260c', s: '#b0431a', m: '#f08622', l: '#ffb040', h: '#ffd88a', ink: '#4a1a08' };
const FIST = { d: '#8a540a', s: '#cc8512', m: '#f6bd28', l: '#ffe064', h: '#fff4b4', ink: '#5a3306' };
const BOOT = { d: '#5a1f0a', s: '#9a3c14', m: '#d8651e', l: '#f58f3a', h: '#ffbe70', ink: '#3a1306' };
const SASH = { d: '#5a0f1c', s: '#962033', m: '#d4343f', l: '#f2605a', h: '#ff9a88', ink: '#3a0a12' };

const EYE_PAL = {
  k: C('#160c14'), w: C('#f7f3df'), b: C('#a0562a'), B: C('#2a1008'), h: C('#ffffff'),
};

// Eyes are authored looking right.
const EYE = [
  '.kkkk.',
  'kwwwwk',
  'kwbbBk',
  'kwbhBk',
  'kwbBBk',
  'kwwbbk',
  '.kkkk.',
];
const EYE_WIDE = [
  '.kkkkk.',
  'kwwwwwk',
  'kwwbbBk',
  'kwbhBBk',
  'kwbBBBk',
  'kwbBBBk',
  'kwwbbwk',
  '.kkkkk.',
];
const EYE_SQUINT_L = ['kk...', '.kk..', '..kk.', '.kk..', 'kk...'];
const EYE_SQUINT_R = ['...kk', '..kk.', '.kk..', '..kk.', '...kk'];
const EYE_X = ['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'];
const EYE_HAPPY = ['..kk..', '.k..k.', 'k....k'];
const EYE_SHUT = ['kkkkk'];

export const meta = { id: 'bean', name: 'El Frijolito' };

const REST = {
  body: [0, 0],
  squash: [1, 1],
  lean: 0,
  tip: [0, 0],
  handF: [17, -11],
  handB: [7, -13],
  footF: [6, 0],
  footB: [-6, 0],
  face: 'angry',
  cape: 0,
  fist: 1,
  rotFace: 0,
};

// pod outline relative to its base pivot; y grows downwards, tip is at about -46
const POD = [
  [-3, -46], [4, -41], [10, -34], [14, -25], [15.5, -16], [13.5, -7], [8, -1.5], [0, 0],
  [-8, -1.5], [-13.5, -7], [-15.5, -16], [-14, -25], [-10, -34], [-6, -42],
];

function smooth(pts, n = 4) {
  const out = [];
  const N = pts.length;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

export function drawFrame(p) {
  const img = newFrame();
  const piv = [ANCHOR_X + p.body[0], ANCHOR_Y + p.body[1] - 6];
  const th = deg(p.lean);
  const cs = Math.cos(th), sn = Math.sin(th);
  // pod-relative point -> canvas (squash about the base, then lean about the base)
  const T = (x, y) => {
    const sx = x * p.squash[0], sy = y * p.squash[1];
    return [piv[0] + sx * cs - sy * sn, piv[1] + sx * sn + sy * cs];
  };
  const podPts = smooth(POD.map(([x, y], i) => {
    const sway = i === 0 ? 1 : i === 1 || i === POD.length - 1 ? 0.45 : 0;
    return T(x + p.tip[0] * sway, y + p.tip[1] * sway);
  }));
  const centre = T(0, -17);
  const faceC = T(4, -20);

  const body = (ramp, c, rx, ry, opt) => (i) => {
    const nx = (i.x + 0.5 - c[0]) / rx, ny = (i.y + 0.5 - c[1]) / ry;
    const nz = Math.sqrt(Math.max(0.02, 1 - Math.min(1, nx * nx + ny * ny)));
    return shade(ramp, nx, ny, nz, i.x, i.y, opt);
  };
  const lit = (ramp) => (i) => shade(ramp, i.nx, i.ny, i.nz, i.x, i.y);

  const shF = T(9, -8), shB = T(-3, -12);
  const armF = ik2(shF[0], shF[1], ANCHOR_X + p.handF[0], ANCHOR_Y + p.handF[1], 7, 7, p.handF[1] < -18 ? 1 : -1);
  const armB = ik2(shB[0], shB[1], ANCHOR_X + p.handB[0], ANCHOR_Y + p.handB[1], 7, 7, 1);
  const hipF = [piv[0] + 4, piv[1] + 1], hipB = [piv[0] - 4, piv[1] + 1];
  const legF = ik2(hipF[0], hipF[1], ANCHOR_X + p.footF[0], ANCHOR_Y + p.footF[1] - 2, 5, 5.5, -1);
  const legB = ik2(hipB[0], hipB[1], ANCHOR_X + p.footB[0], ANCHOR_Y + p.footB[1] - 2, 5, 5.5, -1);

  const limb = (a, j, ramp, r0, r1) => (L) => {
    capsule(L, a[0], a[1], j.ex, j.ey, r0, r1, lit(ramp), ramp.ink);
    capsule(L, j.ex, j.ey, j.hx, j.hy, r1, r0 * 0.92, lit(ramp), ramp.ink);
  };
  const foot = (j) => (L) => ellipse(L, j.hx + 1.5, j.hy + 1, 5, 3, lit(BOOT), BOOT.ink);
  const fist = (j) => (L) => ellipse(L, j.hx, j.hy, 4.4 * p.fist, 4.2 * p.fist, lit(FIST), FIST.ink);

  part(img, limb(hipB, legB, GREEN, 2.6, 2.4)); part(img, foot(legB));
  part(img, limb(shB, armB, LEAF, 2.8, 2.4)); part(img, fist(armB));

  // leaf cape behind the pod, fluttering
  const f = p.cape;
  part(img, (L) => poly(L, smooth([
    T(-8, -24), T(-17 - f * 4, -17 + f * 2), T(-22 - f * 6, -7 + f * 5), T(-10, -6), T(-9, -14),
  ], 4), lit(LEAF), LEAF.ink));

  // sash tail: one ribbon with a swallow-tail notch
  part(img, (L) => {
    const a = T(-12, -8);
    poly(L, [a, [a[0] - 10 - f * 4, a[1] + 1 + f * 3], [a[0] - 8 - f * 3, a[1] + 4 + f * 3], [a[0] - 12 - f * 4, a[1] + 8 + f * 3], [a[0] - 3, a[1] + 5]], lit(SASH), SASH.ink, 2);
  });

  part(img, (L) => {
    poly(L, podPts, body(GREEN, centre, 17, 24, { dither: true }), GREEN.ink);
    // hood rim, then the pale face inside it
    ellipse(L, faceC[0], faceC[1], 12.4, 11, () => C(GREEN.s), GREEN.ink);
    ellipse(L, faceC[0], faceC[1], 11, 9.6, body(SKIN, faceC, 11, 9.6), GREEN.s);
    // leaf vein
    const v0 = T(-4 + p.tip[0] * 0.2, -40), v1 = T(-8, -26), v2 = T(-10, -14);
    line(L, v0[0], v0[1], v1[0], v1[1], C(GREEN.s));
    line(L, v1[0], v1[1], v2[0], v2[1], C(GREEN.s));
    // sash: an arc, since we look at the barrel slightly from above
    const beltTop = [], beltBot = [];
    for (let x = -13.4; x <= 13.41; x += 2.23) {
      const k = 1 - (x / 13.4) ** 2;
      beltTop.push(T(x, -12 + 2.4 * k));
      beltBot.push(T(x * 0.9, -7.5 + 2.4 * k));
    }
    poly(L, [...beltTop, ...beltBot.reverse()], lit(SASH), SASH.ink, 2);
    const bk = T(5.5, -8.6);
    ellipse(L, bk[0], bk[1], 2.6, 2.6, lit(FIST), FIST.ink);
    drawFace(L, p, faceC);
  });

  // beak
  part(img, (L) => {
    const rq = p.rotFace;
    const bo = rotQ([9.5, 4.5], rq);
    const bx = faceC[0] + bo[0], by = faceC[1] + bo[1];
    const open = p.face === 'yell' || p.face === 'hurt' || p.face === 'ko';
    const tall = rq % 2 === 0;
    const [rx, ry] = tall ? [6, 2.6] : [2.6, 6];
    const up = rotQ([0, open ? -1.4 : -0.6], rq), dn = rotQ([-0.4, open ? 2.4 : 1.5], rq);
    ellipse(L, bx + dn[0], by + dn[1], rx - (tall ? 0.8 : 0), ry - (tall ? 0 : 0.8), lit(BEAK), BEAK.ink);
    if (open) ellipse(L, bx + (up[0] + dn[0]) / 2 - (tall ? 0 : 0), by + (up[1] + dn[1]) / 2, tall ? 3.6 : 1.4, tall ? 1.4 : 3.6, () => C('#4a0c18'), BEAK.ink);
    ellipse(L, bx + up[0], by + up[1], rx, ry, lit(BEAK), BEAK.ink);
  });

  part(img, limb(hipF, legF, GREEN, 2.8, 2.5)); part(img, foot(legF));
  part(img, limb(shF, armF, GREEN, 3, 2.6)); part(img, fist(armF));
  return img;
}

function rotQ([x, y], q) {
  let a = x, b = y;
  for (let k = 0; k < ((q % 4) + 4) % 4; k++) [a, b] = [-b, a];
  return [a, b];
}

function drawFace(L, p, fc) {
  const rq = p.rotFace;
  const at = (rows, dx, dy, ax = 0, ay = 0) => {
    const [ox, oy] = rotQ([dx, dy], rq);
    stamp(L, rows, EYE_PAL, fc[0] + ox, fc[1] + oy, { ax, ay, rot: rq });
  };
  const brow = (x0, y0, x1, y1) => {
    const a = rotQ([x0, y0], rq), b = rotQ([x1, y1], rq);
    for (const dy of [0, 1]) line(L, fc[0] + a[0], fc[1] + a[1] + dy, fc[0] + b[0], fc[1] + b[1] + dy, C('#160c14'));
  };
  switch (p.face) {
    case 'yell':
      at(EYE_WIDE, -5, -3, 3, 4); at(EYE_WIDE, 3, -3, 3, 4);
      brow(-9, -9, -2, -6); brow(4, -6, 9, -9);
      break;
    case 'hurt':
      at(EYE_SQUINT_L, -4, -2, 2, 2); at(EYE_SQUINT_R, 4, -2, 2, 2);
      brow(-9, -8, -3, -6); brow(3, -6, 9, -8);
      break;
    case 'ko':
      at(EYE_X, -4, -2, 2, 2); at(EYE_X, 4, -2, 2, 2);
      break;
    case 'smug':
      at(EYE_HAPPY, -4, -1, 3, 1); at(EYE_HAPPY, 4, -1, 3, 1);
      break;
    case 'blink':
      at(EYE_SHUT, -4, -1, 2, 0); at(EYE_SHUT, 4, -1, 2, 0);
      break;
    default:
      at(EYE_WIDE, -5, -3, 3, 4); at(EYE_WIDE, 3, -3, 3, 4);
      brow(-9, -8, -2, -5); brow(4, -5, 9, -8);
  }
}

// ------------------------------------------------------------------ poses
const P = (o) => pose(REST, o);

function walkFrames() {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const sF = Math.sin(a), sB = Math.sin(a + Math.PI);
    out.push(P({
      body: [0, -1 + 2 * Math.abs(Math.sin(a)) * -1 + 1],
      lean: 5,
      footF: [6 + 7 * sF, -Math.max(0, Math.cos(a)) * 4],
      footB: [-6 + 7 * sB, -Math.max(0, Math.cos(a + Math.PI)) * 4],
      handF: [15 - 3 * sF, -15 + Math.max(0, Math.cos(a)) * -1],
      handB: [6 - 3 * sB, -16],
      tip: [-3 - 2 * Math.cos(a), 0],
      cape: 0.5 + 0.4 * Math.sin(a),
    }));
  }
  return out;
}

/** Bust shot for the select and dialogue screens: a 64x64 window onto the idle pose. */
export const portrait = { box: [34, 36], pose: (face) => P({ face, handF: [17, -11], handB: [7, -13] }) };

export function animations() {
  const idle = [
    P({ handF: [15, -15], handB: [6, -16] }),
    P({ body: [0, 1], squash: [1.03, 0.97], handF: [15, -14], handB: [6, -15], tip: [-2, 1], cape: 0.4 }),
    P({ handF: [15, -15], handB: [6, -16], face: 'blink' }),
    P({ body: [0, -1], squash: [0.98, 1.03], handF: [15, -16], handB: [6, -17], tip: [-1, -1], cape: 0.2 }),
  ];
  const jumpUp = P({ body: [0, -6], squash: [0.9, 1.12], lean: 4, footF: [5, -5], footB: [-4, -7], handF: [16, -26], handB: [5, -28], tip: [-4, 0], cape: 1 });
  const jumpTop = P({ body: [0, -2], squash: [1, 1], lean: 2, footF: [7, -6], footB: [-5, -9], handF: [18, -22], handB: [8, -26], cape: 0.7 });
  const jumpDown = P({ body: [0, -5], squash: [0.94, 1.08], lean: -3, footF: [5, -2], footB: [-5, -3], handF: [14, -28], handB: [4, -30], tip: [-5, 2], cape: 1 });
  const land = P({ body: [0, 1], squash: [1.16, 0.8], lean: 3, handF: [16, -11], handB: [4, -12], cape: 0.3 });

  const light = [
    P({ body: [-3, 0], lean: -6, squash: [0.96, 1.02], handF: [3, -17], handB: [10, -13] }),
    P({ body: [4, 0], lean: 10, squash: [1.08, 0.96], handF: [31, -19], handB: [2, -12], fist: 1.2, face: 'yell', footF: [11, 0], footB: [-9, 0] }),
    P({ body: [5, 0], lean: 11, squash: [1.08, 0.96], handF: [33, -19], handB: [2, -12], fist: 1.2, face: 'yell', footF: [12, 0], footB: [-9, 0] }),
    P({ body: [1, 0], lean: 3, handF: [19, -16], handB: [6, -15] }),
  ];
  const heavy = [
    P({ body: [-4, 2], lean: -10, squash: [1.1, 0.88], handF: [-4, -16], handB: [-8, -13], footF: [8, 0], footB: [-8, 0] }),
    P({ body: [-5, 2], lean: -16, squash: [1.12, 0.86], handF: [-9, -22], handB: [-12, -18], footF: [9, 0], footB: [-9, 0], tip: [-6, 2] }),
    P({ body: [8, -1], lean: 20, squash: [0.92, 1.1], handF: [34, -23], handB: [28, -17], fist: 1.35, face: 'yell', footF: [12, 0], footB: [-12, 0], tip: [-8, 0], cape: 1 }),
    P({ body: [9, -1], lean: 21, squash: [0.92, 1.08], handF: [36, -23], handB: [30, -17], fist: 1.35, face: 'yell', footF: [13, 0], footB: [-13, 0], tip: [-8, 0], cape: 1 }),
    P({ body: [4, 0], lean: 8, handF: [22, -17], handB: [14, -14], footF: [11, 0], footB: [-8, 0] }),
  ];
  const air = [
    P({ body: [0, -8], lean: 18, squash: [0.95, 1.05], handF: [26, -22], handB: [18, -26], footF: [4, -6], footB: [-8, -10], face: 'yell', cape: 1 }),
    P({ body: [6, -6], lean: 55, squash: [0.9, 1.1], handF: [26, -14], handB: [20, -20], footF: [-6, -16], footB: [-12, -14], face: 'yell', fist: 1.3, tip: [-8, -2], cape: 1 }),
    P({ body: [8, -6], lean: 60, squash: [0.9, 1.1], handF: [28, -13], handB: [22, -19], footF: [-8, -18], footB: [-14, -15], face: 'yell', fist: 1.3, tip: [-8, -2], cape: 1 }),
  ];
  const special = [
    P({ body: [-3, 1], lean: -8, squash: [1.06, 0.94], handF: [-6, -22], handB: [-10, -18], footF: [9, 0], footB: [-9, 0] }),
    P({ body: [-4, 0], lean: -14, squash: [1.04, 0.98], handF: [-10, -26], handB: [-12, -20], footF: [9, 0], footB: [-10, 0], tip: [-7, 1], cape: 1 }),
    P({ body: [5, 0], lean: 14, squash: [0.96, 1.05], handF: [30, -24], handB: [26, -20], fist: 1.25, face: 'yell', footF: [12, 0], footB: [-10, 0], cape: 0.8 }),
    P({ body: [5, 0], lean: 14, squash: [0.96, 1.05], handF: [32, -24], handB: [28, -20], fist: 1.25, face: 'yell', footF: [12, 0], footB: [-10, 0], cape: 0.8 }),
    P({ body: [2, 0], lean: 5, handF: [20, -17], handB: [10, -15] }),
  ];
  const sup = [
    P({ body: [0, 3], squash: [1.14, 0.8], lean: 0, handF: [10, -9], handB: [2, -9], face: 'yell' }),
    P({ body: [0, 1], squash: [1.08, 0.9], handF: [14, -22], handB: [4, -22], face: 'yell', cape: 0.6 }),
    P({ body: [0, -3], squash: [0.9, 1.18], handF: [16, -38], handB: [2, -40], face: 'yell', footF: [5, -4], footB: [-5, -4], tip: [-4, -2], cape: 1 }),
    P({ body: [0, -3], squash: [0.9, 1.18], handF: [18, -40], handB: [2, -42], face: 'yell', footF: [5, -4], footB: [-5, -4], tip: [-4, -2], cape: 1 }),
    P({ body: [8, -5], lean: 40, squash: [0.92, 1.1], handF: [30, -18], handB: [24, -22], fist: 1.35, face: 'yell', footF: [-4, -14], footB: [-10, -12], tip: [-8, 0], cape: 1 }),
    P({ body: [4, 1], squash: [1.1, 0.9], lean: 10, handF: [22, -13], handB: [12, -12], face: 'yell', footF: [10, 0], footB: [-8, 0] }),
  ];
  const hit = [
    P({ body: [-4, 0], lean: -14, squash: [1.06, 0.94], handF: [4, -22], handB: [-2, -18], footF: [4, 0], footB: [-9, 0], face: 'hurt', tip: [3, 0], cape: 0.2 }),
    P({ body: [-7, -1], lean: -22, squash: [1.1, 0.9], handF: [2, -26], handB: [-4, -22], footF: [3, -1], footB: [-11, 0], face: 'hurt', tip: [6, 1], cape: 0.4 }),
    P({ body: [-4, 0], lean: -12, squash: [1.04, 0.96], handF: [8, -19], handB: [2, -17], face: 'hurt', tip: [2, 0] }),
  ];
  const ko = [
    P({ body: [-10, -12], lean: -34, squash: [0.96, 1.04], handF: [-2, -34], handB: [-8, -30], footF: [6, -16], footB: [0, -12], face: 'ko', tip: [8, 2], cape: 1 }),
    P({ body: [-17, -9], lean: -66, handF: [-10, -30], handB: [-14, -26], footF: [2, -14], footB: [-4, -10], face: 'ko', rotFace: -1, tip: [8, 3], cape: 1 }),
    P({ body: [-22, -13], lean: -90, squash: [1.04, 0.96], handF: [-6, -22], handB: [-12, -18], footF: [14, -8], footB: [8, -4], face: 'ko', rotFace: -1, tip: [6, 4], cape: 0.5 }),
    P({ body: [-22, -14], lean: -90, squash: [1.0, 1.0], handF: [-6, -30], handB: [-14, -26], footF: [14, -12], footB: [8, -8], face: 'ko', rotFace: -1, cape: 0.5 }),
    P({ body: [-22, -14], lean: -90, handF: [-7, -29], handB: [-14, -25], footF: [14, -11], footB: [8, -7], face: 'ko', rotFace: -1 }),
  ];
  const getup = [
    P({ body: [-18, -10], lean: -72, handF: [-6, -16], handB: [-12, -14], footF: [12, -2], footB: [4, 0], face: 'hurt', rotFace: -1 }),
    P({ body: [-8, -3], lean: -36, squash: [1.08, 0.92], handF: [2, -10], handB: [-6, -10], footF: [7, 0], footB: [-6, 0], face: 'hurt' }),
    P({ body: [-1, 1], lean: -6, squash: [1.12, 0.86], handF: [12, -12], handB: [4, -12] }),
  ];
  const dodge = [
    P({ body: [2, 3], lean: 18, squash: [1.12, 0.82], handF: [14, -9], handB: [8, -9], footF: [10, 0], footB: [-8, 0] }),
    P({ body: [10, 4], lean: 52, squash: [1.06, 0.84], handF: [20, -6], handB: [14, -8], footF: [14, -1], footB: [-6, -3], tip: [-6, 0], cape: 1 }),
    P({ body: [3, 3], lean: 20, squash: [1.1, 0.86], handF: [14, -9], handB: [8, -9], footF: [10, 0], footB: [-8, 0], cape: 0.5 }),
  ];
  const block = [
    P({ body: [-2, 2], lean: -2, squash: [1.08, 0.9], handF: [14, -24], handB: [10, -22], footF: [8, 0], footB: [-8, 0] }),
    P({ body: [-3, 2], lean: -4, squash: [1.1, 0.88], handF: [14, -24], handB: [10, -22], footF: [8, 0], footB: [-8, 0], tip: [-1, 0] }),
  ];
  const win = [
    P({ body: [0, 2], squash: [1.1, 0.88], handF: [12, -10], handB: [4, -10], face: 'smug' }),
    P({ body: [0, -5], squash: [0.92, 1.12], handF: [18, -44], handB: [-2, -44], footF: [5, -4], footB: [-5, -4], face: 'smug', cape: 1, tip: [-4, -2] }),
    P({ body: [0, -2], squash: [0.96, 1.05], handF: [18, -42], handB: [-2, -42], footF: [6, -1], footB: [-6, -1], face: 'smug', cape: 0.6 }),
    P({ body: [0, 1], squash: [1.04, 0.96], handF: [16, -40], handB: [0, -40], face: 'smug', cape: 0.3 }),
  ];
  const draw = (arr) => arr.map(drawFrame);
  return {
    idle: { fps: 6, loop: true, frames: draw(idle) },
    walk: { fps: 11, loop: true, frames: draw(walkFrames()) },
    jump: { fps: 1, loop: false, frames: draw([jumpUp, jumpTop, jumpDown]) },
    land: { fps: 1, loop: false, frames: draw([land]) },
    light: { fps: 12, loop: false, strike: [1, 2], frames: draw(light) },
    heavy: { fps: 10, loop: false, strike: [2, 3], frames: draw(heavy) },
    air: { fps: 10, loop: false, strike: [1, 2], frames: draw(air) },
    special: { fps: 10, loop: false, strike: [2, 3], frames: draw(special) },
    super: { fps: 8, loop: false, strike: [4, 4], frames: draw(sup) },
    hit: { fps: 10, loop: false, frames: draw(hit) },
    ko: { fps: 8, loop: false, frames: draw(ko) },
    getup: { fps: 8, loop: false, frames: draw(getup) },
    dodge: { fps: 10, loop: false, frames: draw(dodge) },
    block: { fps: 4, loop: true, frames: draw(block) },
    win: { fps: 6, loop: true, frames: draw(win) },
  };
}
