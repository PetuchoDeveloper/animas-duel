// Ernesto "El Catrín Cantor": a tall skeleton mariachi in an ivory charro suit and a wide sombrero,
// armed with a guitar that doubles as a club. The sombrero flies off when he goes down.
import { C, ellipse, capsule, poly, line, stamp, part } from '../lib/raster.mjs';
import { newFrame, pose, deg, ANCHOR_X, ANCHOR_Y } from '../lib/rig.mjs';
import { solve, limb, lit, stock } from '../lib/humanoid.mjs';

const SUIT = { d: '#5e4f3e', s: '#9a8a70', m: '#d6c6a0', l: '#ede0c0', h: '#fff8e2', ink: '#33281c' };
const BONE = { d: '#6e6c82', s: '#aaa8bc', m: '#dcd8cc', l: '#f2eee0', h: '#ffffff', ink: '#2e2640' };
const GOLD = { d: '#5e3f06', s: '#a8760e', m: '#e2b028', l: '#ffd856', h: '#fff0a0', ink: '#42290a' };
const CLOAK = { d: '#120c20', s: '#221438', m: '#38245c', l: '#55398a', h: '#7c5cb8', ink: '#08040f' };
const BOOT = { d: '#160c06', s: '#2e1a0c', m: '#4e2e16', l: '#744626', h: '#a06a3c', ink: '#0c0603' };
const WOOD = { d: '#44200c', s: '#7a3818', m: '#b45c26', l: '#de8a3e', h: '#ffbe6c', ink: '#2c1206' };
const TIE = { d: '#4a0c1a', s: '#8a1c2e', m: '#c4303c', l: '#ee5a52', h: '#ff9a84', ink: '#2e0710' };
const HAIR = { d: '#08060e', s: '#14101e', m: '#241c34', l: '#3a2e54', h: '#54457a', ink: '#05030a' };

const PAL = { k: C('#120a1c'), p: C('#c46bff'), P: C('#f0c8ff'), w: C('#f6f2e4'), g: C('#6e6c82'), r: C('#8a1c2e') };

export const meta = { id: 'ernesto', name: 'Ernesto' };

const S = { thigh: 16, shin: 16, torso: 21, neck: 1.5, headR: 10, upper: 12, fore: 12, hipH: 30, shoulderDrop: 3, shoulderDepth: 4.5, hipDepth: 3 };

// Eye sockets glow violet, looking right.
const SOCK = ['.kkkk.', 'kkkkkk', 'kkpppk', 'kkpPpk', 'kkkkkk', '.kkkk.'];
const SOCK_WIDE = ['.kkkkk.', 'kkkkkkk', 'kkkpppk', 'kkkpPpk', 'kkkkkkk', '.kkkkk.'];
const SOCK_X = ['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'];
const SOCK_HURT_L = ['kk...', '.kk..', '..kk.', '.kk..', 'kk...'];
const SOCK_HURT_R = ['...kk', '..kk.', '.kk..', '..kk.', '...kk'];
const SOCK_HAPPY = ['.kkkk.', 'kk..kk'];
const SOCK_SHUT = ['kkkkk'];
const NOSE = ['.k.', 'kkk'];

function guitar(L, g) {
  const a = deg(g.ang);
  const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
  const c = [ANCHOR_X + g.x, ANCHOR_Y + g.y];
  const at = (t, o = 0) => [c[0] + d[0] * t + n[0] * o, c[1] + d[1] * t + n[1] * o];
  const lo = at(-2.5), up = at(8.5), nk0 = at(12), nk1 = at(33), hs = at(36);
  // neck and headstock first, body over them
  capsule(L, nk0[0], nk0[1], nk1[0], nk1[1], 1.9, 1.7, lit(BOOT), BOOT.ink);
  capsule(L, nk1[0], nk1[1], hs[0], hs[1], 2.8, 2.4, lit(BOOT), BOOT.ink);
  capsule(L, lo[0], lo[1], up[0], up[1], 6, 4.8, lit(WOOD, { dither: true }), WOOD.ink);
  ellipse(L, lo[0], lo[1], 8.4, 8.4, lit(WOOD, { dither: true }), WOOD.ink);
  ellipse(L, up[0], up[1], 6.2, 6.2, lit(WOOD, { dither: true }), WOOD.ink);
  const sh = at(3);
  ellipse(L, sh[0], sh[1], 3.4, 3.4, () => C('#1c0a04'), WOOD.ink);
  ellipse(L, sh[0], sh[1], 4.8, 4.8, (i) => ((i.q > 0.5 && i.q < 0.9) ? C(GOLD.m) : null));
  const br = at(-6.5);
  line(L, br[0] - n[0] * 3.5, br[1] - n[1] * 3.5, br[0] + n[0] * 3.5, br[1] + n[1] * 3.5, C(BOOT.s));
  const s0 = at(3), s1 = at(34);
  line(L, s0[0], s0[1], s1[0], s1[1], C('#f2ecd8'));
  for (let t = 16; t < 32; t += 5) { const f = at(t); L.set(Math.round(f[0] + n[0]), Math.round(f[1] + n[1]), C(GOLD.l)); }
}

