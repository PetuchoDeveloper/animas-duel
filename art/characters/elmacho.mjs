// El Macho "El Coloso Calavera": a barrel-chested luchador in a red mask with black flames, a flowing red
// cape, royal-blue tights and a gold belt. Built in the King of Fighters mould: heavy shoulders, thick
// tapered limbs, hard cel bands, dark outlines. Wide and slow, so every pose is planted.
import { C, poly, line, stamp, part, mix } from '../lib/raster.mjs';
import { newFrame, pose } from '../lib/rig.mjs';
import { ramp, cel, blob, cap, ell, limbShapes, ribbon, solve2, onTorso, footAngle, stock2, paintOver, flatPoly } from '../lib/kof.mjs';

const SKIN = ramp('#e0955a', { k: 0.8 });
const MASK = ramp('#d4222e');
const NIGHT = ramp('#2a2038', { k: 0.8 });
const TIGHT = ramp('#2c46b4');
const GOLD = ramp('#f0b82a');
const CAPE = ramp('#c81c2a');
const BOOT = ramp('#7a3f26');
const TAPE = ramp('#efe4c8');

const SHADE = mix(SKIN.m, SKIN.s, 0.5);
const PAL = {
  k: C('#120a1a'), w: C('#fff6e4'), p: C('#3a1608'), y: C('#ffd23a'), r: C(MASK.d), t: C('#fff4d6'),
  x: C(NIGHT.ink), g: C(GOLD.m), s: C(SKIN.s), a: C(SKIN.m), d: C(SKIN.d), m: C('#7a1230'), u: C('#d8506a'),
};

export const meta = { id: 'elmacho', name: 'El Macho' };

export const S = { thigh: 20, shin: 20, torso: 30, neck: 6, headR: 8, upper: 13, fore: 12, hipH: 40, shoulderDrop: 5, shoulderDepth: 9, hipDepth: 5 };

const ARM = [5.6, 6.8, 4.9, 5.7, 4.1];
const LEG_F = [7.6, 8.2, 5.8, 6.6, 4.3];
const LEG_B = [7.2, 7.6, 5.6, 6.2, 4.2];

// Eyes sit in black wings. Each is a hand-drawn stamp: x black, w white, p iris, a skin showing through the hole.
// `n` is the near (rear) eye, `f` the far (front) one, which the 3/4 turn squeezes a little.
const EYES = {
  neutral: { n: ['xwwpp', 'xwwpp'], f: ['wwpp', 'wwpp'] },
  blink: { n: ['xxxxx'], f: ['xxxx'] },
  yell: { n: ['xwwpp', 'wwwpp', 'wwwpp'], f: ['wwpp', 'wwpp', 'wwpp'] },
  hurt: { n: ['x...x', '.x.x.', '..x..', '.x.x.'], f: ['x..x', '.xx.', '.xx.', 'x..x'] },
  smug: { n: ['..xx.', '.x..x'], f: ['.xx.', 'x..x'] },
  ko: { n: ['w...w', '.w.w.', '..w..', '.w.w.', 'w...w'], f: ['w..w', '.ww.', '.ww.', 'w..w'] },
};
// mouth, stamped from the upper-lip corner under the moustache
const MOUTH = {
  neutral: ['ddddd'],
  blink: ['ddddd'],
  yell: ['kkkkk', 'twtwt', 'muuum', '.mmm.'],
  hurt: ['kkkkk', 'twwwt', '.mmm.'],
  smug: ['....d', 'dddd.'],
  ko: ['kkkkk', 'mmmmm', '.muum', '..uu.'],
};

