// Ernesto "El Mariachi Calavera": a tall skeleton charro in an ivory bolero, violet trousers with a row of gold
// buttons, a dark sombrero trimmed in gold, and a guitar he wears on his back and swings as a club.
// King of Fighters cel shading, a hand-drawn skull, glowing violet eyes.
import { C, poly, line, stamp, part, mix } from '../lib/raster.mjs';
import { newFrame, pose } from '../lib/rig.mjs';
import { ramp, cel, blob, cap, ell, ribbon, solve2, onTorso, stock2, drawArm, drawLeg, drawSkull, paintOver, flatPoly } from '../lib/kof.mjs';

const BONE = ramp('#eee8d6', { k: 0.9 });
const SUIT = ramp('#efe4c2', { k: 0.85 });
const PANTS = ramp('#44309a');
const HAT = ramp('#33225e');
const GOLD = ramp('#f2c24a');
const BOW = ramp('#d83a50');
const SASH = ramp('#8a2a8c');
const BOOT = ramp('#6e3a22');
const WOOD = ramp('#d07a2c');
const NECK = ramp('#5a3418');
const GLOW = ramp('#c890ff');

const PAL = {
  x: C('#1a1030'), v: C('#c890ff'), h: C('#ffffff'), g: C(GOLD.m), b: C(BONE.m), s: C(BONE.s), d: C(BONE.d), k: C(BONE.ink), t: C(BONE.l),
};

export const meta = { id: 'ernesto', name: 'Ernesto' };

export const S = { thigh: 21, shin: 21, torso: 26, neck: 2.5, headR: 9, upper: 13.5, fore: 12.5, hipH: 41, shoulderDrop: 4, shoulderDepth: 7, hipDepth: 4 };

const ARM = [3.5, 4, 3.3, 3.5, 2.8];
const LEG = [5.6, 5.8, 4.4, 4.8, 3.5];

/** Guitar centred on (cx, cy), neck pointing along `ang` (degrees, 0 = right). */
function guitar(img, cx, cy, ang, sc = 1) {
  const a = (ang * Math.PI) / 180;
  const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
  const at = (t, o = 0) => [cx + d[0] * t * sc + n[0] * o * sc, cy + d[1] * t * sc + n[1] * o * sc];
  part(img, (L) => {
    blob(L, [cap(at(2), at(30), 1.8 * sc, 1.6 * sc)], cel(NECK), NECK.ink); // neck
    blob(L, [cap(at(29), at(34), 2.6 * sc, 2.4 * sc)], cel(NECK), NECK.ink); // headstock
    blob(L, [ell(at(-8), 9 * sc, 9.6 * sc, a), ell(at(2.5), 6.4 * sc, 7 * sc, a)], cel(WOOD), WOOD.ink); // body
    blob(L, [ell(at(-3), 3 * sc, 3 * sc)], cel(NECK), NECK.ink); // sound hole
    blob(L, [cap(at(-12, -1), at(-12, 1), 1.2 * sc)], cel(GOLD), GOLD.ink); // bridge
    line(L, ...at(-9), ...at(31), GOLD.l);
  });
}

