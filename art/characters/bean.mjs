// El Frijolito "El Heroe de la Semilla Sagrada": a small, quick bean-sprout fighter with pale green skin,
// a sprouting crown of leaves, a green gi and a red sash. Short legs, huge determined eyes, a leaf to throw.
// King of Fighters cel shading, hand-drawn face.
import { C, poly, line, stamp, part, mix } from '../lib/raster.mjs';
import { newFrame, pose } from '../lib/rig.mjs';
import { ramp, cel, blob, cap, ell, ribbon, solve2, onTorso, stock2, drawArm, drawLeg, paintOver, flatPoly } from '../lib/kof.mjs';

const SKIN = ramp('#9ddc66', { k: 0.85 });
const LEAF = ramp('#3fb84a');
const GI = ramp('#2a8a44');
const PANTS = ramp('#1f6a3c');
const SASH = ramp('#d8343c');
const WRAP = ramp('#f2ecd8');
const GLOVE = ramp('#f8e8b0');
const BOOT = ramp('#b86a2c');
const SHADE = mix(SKIN.m, SKIN.s, 0.55);

const PAL = {
  x: C('#10180e'), w: C('#fffaf0'), p: C('#2a1a10'), h: C('#ffffff'), s: C(SKIN.s), d: C(SKIN.d), k: C('#1a2a14'),
  m: C('#5a1228'), u: C('#e8607a'), t: C('#fff4d6'), a: C(SKIN.m),
};

export const meta = { id: 'bean', name: 'El Frijolito' };

export const S = { thigh: 12.5, shin: 12, torso: 17, neck: 1, headR: 10, upper: 10, fore: 9.5, hipH: 23.5, shoulderDrop: 3, shoulderDepth: 6, hipDepth: 4.2 };

const ARM = [4, 4.5, 3.7, 4, 3.2];
const LEG = [5.4, 5.6, 4.4, 4.8, 3.7];