function sombrero(L, h, lying) {
  const [x, y] = h;
  if (lying) {
    ellipse(L, x, y, 17, 4.2, lit(SUIT), SUIT.ink);
    ellipse(L, x, y - 2, 6.5, 4.4, lit(SUIT), SUIT.ink);
    capsule(L, x - 6, y - 0.5, x + 6, y - 0.5, 1, 1, lit(GOLD), GOLD.ink);
    return;
  }
  ellipse(L, x, y, 21, 4.8, lit(SUIT, { dither: true }), SUIT.ink);
  ellipse(L, x, y - 5.2, 9, 7.2, lit(SUIT, { dither: true }), SUIT.ink);
  // gold hat band and trim along the brim
  for (let dx = -8; dx <= 8; dx++) {
    const by = y - 0.6 + 0.04 * dx * dx * 0.2;
    L.set(Math.round(x + dx), Math.round(by), C(GOLD.m), GOLD.ink);
    L.set(Math.round(x + dx), Math.round(by) - 1, C((dx & 1) ? GOLD.l : GOLD.s), GOLD.ink);
  }
  for (let dx = -19; dx <= 19; dx += 3) {
    const ey = y + 1.7 * Math.sqrt(Math.max(0, 1 - (dx / 21) ** 2)) * 1.9;
    L.set(Math.round(x + dx), Math.round(ey), C(GOLD.m));
  }
}

/** Gold charro stripe down the outside of a leg. */
function stripe(L, hip, j) {
  const seg = (a, b, off) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let t = 0.1; t < 1; t += 0.12) L.set(Math.round(a[0] + dx * t + nx * off), Math.round(a[1] + dy * t + ny * off), C(GOLD.m));
  };
  seg(hip, [j.ex, j.ey], -3.6);
  seg([j.ex, j.ey], [j.hx, j.hy], -3);
}

