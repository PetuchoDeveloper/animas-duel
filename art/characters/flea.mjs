// La Pulguita "La Luchadora de las Ofrendas", after the owner's reference: a stocky grey flea with long
// drooping ears bristling with little hairs, a stitched forehead, a permanent scowl, a wide orange duck bill,
// a tan belly plate with brown segments, big orange fists and small brown boots.
// King of Fighters cel shading, a hand-drawn face. Short limbs, big head, hits hard.
import { C, poly, line, stamp, part, mix } from '../lib/raster.mjs';
import { newFrame, pose } from '../lib/rig.mjs';
import { ramp, cel, blob, cap, ell, ribbon, solve2, onTorso, stock2, drawArm, drawLeg, paintOver, flatPoly } from '../lib/kof.mjs';

const GREY = ramp('#9a9aa2', { k: 0.9 });
const ORANGE = ramp('#f08a20');
const FIST = ramp('#e07a1c');
const BELLY = ramp('#dcc89c');
const STRIPE = ramp('#7a4a2c');
const BOOT = ramp('#6e4a32');
const SHADE = mix(GREY.m, GREY.s, 0.55);

const PAL = {
  k: C('#120a14'), w: C('#fffaf0'), p: C('#120a14'), h: C('#ffffff'), o: C(ORANGE.m), d: C(ORANGE.d), s: C(ORANGE.s),
  m: C('#5a1228'), u: C('#e8607a'), t: C('#fff4d6'), g: C(GREY.s),
};

export const meta = { id: 'flea', name: 'La Pulguita' };

export const S = { thigh: 12, shin: 11.5, torso: 19, neck: 0.5, headR: 10.5, upper: 9.5, fore: 9, hipH: 22.5, shoulderDrop: 3, shoulderDepth: 6.5, hipDepth: 4.6 };

const ARM = [4.4, 4.9, 4.1, 4.4, 3.6];
const LEG = [5.2, 5.4, 4.1, 4.5, 3.5];

// Eyes sit under the brows: w white, p pupil, h glint, k lid. near = rear eye, far = front eye.
const EYES = {
  neutral: { n: ['kkkkk', 'wwwpp', 'wwhpp', '.wwpp'], f: ['kkkk', 'wwpp', 'whpp', '.wpp'] },
  blink: { n: ['kkkkk', 'kkkkk'], f: ['kkkk', 'kkkk'] },
  yell: { n: ['kkkkk', 'wwppp', 'whppp', 'wwppp', '.www.'], f: ['kkkk', 'wppp', 'whpp', 'wppp'] },
  hurt: { n: ['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'], f: ['k..k', '.kk.', '.kk.', 'k..k'] },
  smug: { n: ['.kkk.', 'k...k', '.....'], f: ['.kk.', 'k..k'] },
  ko: { n: ['w...w', '.w.w.', '..w..', '.w.w.', 'w...w'], f: ['w..w', '.ww.', '.ww.', 'w..w'] },
};

