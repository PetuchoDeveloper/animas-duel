// Huesos "El Segador de Mictlán": a hooded reaper, black robe lined in red, bright skull face with
// burning orange eyes and a long scythe. The robe stops at the shin so the stride stays readable.
import { C, ellipse, capsule, poly, line, stamp, part } from '../lib/raster.mjs';
import { newFrame, pose, deg, ANCHOR_X, ANCHOR_Y } from '../lib/rig.mjs';
import { solve, limb, lit, stock } from '../lib/humanoid.mjs';

const ROBE = { d: '#06030c', s: '#110a1e', m: '#20132f', l: '#36234c', h: '#52386c', ink: '#020104' };
const LINING = { d: '#34050e', s: '#6a0e1e', m: '#ae1a2c', l: '#d83844', h: '#ff7a70', ink: '#22030a' };
const BONE = { d: '#6a6882', s: '#aaa8c2', m: '#e6e2da', l: '#fbf8ee', h: '#ffffff', ink: '#241c36' };
const STEEL = { d: '#34364c', s: '#666a8a', m: '#a4aac6', l: '#d6daee', h: '#ffffff', ink: '#1a1c2c' };
const POLE = { d: '#0e0806', s: '#201210', m: '#382018', l: '#54352a', h: '#7a5240', ink: '#060302' };
const PAL = { k: C('#0a0410'), o: C('#ff6a10'), y: C('#ffd24a'), h: C('#fff6c8'), g: C('#7a7892'), w: C('#fbf8ee') };

export const meta = { id: 'huesos', name: 'Huesos' };

const S = { thigh: 15.5, shin: 15.5, torso: 22, neck: 1, headR: 10, upper: 12, fore: 12, hipH: 29, shoulderDrop: 3, shoulderDepth: 5, hipDepth: 3 };

const EYE = ['kkkkk.', 'koooyk', 'kooyhk', 'kkooyk', '.kkkk.'];
const EYE_WIDE = ['kkkkkk.', 'kooooyk', 'kooyyhk', 'kooyyyk', 'kkooyyk', '.kkkkk.'];
const EYE_SQ_L = ['kk...', '.kk..', '..kk.', '.kk..', 'kk...'];
const EYE_SQ_R = ['...kk', '..kk.', '.kk..', '..kk.', '...kk'];
const EYE_X = ['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'];
const EYE_HAPPY = ['.kkkk.', 'kk..kk'];
const EYE_SHUT = ['kkkkk'];

const POLE_LEN = 76;

function scythe(L, g) {
  const a = deg(g.ang);
  const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
  const c = [ANCHOR_X + g.x, ANCHOR_Y + g.y];
  const at = (t, o = 0) => [c[0] + d[0] * t + n[0] * o, c[1] + d[1] * t + n[1] * o];
  const b = at(-14), t = at(POLE_LEN - 14);
  capsule(L, b[0], b[1], t[0], t[1], 2, 1.8, lit(POLE), POLE.ink);
  // blade: a broad crescent hooking forward from the top of the pole and curling back on itself
  const BL = 32, crescent = [];
  const top = POLE_LEN - 14;
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    crescent.push(at(top + 3 - 13 * u * u, u * BL));
  }
  for (let i = 12; i >= 0; i--) {
    const u = i / 12;
    crescent.push(at(top + 3 - 13 * u * u - (10 * (1 - u) ** 0.85 + 1.2), u * BL - (u > 0.9 ? 1.5 : 0)));
  }
  poly(L, crescent, lit(STEEL, { dither: true }), STEEL.ink, 2.4);
  ellipse(L, t[0], t[1], 2.8, 2.8, lit(STEEL), STEEL.ink);
}