export function drawFrame(p) {
  const img = newFrame();
  const J = solve(S, p);
  const { pelvis, neck, head, up, side } = J;
  const flutter = p.cape ?? 0;

  // cloak behind everything
  part(img, (L) => {
    const a = J.shB, b = J.shF;
    const sway = flutter * 6;
    poly(L, [
      [a[0] - 2, a[1] - 3], [b[0] - 2, b[1] - 2],
      [pelvis[0] - 9 - sway, pelvis[1] + 6 + flutter * 2],
      [pelvis[0] - 16 - sway * 1.4, pelvis[1] + 20],
      [pelvis[0] - 6 - sway * 0.5, pelvis[1] + 22 + flutter * 2],
      [pelvis[0] - 1, pelvis[1] + 10],
    ], lit(CLOAK), CLOAK.ink, 3.4);
  });

  const hand = (a) => (L) => ellipse(L, a.hx, a.hy, 3.6, 3.4, lit(BONE), BONE.ink);
  const sleeve = (sh, a) => (L) => {
    limb(L, sh, a, SUIT, 4.2, 3.6, 3.2);
    capsule(L, a.ex * 0.35 + a.hx * 0.65, a.ey * 0.35 + a.hy * 0.65, a.hx, a.hy, 3.3, 3.3, lit(GOLD), GOLD.ink);
  };
  const boot = (f) => (L) => {
    ellipse(L, f.hx + 3, f.hy + 0.4, 7.2, 3.2, lit(BOOT), BOOT.ink);
    capsule(L, f.hx - 1, f.hy - 5, f.hx, f.hy, 3.6, 3.8, lit(BOOT), BOOT.ink);
  };

  // back arm and guitar neck/behind
  part(img, sleeve(J.shB, J.armB)); part(img, hand(J.armB));
  part(img, (L) => limb(L, J.hipB, J.legB, SUIT, 5, 4.2, 3.4)); part(img, boot(J.legB));

  // torso: jacket, sash, bow tie
  part(img, (L) => {
    capsule(L, pelvis[0], pelvis[1], J.chest[0], J.chest[1], 6.4, 7.8, lit(SUIT, { dither: true }), SUIT.ink);
    capsule(L, J.chest[0], J.chest[1], neck[0], neck[1], 7.8, 6, lit(SUIT, { dither: true }), SUIT.ink);
    // gold lapel line and buttons
    const o = 3.2;
    for (let t = 0.14; t < 0.96; t += 0.08) {
      const x = pelvis[0] + (neck[0] - pelvis[0]) * t + side[0] * o, y = pelvis[1] + (neck[1] - pelvis[1]) * t + side[1] * o;
      L.set(Math.round(x), Math.round(y), C(GOLD.m));
      if (((t * 100) | 0) % 16 < 8) L.set(Math.round(x + 1), Math.round(y), C(GOLD.s));
    }
    // gold epaulette and embroidered chest
    ellipse(L, J.shF[0], J.shF[1] + 0.5, 3.6, 3, lit(GOLD), GOLD.ink);
    for (let t = 0.2; t < 0.9; t += 0.14) {
      const x = pelvis[0] + (neck[0] - pelvis[0]) * t - side[0] * 1.5, y = pelvis[1] + (neck[1] - pelvis[1]) * t - side[1] * 1.5;
      L.set(Math.round(x), Math.round(y), C(GOLD.s)); L.set(Math.round(x) + 1, Math.round(y) + 1, C(GOLD.s));
    }
    // sash belt with buckle
    const b0 = [pelvis[0] - side[0] * 7, pelvis[1] - side[1] * 7], b1 = [pelvis[0] + side[0] * 7, pelvis[1] + side[1] * 7];
    capsule(L, b0[0], b0[1], b1[0], b1[1], 2.6, 2.6, lit(CLOAK), CLOAK.ink);
    ellipse(L, pelvis[0] + side[0] * 3.2, pelvis[1] + side[1] * 3.2, 2.8, 2.8, lit(GOLD), GOLD.ink);
    // bow tie
    const bt = [neck[0] + side[0] * 3 - up[0] * 1.5, neck[1] + side[1] * 3 - up[1] * 1.5];
    ellipse(L, bt[0] - 1.8, bt[1], 2.4, 2, lit(TIE), TIE.ink);
    ellipse(L, bt[0] + 1.8, bt[1], 2.4, 2, lit(TIE), TIE.ink);
  });

  // head: skull, hair, sockets, teeth, sombrero
  part(img, (L) => {
    ellipse(L, head[0], head[1], 9.6, 10.2, lit(BONE, { dither: true }), BONE.ink);
    // cheekbone
    ellipse(L, head[0] + 4, head[1] + 3.6, 3.2, 2, () => C(BONE.l));
    // hair slicked back under the brim
    poly(L, [[head[0] - 9, head[1] - 4], [head[0] - 3, head[1] - 10], [head[0] + 7, head[1] - 8], [head[0] + 2, head[1] - 4], [head[0] - 5, head[1] + 1], [head[0] - 9, head[1] + 3]], lit(HAIR), HAIR.ink, 2.4);
    // cheek, jaw and teeth
    const open = p.face === 'yell' || p.face === 'hurt' || p.face === 'ko';
    const jy = head[1] + (open ? 8.4 : 6.6);
    ellipse(L, head[0] + 2.5, jy, 5.6, 3.2, lit(BONE), BONE.ink);
    if (open) ellipse(L, head[0] + 3, jy - 2.4, 4.2, 1.8, () => C('#1a0814'));
    for (let tx = -2; tx <= 7; tx += 2) {
      L.set(Math.round(head[0] + tx), Math.round(jy - 1 + (open ? -2 : 0)), C(PAL.g));
      L.set(Math.round(head[0] + tx), Math.round(jy + (open ? -2 : 0)), C(PAL.g));
    }
    const eye = (rows, dx, dy, ax, ay) => stamp(L, rows, PAL, head[0] + dx, head[1] + dy, { ax, ay });
    const brow = (x0, y0, x1, y1) => line(L, head[0] + x0, head[1] + y0, head[0] + x1, head[1] + y1, C(BONE.d));
    switch (p.face) {
      case 'yell': eye(SOCK_WIDE, -4, 0, 3, 3); eye(SOCK_WIDE, 5, 0, 3, 3); brow(-8, -4, -1, -2); brow(2, -2, 9, -4); break;
      case 'hurt': eye(SOCK_HURT_L, -2, 0, 2, 2); eye(SOCK_HURT_R, 6, 0, 2, 2); break;
      case 'ko': eye(SOCK_X, -2, 0, 2, 2); eye(SOCK_X, 6, 0, 2, 2); break;
      case 'smug': eye(SOCK_HAPPY, -2, 0, 3, 1); eye(SOCK_HAPPY, 6, 0, 3, 1); break;
      case 'blink': eye(SOCK_SHUT, -3, 1, 2, 0); eye(SOCK_SHUT, 5, 1, 2, 0); break;
      default: eye(SOCK, -4, 0, 3, 3); eye(SOCK, 5, 0, 3, 3); brow(-8, -4, -1, -2); brow(2, -2, 9, -4);
    }
    stamp(L, NOSE, PAL, head[0] + 9, head[1] + 4, { ax: 1, ay: 1 });
    // shadow cast by the brim
    for (let dx = -9; dx <= 9; dx++) { L.set(Math.round(head[0] + dx), Math.round(head[1] - 6), C(BONE.s)); if (Math.abs(dx) < 8) L.set(Math.round(head[0] + dx), Math.round(head[1] - 5), C(BONE.m)); }
  });
  if (!p.hatOff) part(img, (L) => sombrero(L, [head[0] - 1 + (p.hat?.[0] ?? 0), head[1] - 11 + (p.hat?.[1] ?? 0)], false));

  part(img, (L) => { limb(L, J.hipF, J.legF, SUIT, 5.4, 4.4, 3.6); stripe(L, J.hipF, J.legF); }); part(img, boot(J.legF));
  if (p.guitar) part(img, (L) => guitar(L, p.guitar));
  part(img, sleeve(J.shF, J.armF)); part(img, hand(J.armF));
  if (p.hatOff) part(img, (L) => sombrero(L, [ANCHOR_X + p.hatOff[0], ANCHOR_Y + p.hatOff[1]], true));
  return img;
}