export function drawFrame(p) {
  const img = newFrame();
  const J = solve2(S, p);
  const { pelvis, neck, head, chest, waist } = J;
  const fl = p.cape ?? 0;
  const open = p.face === 'yell' || p.face === 'hurt' || p.face === 'ko';
  const lower = { side1: [Math.cos(J.a0), Math.sin(J.a0)], up1: [Math.sin(J.a0), -Math.cos(J.a0)] };

  // ---- cape, behind everything: two scalloped tails that stream back with the motion
  part(img, (L) => {
    const a = J.shB, n = neck;
    const hem = pelvis[1] + 17;
    const pts = [
      [n[0] - 1, n[1] - 3], [a[0] - 4, a[1] - 2], [a[0] - 10 - fl * 7, a[1] + 14], [a[0] - 14 - fl * 13, pelvis[1] + 6],
      [a[0] - 18 - fl * 19, hem + 6 + fl * 4], [a[0] - 11 - fl * 12, hem - 1], [a[0] - 9 - fl * 13, hem + 11 + fl * 5],
      [pelvis[0] - 8 - fl * 6, hem + 1], [pelvis[0] - 5 - fl * 3, hem + 8 + fl * 2], [pelvis[0] - 1, pelvis[1] + 4], [n[0] + 3, n[1] + 4],
    ];
    poly(L, pts, cel(CAPE, { noHi: true }), CAPE.ink, 3.4);
    for (let i = 3; i < 8; i++) line(L, pts[i][0], pts[i][1] - 1, pts[i + 1][0], pts[i + 1][1] - 1, GOLD.m);
  });

  const arm = (sh, a, back) => {
    part(img, (L) => blob(L, limbShapes(sh, [a.ex, a.ey], [a.hx, a.hy], back ? ARM.map((r) => r * 0.94) : ARM), cel(SKIN), SKIN.ink));
    const dx = a.hx - a.ex, dy = a.hy - a.ey, d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    part(img, (L) => blob(L, [cap([a.hx - ux * 5.6, a.hy - uy * 5.6], [a.hx - ux * 1, a.hy - uy * 1], 4.5, 4.4)], cel(TAPE), TAPE.ink));
    part(img, (L) => {
      const big = p.fist ?? 1;
      blob(L, [cap([a.hx + ux * 0.5, a.hy + uy * 0.5], [a.hx + ux * 5.2 * big, a.hy + uy * 5.2 * big], 4.4 * big, 4.8 * big)], cel(SKIN), SKIN.ink);
      // curled fingers: short dark lines across the front of the fist
      for (const o of [-2.2, 0.2, 2.6]) {
        const k = [a.hx + ux * 3 * big - uy * o, a.hy + uy * 3 * big + ux * o];
        L.set(Math.round(k[0]), Math.round(k[1]), SKIN.d);
        L.set(Math.round(k[0] + ux * 1.4), Math.round(k[1] + uy * 1.4), SKIN.d);
      }
    });
  };

  const leg = (hip, l, back, ang) => {
    part(img, (L) => {
      blob(L, limbShapes(hip, [l.ex, l.ey], [l.hx, l.hy], back ? LEG_B : LEG_F), cel(TIGHT), TIGHT.ink);
      line(L, hip[0] - 1, hip[1] + 4, l.ex - 1, l.ey - 1, GOLD.m); // gold side stripe
      line(L, l.ex + 2, l.ey - 2, l.ex + 2, l.ey + 2, TIGHT.d); // knee crease
    });
    const dx = l.hx - l.ex, dy = l.hy - l.ey, d = Math.hypot(dx, dy) || 1;
    const sx = dx / d, sy = dy / d;
    const fa = (footAngle(l, ang) * Math.PI) / 180;
    const fx = Math.cos(fa), fy = Math.sin(fa);
    part(img, (L) => {
      // boot shaft from mid-calf to the ankle, then the foot; a thin gold cuff across the top
      const top = [l.hx - sx * 10, l.hy - sy * 10];
      blob(L, [cap(top, [l.hx, l.hy], 5.9, 5), cap([l.hx - fx * 2.6, l.hy - fy * 2.6 + 0.4], [l.hx + fx * 10, l.hy + fy * 10 + 1.2], 4.3, 3.1)], cel(BOOT), BOOT.ink);
      blob(L, [cap([top[0] - sy * 6, top[1] + sx * 6], [top[0] + sy * 6, top[1] - sx * 6], 1.5)], cel(GOLD), GOLD.ink);
    });
  };

  const torso = () => {
    // thick neck first, so the chest never swallows the head
    part(img, (L) => {
      // barrel chest over a narrower waist: the V of a heavyweight, with a thick neck running up into the mask
      blob(L, [
        ell(chest, 12.6, 10.6, J.a1),
        cap([neck[0] - J.up1[0] * 4, neck[1] - J.up1[1] * 4], [head[0] + 1, head[1] + 5], 6.4, 4.8),
        cap(waist, pelvis, 9.2, 9.8),
        ell(J.shF, 6, 6), ell(J.shB, 5.6, 5.6),
      ], cel(SKIN), SKIN.ink);
      // pecs and abs
      const at = (u, v) => onTorso(J, chest, u, v).map(Math.round);
      for (let i = 0; i < 8; i++) { const [x, y] = at(-3 + i, -3.4 + (i > 4 ? (i - 4) * 0.5 : 0)); L.set(x, y, SKIN.s); }
      for (const [u, v] of [[0, -8], [0, -11.4], [0, -14.8]]) { const [x, y] = at(u, v); L.set(x, y, SKIN.s); L.set(x + 1, y, SKIN.s); L.set(x + 2, y, SKIN.s); }
    });
    // tights over the hips, then the gold belt wrapped over them
    part(img, (L) => blob(L, [ell([pelvis[0], pelvis[1] + 2], 11.4, 9), cap([pelvis[0] - 6, pelvis[1] + 5], [pelvis[0] + 6, pelvis[1] + 5], 7.6)], cel(TIGHT), TIGHT.ink));
  };

  const belt = () => {
    part(img, (L) => {
      const a = onTorso(lower, pelvis, -11.5, 6), b = onTorso(lower, pelvis, 11.5, 6);
      blob(L, [cap(a, b, 3.1, 3.2)], cel(GOLD), GOLD.ink);
      const bk = onTorso(lower, pelvis, 4, 6);
      blob(L, [ell(bk, 5, 4.8)], cel(GOLD), GOLD.ink);
      stamp(L, ['k...k', 'kk.kk', 'k.k.k', 'k...k'], PAL, bk[0] + 0.5, bk[1] + 0.5, { ax: 2, ay: 2 });
    });
    // chain and the round medallion
    part(img, (L) => {
      const c0 = onTorso(J, neck, 6, -2), c1 = onTorso(J, chest, 6.5, 2);
      line(L, c0[0], c0[1], c1[0], c1[1], GOLD.l);
      blob(L, [ell([c1[0], c1[1] + 1.5], 3.3, 3.3)], cel(GOLD), GOLD.ink);
      L.set(Math.round(c1[0]), Math.round(c1[1] + 1.5), GOLD.h);
    });
  };

  const face = () => {
    const [hx, hy] = head;
    const rot = p.lean < -60 ? 3 : 0;
    // ponytail behind the head
    part(img, (L) => {
      const tail = [[hx - 8, hy - 2], [hx - 12, hy + 3 + fl * 2], [hx - 14 - fl * 3, hy + 10 + fl * 3], [hx - 15 - fl * 4, hy + 17 + fl * 4]];
      blob(L, ribbon(tail, [3, 2.8, 2, 0.9]), cel(NIGHT), NIGHT.ink);
    });
    part(img, (L) => {
      const at = (pts) => pts.map(([x, y]) => [hx + x, hy + y]);
      const px = (dx, dy, c) => L.set(Math.round(hx + dx), Math.round(hy + dy), c);
      // skin head, flat: crown, brow ridge, small nose, lip, strong chin, jaw
      flatPoly(L, at([[-3, -10.4], [2, -10.4], [4.8, -9], [6.4, -7], [7.6, -4.6], [7.8, -1.6], [8.4, -0.6], [8.4, 0.8], [10, 2.2], [10.2, 3.6], [8.8, 4.2], [8.4, 5.2],
        [8.8, 6.6], [8.2, 8.4], [6.2, 9.8], [2.6, 10.2], [-1.6, 9.2], [-4.4, 6.6], [-6.6, 3.4], [-8, -1], [-7.6, -5.4], [-6, -8.4]]), SKIN.m, SKIN.ink);
      // painted planes: light on the cheekbone and nose, shade under the cheek, the jaw and the nose
      paintOver(L, at([[-2, 3.6], [6, 3.4], [9.8, 2.6], [10.2, 3.6], [8.8, 4.2], [4, 5.4], [-1, 5.4]]), SKIN.l);
      paintOver(L, at([[-5.4, 7.2], [0, 8.2], [4, 9], [8.6, 7.8], [8.2, 8.4], [6.2, 9.8], [2.6, 10.2], [-1.6, 9.2], [-4.4, 6.6]]), SHADE);
      paintOver(L, at([[-6.6, 3.4], [-3, 4.6], [-2, 7], [-5, 6.4]]), SHADE);
      px(9.2, 2.4, SKIN.h); px(8.2, 2.8, SKIN.h); px(9.2, 3.8, SKIN.d);
      // the red mask over the top of the face, ending in a gold-trimmed diagonal across the nose bridge
      const edge = [[8.4, 0.2], [6.6, 1.6], [3.5, 2.8], [0, 3.8], [-3.4, 4.4], [-6.8, 3.8]];
      const mask = at([[-8, -1], [-7.6, -5.4], [-6, -8.4], [-3, -10.4], [2, -10.4], [4.8, -9], [6.4, -7], [7.6, -4.6], [7.8, -1.6], ...edge]);
      flatPoly(L, mask, MASK.m, MASK.ink);
      paintOver(L, at([[-6.4, -7.6], [-3, -10.2], [2, -10.2], [4, -8.6], [0, -6.4], [-4, -3.6], [-6.8, -3]]), MASK.l); // lit crown
      paintOver(L, at([[4.4, -8], [7.8, -4.6], [7.8, -1.6], [8.4, 0.2], [5.4, 1.2], [4.2, -3]]), MASK.s); // shaded front
      paintOver(L, at([[-8, -1], [-6.8, 3.8], [-3.4, 4.4], [-5.4, -1]]), MASK.s); // shaded back of the head
      for (const [dx, dy] of [[-5.6, -6.4], [-4.6, -7.6], [-3.4, -8.6], [-2, -9]]) px(dx, dy, MASK.h);
      for (let i = 0; i < edge.length - 1; i++) line(L, hx + edge[i][0], hy + edge[i][1] - 0.4, hx + edge[i + 1][0], hy + edge[i + 1][1] - 0.4, GOLD.m);
      for (let i = 0; i < edge.length - 1; i++) line(L, hx + edge[i][0], hy + edge[i][1] - 1.4, hx + edge[i + 1][0], hy + edge[i + 1][1] - 1.4, MASK.d);
      // black flame on the brow, clear of the eyes: a hand-drawn stamp with two tongues
      stamp(L, ['...x...', '..xx.x.', '..xxxx.', '.xxxxxx', '.xxxxx.'], PAL, hx - 3, hy - 9.4);
      // small black almond eye holes
      flatPoly(L, at([[3.6, -3.4], [7.4, -4.4], [8, -1.6], [4, 0]]), NIGHT.m, NIGHT.ink);
      flatPoly(L, at([[-6.8, -3.2], [-2, -4.2], [-1.6, -0.6], [-6, 0.2]]), NIGHT.m, NIGHT.ink);
      // handlebar moustache under the nose: thick across the lip, tips curling down
      flatPoly(L, at([[3.6, 4.8], [8.2, 4.6], [9, 5.2], [9, 7], [8.2, 6.4], [7.4, 6.6], [3.8, 6.4]]), NIGHT.m, NIGHT.ink);
      paintOver(L, at([[3.6, 4.8], [8.2, 4.6], [8.2, 5.3], [3.8, 5.5]]), NIGHT.l);
      for (const [dx, dy] of [[1, 8.6], [3, 9.2], [5.4, 9.2], [7, 8.2], [-1, 7.4]]) px(dx, dy, SKIN.s); // stubble
      const e = EYES[p.face] ?? EYES.neutral;
      stamp(L, e.n, PAL, hx - 6.2, hy - 2.8);
      stamp(L, e.f, PAL, hx + 3.8, hy - 3);
      stamp(L, MOUTH[p.face] ?? MOUTH.neutral, PAL, hx + 4, hy + 7.2);
    });
  };

  // the rear arm swings in front of the chest when it guards, and hides behind the back when it cocks
  const backOver = J.armB.hx > pelvis[0] + 3;
  if (!backOver) arm(J.shB, J.armB, true);
  leg(J.hipB, J.legB, true, p.ftB);
  torso();
  leg(J.hipF, J.legF, false, p.ftF);
  belt();
  face();
  if (backOver) arm(J.shB, J.armB, true);
  arm(J.shF, J.armF, false);
  return img;
}

