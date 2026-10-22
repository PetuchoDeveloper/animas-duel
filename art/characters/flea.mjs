// La Pulguita: a flea brawler. Brown carapace with a pale stitched belly, orange boxing gloves
// and boots, a heavy jaw and two long antennae that lag behind her movement.
import { C, ellipse, capsule, poly, line, stamp, part } from '../lib/raster.mjs';
import { newFrame, pose, deg } from '../lib/rig.mjs';
import { solve, limb, lit, stock } from '../lib/humanoid.mjs';

const SHELL = { d: '#2d1710', s: '#4f2a18', m: '#78431f', l: '#a2652f', h: '#d08e4e', ink: '#1c0e08' };
const BELLY = { d: '#6b3d1c', s: '#a2642c', m: '#d29552', l: '#edbd78', h: '#fde0a6', ink: '#3a1e0c' };
const GLOVE = { d: '#7a2c08', s: '#c3481a', m: '#f2822a', l: '#ffb04a', h: '#ffdc90', ink: '#4a1a06' };
const CUFF = { d: '#8c7c5c', s: '#c8bc96', m: '#ece3c8', l: '#fffaee', h: '#ffffff', ink: '#4a3a24' };
const TRUNK = { d: '#4a0c1a', s: '#8a1c2e', m: '#c4303c', l: '#ee5a52', h: '#ff9a84', ink: '#2e0710' };
const JAW = { d: '#7a2c08', s: '#c3481a', m: '#f2822a', l: '#ffb04a', h: '#ffdc90', ink: '#4a1a06' };

export const meta = { id: 'flea', name: 'La Pulguita' };

const S = { thigh: 11, shin: 12, torso: 15, neck: 1, headR: 11, upper: 9, fore: 9, hipH: 21, shoulderDrop: 3, shoulderDepth: 6.5, hipDepth: 4 };

const EYE_PAL = { k: C('#160c14'), w: C('#f7f3df'), B: C('#140808'), h: C('#ffffff'), y: C('#e8b020') };
const EYE = ['.kkkk.', 'kwwwwk', 'kwwBBk', 'kwhBBk', 'kwwBBk', '.kwwk.'];
const EYE_WIDE = ['.kkkkk.', 'kwwwwwk', 'kwyyBBk', 'kwyhBBk', 'kwyyBBk', 'kwwwwwk', '.kkkkk.'];
const EYE_SQUINT_L = ['kk...', '.kk..', '..kk.', '.kk..', 'kk...'];
const EYE_SQUINT_R = ['...kk', '..kk.', '.kk..', '..kk.', '...kk'];
const EYE_X = ['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'];
const EYE_HAPPY = ['..kk..', '.k..k.', 'k....k'];
const EYE_SHUT = ['kkkkk'];

