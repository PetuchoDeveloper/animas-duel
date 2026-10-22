// Shared skeleton for the four two-armed, two-legged fighters, plus the stock poses
// (idle, walk, jump, hit, ko ...) every one of them needs. Characters add their own
// attacks and supply the drawing code.
import { ik2, ANCHOR_X, ANCHOR_Y, deg, pose } from './rig.mjs';
import { capsule, shade } from './raster.mjs';

/** Shade helper: paint callback that lights a primitive with `ramp`. */
export const lit = (ramp, opt) => (i) => shade(ramp, i.nx, i.ny, i.nz, i.x, i.y, opt);

/**
 * S: { thigh, shin, torso, neck, headR, upper, fore, hipH, shoulderDrop, shoulderDepth, hipDepth }
 * p: pose, all targets in local px relative to the feet anchor (+x forward, +y down).
 */
export function solve(S, p) {
  const pelvis = [ANCHOR_X + p.root[0], ANCHOR_Y - S.hipH + p.root[1]];
  const lean = deg(p.lean);
  const up = [Math.sin(lean), -Math.cos(lean)];
  const side = [Math.cos(lean), Math.sin(lean)];
  const neck = [pelvis[0] + up[0] * S.torso, pelvis[1] + up[1] * S.torso];
  const chest = [pelvis[0] + up[0] * S.torso * 0.6, pelvis[1] + up[1] * S.torso * 0.6];
  const lift = S.neck + S.headR * 0.8;
  const head = [neck[0] + up[0] * lift + p.head[0], neck[1] + up[1] * lift + p.head[1]];
  const sh = (d) => [
    neck[0] - up[0] * S.shoulderDrop + side[0] * S.shoulderDepth * d,
    neck[1] - up[1] * S.shoulderDrop + side[1] * S.shoulderDepth * d,
  ];
  const shF = sh(1), shB = sh(-1);
  const hipF = [pelvis[0] + S.hipDepth, pelvis[1]], hipB = [pelvis[0] - S.hipDepth, pelvis[1]];
  const tgt = (t) => [ANCHOR_X + t[0], ANCHOR_Y + t[1]];
  const hF = tgt(p.handF), hB = tgt(p.handB);
  const armF = ik2(shF[0], shF[1], hF[0], hF[1], S.upper, S.fore, p.bendF ?? (hF[0] >= shF[0] - 2 ? 1 : -1));
  const armB = ik2(shB[0], shB[1], hB[0], hB[1], S.upper, S.fore, p.bendB ?? (hB[0] >= shB[0] - 2 ? 1 : -1));
  const fF = tgt(p.footF), fB = tgt(p.footB);
  const legF = ik2(hipF[0], hipF[1], fF[0], fF[1], S.thigh, S.shin, p.kneeF ?? -1);
  const legB = ik2(hipB[0], hipB[1], fB[0], fB[1], S.thigh, S.shin, p.kneeB ?? -1);
  return { pelvis, chest, neck, head, up, side, shF, shB, armF, armB, hipF, hipB, legF, legB, lean };
}

/** Two capsules sharing a joint: root -> mid (r0 -> r1) then mid -> end (r1 -> r2). */
export function limb(L, root, j, ramp, r0, r1, r2, paint = lit(ramp)) {
  capsule(L, root[0], root[1], j.ex, j.ey, r0, r1, paint, ramp.ink);
  capsule(L, j.ex, j.ey, j.hx, j.hy, r1, r2, paint, ramp.ink);
}

export const REST = {
  root: [0, 0],
  lean: 0,
  head: [0, 0],
  handF: [14, -40],
  handB: [8, -38],
  footF: [8, 0],
  footB: [-8, 0],
  face: 'neutral',
};

const P = (o) => pose(REST, o);

/**
 * Stock poses scaled by the skeleton. `o` tunes the personality:
 *   stance: half foot spacing, guard: [handF, handB] resting guard targets (local), crouch: how low the idle sits.
 */