// ------------------------------------------------------------------ poses
const st = stock2(S, { lieLift: 6, stance: 17, crouch: 3, stride: 12, lean: 5, blink: true, guard: [[24, -59], [14, -64]] });
const P = st.P;
const SH = -(S.hipH + S.torso - 3); // shoulder line in the fighting stance

/** Bust shot for the select and dialogue screens: a 64x64 window onto the idle pose. */
export const portrait = { box: [48, 22], pose: (face) => P({ face, handF: [20, SH + 8], handB: [10, SH + 6] }) };

export function animations() {
  const cape = (a, f) => a.map((q, i) => pose(q, { cape: typeof f === 'function' ? f(i) : f }));
  const idle = cape(st.idle, (i) => 0.15 + 0.1 * Math.sin((i / 6) * Math.PI * 2));
  const walk = cape(st.walk, (i) => 0.45 + 0.25 * Math.sin((i / 8) * Math.PI * 2));
  const jump = cape(st.jump, 1);

  // jab and straight: chamber, shoulder launches, full extension (held a beat), snap back
  const light = [
    P({ root: [-3, 4], lean: 2, twist: -2, handF: [16, -57], handB: [20, -64], cape: 0.2 }),
    P({ root: [2, 4], lean: 8, twist: 3, handF: [33, -62], handB: [18, -65], cape: 0.4 }),
    P({ root: [6, 4], lean: 13, twist: 7, handF: [43, -66], handB: [16, -64], fist: 1.1, face: 'yell', footF: [19, 0], cape: 0.6 }),
    P({ root: [7, 4], lean: 14, twist: 8, handF: [44, -66], handB: [15, -64], fist: 1.1, face: 'yell', footF: [19, 0], cape: 0.6 }),
    P({ root: [2, 4], lean: 8, twist: 2, handF: [30, -62], handB: [17, -64], cape: 0.3 }),
  ];
  // overhead double hammer: crouch, fists to the sky with the back arched, then the whole body drops into the blow
  const heavy = [
    P({ root: [-6, 8], lean: -6, twist: -3, handF: [-2, -70], handB: [-8, -64], footF: [17, 0], footB: [-19, 0], cape: 0.6 }),
    P({ root: [-8, 3], lean: -16, bend: -6, twist: -4, handF: [4, -100], handB: [-6, -98], footF: [16, 0], footB: [-20, 0], face: 'yell', cape: 1 }),
    P({ root: [8, 9], lean: 20, bend: 3, twist: 5, handF: [78, -42], handB: [72, -50], fist: 1.3, face: 'yell', footF: [24, 0], footB: [-17, 0], cape: 1 }),
    P({ root: [9, 9], lean: 22, bend: 3, twist: 6, handF: [80, -40], handB: [74, -48], fist: 1.3, face: 'yell', footF: [25, 0], footB: [-17, 0], cape: 1 }),
    P({ root: [5, 7], lean: 14, handF: [48, -50], handB: [40, -56], footF: [21, 0], footB: [-16, 0], cape: 0.8 }),
    P({ root: [1, 5], lean: 8, handF: [26, -56], handB: [17, -62], cape: 0.4 }),
  ];
  // flying drop kick
  const air = [
    P({ root: [0, -12], lean: 6, handF: [22, -64], handB: [12, -66], footF: [12, -20], footB: [-8, -16], face: 'yell', cape: 1 }),
    P({ root: [2, -8], lean: -16, bend: -6, handF: [6, -72], handB: [-10, -66], footF: [37, -30], footB: [-10, -18], face: 'yell', cape: 1, ftF: -20 }),
    P({ root: [3, -8], lean: -18, bend: -6, handF: [5, -72], handB: [-12, -66], footF: [39, -30], footB: [-11, -18], face: 'yell', cape: 1, ftF: -20 }),
  ];
  // double lariat: coil, then both arms swing round the body
  const special = [
    P({ root: [-5, 7], lean: -4, twist: -4, handF: [-4, -58], handB: [14, -62], footF: [18, 0], footB: [-20, 0], cape: 0.6 }),
    P({ root: [-1, 5], lean: 8, twist: 0, handF: [8, -66], handB: [-8, -66], footF: [19, 0], footB: [-20, 0], face: 'yell', cape: 0.9 }),
    P({ root: [8, 5], lean: 16, twist: 4, handF: [51, -67], handB: [-34, -67], fist: 1.25, face: 'yell', footF: [24, 0], footB: [-14, 0], cape: 1 }),
    P({ root: [10, 5], lean: 18, twist: -4, handF: [-30, -67], handB: [50, -67], fist: 1.25, face: 'yell', footF: [26, 0], footB: [-12, 0], cape: 1 }),
    P({ root: [4, 4], lean: 8, handF: [24, -62], handB: [14, -64], footF: [19, 0], footB: [-17, 0], cape: 0.5 }),
  ];
  // Gran Mazo: charge, roar, rise, then a lunging overhead slam
  const sup = [
    P({ root: [-1, 11], lean: 10, handF: [8, -34], handB: [2, -36], footF: [20, 0], footB: [-22, 0], face: 'yell', cape: 0.3 }),
    P({ root: [0, 6], lean: 2, handF: [14, -58], handB: [4, -60], footF: [18, 0], footB: [-20, 0], face: 'yell', cape: 0.7 }),
    P({ root: [0, 0], lean: -6, bend: -4, handF: [16, -92], handB: [-6, -92], footF: [16, 0], footB: [-18, 0], face: 'yell', cape: 1 }),
    P({ root: [-4, -1], lean: -14, bend: -8, handF: [8, -108], handB: [-8, -106], footF: [16, 0], footB: [-20, 0], face: 'yell', cape: 1 }),
    P({ root: [10, 10], lean: 22, bend: 3, twist: 6, handF: [84, -38], handB: [78, -46], fist: 1.4, face: 'yell', footF: [27, 0], footB: [-18, 0], cape: 1 }),
    P({ root: [11, 11], lean: 24, bend: 3, twist: 6, handF: [86, -34], handB: [80, -42], fist: 1.4, face: 'yell', footF: [28, 0], footB: [-18, 0], cape: 0.9 }),
    P({ root: [6, 8], lean: 14, handF: [46, -48], handB: [38, -54], footF: [23, 0], footB: [-16, 0], cape: 0.5 }),
  ];
  // knocked back: head snapped away, arms trailing instead of guarding
  const hit = [
    P({ root: [-4, 3], lean: -10, bend: -4, head: [-3, 0], handF: [6, -60], handB: [-4, -64], footF: [16, 0], footB: [-21, 0], face: 'hurt', cape: 0.9 }),
    P({ root: [-8, 4], lean: -18, bend: -8, head: [-5, 1], handF: [-6, -56], handB: [-16, -60], footF: [15, 0], footB: [-23, 0], face: 'hurt', cape: 1 }),
    P({ root: [-4, 4], lean: -8, bend: -3, head: [-2, 1], handF: [8, -56], handB: [-2, -62], face: 'hurt', cape: 0.7 }),
  ];
  const ko = cape(st.ko, 0.5);
  const win = cape(st.win, (i) => 0.5 + 0.2 * i);
  const draw = (a) => a.map(drawFrame);
  return {
    idle: { fps: 7, loop: true, frames: draw(idle) },
    walk: { fps: 11, loop: true, frames: draw(walk) },
    jump: { fps: 1, loop: false, frames: draw(jump) },
    land: { fps: 1, loop: false, frames: draw(st.land) },
    light: { fps: 12, loop: false, strike: [2, 3], frames: draw(light) },
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