// ------------------------------------------------------------------ poses
const st = stock(S, { stance: 9, stride: 13, blink: true });
const P = st.P;

/** Guitar held with its body at (x, y) pointing along `ang`; both hands are placed on it. */
function hold(x, y, ang, open = false) {
  const a = deg(ang), d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
  return {
    guitar: { x, y, ang },
    handF: [x + d[0] * 19 + n[0] * 1, y + d[1] * 19 + n[1] * 1],
    handB: [x - d[0] * 2 + n[0] * 4, y - d[1] * 2 + n[1] * 4],
  };
}
const chestY = -(S.hipH + S.torso * 0.5);

/** Bust shot for the select and dialogue screens: a 64x64 window onto the idle pose. */
export const portrait = { box: [34, 10], pose: (face) => pose(P({ face }), { guitar: null }) };

export function animations() {
  const idle = st.idle.map((q, i) => pose(q, { ...hold(5, chestY + 6 + [0, 0.6, 1.2, 0.5][i], -34), cape: 0.2 + 0.1 * i }));
  const walk = st.walk.map((q, i) => pose(q, { ...hold(5, chestY + 5 + Math.abs(Math.sin((i / 6) * Math.PI)) * 1.2, -32), cape: 0.5 + 0.3 * Math.sin((i / 6) * Math.PI * 2) }));
  const jump = st.jump.map((q, i) => pose(q, { ...hold(5, chestY + 6 - [2, 4, 0][i], [-48, -60, -20][i]), cape: 0.9 }));
  const land = st.land.map((q) => pose(q, { ...hold(4, chestY + 10, -20), cape: 0.1 }));

  const light = [
    P({ root: [-2, 2], lean: -3, ...hold(-2, chestY + 5, -22), cape: 0.3 }),
    P({ root: [5, 2], lean: 10, ...hold(16, chestY + 3, -4), footF: [13, 0], footB: [-10, 0], face: 'yell', cape: 0.5 }),
    P({ root: [6, 2], lean: 11, ...hold(18, chestY + 3, -4), footF: [14, 0], footB: [-10, 0], face: 'yell', cape: 0.5 }),
    P({ root: [1, 2], lean: 4, ...hold(7, chestY + 5, -26), cape: 0.3 }),
  ];
  const heavy = [
    P({ root: [-4, 3], lean: -8, ...hold(-8, chestY - 6, -118), footF: [10, 0], footB: [-11, 0], cape: 0.6 }),
    P({ root: [-6, 3], lean: -14, ...hold(-10, chestY - 12, -132), footF: [11, 0], footB: [-12, 0], cape: 0.9 }),
    P({ root: [8, 3], lean: 20, ...hold(14, chestY + 6, 16), face: 'yell', footF: [16, 0], footB: [-12, 0], cape: 1 }),
    P({ root: [9, 3], lean: 22, ...hold(16, chestY + 10, 34), face: 'yell', footF: [17, 0], footB: [-12, 0], cape: 1 }),
    P({ root: [4, 3], lean: 10, ...hold(10, chestY + 8, 20), footF: [13, 0], footB: [-10, 0], cape: 0.5 }),
  ];
  const air = [
    P({ root: [0, -9], lean: 4, ...hold(0, chestY - 6, -80), footF: [10, -12], footB: [-3, -15], cape: 1 }),
    P({ root: [4, -8], lean: 16, ...hold(12, chestY + 2, 40), footF: [14, -10], footB: [-2, -13], face: 'yell', cape: 1 }),
    P({ root: [4, -8], lean: 18, ...hold(14, chestY + 5, 56), footF: [15, -9], footB: [-1, -12], face: 'yell', cape: 1 }),
  ];
  // Serenata: strum up front, head thrown back to sing
  const special = [
    P({ root: [-2, 2], lean: -6, ...hold(-4, chestY + 4, -40), cape: 0.4 }),
    P({ root: [-3, 2], lean: -12, head: [-2, 0], ...hold(2, chestY + 2, -70), face: 'yell', cape: 0.8 }),
    P({ root: [1, 2], lean: -8, head: [-2, -1], ...hold(8, chestY + 1, -56), face: 'yell', handF: [18, chestY - 4], cape: 0.8 }),
    P({ root: [1, 2], lean: -8, head: [-2, -1], ...hold(8, chestY + 1, -56), face: 'yell', handF: [18, chestY + 4], cape: 0.8 }),
    P({ root: [0, 2], lean: 0, ...hold(5, chestY + 5, -38), cape: 0.4 }),
  ];
  const sup = [
    P({ root: [0, 6], lean: 4, ...hold(4, chestY + 14, -30), face: 'yell', cape: 0.3 }),
    P({ root: [0, 0], lean: -4, ...hold(4, chestY - 8, -70), face: 'yell', cape: 0.7 }),
    P({ root: [0, -1], lean: -8, head: [-2, -1], ...hold(2, chestY - 22, -96), face: 'yell', cape: 1 }),
    P({ root: [0, -1], lean: -10, head: [-3, -1], ...hold(0, chestY - 26, -104), face: 'yell', cape: 1 }),
    P({ root: [6, 3], lean: 18, ...hold(14, chestY - 4, -8), face: 'yell', footF: [14, 0], footB: [-12, 0], cape: 1 }),
    P({ root: [4, 3], lean: 10, ...hold(8, chestY + 6, -26), face: 'yell', cape: 0.6 }),
  ];

  const hit = st.hit.map((q, i) => pose(q, { ...hold(-3 - i * 2, chestY + 8, [-10, 10, -20][i]), cape: 0.8 }));
  const koq = st.ko.map((q, i) => pose(q, {
    hatOff: [[24, -48], [-34, -6], [-44, -2], [-44, -2], [-44, -2]][i].slice(0, 2),
    cape: 0.5,
    guitar: [
      { x: 18, y: -34, ang: -80 }, { x: 24, y: -14, ang: -30 }, { x: 30, y: -6, ang: -4 }, { x: 32, y: -5, ang: 0 }, { x: 32, y: -5, ang: 0 },
    ][i],
    handF: [[8, -50], [14, -34], [-26, -6], [-26, -6], [-26, -6]][i],
  }));
  koq[0].hatOff = [-8, -62];
  const getup = st.getup.map((q, i) => pose(q, { cape: 0.4, hatOff: i < 2 ? [-40, -2] : null, guitar: i < 2 ? { x: 26, y: -5, ang: 0 } : { x: 6, y: chestY + 14, ang: -30 }, ...(i === 2 ? hold(6, chestY + 12, -30) : {}) }));
  const dodge = st.dodge.map((q) => pose(q, { ...hold(6, chestY + 14, -20), cape: 1 }));
  const block = st.guard.map((q, i) => pose(q, { ...hold(8, chestY + 6, -88 - i * 2), cape: 0.2, handF: [10, chestY - 10], handB: [9, chestY + 2] }));
  const win = st.win.map((q, i) => pose(q, { ...hold(0, [-62, -76, -72, -68][i], [-50, -88, -80, -70][i]), cape: 0.5 + 0.2 * i }));

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
    super: { fps: 8, loop: false, strike: [3, 4], frames: draw(sup) },
    hit: { fps: 10, loop: false, frames: draw(hit) },
    ko: { fps: 8, loop: false, frames: draw(koq) },
    getup: { fps: 8, loop: false, frames: draw(getup) },
    dodge: { fps: 10, loop: false, frames: draw(dodge) },
    block: { fps: 4, loop: true, frames: draw(block) },
    win: { fps: 6, loop: true, frames: draw(win) },
  };
}
