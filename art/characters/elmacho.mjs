// El Macho "El Coloso Calavera": a barrel-chested luchador in a red and black mask, red cape,
// navy singlet and a gold M medallion. Wide, slow, heavy: every limb is thick.
import { C, ellipse, capsule, poly, line, stamp, part } from '../lib/raster.mjs';
import { newFrame, pose, deg, ANCHOR_X, ANCHOR_Y } from '../lib/rig.mjs';
import { solve, limb, lit, stock } from '../lib/humanoid.mjs';

const SKIN = { d: '#6a3418', s: '#a65a2c', m: '#d68a4c', l: '#f0b074', h: '#ffd9a4', ink: '#3a1a0a' };
const MASK = { d: '#4a0a14', s: '#8a1424', m: '#c8222e', l: '#ee4a46', h: '#ff8a76', ink: '#2a0408' };
const BLACK = { d: '#050308', s: '#0e0a14', m: '#1c1426', l: '#30243e', h: '#4a3a5c', ink: '#020104' };
const SING = { d: '#0c1430', s: '#18285a', m: '#28418e', l: '#3f62c0', h: '#7a9ae4', ink: '#060a1c' };
const CAPE = { d: '#4a0a14', s: '#8a1424', m: '#c4202c', l: '#e84a44', h: '#ff8472', ink: '#2a0408' };
const GOLD = { d: '#5e3f06', s: '#a8760e', m: '#e2b028', l: '#ffd856', h: '#fff0a0', ink: '#42290a' };
const BOOT = { d: '#1a0a06', s: '#3a1a0e', m: '#5e3018', l: '#85482a', h: '#a86840', ink: '#0c0503' };
const HAIR = { d: '#050308', s: '#100c18', m: '#1e1828', l: '#30283c', h: '#483c58', ink: '#020104' };

const PAL = { k: C('#0c0610'), w: C('#f6f0e0'), y: C('#ffd23a'), b: C('#2a1008'), h: C('#ffffff'), r: C('#8a1424'), t: C('#fff4d6') };

export const meta = { id: 'elmacho', name: 'El Macho' };

const S = { thigh: 14.5, shin: 14.5, torso: 27, neck: 0, headR: 10.5, upper: 13, fore: 12, hipH: 28, shoulderDrop: 4, shoulderDepth: 9, hipDepth: 5 };

const EYE = ['.kkkkk.', 'kwwwwwk', 'kwwbbhk', 'kwwbbbk', '.kwwwk.'];
const EYE_WIDE = ['.kkkkk.', 'kwwwwwk', 'kwwbbhk', 'kwwbbbk', 'kwwbbbk', '.kwwwk.'];
const EYE_SQ_L = ['kk...', '.kk..', '..kk.', '.kk..', 'kk...'];
const EYE_SQ_R = ['...kk', '..kk.', '.kk..', '..kk.', '...kk'];
const EYE_X = ['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'];
const EYE_HAPPY = ['.kkkk.', 'kk..kk'];
const EYE_SHUT = ['kkkkk'];

const shadeBelly = (i) => (i.nx * -0.3 + i.ny * -0.6 > 0.35 ? C(SKIN.l) : null);