export function drawFrame(p) {
  const img = newFrame();
  const J = solve(S, p);
  const { pelvis, neck, head, up, side } = J;
  const fl = p.cape ?? 0;

  const hand = (a) => (L) => ellipse(L, a.hx, a.hy, 3.4, 3.2, lit(BONE), BONE.ink);
  const sleeve = (sh, a) => (L) => {
    limb(L, sh, a, ROBE, 4.8, 4.2, 3.6);
    capsule(L, a.ex * 0.4 + a.hx * 0.6, a.ey * 0.4 + a.hy * 0.6, a.hx, a.hy, 4.4, 3.8, lit(ROBE), ROBE.ink);
    line(L, a.hx - 3, a.hy - 3.5, a.hx - 3, a.hy + 3.5, C(LINING.m));
  };
  const bonelimb = (hip, l, w) => (L) => {
    capsule(L, hip[0], hip[1], l.ex, l.ey, w + 0.6, w, lit(BONE), BONE.ink);
    capsule(L, l.ex, l.ey, l.hx, l.hy, w, w * 0.8, lit(BONE), BONE.ink);
    ellipse(L, l.ex, l.ey, w + 0.9, w + 0.9, lit(BONE), BONE.ink);
  };
  const foot = (f) => (L) => ellipse(L, f.hx + 3, f.hy + 0.4, 6, 2.6, lit(BONE), BONE.ink);
  // ragged robe skirt hanging from the hips to mid-shin
  const skirt = (L) => {
    const w = fl * 6;
    const top = pelvis[1] - 4;
    const hemY = pelvis[1] + S.hipH * 0.62;
    const x0 = pelvis[0] - 11, x1 = pelvis[0] + 11;
    const pts = [[x0, top], [x1, top]];
    const teeth = [0, 1, 2, 3, 4, 5, 6];
    teeth.forEach((i) => {
      const u = i / 6;
      const x = x1 - u * (x1 - x0) - w * u * 0.8;
      pts.push([x + (i % 2 ? 1.5 : -1.2), hemY + (i % 2 ? 7 : 0) + u * fl * 3]);
    });
    poly(L, pts, lit(ROBE, { dither: true }), ROBE.ink, 3.2);
    // red lining flash on the hem
    for (let i = 2; i < pts.length - 1; i += 2) L.set(Math.round(pts[i][0]), Math.round(pts[i][1]) - 1, C(LINING.m));
  };

  // rear cloak billow
  part(img, (L) => {
    const a = J.shB;
    const w = fl * 8;
    poly(L, [[a[0] - 2, a[1] - 6], [a[0] - 12 - w * 0.5, a[1] + 8], [a[0] - 16 - w * 1.2, pelvis[1] + 22], [a[0] - 13 - w * 1.6, pelvis[1] + 34], [pelvis[0] - 3, pelvis[1] + 30], [pelvis[0] + 2, pelvis[1] + 4]], lit(ROBE, { dither: true }), ROBE.ink, 3.4);
  });

  part(img, sleeve(J.shB, J.armB));
  part(img, bonelimb(J.hipB, J.legB, 2.4)); part(img, foot(J.legB));

  // robe torso
  part(img, (L) => {
    capsule(L, pelvis[0], pelvis[1], J.chest[0], J.chest[1], 8, 9.4, lit(ROBE, { dither: true }), ROBE.ink);
    capsule(L, J.chest[0], J.chest[1], neck[0], neck[1], 9.4, 7.4, lit(ROBE, { dither: true }), ROBE.ink);
    // open front: red lining and a glimpse of ribs
    const o = 3;
    const a = [pelvis[0] + side[0] * o, pelvis[1] + side[1] * o], b = [neck[0] + side[0] * o - up[0] * 2, neck[1] + side[1] * o - up[1] * 2];
    capsule(L, a[0], a[1], b[0], b[1], 2.4, 3.2, lit(LINING), LINING.ink);
    for (let t = 0.3; t < 0.95; t += 0.16) {
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      line(L, x - 1, y, x + 1, y, C(BONE.m));
    }
    // shoulder mantle
    ellipse(L, J.shF[0] - 1, J.shF[1] + 0.5, 6, 4.8, lit(ROBE), ROBE.ink);
    // rope belt
    const b0 = [pelvis[0] - side[0] * 8.5, pelvis[1] - side[1] * 8.5 - 3], b1 = [pelvis[0] + side[0] * 8.5, pelvis[1] + side[1] * 8.5 - 3];
    capsule(L, b0[0], b0[1], b1[0], b1[1], 1.6, 1.6, lit(LINING), LINING.ink);
  });
  part(img, skirt);

  // hood and skull
  part(img, (L) => {
    const w = fl * 3;
    // trailing hood point
    poly(L, [[head[0] - 7, head[1] - 9], [head[0] - 15 - w, head[1] - 4], [head[0] - 20 - w * 1.4, head[1] + 7 + fl * 2], [head[0] - 9, head[1] + 7]], lit(ROBE), ROBE.ink, 3);
    ellipse(L, head[0] - 1, head[1] - 1, 12.4, 12.6, lit(ROBE, { dither: true }), ROBE.ink);
    // red lining around the face opening, then the skull
    ellipse(L, head[0] + 3, head[1] + 1, 9.4, 10.2, lit(LINING), LINING.ink);
    ellipse(L, head[0] + 3.8, head[1] + 1.4, 8, 9, lit(BONE, { dither: true }), BONE.ink);
    // brow ridge shadow and nose
    for (let dx = -3; dx <= 11; dx++) L.set(Math.round(head[0] + dx), Math.round(head[1] - 3.5 + (dx < 4 ? (4 - dx) * 0.3 : 0)), C(BONE.s));
    stamp(L, ['.k.', 'kkk'], PAL, head[0] + 10, head[1] + 4, { ax: 1, ay: 1 });
    // jaw and teeth
    const open = p.face === 'yell' || p.face === 'hurt' || p.face === 'ko';
    const jy = head[1] + (open ? 10 : 8);
    ellipse(L, head[0] + 4, jy, 5.6, 3, lit(BONE), BONE.ink);
    if (open) ellipse(L, head[0] + 4, jy - 2.4, 4.2, 1.8, () => C('#12040c'));
    for (let tx = 0; tx <= 8; tx += 2) {
      L.set(Math.round(head[0] + tx), Math.round(jy - 1 + (open ? -2 : 0)), C(PAL.g));
      L.set(Math.round(head[0] + tx), Math.round(jy + (open ? -2 : 0)), C(PAL.g));
    }
    const eye = (rows, dx, dy, ax, ay) => stamp(L, rows, PAL, head[0] + dx, head[1] + dy, { ax, ay });
    switch (p.face) {
      case 'yell': eye(EYE_WIDE, -1, 0, 3, 3); eye(EYE_WIDE, 7, 0, 3, 3); break;
      case 'hurt': eye(EYE_SQ_L, 0, 0, 2, 2); eye(EYE_SQ_R, 8, 0, 2, 2); break;
      case 'ko': eye(EYE_X, 0, 0, 2, 2); eye(EYE_X, 8, 0, 2, 2); break;
      case 'smug': eye(EYE_HAPPY, 0, 0, 3, 1); eye(EYE_HAPPY, 8, 0, 3, 1); break;
      case 'blink': eye(EYE_SHUT, 0, 0, 2, 0); eye(EYE_SHUT, 8, 0, 2, 0); break;
      default: eye(EYE, -1, 0, 3, 2); eye(EYE, 7, 0, 3, 2);
    }
    if (!['hurt', 'ko', 'smug', 'blink'].includes(p.face)) {
      for (const d of [0, 1]) { line(L, head[0] - 5, head[1] - 6 + d, head[0] + 2, head[1] - 3 + d, C(PAL.k)); line(L, head[0] + 5, head[1] - 3 + d, head[0] + 12, head[1] - 6 + d, C(PAL.k)); }
    }
    // hood front lip over the forehead
    ellipse(L, head[0] + 2, head[1] - 10.4, 10.5, 3.2, lit(ROBE), ROBE.ink);
  });

  part(img, bonelimb(J.hipF, J.legF, 2.8)); part(img, foot(J.legF));
  if (p.scythe) part(img, (L) => scythe(L, p.scythe));
  part(img, hand(J.armB));
  part(img, sleeve(J.shF, J.armF)); part(img, hand(J.armF));
  if (p.scytheDown) part(img, (L) => scythe(L, p.scytheDown));
  return img;
}

