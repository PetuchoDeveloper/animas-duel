// Huesos "El Segador de Mictlan": a tall reaper in an indigo robe lined in red, a pointed hood over a skull
// with burning orange eyes, ribs showing through the open front, bony shins and a long scythe held in both hands.
// King of Fighters cel shading; the robe is lighter than black so he still reads against the dark stages.
import { C, poly, line, stamp, part, mix } from '../lib/raster.mjs';
import { newFrame, pose, ANCHOR_X, ANCHOR_Y } from '../lib/rig.mjs';
import { ramp, cel, blob, cap, ell, ribbon, solve2, onTorso, stock2, drawArm, drawLeg, drawSkull, paintOver, flatPoly } from '../lib/kof.mjs';

const ROBE = ramp('#4c3c92', { k: 0.9 });
const LINING = ramp('#d02a4a');
const BONE = ramp('#ece6d8', { k: 0.9 });
const GLOW = ramp('#ff9a3a');
const STEEL = ramp('#b6bedc');
const POLE = ramp('#5a3a28');
const VOID = C('#140a24');

export const meta = { id: 'huesos', name: 'Huesos' };

export const S = { thigh: 21, shin: 21, torso: 25, neck: 3, headR: 8.5, upper: 13, fore: 12.5, hipH: 41, shoulderDrop: 4, shoulderDepth: 6.5, hipDepth: 3.8 };

const ARM = [4, 4.4, 3.4, 3.4, 2.6];
const LEG = [4, 4, 3.2, 3.4, 2.8];

const POLE_BACK = 12, POLE_FRONT = 50;

/** The scythe: its pole runs through both hands; the blade hooks off the far end. */
function scythe(img, B, F, flip = 1, dir) {
  const dx = F[0] - B[0], dy = F[1] - B[1], d = Math.hypot(dx, dy) || 1;
  // `dir` pins the pole's direction when the hands are too close together to give one (a fallen fighter)
  const u = dir ?? [dx / d, dy / d], n = [-u[1] * flip, u[0] * flip];
  const at = (t, o = 0) => [B[0] + u[0] * t + n[0] * o, B[1] + u[1] * t + n[1] * o];
  part(img, (L) => {
    blob(L, [cap(at(-POLE_BACK), at(POLE_FRONT), 1.7, 1.5)], cel(POLE), POLE.ink);
    // blade: a broad crescent that sweeps out sideways from the top of the pole and curls back toward the tip
    const top = POLE_FRONT - 2, BL = 26, crescent = [];
    for (let i = 0; i <= 10; i++) { const k = i / 10; crescent.push(at(top + 4 - 12 * k * k, k * BL)); }
    for (let i = 10; i >= 0; i--) { const k = i / 10; crescent.push(at(top + 4 - 12 * k * k - (9 * (1 - k) ** 0.9 + 1.2), k * BL - (k > 0.9 ? 1.4 : 0))); }
    poly(L, crescent, cel(STEEL), STEEL.ink, 2.2);
    blob(L, [ell(at(POLE_FRONT - 1), 2.6, 2.6)], cel(STEEL), STEEL.ink);
    blob(L, [ell(at(-POLE_BACK), 1.8, 1.8)], cel(STEEL), STEEL.ink);
  });
}