// Big round eyes: x lid, w white, p iris, h glint. near = rear eye, far = front eye.
const EYES = {
  neutral: { n: ['xxxxx', 'wwppp', 'whppp', '.wppp'], f: ['xxxx', 'wppp', 'whpp', '.ppp'] },
  blink: { n: ['xxxxx', 'xxxxx'], f: ['xxxx', 'xxxx'] },
  yell: { n: ['xxxxx', 'wpppp', 'wpphp', 'wpppp', '.www.'], f: ['xxxx', 'pppp', 'pphp', 'pppp'] },
  hurt: { n: ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'], f: ['x..x', '.xx.', '.xx.', 'x..x'] },
  smug: { n: ['.xxx.', 'x...x'], f: ['.xx.', 'x..x'] },
  ko: { n: ['w...w', '.w.w.', '..w..', '.w.w.', 'w...w'], f: ['w..w', '.ww.', '.ww.', 'w..w'] },
};
const MOUTH = {
  neutral: ['dddd'],
  blink: ['dddd'],
  yell: ['kkkkk', 'twtwt', 'muuum', '.mmm.'],
  hurt: ['kkkkk', 'twwwt', '.mmm.'],
  smug: ['....d', 'dddd.'],
  ko: ['kkkkk', 'mmmmm', '.muum'],
};

/** A leaf from a base point along a direction: pointed oval with a lit vein. */
function leaf(L, bx, by, ang, len, wid) {
  const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
  const at = (t, o) => [bx + d[0] * t + n[0] * o, by + d[1] * t + n[1] * o];
  poly(L, [at(0, 0), at(len * 0.3, wid), at(len * 0.7, wid * 0.7), at(len, 0), at(len * 0.7, -wid * 0.7), at(len * 0.3, -wid)], cel(LEAF), LEAF.ink, 2.4);
  const a = at(len * 0.1, 0), b = at(len * 0.85, 0);
  line(L, a[0], a[1], b[0], b[1], LEAF.h);
}

export function drawFrame(p) {
  const img = newFrame();
  const J = solve2(S, p);
  const { pelvis, neck, head, chest, waist } = J;
  const sway = p.ant ?? 0;
  const lower = { side1: [Math.cos(J.a0), Math.sin(J.a0)], up1: [Math.sin(J.a0), -Math.cos(J.a0)] };

  const arm = (sh, a, back) => drawArm(img, sh, a, {
    radii: back ? ARM.map((r) => r * 0.94) : ARM, skin: SKIN,
    sleeve: { ramp: GI, to: 0.45, grow: 0.8 }, hand: 'fist', glove: GLOVE, size: p.fist ?? 1.15, wrap: { ramp: WRAP, len: 5 },
  });
  const leg = (hip, l, back, ang) => drawLeg(img, hip, l, {
    radii: LEG, skin: SKIN, angle: ang,
    pants: { ramp: PANTS, to: 0.78, grow: 0.7, cuff: WRAP },
    boot: { ramp: BOOT, shaft: 5, len: 9.4, r: 4.4 },
  });

  const torso = () => {
    part(img, (L) => {
      blob(L, [
        ell(chest, 8.6, 8.6, J.a1),
        cap(waist, pelvis, 6.4, 7.2),
        cap([neck[0] - J.up1[0] * 2, neck[1] - J.up1[1] * 2], [head[0], head[1] + 5], 3.4, 3.2),
        ell(J.shF, 4.6, 4.6), ell(J.shB, 4.3, 4.3),
      ], cel(GI), GI.ink);
      // open collar: a vee of skin and a yellow trim down the front
      const at = (u, v) => onTorso(J, chest, u, v);
      flatPoly(L, [at(1.4, 9), at(6.4, 7.6), at(4.4, 1), at(2.2, -4)], SKIN.m, SKIN.ink);
      for (let v = 8; v >= -9; v--) { const [x, y] = at(5.8, v); L.set(Math.round(x), Math.round(y), mix(GI.m, '#ffe27a', 0.6)); }
    });
    part(img, (L) => blob(L, [ell([pelvis[0], pelvis[1] + 2.4], 8.2, 7), cap([pelvis[0] - 5, pelvis[1] + 4], [pelvis[0] + 5, pelvis[1] + 4], 6)], cel(PANTS), PANTS.ink));
    // red sash with its tails flying behind
    part(img, (L) => {
      const a = onTorso(lower, pelvis, -8.4, 4.8), b = onTorso(lower, pelvis, 8.6, 4.8);
      blob(L, [cap(a, b, 2.6, 2.7)], cel(SASH), SASH.ink);
      const tail = [a, [a[0] - 4 - sway, a[1] + 4], [a[0] - 8 - sway * 2, a[1] + 7 + sway], [a[0] - 11 - sway * 3, a[1] + 9 + sway]];
      blob(L, ribbon(tail, [2.2, 2, 1.6, 1]), cel(SASH), SASH.ink);
    });
  };

  const face = () => {
    const [hx, hy] = head;
    const at = (pts) => pts.map(([x, y]) => [hx + x, hy + y]);
    const px = (dx, dy, c) => img.set(Math.round(hx + dx), Math.round(hy + dy), c);
    // the sprout: two leaves on a short stem, swaying
    part(img, (L) => {
      const sx = hx - 1, sy = hy - 9;
      line(L, sx, sy, sx - 1, sy - 4, LEAF.m);
      leaf(L, sx - 1, sy - 4, -2.5 - sway * 0.12, 13, 4.2);
      leaf(L, sx - 1, sy - 4, -0.7 + sway * 0.12, 11, 3.6);
    });
    part(img, (L) => {
      // the bean head: a plump kidney of pale green, lit from the upper left
      blob(L, [ell([hx, hy], 10.2, 9.2), ell([hx + 4, hy + 2.4], 7.6, 6.8)], cel(SKIN, { noHi: true }), SKIN.ink);
      paintOver(L, at([[-8, -6], [0, -9], [6, -7], [3, -4], [-6, -3]]), SKIN.l);
      paintOver(L, at([[-10, 0], [-6, 5], [2, 8.6], [8, 8], [-2, 4], [-8, 0]]), SHADE);
      px(-6, -6, SKIN.h); px(-4.6, -7.4, SKIN.h); px(-3, -8, SKIN.h);
      // a thick headband in red above the brows
      flatPoly(L, at([[-9.6, -4.2], [-5, -7.6], [3, -8.6], [8.4, -6], [9.2, -3.6], [-9, -2.6]]), SASH.m, SASH.ink);
      paintOver(L, at([[-8, -5.6], [3, -8], [8, -5.8], [4, -5], [-7, -4.2]]), SASH.l);
      paintOver(L, at([[-9, -3.4], [9, -3.6], [9.2, -3.6], [-9, -2.6]]), SASH.s);
      // small nose and the cheek
      px(10, 1.4, SKIN.h); px(10.4, 2.4, SKIN.d); px(9.4, 3, SKIN.d);
      paintOver(L, at([[1, 2.4], [5.6, 2.2], [6, 4], [1.6, 4.4]]), SKIN.l);
      const e = EYES[p.face] ?? EYES.neutral;
      stamp(L, e.n, PAL, hx - 5.4, hy - 2);
      stamp(L, e.f, PAL, hx + 2.4, hy - 2);
      // brows set low and angry
      const sad = p.face === 'hurt' || p.face === 'ko';
      if (!sad) { line(L, hx - 6, hy - 3.8, hx - 1, hy - 2.4, PAL.x); line(L, hx + 3, hy - 2.4, hx + 8, hy - 3.8, PAL.x); }
      stamp(L, MOUTH[p.face] ?? MOUTH.neutral, PAL, hx + 3.6, hy + 5);
    });
  };

  const backOver = J.armB.hx > pelvis[0] + 3;
  if (!backOver) arm(J.shB, J.armB, true);
  leg(J.hipB, J.legB, true, p.ftB);
  torso();
  leg(J.hipF, J.legF, false, p.ftF);
  face();
  if (backOver) arm(J.shB, J.armB, true);
  arm(J.shF, J.armF, false);
  // the leaf in the throwing hand while he winds up
  if (p.leaf) part(img, (L) => leaf(L, J.armF.hx + 1, J.armF.hy - 1, -0.3, p.leaf, 4));
  // a swirl of leaves around him for the super
  if (p.storm != null) {
    part(img, (L) => {
      for (let i = 0; i < 6; i++) {
        const a = p.storm * 1.2 + (i * Math.PI * 2) / 6, r = 22 + (i % 2) * 8;
        leaf(L, pelvis[0] + Math.cos(a) * r, pelvis[1] - 14 + Math.sin(a) * r * 0.8, a + 1.6, 7, 2.4);
      }
    });
  }
  return img;
}

// ------------------------------------------------------------------ poses
const st = stock2(S, { stance: 11, crouch: 4, stride: 10, lean: 8, blink: true, guard: [[19, -34], [11, -37]] });
const P = st.P;

export const portrait = { box: [58, 30], pose: (face) => P({ face, handF: [14, -24], handB: [8, -26] }) };

export function animations() {
  const ant = (a, f) => a.map((q, i) => pose(q, { ant: typeof f === 'function' ? f(i) : f }));
  const idle = ant(st.idle, (i) => Math.sin((i / 6) * Math.PI * 2) * 0.9);
  const walk = ant(st.walk, (i) => Math.sin((i / 8) * Math.PI * 2) * 1.3);
  const jump = ant(st.jump, -1.4);

  const light = [
    P({ root: [-2, 5], lean: 5, twist: -2, handF: [12, -34], handB: [12, -38], ant: 0.6 }),
    P({ root: [2, 5], lean: 10, twist: 2, handF: [26, -37], handB: [11, -38], ant: -0.8 }),
    P({ root: [5, 5], lean: 12, twist: 4, handF: [34, -40], handB: [10, -36], fist: 1.3, face: 'yell', footF: [14, 0], ant: -1.6 }),
    P({ root: [6, 5], lean: 13, twist: 5, handF: [35, -40], handB: [9, -36], fist: 1.3, face: 'yell', footF: [14, 0], ant: -1.6 }),
    P({ root: [2, 5], lean: 9, twist: 2, handF: [24, -36], handB: [11, -38], ant: -0.4 }),
  ];
  // spinning kick: wind up on the back foot, whip the leg round at head height
  const heavy = [
    P({ root: [-4, 6], lean: 2, handF: [12, -36], handB: [6, -38], footF: [13, 0], footB: [-14, 0], ant: 0.8 }),
    P({ root: [-3, 4], lean: -6, bend: -3, handF: [14, -42], handB: [2, -42], footF: [18, -26], footB: [-13, 0], ant: 1.2 }),
    P({ root: [9, 3], lean: -22, bend: -4, handF: [-4, -46], handB: [14, -50], footF: [56, -40], footB: [-12, 0], face: 'yell', ant: 2, ftF: -35 }),
    P({ root: [10, 3], lean: -24, bend: -4, handF: [-6, -46], handB: [14, -50], footF: [58, -38], footB: [-12, 0], face: 'yell', ant: 2, ftF: -35 }),
    P({ root: [-2, 5], lean: -4, handF: [14, -38], handB: [8, -40], footF: [20, -18], footB: [-13, 0], ant: 0.6 }),
    P({ root: [0, 5], lean: 7, handF: [18, -35], handB: [11, -38], ant: 0 }),
  ];
  const air = [
    P({ root: [0, -10], lean: 6, handF: [16, -40], handB: [8, -42], footF: [10, -18], footB: [-6, -14], face: 'yell', ant: -1 }),
    P({ root: [3, -8], lean: -12, bend: -4, handF: [6, -46], handB: [-4, -42], footF: [32, -22], footB: [-8, -16], face: 'yell', ant: -2, ftF: -30 }),
    P({ root: [4, -8], lean: -14, bend: -4, handF: [6, -46], handB: [-4, -42], footF: [34, -22], footB: [-9, -16], face: 'yell', ant: -2, ftF: -30 }),
  ];
  // Hoja Cortante: draw a leaf, flick it away
  const special = [
    P({ root: [-3, 6], lean: 0, handF: [14, -38], handB: [4, -40], leaf: 8, footF: [13, 0], footB: [-14, 0], ant: 0.6 }),
    P({ root: [-4, 6], lean: -8, handF: [-2, -44], handB: [10, -40], leaf: 12, face: 'smug', footF: [14, 0], footB: [-15, 0], ant: 1.2 }),
    P({ root: [5, 5], lean: 14, twist: 6, handF: [46, -42], handB: [4, -38], fist: 1.2, face: 'yell', footF: [17, 0], footB: [-14, 0], ant: -2 }),
    P({ root: [6, 5], lean: 15, twist: 6, handF: [47, -42], handB: [3, -38], fist: 1.2, face: 'yell', footF: [17, 0], footB: [-14, 0], ant: -2 }),
    P({ root: [2, 5], lean: 8, handF: [24, -36], handB: [10, -38], ant: -0.6 }),
  ];
  // Tormenta de Hojas: crouch, spin up in a ring of leaves, burst out
  const sup = [
    P({ root: [-1, 11], lean: 8, handF: [8, -24], handB: [4, -26], face: 'yell', storm: 0, ant: 0.6 }),
    P({ root: [0, 6], lean: 0, handF: [20, -46], handB: [-4, -46], face: 'yell', storm: 1, ant: 1 }),
    P({ root: [0, -2], lean: -4, handF: [26, -64], handB: [-8, -64], face: 'yell', storm: 2, ant: 2 }),
    P({ root: [0, -2], lean: -4, handF: [28, -70], handB: [-10, -68], face: 'yell', storm: 3, ant: 2 }),
    P({ root: [8, 6], lean: 16, twist: 6, handF: [52, -42], handB: [30, -46], fist: 1.4, face: 'yell', storm: 4, footF: [20, 0], ant: -2 }),
    P({ root: [9, 6], lean: 18, twist: 6, handF: [54, -40], handB: [32, -44], fist: 1.4, face: 'yell', storm: 5, footF: [21, 0], ant: -2 }),
    P({ root: [4, 6], lean: 9, handF: [26, -36], handB: [12, -38], ant: 0 }),
  ];
  const hit = [
    P({ root: [-4, 4], lean: -10, bend: -5, head: [-3, 0], handF: [6, -32], handB: [-4, -36], footF: [11, 0], footB: [-15, 0], face: 'hurt', ant: 2 }),
    P({ root: [-8, 5], lean: -18, bend: -8, head: [-5, 1], handF: [-6, -30], handB: [-14, -34], footF: [10, 0], footB: [-17, 0], face: 'hurt', ant: 3 }),
    P({ root: [-4, 5], lean: -8, bend: -3, head: [-2, 1], handF: [6, -32], handB: [-2, -36], face: 'hurt', ant: 1 }),
  ];
  const draw = (a) => a.map(drawFrame);
  return {
    idle: { fps: 8, loop: true, frames: draw(idle) },
    walk: { fps: 12, loop: true, frames: draw(walk) },
    jump: { fps: 1, loop: false, frames: draw(jump) },
    land: { fps: 1, loop: false, frames: draw(st.land) },
    light: { fps: 14, loop: false, strike: [2, 3], frames: draw(light) },
    heavy: { fps: 10, loop: false, strike: [2, 3], frames: draw(heavy) },
    air: { fps: 10, loop: false, strike: [1, 2], frames: draw(air) },
    special: { fps: 10, loop: false, strike: [2, 3], frames: draw(special) },
    super: { fps: 8, loop: false, strike: [4, 5], frames: draw(sup) },
    hit: { fps: 10, loop: false, frames: draw(hit) },
    ko: { fps: 8, loop: false, frames: draw(ant(st.ko, 2)) },
    getup: { fps: 8, loop: false, frames: draw(st.getup) },
    dodge: { fps: 10, loop: false, frames: draw(ant(st.dodge, -2)) },
    block: { fps: 4, loop: true, frames: draw(st.guard) },
    win: { fps: 6, loop: true, frames: draw(ant(st.win, (i) => Math.sin(i) * 2)) },
  };
}