function drawFrame(p) {
  const img = newFrame();
  const J = solve(S, p);
  const { pelvis, neck, head, up, side } = J;
  const fl = p.cape ?? 0;

  // cape, billowing behind
  part(img, (L) => {
    const a = J.shB, b = J.shF;
    const w = fl * 7;
    poly(L, [
      [a[0] - 2, a[1] - 6], [a[0] - 9 - w * 0.5, a[1] + 8],
      [a[0] - 13 - w * 1.3, pelvis[1] + 16], [a[0] - 17 - w * 1.8, pelvis[1] + 25 + fl * 2],
      [pelvis[0] - 2, pelvis[1] + 26], [pelvis[0] + 2, pelvis[1] + 6], [b[0] - 3, b[1] - 5],
    ], lit(CAPE, { dither: true }), CAPE.ink, 3.6);
  });

  const fist = (a, big = 1) => (L) => {
    ellipse(L, a.hx, a.hy, 6 * big, 5.6 * big, lit(SKIN), SKIN.ink);
    for (const k of [-2.4, 0, 2.4]) L.set(Math.round(a.hx + 2 * big), Math.round(a.hy + k), C(SKIN.s));
  };
  const boot = (f) => (L) => {
    ellipse(L, f.hx + 3, f.hy + 0.2, 8.4, 3.8, lit(BOOT), BOOT.ink);
    capsule(L, f.hx - 1, f.hy - 7, f.hx, f.hy, 4.8, 5, lit(BOOT), BOOT.ink);
    line(L, f.hx - 4, f.hy - 5, f.hx + 3, f.hy - 5, C(GOLD.m));
  };
  const arm = (sh, a) => (L) => limb(L, sh, a, SKIN, 6.4, 5.6, 5);
  const leg = (hip, l, back) => (L) => {
    capsule(L, hip[0], hip[1], l.ex, l.ey, back ? 7 : 7.6, 6.2, lit(SING), SING.ink);
    capsule(L, l.ex, l.ey, l.hx, l.hy, 6.2, 5.6, lit(SING), SING.ink);
    // gold trim at the cuff
    line(L, l.hx - 5, l.hy - 8, l.hx + 3, l.hy - 8, C(GOLD.m));
  };

  part(img, arm(J.shB, J.armB)); part(img, fist(J.armB));
  part(img, leg(J.hipB, J.legB, true)); part(img, boot(J.legB));

  // torso: barrel chest and belly, navy tights up to a gold belt, singlet straps and the M medallion
  part(img, (L) => {
    capsule(L, pelvis[0], pelvis[1] - 2, J.chest[0], J.chest[1], 12.5, 14.5, lit(SKIN, { dither: true }), SKIN.ink);
    capsule(L, J.chest[0], J.chest[1], neck[0], neck[1], 14.5, 10, lit(SKIN, { dither: true }), SKIN.ink);
    // belly highlight
    ellipse(L, pelvis[0] + side[0] * 4 + up[0] * 8, pelvis[1] + side[1] * 4 + up[1] * 8, 5, 6, (i) => shadeBelly(i), SKIN.ink);
    // chest hair
    for (const [dx, dy] of [[2, 1], [4, 2], [0, 4], [3, 5], [5, 3], [1, 7], [-2, 3], [6, 6], [-1, 9], [4, 9]]) {
      const x = J.chest[0] + side[0] * dx + up[0] * dy, y = J.chest[1] + side[1] * dx + up[1] * dy;
      L.set(Math.round(x), Math.round(y), C(SKIN.d));
    }
    // tights over the hips
    ellipse(L, pelvis[0], pelvis[1] + 2, 13.4, 9.6, lit(SING, { dither: true }), SING.ink);
    // gold belt and buckle
    const b0 = [pelvis[0] - side[0] * 12.5, pelvis[1] - side[1] * 12.5 - 5], b1 = [pelvis[0] + side[0] * 12.5, pelvis[1] + side[1] * 12.5 - 5];
    capsule(L, b0[0], b0[1], b1[0], b1[1], 2.8, 2.8, lit(GOLD), GOLD.ink);
    ellipse(L, pelvis[0] + side[0] * 4.5, pelvis[1] - 5, 4, 3.6, lit(GOLD), GOLD.ink);
    // singlet straps up to the shoulders
    const belt = [pelvis[0] + side[0] * 7, pelvis[1] - 6];
    capsule(L, belt[0], belt[1], J.shF[0] - 1, J.shF[1] + 2, 2.6, 3.2, lit(SING), SING.ink);
    capsule(L, pelvis[0] - side[0] * 5, pelvis[1] - 6, J.shB[0] + 1, J.shB[1] + 2, 2.4, 3, lit(SING), SING.ink);
    // medallion on a chain
    const md = [J.chest[0] + side[0] * 5 + up[0] * 2, J.chest[1] + side[1] * 5 + up[1] * 2];
    line(L, neck[0] + side[0] * 4 - up[0] * 2, neck[1] + side[1] * 4 - up[1] * 2, md[0], md[1], C(GOLD.l));
    ellipse(L, md[0], md[1] + 1, 3.6, 3.6, lit(GOLD), GOLD.ink);
    stamp(L, ['k.k', 'kkk', 'k.k'], PAL, md[0] + 1, md[1] + 2, { ax: 1, ay: 1 });
  });

  // head: mask, hair, eyes, moustache, jaw
  part(img, (L) => {
    // flowing hair behind the neck
    poly(L, [[head[0] - 6, head[1] - 7], [head[0] - 14, head[1] - 1 + fl * 2], [head[0] - 16 - fl * 3, head[1] + 12], [head[0] - 8, head[1] + 9], [head[0] - 3, head[1] + 3]], lit(HAIR), HAIR.ink, 3);
    ellipse(L, head[0], head[1], 11.2, 11, lit(MASK, { dither: true }), MASK.ink);
    // black mask pattern: eye surrounds and a forehead flame
    const eyeBlack = (cx, cy, rx, ry) => ellipse(L, head[0] + cx, head[1] + cy, rx, ry, lit(BLACK), BLACK.ink);
    eyeBlack(-3.4, -1.5, 4.6, 4.2); eyeBlack(5.4, -1.5, 4.6, 4.2);
    poly(L, [[head[0] + 0.5, head[1] - 11], [head[0] + 3, head[1] - 4], [head[0] - 2, head[1] - 4]], lit(BLACK), BLACK.ink, 2);
    // nose, big and tan, pokes out of the mask
    ellipse(L, head[0] + 10.5, head[1] + 2.6, 4.2, 3.8, lit(SKIN), SKIN.ink);
    // moustache and jaw
    const open = p.face === 'yell' || p.face === 'hurt' || p.face === 'ko';
    ellipse(L, head[0] + 3.5, head[1] + (open ? 9.6 : 8), 7, open ? 3.8 : 3, lit(SKIN), SKIN.ink);
    if (open) ellipse(L, head[0] + 3.5, head[1] + 7, 5.6, 2.6, () => C('#2a0610'));
    if (open) { L.set(Math.round(head[0] + 1), Math.round(head[1] + 6), C(PAL.t)); L.set(Math.round(head[0] + 6), Math.round(head[1] + 6), C(PAL.t)); }
    poly(L, [[head[0] + 3, head[1] + 4.6], [head[0] + 13, head[1] + 4.8], [head[0] + 15, head[1] + 7.5], [head[0] + 8, head[1] + 6], [head[0] + 2, head[1] + 7.5]], lit(BLACK), BLACK.ink, 2);
    const eye = (rows, dx, dy, ax, ay) => stamp(L, rows, PAL, head[0] + dx, head[1] + dy, { ax, ay });
    switch (p.face) {
      case 'yell': eye(EYE_WIDE, -3, -2, 3, 3); eye(EYE_WIDE, 6, -2, 3, 3); break;
      case 'hurt': eye(EYE_SQ_L, -2, -1, 2, 2); eye(EYE_SQ_R, 7, -1, 2, 2); break;
      case 'ko': eye(EYE_X, -2, -1, 2, 2); eye(EYE_X, 7, -1, 2, 2); break;
      case 'smug': eye(EYE_HAPPY, -2, -1, 3, 1); eye(EYE_HAPPY, 7, -1, 3, 1); break;
      case 'blink': eye(EYE_SHUT, -3, -1, 2, 0); eye(EYE_SHUT, 6, -1, 2, 0); break;
      default: eye(EYE, -3, -2, 3, 2); eye(EYE, 6, -2, 3, 2);
    }
    // heavy angry brows over the eyes
    if (!['hurt', 'ko', 'smug'].includes(p.face)) {
      for (const d of [0, 1]) { line(L, head[0] - 8, head[1] - 6 + d, head[0] + 0, head[1] - 3 + d, C(BLACK.m)); line(L, head[0] + 3, head[1] - 3 + d, head[0] + 11, head[1] - 6 + d, C(BLACK.m)); }
    }
  });

  part(img, leg(J.hipF, J.legF, false)); part(img, boot(J.legF));
  part(img, arm(J.shF, J.armF)); part(img, fist(J.armF, p.fist ?? 1));
  return img;
}