export function drawFrame(p) {
  const img = newFrame();
  const J = solve2(S, p);
  const { pelvis, neck, head, chest, waist } = J;
  const lower = { side1: [Math.cos(J.a0), Math.sin(J.a0)], up1: [Math.sin(J.a0), -Math.cos(J.a0)] };
  const holding = !!p.guitar;

  // the guitar slung on his back: body low behind the hip, neck rising over the shoulder
  if (!holding) {
    const base = onTorso(J, waist, -15, 0);
    guitar(img, base[0], base[1] + 4, -112, 0.95);
  }

  const sleeve = (back) => ({ ramp: SUIT, to: 0.62, grow: 0.5, cuff: GOLD });
  const arm = (sh, a, back) => drawArm(img, sh, a, {
    radii: back ? ARM.map((r) => r * 0.95) : ARM, skin: BONE, sleeve: sleeve(back), hand: 'open',
  });
  const leg = (hip, l, back, ang) => drawLeg(img, hip, l, {
    radii: LEG, skin: PANTS, angle: ang,
    pants: { ramp: PANTS, to: 1, grow: 0.3, stripe: GOLD.m },
    boot: { ramp: BOOT, shaft: 8, cuff: GOLD, len: 10.4, r: 4.5 },
  });

  const torso = () => {
    part(img, (L) => {
      blob(L, [
        ell(chest, 8.4, 8.6, J.a1),
        cap(waist, pelvis, 5.6, 6.4),
        cap([neck[0] - J.up1[0] * 3, neck[1] - J.up1[1] * 3], [head[0], head[1] + 5], 3.6, 3.1),
        ell(J.shF, 4.4, 4.4), ell(J.shB, 4.1, 4.1),
      ], cel(SUIT), SUIT.ink);
      // gold embroidery down the front edge and a line of buttons
      const at = (u, v) => onTorso(J, chest, u, v).map(Math.round);
      for (let v = 5; v >= -7; v -= 3) { const [x, y] = at(5.4, v); L.set(x, y, GOLD.m); L.set(x + 1, y, GOLD.l); L.set(x, y + 1, GOLD.d); }
      for (let v = 8; v >= -9; v--) { const [x, y] = at(3.4, v); L.set(x, y, GOLD.s); }
      for (let u = -8; u <= 8; u++) { const [x, y] = at(u, -8.6); L.set(x, y, GOLD.m); } // hem trim
      const sf = J.shF.map(Math.round), sb = J.shB.map(Math.round); // shoulder braid
      for (const [x, y] of [sf, sb]) { L.set(x - 2, y - 2, GOLD.l); L.set(x - 1, y - 3, GOLD.m); L.set(x, y - 3, GOLD.m); L.set(x + 1, y - 2, GOLD.m); }
    });
    // violet cummerbund over the waist and trousers over the hips
    part(img, (L) => blob(L, [ell([pelvis[0], pelvis[1] + 3], 8.4, 7.6), cap([pelvis[0] - 5, pelvis[1] + 5], [pelvis[0] + 5, pelvis[1] + 5], 6.4)], cel(PANTS), PANTS.ink));
    part(img, (L) => {
      const a = onTorso(lower, pelvis, -8.4, 4.4), b = onTorso(lower, pelvis, 8.6, 4.4);
      blob(L, [cap(a, b, 3, 3.2)], cel(SASH), SASH.ink);
      const bk = onTorso(lower, pelvis, 4, 4.4);
      blob(L, [ell(bk, 3.4, 3.4)], cel(GOLD), GOLD.ink);
    });
    // red bow tie at the throat
    part(img, (L) => {
      const b = onTorso(J, neck, 3.2, -1.2);
      blob(L, [ell([b[0] - 2.2, b[1]], 2.6, 2), ell([b[0] + 2.2, b[1]], 2.6, 2)], cel(BOW), BOW.ink);
      blob(L, [ell(b, 1.2, 1.2)], cel(BOW), BOW.ink);
    });
    // guitar strap across the chest when the guitar is on his back
    if (!holding) {
      part(img, (L) => {
        const a = onTorso(J, neck, -6, -3), b = onTorso(J, waist, 6.4, 3);
        line(L, a[0], a[1], b[0], b[1], SASH.m);
        line(L, a[0] + 1, a[1], b[0] + 1, b[1], SASH.l);
      });
    }
  };

  const skull = () => drawSkull(img, head, p.face, { bone: BONE, glow: GLOW });

  const hat = () => {
    const [hx, hy] = head;
    part(img, (L) => {
      // brim tilted a little forward, sitting on the brow so the eyes stay clear, then the crown with a gold band
      blob(L, [ell([hx + 0.4, hy - 9.4], 14.6, 3.2, -0.1)], cel(HAT, { noHi: true }), HAT.ink);
      paintOver(L, [[hx - 13, hy - 9], [hx + 14, hy - 11.2], [hx + 14, hy - 10.2], [hx - 13, hy - 8]], HAT.l);
      blob(L, [ell([hx - 0.4, hy - 13.6], 7.4, 5.6)], cel(HAT, { noHi: true }), HAT.ink);
      paintOver(L, [[hx - 8, hy - 14], [hx + 8, hy - 14.6], [hx + 8, hy - 11.4], [hx - 8, hy - 10.8]], GOLD.m);
      for (let i = -6; i <= 6; i += 2) L.set(Math.round(hx + i), Math.round(hy - 12.4), GOLD.l);
      blob(L, [ell([hx + 4.4, hy - 12.6], 2.1, 2.1)], cel(BOW), BOW.ink);
      for (let i = -12; i <= 14; i += 2) L.set(Math.round(hx + 0.4 + i), Math.round(hy - 7 - (i + 12) * 0.06), GOLD.m);
    });
  };

  const backOver = J.armB.hx > pelvis[0] + 3;
  if (!backOver) arm(J.shB, J.armB, true);
  leg(J.hipB, J.legB, true, p.ftB);
  torso();
  leg(J.hipF, J.legF, false, p.ftF);
  skull();
  hat();
  if (holding) {
    const B = [J.armB.hx, J.armB.hy], F = [J.armF.hx, J.armF.hy];
    const dx = F[0] - B[0], dy = F[1] - B[1], d = Math.hypot(dx, dy) || 1;
    const u = [dx / d, dy / d];
    if (p.guitar === 'club') {
      // gripped by the neck, the body swings out in front like a mallet
      const c = [F[0] + u[0] * 2, F[1] + u[1] * 2];
      guitar(img, c[0], c[1], (Math.atan2(-u[1], -u[0]) * 180) / Math.PI, 1);
    } else {
      guitar(img, B[0], B[1], p.gAng ?? (Math.atan2(dy, dx) * 180) / Math.PI, 1);
    }
  }
  if (backOver) arm(J.shB, J.armB, true);
  arm(J.shF, J.armF, false);
  return img;
}