export function stock(S, o = {}) {
  const stance = o.stance ?? 8;
  const gF = o.guard?.[0] ?? [S.upper + S.fore - 6, -(S.hipH + S.torso * 0.62)];
  const gB = o.guard?.[1] ?? [S.upper + S.fore - 12, -(S.hipH + S.torso * 0.5)];
  const sh = S.hipH + S.torso; // shoulder height above ground
  const base = (x = {}) => P({ handF: gF, handB: gB, footF: [stance, 0], footB: [-stance, 0], root: [0, 2], lean: 3, ...x });
  const at = (a, b) => [a[0] + b[0], a[1] + b[1]];

  const idle = [0, 1, 2, 3].map((i) => {
    const b = [0, 1.2, 1.6, 0.6][i];
    return base({ root: [0, 2 + b * 0.6], lean: 3 + [0, 0.6, 1, 0.4][i], handF: at(gF, [0, [0, 0.6, 1.2, 0.5][i]]), handB: at(gB, [0, [0, 0.8, 1.2, 0.4][i]]), head: [0, [0, 0.4, 0.7, 0.2][i]], face: i === 2 && o.blink ? 'blink' : 'neutral' });
  });

  const walk = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const stride = o.stride ?? 11;
    walk.push(base({
      root: [0, 2 + 1.4 * Math.abs(Math.sin(a)) - 1],
      lean: 6,
      footF: [stance + stride * Math.sin(a), -Math.max(0, Math.cos(a)) * 5],
      footB: [-stance + stride * Math.sin(a + Math.PI), -Math.max(0, Math.cos(a + Math.PI)) * 5],
      handF: at(gF, [-2 * Math.sin(a), 0]),
      handB: at(gB, [-2 * Math.sin(a + Math.PI), 0]),
    }));
  }

  const jump = [
    base({ root: [0, -7], lean: 6, footF: [10, -10], footB: [-4, -14], handF: [gF[0] + 4, gF[1] - 6], handB: [gB[0] + 2, gB[1] - 6] }),
    base({ root: [0, -3], lean: 4, footF: [12, -13], footB: [-2, -17], handF: [gF[0] + 5, gF[1] - 8], handB: [gB[0] + 2, gB[1] - 8] }),
    base({ root: [0, -5], lean: 0, footF: [8, -4], footB: [-6, -7], handF: [gF[0] + 2, gF[1] - 14], handB: [gB[0] - 2, gB[1] - 14] }),
  ];
  const land = [base({ root: [0, 7], lean: 10, footF: [stance + 6, 0], footB: [-stance - 6, 0], handF: [gF[0] + 2, gF[1] - 8], handB: [gB[0], gB[1] - 8] })];

  const hit = [
    base({ root: [-3, 2], lean: -10, head: [-3, 0], footF: [stance - 1, 0], footB: [-stance - 3, 0], handF: [gF[0] - 8, gF[1] - 2], handB: [gB[0] - 10, gB[1] + 2], face: 'hurt' }),
    base({ root: [-6, 3], lean: -17, head: [-5, 1], footF: [stance - 2, 0], footB: [-stance - 5, 0], handF: [gF[0] - 12, gF[1] + 2], handB: [gB[0] - 14, gB[1] + 5], face: 'hurt' }),
    base({ root: [-3, 3], lean: -8, head: [-2, 1], handF: [gF[0] - 4, gF[1]], handB: [gB[0] - 6, gB[1]], face: 'hurt' }),
  ];

  // lying on the back, head pointing away from the opponent. root.y is relative to the standing
  // pelvis, so a body on the floor sits S.hipH - 9 below it.
  const L = S.torso;
  const lie = S.hipH - 9;
  const ko = [
    P({ root: [-9, -12], lean: -38, head: [-2, 0], footF: [8, -14], footB: [2, -8], handF: [-6, -sh - 4], handB: [-12, -sh + 4], face: 'ko' }),
    P({ root: [-14, S.hipH * 0.35], lean: -68, footF: [10, -14], footB: [3, -10], handF: [-14, -sh + 10], handB: [-24, -sh + 16], face: 'ko' }),
    P({ root: [-14, lie], lean: -86, footF: [S.thigh + S.shin * 0.7, -4], footB: [S.thigh + S.shin * 0.45, -9], handF: [-L - 4, -4], handB: [-L, -8], face: 'ko' }),
    P({ root: [-14, lie], lean: -88, footF: [S.thigh + S.shin * 0.75, -3], footB: [S.thigh + S.shin * 0.5, -8], handF: [-L - 8, -5], handB: [-L - 2, -9], face: 'ko' }),
    P({ root: [-14, lie], lean: -88, footF: [S.thigh + S.shin * 0.75, -3], footB: [S.thigh + S.shin * 0.5, -8], handF: [-L - 8, -4], handB: [-L - 3, -8], face: 'ko' }),
  ];
  const getup = [
    P({ root: [-12, S.hipH - 16], lean: -64, footF: [S.thigh + 6, -6], footB: [S.thigh, -2], handF: [-8, -8], handB: [-18, -12], face: 'hurt' }),
    P({ root: [-6, 8], lean: -30, footF: [stance + 4, 0], footB: [-stance, 0], handF: [4, -14], handB: [-8, -14], face: 'hurt' }),
    base({ root: [-2, 5], lean: 0, handF: [gF[0] - 2, gF[1] - 6], handB: [gB[0] - 4, gB[1] - 6] }),
  ];
  const dodge = [
    base({ root: [4, 8], lean: 18, footF: [stance + 8, 0], footB: [-stance - 4, 0], handF: [gF[0], gF[1] - 14], handB: [gB[0] - 4, gB[1] - 14] }),
    base({ root: [14, 11], lean: 40, footF: [stance + 14, 0], footB: [-stance - 12, -2], handF: [gF[0] + 4, gF[1] - 20], handB: [gB[0], gB[1] - 22], face: 'neutral' }),
    base({ root: [6, 8], lean: 20, footF: [stance + 8, 0], footB: [-stance - 4, 0], handF: [gF[0], gF[1] - 14], handB: [gB[0] - 4, gB[1] - 14] }),
  ];
  const guard = [
    base({ root: [-1, 5], lean: 2, footF: [stance + 3, 0], footB: [-stance - 3, 0], handF: [S.upper * 0.7 + 4, -(sh - 3)], handB: [S.upper * 0.5 + 4, -(sh - 7)] }),
    base({ root: [-2, 5.5], lean: 1, footF: [stance + 3, 0], footB: [-stance - 3, 0], handF: [S.upper * 0.7 + 5, -(sh - 4)], handB: [S.upper * 0.5 + 5, -(sh - 8)] }),
  ];
  const win = [
    base({ root: [0, 6], lean: 4, handF: [gF[0], gF[1] - 14], handB: [gB[0] - 2, gB[1] - 14], face: 'smug' }),
    base({ root: [0, -9], lean: -2, footF: [6, -9], footB: [-6, -9], handF: [10, -(sh + S.upper + S.fore - 2)], handB: [-10, -(sh + S.upper + S.fore - 4)], face: 'smug' }),
    base({ root: [0, -3], lean: -3, handF: [11, -(sh + S.upper + S.fore - 4)], handB: [-11, -(sh + S.upper + S.fore - 6)], face: 'smug' }),
    base({ root: [0, 2], lean: -2, handF: [11, -(sh + S.upper + S.fore - 8)], handB: [-11, -(sh + S.upper + S.fore - 9)], face: 'smug' }),
  ];
  return { idle, walk, jump, land, hit, ko, getup, dodge, guard, win, P: base, gF, gB, stance, sh };
}