// ------------------------------------------------------------------ poses
const st = stock(S, { stance: 12, stride: 9, blink: true, guard: [[19, -(S.hipH + S.torso * 0.62)], [14, -(S.hipH + S.torso * 0.5) + 2]] });
const P = st.P;
const chest = -(S.hipH + S.torso * 0.62), sh = -(S.hipH + S.torso - 5);

export function animations() {
  const idle = st.idle.map((q, i) => pose(q, { cape: 0.2 + 0.15 * i }));
  const walk = st.walk.map((q, i) => pose(q, { cape: 0.5 + 0.3 * Math.sin((i / 6) * Math.PI * 2) }));
  const jump = st.jump.map((q) => pose(q, { cape: 1 }));

  const light = [
    P({ root: [-2, 2], lean: -4, handF: [4, chest + 4], handB: [14, chest + 6], footF: [13, 0], footB: [-12, 0], cape: 0.3 }),
    P({ root: [5, 2], lean: 11, handF: [34, sh + 1], handB: [8, chest + 6], fist: 1.15, face: 'yell', footF: [16, 0], footB: [-13, 0], cape: 0.6 }),
    P({ root: [6, 2], lean: 12, handF: [36, sh + 1], handB: [8, chest + 6], fist: 1.15, face: 'yell', footF: [17, 0], footB: [-13, 0], cape: 0.6 }),
    P({ root: [1, 2], lean: 4, handF: [24, chest], handB: [12, chest + 5], cape: 0.3 }),
  ];
  const heavy = [
    P({ root: [-5, 3], lean: -10, handF: [-8, chest + 6], handB: [6, chest + 10], footF: [13, 0], footB: [-14, 0], cape: 0.6 }),
    P({ root: [-8, 4], lean: -18, handF: [-14, chest - 4], handB: [2, chest + 6], footF: [14, 0], footB: [-15, 0], cape: 1 }),
    P({ root: [10, 3], lean: 24, handF: [38, chest - 8], handB: [-2, chest + 12], fist: 1.35, face: 'yell', footF: [20, 0], footB: [-15, 0], cape: 1 }),
    P({ root: [11, 3], lean: 25, handF: [40, chest - 9], handB: [-3, chest + 12], fist: 1.35, face: 'yell', footF: [21, 0], footB: [-15, 0], cape: 1 }),
    P({ root: [5, 3], lean: 12, handF: [28, chest - 4], handB: [6, chest + 8], footF: [16, 0], footB: [-12, 0], cape: 0.6 }),
  ];
  // flying elbow drop
  const air = [
    P({ root: [0, -9], lean: 4, handF: [16, sh - 12], handB: [4, sh - 14], footF: [12, -12], footB: [-4, -15], face: 'yell', cape: 1 }),
    P({ root: [5, -7], lean: 34, handF: [28, chest + 2], handB: [20, chest + 6], footF: [4, -16], footB: [-8, -14], face: 'yell', fist: 1.25, cape: 1 }),
    P({ root: [6, -6], lean: 38, handF: [30, chest + 6], handB: [22, chest + 10], footF: [3, -15], footB: [-9, -13], face: 'yell', fist: 1.25, cape: 1 }),
  ];
  // Lariat volcanico: spinning arm out wide
  const special = [
    P({ root: [-4, 4], lean: -8, handF: [-8, chest + 4], handB: [10, chest + 8], footF: [14, 0], footB: [-15, 0], cape: 0.6 }),
    P({ root: [-2, 3], lean: 6, handF: [-6, chest - 2], handB: [24, chest - 2], footF: [14, 0], footB: [-15, 0], face: 'yell', cape: 0.9 }),
    P({ root: [8, 3], lean: 18, handF: [-22, chest - 4], handB: [38, chest - 6], fist: 1.3, face: 'yell', footF: [20, 0], footB: [-10, 0], cape: 1 }),
    P({ root: [10, 3], lean: 20, handF: [34, chest - 6], handB: [-24, chest - 4], fist: 1.3, face: 'yell', footF: [22, 0], footB: [-10, 0], cape: 1 }),
    P({ root: [4, 3], lean: 8, handF: [22, chest], handB: [10, chest + 6], footF: [15, 0], footB: [-12, 0], cape: 0.5 }),
  ];
  const sup = [
    P({ root: [0, 8], lean: 6, handF: [14, -(S.hipH * 0.7)], handB: [6, -(S.hipH * 0.7)], footF: [16, 0], footB: [-16, 0], face: 'yell', cape: 0.3 }),
    P({ root: [0, 2], lean: 0, handF: [12, sh - 10], handB: [-4, sh - 10], footF: [14, 0], footB: [-14, 0], face: 'yell', cape: 0.7 }),
    P({ root: [0, -2], lean: -4, handF: [14, sh - 30], handB: [-10, sh - 30], footF: [14, 0], footB: [-14, 0], face: 'yell', cape: 1 }),
    P({ root: [0, -2], lean: -6, handF: [16, sh - 34], handB: [-12, sh - 34], footF: [14, 0], footB: [-14, 0], face: 'yell', cape: 1 }),
    P({ root: [8, 6], lean: 28, handF: [30, chest + 10], handB: [24, chest + 14], fist: 1.4, face: 'yell', footF: [20, 0], footB: [-14, 0], cape: 1 }),
    P({ root: [8, 7], lean: 30, handF: [32, chest + 20], handB: [26, chest + 22], fist: 1.4, face: 'yell', footF: [22, 0], footB: [-14, 0], cape: 0.8 }),
  ];
  const hit = st.hit.map((q) => pose(q, { cape: 0.9 }));
  const ko = st.ko.map((q) => pose(q, { cape: 0.5 }));
  const win = st.win.map((q, i) => pose(q, { cape: 0.5 + 0.2 * i }));
  const draw = (a) => a.map(drawFrame);
  return {
    idle: { fps: 6, loop: true, frames: draw(idle) },
    walk: { fps: 9, loop: true, frames: draw(walk) },
    jump: { fps: 1, loop: false, frames: draw(jump) },
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