// ------------------------------------------------------------------ poses
const st = stock2(S, { lieLift: 10, stance: 14, crouch: 4, stride: 12, lean: 6, blink: true, guard: [[24, -55], [14, -60]] });
const P = st.P;

export const portrait = { box: [58, 20], pose: (face) => P({ face, handF: [16, -40], handB: [8, -42] }) };

export function animations() {
  const idle = st.idle, walk = st.walk, jump = st.jump;
  const light = [
    P({ root: [-2, 4], lean: 3, twist: -2, handF: [15, -55], handB: [18, -60] }),
    P({ root: [3, 4], lean: 9, twist: 3, handF: [34, -60], handB: [16, -62] }),
    P({ root: [7, 4], lean: 13, twist: 6, handF: [54, -63], handB: [14, -60], face: 'yell', footF: [18, 0] }),
    P({ root: [8, 4], lean: 14, twist: 7, handF: [55, -63], handB: [13, -60], face: 'yell', footF: [18, 0] }),
    P({ root: [3, 4], lean: 8, twist: 2, handF: [30, -58], handB: [15, -60] }),
  ];
  // guitarrazo: unsling it over the head, then swing it down through the opponent
  const heavy = [
    P({ root: [-4, 7], lean: -2, handF: [10, -64], handB: [2, -60], guitar: 'club', gAng: -60, footF: [16, 0], footB: [-18, 0] }),
    P({ root: [-6, 4], lean: -12, bend: -4, handF: [-2, -104], handB: [-6, -96], guitar: 'club', gAng: -112, face: 'yell', footF: [15, 0], footB: [-19, 0] }),
    P({ root: [8, 8], lean: 22, bend: 3, twist: 5, handF: [58, -48], handB: [38, -66], guitar: 'club', face: 'yell', footF: [24, 0], footB: [-17, 0] }),
    P({ root: [9, 8], lean: 24, bend: 3, twist: 5, handF: [60, -42], handB: [40, -62], guitar: 'club', face: 'yell', footF: [25, 0], footB: [-17, 0] }),
    P({ root: [4, 6], lean: 14, handF: [48, -44], handB: [30, -58], guitar: 'club', footF: [21, 0], footB: [-16, 0] }),
    P({ root: [1, 5], lean: 8, handF: [26, -54], handB: [16, -60] }),
  ];
  // jump kick
  const air = [
    P({ root: [0, -12], lean: 6, handF: [22, -62], handB: [12, -64], footF: [14, -22], footB: [-8, -18], face: 'yell' }),
    P({ root: [2, -8], lean: -14, bend: -4, handF: [6, -68], handB: [-8, -62], footF: [42, -30], footB: [-10, -22], face: 'yell', ftF: -30 }),
    P({ root: [3, -8], lean: -16, bend: -4, handF: [5, -68], handB: [-9, -62], footF: [44, -30], footB: [-11, -22], face: 'yell', ftF: -30 }),
  ];
  // Serenata: unsling the guitar and strum a skull out of it
  const special = [
    P({ root: [-4, 6], lean: 0, handF: [14, -58], handB: [-2, -56], guitar: 'strum', gAng: -20, footF: [16, 0], footB: [-18, 0] }),
    P({ root: [-1, 5], lean: 4, handF: [34, -54], handB: [10, -52], guitar: 'strum', face: 'smug', footF: [17, 0], footB: [-18, 0] }),
    P({ root: [4, 5], lean: 8, handF: [44, -56], handB: [14, -48], guitar: 'strum', face: 'yell', footF: [19, 0], footB: [-17, 0] }),
    P({ root: [5, 5], lean: 9, handF: [46, -58], handB: [14, -46], guitar: 'strum', face: 'yell', footF: [19, 0], footB: [-17, 0] }),
    P({ root: [1, 5], lean: 5, handF: [22, -56], handB: [10, -52], guitar: 'strum', footF: [17, 0], footB: [-17, 0] }),
  ];
  const sup = [
    P({ root: [-1, 8], lean: 4, handF: [12, -48], handB: [4, -46], guitar: 'club', gAng: -10, face: 'yell', footF: [18, 0], footB: [-19, 0] }),
    P({ root: [0, 4], lean: 0, handF: [18, -76], handB: [6, -66], guitar: 'club', gAng: -50, face: 'yell', footF: [17, 0], footB: [-18, 0] }),
    P({ root: [0, 0], lean: -6, bend: -4, handF: [10, -104], handB: [-2, -96], guitar: 'club', gAng: -86, face: 'yell', footF: [16, 0], footB: [-18, 0] }),
    P({ root: [0, 0], lean: -12, bend: -6, handF: [6, -108], handB: [-6, -98], guitar: 'club', gAng: -96, face: 'yell', footF: [16, 0], footB: [-19, 0] }),
    P({ root: [10, 9], lean: 24, bend: 4, twist: 6, handF: [64, -40], handB: [42, -58], guitar: 'club', face: 'yell', footF: [27, 0], footB: [-17, 0] }),
    P({ root: [11, 9], lean: 26, bend: 4, twist: 6, handF: [66, -36], handB: [44, -54], guitar: 'club', face: 'yell', footF: [28, 0], footB: [-17, 0] }),
    P({ root: [5, 7], lean: 14, handF: [46, -44], handB: [30, -56], guitar: 'club', footF: [22, 0], footB: [-16, 0] }),
  ];
  const hit = [
    P({ root: [-4, 4], lean: -10, bend: -4, head: [-3, 0], handF: [6, -56], handB: [-4, -60], footF: [15, 0], footB: [-19, 0], face: 'hurt' }),
    P({ root: [-8, 5], lean: -18, bend: -8, head: [-5, 1], handF: [-6, -52], handB: [-16, -56], footF: [14, 0], footB: [-21, 0], face: 'hurt' }),
    P({ root: [-4, 5], lean: -8, bend: -3, head: [-2, 1], handF: [8, -54], handB: [-2, -58], face: 'hurt' }),
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
    ko: { fps: 8, loop: false, frames: draw(st.ko) },
    getup: { fps: 8, loop: false, frames: draw(st.getup) },
    dodge: { fps: 10, loop: false, frames: draw(st.dodge) },
    block: { fps: 4, loop: true, frames: draw(st.guard) },
    win: { fps: 6, loop: true, frames: draw(st.win) },
  };
}