export function drawFrame(p) {
  const img = newFrame();
  const J = solve(S, p);
  const { pelvis, neck, head, up, side } = J;
  const ant = p.ant ?? 0;

  // antennae first: they sit behind the skull
  part(img, (L) => {
    for (const [dx, k] of [[-3.5, 0.8], [1.5, 1]]) {
      const b = [head[0] + dx, head[1] - 8.5];
      const m = [b[0] - 3 + ant * 0.4 * k, b[1] - 7];
      const t = [b[0] - 1 + ant * k - 3, b[1] - 14 + Math.abs(ant) * 0.15];
      capsule(L, b[0], b[1], m[0], m[1], 1.8, 1.4, lit(SHELL), SHELL.ink);
      capsule(L, m[0], m[1], t[0], t[1], 1.4, 1.1, lit(SHELL), SHELL.ink);
      ellipse(L, t[0], t[1] - 0.5, 2.6, 2.6, lit(GLOVE), GLOVE.ink);
    }
  });

  const glove = (a, big = 1) => (L) => {
    const [x, y] = [a.hx, a.hy];
    ellipse(L, x, y, 6.6 * big, 6.2 * big, lit(GLOVE), GLOVE.ink);
    ellipse(L, x - 5.4 * big * Math.sign(a.hx - a.ex || 1), y + 0.4, 2.6, 4.6, lit(CUFF), CUFF.ink);
  };
  const boot = (f, dir = 1) => (L) => {
    ellipse(L, f.hx + 2.5 * dir, f.hy + 0.2, 7.4, 3.8, lit(GLOVE), GLOVE.ink);
    ellipse(L, f.hx - 0.5 * dir, f.hy - 3.6, 3.8, 2.6, lit(CUFF), CUFF.ink);
  };

  part(img, (L) => limb(L, J.shB, J.armB, SHELL, 4.6, 4.2, 3.6)); part(img, glove(J.armB));
  part(img, (L) => limb(L, J.hipB, J.legB, SHELL, 6, 4.6, 3.8)); part(img, boot(J.legB));

  // torso
  part(img, (L) => {
    const wst = [pelvis[0], pelvis[1]];
    const chest = J.chest;
    capsule(L, wst[0], wst[1], chest[0], chest[1], 7.6, 10, lit(SHELL, { dither: true }), SHELL.ink);
    capsule(L, chest[0], chest[1], neck[0], neck[1], 10, 7.4, lit(SHELL, { dither: true }), SHELL.ink);
    // pale belly plate, ribbed
    const o = 3.4;
    const a = [wst[0] + side[0] * o + up[0] * 1, wst[1] + side[1] * o + up[1] * 1];
    const b = [neck[0] + side[0] * o - up[0] * 4, neck[1] + side[1] * o - up[1] * 4];
    capsule(L, a[0], a[1], b[0], b[1], 5.4, 6.4, lit(BELLY), BELLY.ink);
    for (let t = 0.18; t < 0.9; t += 0.2) {
      const cx = a[0] + (b[0] - a[0]) * t, cy = a[1] + (b[1] - a[1]) * t;
      line(L, cx - 4, cy, cx + 5, cy, C(BELLY.s));
    }
    // stitched seam down the middle
    for (let t = 0.05; t < 1; t += 0.11) {
      const x = a[0] + (b[0] - a[0]) * t + side[0] * 3, y = a[1] + (b[1] - a[1]) * t + side[1] * 3;
      L.set(Math.round(x), Math.round(y), C('#3a1e0c'));
    }
    // shoulder pad
    ellipse(L, J.shF[0], J.shF[1], 5.4, 5.2, lit(SHELL), SHELL.ink);
  });

  // boxing trunks with a cream waistband
  part(img, (L) => {
    const a = [pelvis[0] - up[0] * 3, pelvis[1] - up[1] * 3];
    const b = [pelvis[0] + up[0] * -5, pelvis[1] + 5];
    capsule(L, a[0] + 1, a[1], b[0] + 1, b[1], 7.2, 8, lit(TRUNK, { dither: true }), TRUNK.ink);
    for (const d of [0, 1]) line(L, a[0] - side[0] * 6.4 + 1, a[1] - side[1] * 6.4 + d, a[0] + side[0] * 6.4 + 1, a[1] + side[1] * 6.4 + d, C(d ? CUFF.s : CUFF.l));
  });

  // head band tail, behind the skull
  part(img, (L) => {
    const f = (p.ant ?? 0) * 0.25;
    poly(L, [[head[0] - 9, head[1] - 4], [head[0] - 19 + f, head[1] - 7 + Math.abs(f) * 0.3], [head[0] - 15 + f, head[1] - 3], [head[0] - 21 + f, head[1] + 1], [head[0] - 9, head[1] - 1]], lit(TRUNK), TRUNK.ink, 2);
  });

  // head
  part(img, (L) => {
    ellipse(L, head[0], head[1], 11.6, 10.2, lit(SHELL, { dither: true }), SHELL.ink);
    // forehead band
    for (let dx = -11; dx <= 11; dx++) {
      const by = head[1] - 6 + 0.02 * dx * dx;
      const inside = (dx / 11.6) ** 2 + ((by - head[1]) / 10.2) ** 2 < 0.97;
      if (!inside) continue;
      L.set(Math.round(head[0] + dx), Math.round(by), C(TRUNK.l), TRUNK.ink);
      L.set(Math.round(head[0] + dx), Math.round(by) + 1, C(TRUNK.s), TRUNK.ink);
    }
    // heavy orange jaw
    const open = p.face === 'yell' || p.face === 'hurt' || p.face === 'ko';
    ellipse(L, head[0] + 4, head[1] + (open ? 7.6 : 6.4), 7.6, open ? 3.8 : 4, lit(JAW), JAW.ink);
    if (open) {
      ellipse(L, head[0] + 4, head[1] + 5, 6, 2.6, () => C('#3a0612'), JAW.ink);
      L.set(Math.round(head[0] + 1), Math.round(head[1] + 4), C('#fff4d0'));
      L.set(Math.round(head[0] + 7), Math.round(head[1] + 4), C('#fff4d0'));
    } else {
      // grin line
      line(L, head[0] - 1, head[1] + 4, head[0] + 10, head[1] + 4, C('#3a0612'));
    }
    const eye = (rows, dx, dy, ax, ay) => stamp(L, rows, EYE_PAL, head[0] + dx, head[1] + dy, { ax, ay });
    const brow = (x0, y0, x1, y1) => { for (const d of [0, 1]) line(L, head[0] + x0, head[1] + y0 + d, head[0] + x1, head[1] + y1 + d, C('#160c14')); };
    switch (p.face) {
      case 'yell': eye(EYE_WIDE, -6, -1, 3, 3); eye(EYE_WIDE, 4, -1, 3, 3); break;
      case 'hurt': eye(EYE_SQUINT_L, -3, -2, 2, 2); eye(EYE_SQUINT_R, 6, -2, 2, 2); brow(-9, -7, -2, -4); brow(3, -4, 11, -7); break;
      case 'ko': eye(EYE_X, -3, -2, 2, 2); eye(EYE_X, 6, -2, 2, 2); break;
      case 'smug': eye(EYE_HAPPY, -3, -2, 3, 1); eye(EYE_HAPPY, 6, -2, 3, 1); break;
      case 'blink': eye(EYE_SHUT, -4, -2, 2, 0); eye(EYE_SHUT, 5, -2, 2, 0); break;
      default: eye(EYE_WIDE, -6, -1, 3, 3); eye(EYE_WIDE, 4, -1, 3, 3); 
    }
  });

  part(img, (L) => limb(L, J.hipF, J.legF, SHELL, 6.4, 5, 4)); part(img, boot(J.legF));
  part(img, (L) => limb(L, J.shF, J.armF, SHELL, 5, 4.4, 3.8)); part(img, glove(J.armF, p.glove ?? 1));
  return img;
}