export function drawFrame(p) {
  const img = newFrame();
  const J = solve2(S, p);
  const { pelvis, neck, head, chest, waist } = J;
  const fl = p.cape ?? 0;
  const lower = { side1: [Math.cos(J.a0), Math.sin(J.a0)], up1: [Math.sin(J.a0), -Math.cos(J.a0)] };
  const B = [J.armB.hx, J.armB.hy], F = [J.armF.hx, J.armF.hy];

  // long cloak streaming behind, ragged at the hem, lined in red
  part(img, (L) => {
    const a = J.shB, n = neck, hem = pelvis[1] + 24;
    const pts = [
      [n[0] - 1, n[1] - 3], [a[0] - 3, a[1] - 2], [a[0] - 8 - fl * 6, a[1] + 14], [a[0] - 12 - fl * 12, pelvis[1] + 6],
      [a[0] - 17 - fl * 19, hem + 4 + fl * 4], [a[0] - 11 - fl * 12, hem - 4], [a[0] - 10 - fl * 12, hem + 8 + fl * 4], [a[0] - 5 - fl * 8, hem - 2],
      [pelvis[0] - 6 - fl * 6, hem + 6 + fl * 2], [pelvis[0] - 2, hem - 5], [pelvis[0] + 2, pelvis[1] + 6], [n[0] + 3, n[1] + 4],
    ];
    poly(L, pts, cel(ROBE, { noHi: true }), ROBE.ink, 3.2);
    for (let i = 4; i < 10; i++) line(L, pts[i][0], pts[i][1] - 1, pts[i + 1][0], pts[i + 1][1] - 1, LINING.m);
  });

  const sleeve = { ramp: ROBE, to: 0.8, grow: 1.5, cuff: LINING };
  const arm = (sh, a, back) => drawArm(img, sh, a, { radii: back ? ARM.map((r) => r * 0.95) : ARM, skin: BONE, sleeve, hand: 'open' });
  const leg = (hip, l, back, ang) => drawLeg(img, hip, l, {
    radii: LEG, skin: BONE, angle: ang,
    boot: { ramp: BONE, shaft: 0, len: 9, r: 3.8 },
  });

  const torso = () => {
    part(img, (L) => {
      blob(L, [
        ell(chest, 8.8, 9, J.a1),
        cap(waist, pelvis, 6, 6.8),
        cap([neck[0] - J.up1[0] * 3, neck[1] - J.up1[1] * 3], [head[0], head[1] + 5], 3.4, 3),
        ell(J.shF, 5, 5), ell(J.shB, 4.6, 4.6),
      ], cel(ROBE), ROBE.ink);
      // the robe hangs open at the front: red lining and a bare ribcage inside it
      const at = (u, v) => onTorso(J, chest, u, v);
      flatPoly(L, [at(1.5, 8), at(6.6, 6), at(7.2, -6), at(5.6, -12), at(1.2, -12), at(2.4, 0)], LINING.m, LINING.ink);
      flatPoly(L, [at(2.2, 7), at(5.4, 5.4), at(5.8, -6), at(4.8, -10.6), at(2, -10.6), at(3, 0)], VOID);
      for (const v of [4, 0.6, -2.8, -6.2]) { const a = at(2.8, v), b = at(5.6, v + 1.2); line(L, a[0], a[1], b[0], b[1], BONE.m); }
      const s0 = at(3.4, 6), s1 = at(3.6, -10); line(L, s0[0], s0[1], s1[0], s1[1], BONE.s);
    });
    // collar and a silver clasp
    part(img, (L) => {
      const c = onTorso(J, neck, 1.4, -1.6);
      blob(L, [ell(c, 6.4, 2.6, J.a1)], cel(ROBE), ROBE.ink);
      blob(L, [ell(onTorso(J, neck, 5.6, -2), 1.6, 1.6)], cel(STEEL), STEEL.ink);
    });
  };

  // robe skirt from the waist to mid-shin, ragged, swaying with the motion
  const skirt = () => {
    part(img, (L) => {
      const at = (u, v) => onTorso(lower, pelvis, u, v);
      const hem = 24 + fl * 2;
      const pts = [
        at(-8, 3), at(8.4, 3), at(10 + fl * 3, -8), at(11 + fl * 5, -hem + 3), at(7 + fl * 3, -hem - 2), at(4 + fl * 2, -hem + 4), at(0, -hem - 1),
        at(-3, -hem + 5), at(-7 - fl * 2, -hem), at(-9 - fl * 3, -hem + 4), at(-11 - fl * 4, -8),
      ];
      poly(L, pts, cel(ROBE), ROBE.ink, 3.4);
      for (let i = 3; i < 10; i++) line(L, pts[i][0], pts[i][1] - 1, pts[i + 1][0], pts[i + 1][1] - 1, LINING.m);
      const g = at(-8.4, 2.4), g2 = at(8.6, 2.4);
      blob(L, [cap(g, g2, 2.2, 2.2)], cel(LINING), LINING.ink); // a red sash at the waist
    });
  };

  const hoodBack = () => {
    const [hx, hy] = head;
    part(img, (L) => {
      const at = (pts) => pts.map(([x, y]) => [hx + x, hy + y]);
      flatPoly(L, at([[-10, -4], [-12, -11], [-19 - fl * 3, -19 - fl], [-7, -16], [-1, -17], [5, -14], [8.4, -9], [9.4, -4], [9, 2], [6.6, 6.6], [-4, 8], [-8, 5], [-10.4, 1]]), ROBE.m, ROBE.ink);
      paintOver(L, at([[-6, -15], [-1, -17], [5, -14], [8, -9], [2, -8], [-5, -9]]), ROBE.l);
      paintOver(L, at([[-10, -4], [-10.4, 1], [-8, 5], [-4, 8], [-3, 2], [-6, -3]]), ROBE.s);
    });
  };
  const hoodFront = () => {
    const [hx, hy] = head;
    part(img, (L) => {
      const at = (pts) => pts.map(([x, y]) => [hx + x, hy + y]);
      // the cowl drops over the forehead and frames the face; red lining shows inside the rim
      flatPoly(L, at([[-10, -12], [-3, -16], [5, -14], [8.8, -9], [9.8, -3], [8.4, -3.8], [7, -5.8], [3, -6.4], [-3, -6.4], [-8, -5.4], [-10.4, -3]]), ROBE.m, ROBE.ink);
      paintOver(L, at([[-8, -14], [-1, -16], [5, -14], [8, -9], [0, -9]]), ROBE.l);
      for (let x = -7; x <= 6; x += 1) img.set(Math.round(hx + x), Math.round(hy - 5.6 + (x > 2 ? (x - 2) * 0.3 : 0)), LINING.m);
      // cheek strip down the front of the hood
      flatPoly(L, at([[7.6, -3], [9.6, -3], [9.4, 2.4], [7, 6.4], [6, 6], [7.6, 1.6]]), ROBE.m, ROBE.ink);
    });
  };

  // the weapon is gripped at the hands: the pole runs through both, so it is drawn behind the front arm
  const backOver = J.armB.hx > pelvis[0] + 3;
  if (!backOver) arm(J.shB, J.armB, true);
  leg(J.hipB, J.legB, true, p.ftB);
  torso();
  leg(J.hipF, J.legF, false, p.ftF);
  skirt();
  hoodBack();
  drawSkull(img, head, p.face, { bone: BONE, glow: GLOW });
  hoodFront();
  scythe(img, B, F, p.flip ?? 1, p.pole);
  if (backOver) arm(J.shB, J.armB, true);
  arm(J.shF, J.armF, false);
  return img;
}