export function drawFrame(p) {
  const img = newFrame();
  const J = solve2(S, p);
  const { pelvis, neck, head, chest, waist } = J;
  const sway = p.ant ?? 0;

  const arm = (sh, a, back) => drawArm(img, sh, a, {
    radii: back ? ARM.map((r) => r * 0.94) : ARM, skin: GREY, hand: 'fist', glove: FIST, size: p.fist ?? 1.15,
  });
  const leg = (hip, l, back, ang) => drawLeg(img, hip, l, {
    radii: LEG, skin: GREY, angle: ang,
    boot: { ramp: BOOT, shaft: 4, len: 9, r: 4.6 },
  });

  const torso = () => {
    part(img, (L) => {
      blob(L, [
        ell(chest, 9.6, 9.6, J.a1),
        cap(waist, pelvis, 8, 8.4),
        cap([neck[0] - J.up1[0] * 2, neck[1] - J.up1[1] * 2], [head[0], head[1] + 5], 4.4, 4),
        ell(J.shF, 4.6, 4.6), ell(J.shB, 4.3, 4.3),
      ], cel(GREY, { noHi: true }), GREY.ink);
    });
    // tan belly plate with the brown segments of a flea's abdomen
    part(img, (L) => {
      const c = onTorso(J, waist, 2.4, 6);
      blob(L, [ell(c, 5.8, 10.6, J.a1)], cel(BELLY, { noHi: true }), BELLY.ink);
      for (const v of [-6, -2.4, 1.2, 4.8]) {
        const a = onTorso(J, c, -3.8, v), b = onTorso(J, c, 4.6, v);
        blob(L, [cap(a, b, 1.15, 1.15)], cel(STRIPE, { noHi: true }), STRIPE.ink);
      }
    });
    // little guard hairs on the shoulder and hip
    part(img, (L) => {
      for (const [at, dx, dy] of [[J.shF, 3, -4], [J.shB, -3, -4], [J.hipB, -4, 3]]) { L.set(Math.round(at[0] + dx), Math.round(at[1] + dy), GREY.ink); L.set(Math.round(at[0] + dx * 1.4), Math.round(at[1] + dy * 1.5), GREY.ink); }
    });
  };

  const face = () => {
    const [hx, hy] = head;
    const at = (pts) => pts.map(([x, y]) => [hx + x, hy + y]);
    const px = (dx, dy, c) => img.set(Math.round(hx + dx), Math.round(hy + dy), c);
    const open = p.face === 'yell' ? 2.6 : p.face === 'hurt' ? 1.6 : p.face === 'ko' ? 2 : 0;
    // long ears, behind the head, bristling with hairs
    part(img, (L) => {
      for (const [bx, pts, rad] of [
        [-4, [[-4, -8], [-9, -14 + sway], [-15 - sway, -19], [-21 - sway * 1.5, -20 + sway]], [4.2, 3.6, 2.8, 1.4]],
        [3, [[3, -9], [6, -16 - sway], [12 + sway, -21], [19 + sway * 1.6, -20]], [4, 3.4, 2.6, 1.2]],
      ]) {
        // the ears lag behind the head: they stream back when she leans into a rush and lie along the floor when she falls
        const ea = p.lean >= 0 ? (-p.lean * 0.85 * Math.PI) / 180 : (p.lean * Math.PI) / 180;
        const world = pts.map(([x, y]) => [hx + x * Math.cos(ea) - y * Math.sin(ea), hy + x * Math.sin(ea) + y * Math.cos(ea)]);
        blob(L, ribbon(world, rad), cel(GREY, { noHi: true }), GREY.ink);
        // tiny hairs along the ear
        for (const t of [1, 2]) { const q = world[t]; L.set(Math.round(q[0] + (bx < 0 ? -4 : 4)), Math.round(q[1] - 2), GREY.ink); L.set(Math.round(q[0] + (bx < 0 ? -3 : 3)), Math.round(q[1] - 1), GREY.ink); L.set(Math.round(q[0] + (bx < 0 ? -2 : 2)), Math.round(q[1]), GREY.ink); }
      }
    });
    part(img, (L) => {
      // wide grey skull, lit from the upper left
      blob(L, [ell([hx, hy], 11.2, 9.6), ell([hx + 4, hy + 3], 8.6, 6.4)], cel(GREY, { noHi: true }), GREY.ink);
      paintOver(L, at([[-8, -7], [0, -9.4], [6, -8], [3, -5], [-6, -4]]), GREY.l);
      paintOver(L, at([[-11, 0], [-6, 6], [2, 9], [8, 8.6], [-2, 5], [-8, 0]]), SHADE);
      px(-7, -6, GREY.h); px(-5.4, -7.4, GREY.h);
      // the stitched seam over the forehead
      for (let i = 0; i < 4; i++) px(0.6, -9 + i, GREY.ink);
      for (const y of [-8.6, -6.8]) { px(-0.6, y, GREY.ink); px(1.8, y, GREY.ink); }
      // the duck bill: an upper bill, a lower bill that drops when she shouts, a dark mouth line between
      flatPoly(L, at([[4, -1.2], [11, -1.6], [15.6, -0.2], [16.4, 1.6], [15.4, 3], [6, 3.4]]), ORANGE.m, ORANGE.ink);
      paintOver(L, at([[5, -1], [11, -1.4], [15, -0.2], [11, 0.6], [5, 0.8]]), ORANGE.l);
      paintOver(L, at([[6, 2], [15.4, 2.2], [15.4, 3], [6, 3.4]]), ORANGE.s);
      flatPoly(L, at([[5, 3.4 + open], [15, 3.4 + open], [14.4, 6 + open], [10, 7 + open], [6, 5.8 + open]]), ORANGE.s, ORANGE.ink);
      paintOver(L, at([[6, 5 + open], [14.4, 5 + open], [14.4, 6 + open], [10, 7 + open], [6, 5.8 + open]]), ORANGE.d);
      for (let i = 5; i <= 15; i++) px(i, 3.2 + open * 0.4, PAL.k); // mouth line
      if (open > 1.2) flatPoly(L, at([[6, 3.8], [14, 3.8], [14, 3.6 + open], [6, 3.6 + open]]), PAL.m);
      px(14, 0.2, ORANGE.d); px(13, 0.2, ORANGE.d); // nostril
      for (let i = 6; i <= 13; i += 3) px(i, -1.2, ORANGE.h); // shine on the bill ridge
      // heavy slanting brows over the eyes, then the hand-drawn eyes
      const e = EYES[p.face] ?? EYES.neutral;
      const sad = p.face === 'hurt' || p.face === 'ko', soft = p.face === 'smug';
      const brow = (x0, y0, x1, y1) => { line(L, hx + x0, hy + y0, hx + x1, hy + y1, PAL.k); line(L, hx + x0, hy + y0 - 1, hx + x1, hy + y1 - 1, PAL.k); };
      if (!sad && !soft) { brow(-5.4, -5.6, -0.2, -3.2); brow(3.4, -3.4, 8.6, -5.4); } else if (soft) { brow(-5, -5, -0.6, -5.4); brow(3.6, -5.4, 8, -5); } else { brow(-5.4, -3.6, -0.4, -5.6); brow(3.6, -5.6, 8.4, -3.4); }
      stamp(L, e.n, PAL, hx - 4.6, hy - 3.2);
      stamp(L, e.f, PAL, hx + 3.6, hy - 3.2);
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
  return img;
}

// ------------------------------------------------------------------ poses
const st = stock2(S, { stance: 11, crouch: 4, stride: 9, lean: 8, blink: true, guard: [[21, -26], [13, -29]] });
const P = st.P;

export const portrait = { box: [58, 30], pose: (face) => P({ face, handF: [14, -22], handB: [8, -24] }) };

export function animations() {
  const ant = (a, f) => a.map((q, i) => pose(q, { ant: typeof f === 'function' ? f(i) : f }));
  const idle = ant(st.idle, (i) => Math.sin((i / 6) * Math.PI * 2) * 1);
  const walk = ant(st.walk, (i) => Math.sin((i / 8) * Math.PI * 2) * 1.4);
  const jump = ant(st.jump, -1.4);

  const light = [
    P({ root: [-2, 5], lean: 5, twist: -2, handF: [10, -32], handB: [10, -36], ant: 0.6 }),
    P({ root: [2, 5], lean: 10, twist: 2, handF: [24, -35], handB: [10, -36], ant: -0.8 }),
    P({ root: [5, 5], lean: 13, twist: 4, handF: [36, -37], handB: [9, -34], fist: 1.35, face: 'yell', footF: [14, 0], ant: -1.6 }),
    P({ root: [6, 5], lean: 14, twist: 5, handF: [37, -37], handB: [8, -34], fist: 1.35, face: 'yell', footF: [14, 0], ant: -1.6 }),
    P({ root: [2, 5], lean: 9, twist: 2, handF: [22, -34], handB: [10, -36], ant: -0.4 }),
  ];
  // picotazo: coil, then a lunging bill thrust with both fists trailing
  const heavy = [
    P({ root: [-5, 8], lean: -2, handF: [6, -28], handB: [2, -30], footF: [13, 0], footB: [-14, 0], ant: 0.8 }),
    P({ root: [-8, 7], lean: -10, bend: -3, handF: [-4, -34], handB: [-8, -34], footF: [14, 0], footB: [-15, 0], ant: 1.4 }),
    P({ root: [14, 9], lean: 44, bend: 4, head: [2, 0], handF: [-2, -26], handB: [-8, -30], footF: [22, 0], footB: [-14, 0], face: 'yell', ant: -3 }),
    P({ root: [15, 9], lean: 46, bend: 4, head: [3, 0], handF: [-3, -26], handB: [-9, -30], footF: [23, 0], footB: [-14, 0], face: 'yell', ant: -3 }),
    P({ root: [8, 7], lean: 22, handF: [14, -30], handB: [8, -34], footF: [18, 0], footB: [-12, 0], ant: -1 }),
    P({ root: [2, 5], lean: 8, handF: [16, -31], handB: [10, -35], ant: 0 }),
  ];
  // stomping dive kick
  const air = [
    P({ root: [0, -10], lean: 6, handF: [16, -38], handB: [8, -40], footF: [10, -18], footB: [-6, -14], face: 'yell', ant: -1 }),
    P({ root: [3, -8], lean: -12, bend: -4, handF: [6, -44], handB: [-4, -40], footF: [30, -22], footB: [-8, -16], face: 'yell', ant: -2, ftF: -30 }),
    P({ root: [4, -8], lean: -14, bend: -4, handF: [6, -44], handB: [-4, -40], footF: [32, -22], footB: [-9, -16], face: 'yell', ant: -2, ftF: -30 }),
  ];
  // Cabezazo Meteoro: curl up, then a human cannonball head first
  const special = [
    P({ root: [-4, 9], lean: -6, handF: [6, -24], handB: [0, -28], footF: [13, 0], footB: [-14, 0], ant: 1 }),
    P({ root: [-6, 10], lean: -12, handF: [-2, -22], handB: [-6, -24], footF: [14, 0], footB: [-16, 0], face: 'yell', ant: 1.4 }),
    P({ root: [16, 11], lean: 76, bend: 4, head: [3, 0], handF: [-6, -24], handB: [-12, -20], footF: [-16, -10], footB: [-22, -4], face: 'yell', ant: -3.4, kneeF: 1, kneeB: 1 }),
    P({ root: [18, 12], lean: 80, bend: 4, head: [3, 0], handF: [-8, -22], handB: [-14, -18], footF: [-18, -10], footB: [-24, -4], face: 'yell', ant: -3.4, kneeF: 1, kneeB: 1 }),
    P({ root: [8, 7], lean: 20, handF: [14, -28], handB: [8, -32], footF: [14, 0], footB: [-12, 0], ant: -0.4 }),
  ];
  // Pulga Frenetica: flurry of jabs, then a leaping double-fist rise
  const sup = [
    P({ root: [-1, 11], lean: 10, handF: [6, -22], handB: [2, -24], footF: [14, 0], footB: [-16, 0], face: 'yell', ant: 0.6 }),
    P({ root: [2, 7], lean: 14, twist: 4, handF: [34, -34], handB: [8, -36], fist: 1.35, face: 'yell', ant: -1 }),
    P({ root: [4, 7], lean: 14, twist: -4, handF: [8, -36], handB: [36, -32], fist: 1.35, face: 'yell', ant: -1 }),
    P({ root: [6, 5], lean: 8, handF: [12, -26], handB: [6, -28], footF: [14, 0], footB: [-14, 0], face: 'yell', ant: 0 }),
    P({ root: [5, -14], lean: -4, handF: [24, -86], handB: [8, -76], footF: [8, -6], footB: [-6, -12], fist: 1.4, face: 'yell', ant: 2 }),
    P({ root: [5, -16], lean: -6, handF: [22, -90], handB: [8, -78], footF: [6, -4], footB: [-8, -10], fist: 1.4, face: 'yell', ant: 2 }),
    P({ root: [2, 8], lean: 6, handF: [14, -28], handB: [8, -32], ant: 0 }),
  ];
  const hit = [
    P({ root: [-4, 4], lean: -10, bend: -5, head: [-3, 0], handF: [4, -30], handB: [-4, -34], footF: [11, 0], footB: [-15, 0], face: 'hurt', ant: 2 }),
    P({ root: [-8, 5], lean: -18, bend: -8, head: [-5, 1], handF: [-6, -28], handB: [-14, -32], footF: [10, 0], footB: [-17, 0], face: 'hurt', ant: 3 }),
    P({ root: [-4, 5], lean: -8, bend: -3, head: [-2, 1], handF: [6, -30], handB: [-2, -34], face: 'hurt', ant: 1 }),
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