// ------------------------------------------------------------------ poses
const st = stock(S, { stance: 9, stride: 12, blink: true });
const P = st.P;
const FX = (a, b) => [a, b];
// glove heights above ground
const chest = -(S.hipH + S.torso * 0.62), shoulder = -(S.hipH + S.torso - 3);

/** Bust shot for the select and dialogue screens: a 64x64 window onto the idle pose. */
export const portrait = { box: [34, 20], pose: (face) => P({ face, handF: [15, -24], handB: [6, -26] }) };

export function animations() {
  const idle = st.idle.map((q, i) => pose(q, { ant: [0, -1.5, -2.5, -1][i] }));
  const walk = st.walk.map((q, i) => pose(q, { ant: -3 - 2 * Math.sin((i / 6) * Math.PI * 2) }));

  const light = [
    P({ root: [-2, 2], lean: -4, handF: [2, chest + 2], handB: [10, chest + 4], ant: -3 }),
    P({ root: [5, 2], lean: 12, handF: [28, shoulder + 1], handB: [4, chest + 6], glove: 1.15, face: 'yell', footF: [13, 0], footB: [-10, 0], ant: -5 }),
    P({ root: [6, 2], lean: 13, handF: [30, shoulder + 1], handB: [4, chest + 6], glove: 1.15, face: 'yell', footF: [14, 0], footB: [-10, 0], ant: -5 }),
    P({ root: [1, 2], lean: 4, handF: [20, chest - 1], handB: [9, chest + 3] }),
  ];
  const heavy = [
    P({ root: [-4, 3], lean: -10, handF: [-6, chest + 8], handB: [8, chest + 4], footF: [11, 0], footB: [-11, 0], ant: -2 }),
    P({ root: [-7, 4], lean: -18, handF: [-12, chest - 2], handB: [6, chest + 3], footF: [12, 0], footB: [-12, 0], ant: 2 }),
    P({ root: [9, 3], lean: 24, handF: [32, chest - 7], handB: [-2, chest + 8], glove: 1.3, face: 'yell', footF: [17, 0], footB: [-12, 0], ant: -7 }),
    P({ root: [10, 3], lean: 25, handF: [34, chest - 7], handB: [-2, chest + 8], glove: 1.3, face: 'yell', footF: [18, 0], footB: [-12, 0], ant: -7 }),
    P({ root: [5, 3], lean: 12, handF: [26, chest - 4], handB: [4, chest + 6], footF: [14, 0], footB: [-10, 0] }),
  ];
  const air = [
    P({ root: [0, -9], lean: -8, handF: [16, chest - 6], handB: [6, chest - 6], footF: [14, -12], footB: [-2, -14], face: 'yell', ant: -5 }),
    P({ root: [3, -8], lean: -26, handF: [8, chest - 2], handB: [-2, chest + 2], footF: [26, -9], footB: [17, -13], face: 'yell', ant: -9 }),
    P({ root: [4, -8], lean: -28, handF: [8, chest], handB: [-2, chest + 4], footF: [28, -8], footB: [19, -12], face: 'yell', ant: -9 }),
  ];
  const special = [
    P({ root: [-5, 9], lean: 6, handF: [10, -22], handB: [4, -20], footF: [12, 0], footB: [-14, 0], ant: 1 }),
    P({ root: [-4, 10], lean: -8, handF: [4, -20], handB: [-4, -18], footF: [13, 0], footB: [-15, 0], ant: 3 }),
    P({ root: [18, -14], lean: 76, head: [4, 0], handF: [34, -24], handB: [26, -28], footF: [-14, -26], footB: [-22, -30], face: 'yell', ant: -12 }),
    P({ root: [20, -14], lean: 80, head: [4, 0], handF: [36, -22], handB: [28, -26], footF: [-16, -26], footB: [-24, -30], face: 'yell', ant: -12 }),
    P({ root: [6, 3], lean: 20, handF: [22, chest], handB: [8, chest + 4], footF: [14, 0], footB: [-10, 0], ant: -4 }),
  ];
  const sup = [
    P({ root: [0, 11], lean: 8, handF: [14, -16], handB: [6, -14], footF: [14, 0], footB: [-14, 0], face: 'yell', ant: 2 }),
    P({ root: [0, -2], lean: 0, handF: [12, shoulder - 12], handB: [-6, shoulder - 12], footF: [4, -8], footB: [-6, -6], face: 'yell', ant: -3 }),
    P({ root: [0, -18], lean: 0, handF: [10, shoulder - 24], handB: [-8, shoulder - 24], footF: [6, -22], footB: [-6, -22], face: 'yell', ant: -6 }),
    P({ root: [3, -14], lean: 14, handF: [16, shoulder - 14], handB: [2, shoulder - 14], footF: [10, -16], footB: [-6, -18], face: 'yell', ant: -9 }),
    P({ root: [6, 6], lean: 34, handF: [28, -12], handB: [22, -6], footF: [8, 0], footB: [-14, 0], face: 'yell', glove: 1.35, ant: -10 }),
    P({ root: [8, 8], lean: 30, handF: [30, -6], handB: [24, -4], footF: [10, 0], footB: [-14, 0], face: 'yell', glove: 1.35, ant: -8 }),
  ];
  const hit = st.hit.map((q, i) => pose(q, { ant: [4, 7, 3][i] }));
  const ko = st.ko.map((q, i) => pose(q, { ant: [8, 6, 3, 1, 1][i] }));
  const win = st.win.map((q, i) => pose(q, { ant: [0, -3, -1, 1][i] }));
  const draw = (a) => a.map(drawFrame);
  return {
    idle: { fps: 6, loop: true, frames: draw(idle) },
    walk: { fps: 11, loop: true, frames: draw(walk) },
    jump: { fps: 1, loop: false, frames: draw(st.jump) },
    land: { fps: 1, loop: false, frames: draw(st.land) },
    light: { fps: 12, loop: false, strike: [1, 2], frames: draw(light) },
    heavy: { fps: 10, loop: false, strike: [2, 3], frames: draw(heavy) },
    air: { fps: 10, loop: false, strike: [1, 2], frames: draw(air) },
    special: { fps: 10, loop: false, strike: [2, 3], frames: draw(special) },
    super: { fps: 8, loop: false, strike: [4, 5], frames: draw(sup) },
    hit: { fps: 10, loop: false, frames: draw(hit) },
    ko: { fps: 8, loop: false, frames: draw(ko) },
    getup: { fps: 8, loop: false, frames: draw(st.getup) },
    dodge: { fps: 10, loop: false, frames: draw(st.dodge) },
    block: { fps: 4, loop: true, frames: draw(st.guard) },
    win: { fps: 6, loop: true, frames: draw(win) },
  };
}