// ------------------------------------------------------------------ poses
const st = stock(S, { stance: 9, stride: 12, blink: true });
const P = st.P;
const chest = -(S.hipH + S.torso * 0.55);

/** Scythe held on the pole at (x, y) (hand grip) pointing along `ang`; both hands are placed on the shaft. */
function hold(x, y, ang) {
  const a = deg(ang), d = [Math.cos(a), Math.sin(a)];
  return {
    scythe: { x, y, ang },
    handF: [x + d[0] * 6, y + d[1] * 6],
    handB: [x - d[0] * 12, y - d[1] * 12],
  };
}

/** Bust shot for the select and dialogue screens: a 64x64 window onto the idle pose. */
export const portrait = { box: [34, 14], pose: (face) => pose(P({ face }), { scythe: null }) };

export function animations() {
  const idle = st.idle.map((q, i) => pose(q, { ...hold(16, chest + 4 + [0, 0.5, 1, 0.4][i], -80), cape: 0.2 + 0.15 * i }));
  const walk = st.walk.map((q, i) => pose(q, { ...hold(16, chest + 4 + Math.abs(Math.sin((i / 6) * Math.PI)) * 1.2, -78), cape: 0.5 + 0.3 * Math.sin((i / 6) * Math.PI * 2) }));
  const jump = st.jump.map((q, i) => pose(q, { ...hold(14, chest + 2 - [2, 4, 0][i], [-72, -64, -86][i]), cape: 1 }));
  const land = st.land.map((q) => pose(q, { ...hold(14, chest + 12, -80), cape: 0.1 }));

  const light = [
    P({ root: [-2, 2], lean: -4, ...hold(0, chest + 2, -30), cape: 0.4 }),
    P({ root: [4, 2], lean: 10, ...hold(14, chest + 2, 6), face: 'yell', footF: [13, 0], footB: [-10, 0], cape: 0.6 }),
    P({ root: [5, 2], lean: 11, ...hold(18, chest + 3, 14), face: 'yell', footF: [14, 0], footB: [-10, 0], cape: 0.6 }),
    P({ root: [1, 2], lean: 4, ...hold(14, chest + 3, -50), cape: 0.4 }),
  ];
  const heavy = [
    P({ root: [-4, 3], lean: -10, ...hold(-4, chest - 4, -150), footF: [10, 0], footB: [-11, 0], cape: 0.7 }),
    P({ root: [-6, 3], lean: -16, ...hold(-6, chest - 10, -160), footF: [11, 0], footB: [-12, 0], cape: 1 }),
    P({ root: [8, 3], lean: 22, ...hold(12, chest + 4, -20), face: 'yell', footF: [16, 0], footB: [-12, 0], cape: 1 }),
    P({ root: [9, 3], lean: 24, ...hold(14, chest + 10, 24), face: 'yell', footF: [17, 0], footB: [-12, 0], cape: 1 }),
    P({ root: [4, 3], lean: 10, ...hold(12, chest + 8, 30), footF: [13, 0], footB: [-10, 0], cape: 0.6 }),
  ];
  const air = [
    P({ root: [0, -9], lean: 4, ...hold(4, chest - 4, -120), footF: [10, -12], footB: [-3, -15], cape: 1 }),
    P({ root: [4, -8], lean: 16, ...hold(14, chest, -10), face: 'yell', footF: [14, -10], footB: [-2, -13], cape: 1 }),
    P({ root: [4, -8], lean: 18, ...hold(18, chest + 8, 40), face: 'yell', footF: [15, -9], footB: [-1, -12], cape: 1 }),
  ];
  // Guadaña espectral: point the blade forward and cast spirits
  const special = [
    P({ root: [-2, 2], lean: -6, ...hold(6, chest + 2, -100), cape: 0.5 }),
    P({ root: [-3, 2], lean: -10, ...hold(0, chest - 4, -120), face: 'yell', cape: 0.9 }),
    P({ root: [4, 2], lean: 8, ...hold(18, chest - 2, -36), face: 'yell', footF: [13, 0], footB: [-10, 0], cape: 1 }),
    P({ root: [5, 2], lean: 10, ...hold(20, chest - 3, -30), face: 'yell', footF: [14, 0], footB: [-10, 0], cape: 1 }),
    P({ root: [1, 2], lean: 2, ...hold(14, chest + 2, -76), cape: 0.5 }),
  ];
  const sup = [
    P({ root: [0, 6], lean: 4, ...hold(14, chest + 14, -70), face: 'yell', cape: 0.3 }),
    P({ root: [0, 0], lean: -4, ...hold(6, chest - 6, -112), face: 'yell', cape: 0.7 }),
    P({ root: [0, -1], lean: -8, head: [-2, -2], ...hold(2, chest - 24, -140), face: 'yell', cape: 1 }),
    P({ root: [0, -1], lean: -10, head: [-3, -2], ...hold(0, chest - 28, -150), face: 'yell', cape: 1 }),
    P({ root: [8, 4], lean: 22, ...hold(16, chest + 4, 12), face: 'yell', footF: [16, 0], footB: [-14, 0], cape: 1 }),
    P({ root: [8, 4], lean: 24, ...hold(18, chest + 12, 36), face: 'yell', footF: [18, 0], footB: [-14, 0], cape: 0.8 }),
  ];
  const hit = st.hit.map((q, i) => pose(q, { ...hold(10 - i * 3, chest + 6, -70 - i * 14), cape: 0.9 }));
  const koq = st.ko.map((q, i) => pose(q, {
    cape: 0.5,
    scythe: [
      { x: 20, y: chest - 14, ang: -60 }, { x: 28, y: -34, ang: -20 }, { x: 24, y: -6, ang: 2 }, { x: 24, y: -4, ang: 0 }, { x: 24, y: -4, ang: 0 },
    ][i],
    handF: [[10, -50], [16, -34], [-26, -6], [-26, -6], [-26, -6]][i],
    handB: [[-4, -50], [8, -30], [-30, -9], [-30, -9], [-30, -9]][i],
  }));
  const getup = st.getup.map((q, i) => pose(q, { cape: 0.4, scythe: i < 2 ? { x: 24, y: -4, ang: 0 } : undefined, ...(i === 2 ? hold(14, chest + 10, -80) : {}) }));
  const dodge = st.dodge.map((q) => pose(q, { ...hold(10, chest + 14, -50), cape: 1 }));
  const block = st.guard.map((q, i) => pose(q, { ...hold(12, chest + 4, -88 - i * 2), cape: 0.2, handF: [12, chest - 8], handB: [10, chest + 2] }));
  const win = st.win.map((q, i) => pose(q, { ...hold(4, [chest + 6, chest - 10, chest - 8, chest - 6][i], [-80, -108, -104, -98][i]), cape: 0.5 + 0.2 * i }));

  const draw = (a) => a.map(drawFrame);
  return {
    idle: { fps: 6, loop: true, frames: draw(idle) },
    walk: { fps: 11, loop: true, frames: draw(walk) },
    jump: { fps: 1, loop: false, frames: draw(jump) },
    land: { fps: 1, loop: false, frames: draw(land) },
    light: { fps: 12, loop: false, strike: [1, 2], frames: draw(light) },
    heavy: { fps: 10, loop: false, strike: [2, 3], frames: draw(heavy) },
    air: { fps: 10, loop: false, strike: [1, 2], frames: draw(air) },
    special: { fps: 10, loop: false, strike: [2, 3], frames: draw(special) },
    super: { fps: 8, loop: false, strike: [4, 5], frames: draw(sup) },
    hit: { fps: 10, loop: false, frames: draw(hit) },
    ko: { fps: 8, loop: false, frames: draw(koq) },
    getup: { fps: 8, loop: false, frames: draw(getup) },
    dodge: { fps: 10, loop: false, frames: draw(dodge) },
    block: { fps: 4, loop: true, frames: draw(block) },
    win: { fps: 6, loop: true, frames: draw(win) },
  };
}