// ------------------------------------------------------------------ poses
const st = stock2(S, { lieLift: 7, stance: 12, crouch: 4, stride: 11, lean: 5, blink: true, guard: [[17, -64], [9, -46]] });
const P = st.P;

export const portrait = { box: [58, 22], pose: (face) => P({ face, handF: [10, -40], handB: [4, -36] }) };

export function animations() {
  const cape = (a, f) => a.map((q, i) => pose(q, { cape: typeof f === 'function' ? f(i) : f }));
  const idle = cape(st.idle, (i) => 0.2 + 0.12 * Math.sin((i / 6) * Math.PI * 2));
  const walk = cape(st.walk, (i) => 0.5 + 0.25 * Math.sin((i / 8) * Math.PI * 2));
  const jump = cape(st.jump, 1);

  // thrust: the pole drives forward
  const light = [
    P({ root: [-2, 4], lean: 3, twist: -2, handF: [14, -58], handB: [6, -48], cape: 0.3 }),
    P({ root: [2, 4], lean: 8, twist: 3, handF: [30, -58], handB: [10, -52], cape: 0.5 }),
    P({ root: [7, 4], lean: 13, twist: 6, handF: [50, -58], handB: [16, -54], face: 'yell', footF: [17, 0], cape: 0.8 }),
    P({ root: [8, 4], lean: 14, twist: 7, handF: [52, -58], handB: [17, -54], face: 'yell', footF: [17, 0], cape: 0.8 }),
    P({ root: [3, 4], lean: 8, twist: 2, handF: [30, -58], handB: [12, -52], cape: 0.4 }),
  ];
  // wide reaping swing: wind it behind, raise it, then cut down and across
  const heavy = [
    P({ root: [-5, 6], lean: -4, twist: -3, handF: [-6, -64], handB: [10, -62], flip: -1, footF: [15, 0], footB: [-15, 0], cape: 0.6 }),
    P({ root: [-8, 3], lean: -14, bend: -5, handF: [-8, -96], handB: [0, -78], flip: -1, face: 'yell', footF: [14, 0], footB: [-16, 0], cape: 1 }),
    P({ root: [9, 8], lean: 20, bend: 3, twist: 5, handF: [52, -34], handB: [30, -58], flip: -1, face: 'yell', footF: [24, 0], footB: [-15, 0], cape: 1 }),
    P({ root: [10, 8], lean: 22, bend: 3, twist: 5, handF: [54, -30], handB: [32, -54], flip: -1, face: 'yell', footF: [25, 0], footB: [-15, 0], cape: 1 }),
    P({ root: [5, 6], lean: 14, handF: [48, -36], handB: [28, -54], flip: -1, footF: [21, 0], footB: [-14, 0], cape: 0.8 }),
    P({ root: [1, 5], lean: 8, handF: [24, -52], handB: [10, -50], cape: 0.4 }),
  ];
  const air = [
    P({ root: [0, -12], lean: 6, handF: [24, -70], handB: [10, -64], footF: [12, -20], footB: [-8, -16], face: 'yell', cape: 1 }),
    P({ root: [2, -8], lean: 10, bend: 3, handF: [54, -44], handB: [24, -62], flip: -1, footF: [16, -16], footB: [-8, -22], face: 'yell', cape: 1 }),
    P({ root: [3, -8], lean: 12, bend: 3, handF: [56, -40], handB: [26, -60], flip: -1, footF: [16, -16], footB: [-9, -22], face: 'yell', cape: 1 }),
  ];
  // Almas Errantes: lift the scythe, then point it and let the souls go
  const special = [
    P({ root: [-4, 6], lean: -2, handF: [10, -76], handB: [8, -56], cape: 0.6, footF: [14, 0], footB: [-15, 0] }),
    P({ root: [-2, 4], lean: -6, bend: -3, handF: [8, -100], handB: [6, -76], face: 'yell', cape: 0.9, footF: [14, 0], footB: [-15, 0] }),
    P({ root: [5, 5], lean: 8, handF: [50, -64], handB: [22, -58], flip: -1, face: 'yell', cape: 1, footF: [19, 0], footB: [-15, 0] }),
    P({ root: [6, 5], lean: 9, handF: [52, -66], handB: [23, -58], flip: -1, face: 'yell', cape: 1, footF: [20, 0], footB: [-15, 0] }),
    P({ root: [2, 5], lean: 5, handF: [24, -58], handB: [10, -50], cape: 0.5 }),
  ];
  const sup = [
    P({ root: [-1, 9], lean: 5, handF: [8, -52], handB: [4, -46], face: 'yell', cape: 0.4 }),
    P({ root: [0, 4], lean: 0, handF: [10, -80], handB: [6, -62], face: 'yell', cape: 0.8 }),
    P({ root: [0, 0], lean: -6, bend: -4, handF: [6, -104], handB: [2, -84], face: 'yell', cape: 1 }),
    P({ root: [-3, 0], lean: -14, bend: -8, handF: [-2, -108], handB: [-4, -88], face: 'yell', cape: 1 }),
    P({ root: [11, 9], lean: 24, bend: 4, twist: 6, handF: [47, -32], handB: [28, -56], flip: -1, face: 'yell', footF: [27, 0], footB: [-15, 0], cape: 1 }),
    P({ root: [12, 9], lean: 26, bend: 4, twist: 6, handF: [49, -28], handB: [30, -52], flip: -1, face: 'yell', footF: [28, 0], footB: [-15, 0], cape: 0.9 }),
    P({ root: [6, 7], lean: 14, handF: [46, -40], handB: [28, -54], flip: -1, footF: [22, 0], footB: [-14, 0], cape: 0.6 }),
  ];
  const hit = [
    P({ root: [-4, 4], lean: -10, bend: -4, head: [-3, 0], handF: [6, -62], handB: [-4, -50], footF: [13, 0], footB: [-17, 0], face: 'hurt', cape: 1 }),
    P({ root: [-8, 5], lean: -18, bend: -8, head: [-5, 1], handF: [-6, -64], handB: [-14, -52], footF: [12, 0], footB: [-19, 0], face: 'hurt', cape: 1 }),
    P({ root: [-4, 5], lean: -8, bend: -3, head: [-2, 1], handF: [8, -60], handB: [-2, -50], face: 'hurt', cape: 0.7 }),
  ];
  const draw = (a) => a.map(drawFrame);
  return {
    idle: { fps: 7, loop: true, frames: draw(idle) },
    walk: { fps: 11, loop: true, frames: draw(walk) },
    jump: { fps: 1, loop: false, frames: draw(jump) },
    land: { fps: 1, loop: false, frames: draw(st.land) },
    light: { fps: 13, loop: false, strike: [2, 3], frames: draw(light) },
    heavy: { fps: 10, loop: false, strike: [2, 3], frames: draw(heavy) },
    air: { fps: 10, loop: false, strike: [1, 2], frames: draw(air) },
    special: { fps: 10, loop: false, strike: [2, 3], frames: draw(special) },
    super: { fps: 8, loop: false, strike: [4, 5], frames: draw(sup) },
    hit: { fps: 10, loop: false, frames: draw(hit) },
    ko: { fps: 8, loop: false, frames: draw(cape(st.ko.map((k, i) => (i >= 2 ? { ...k, pole: [0.98, -0.1], flip: -1 } : k)), 0.5)) },
    getup: { fps: 8, loop: false, frames: draw(st.getup) },
    dodge: { fps: 10, loop: false, frames: draw(cape(st.dodge, 1)) },
    block: { fps: 4, loop: true, frames: draw(st.guard) },
    win: { fps: 6, loop: true, frames: draw(cape(st.win, (i) => 0.5 + 0.2 * i)) },
  };
}
