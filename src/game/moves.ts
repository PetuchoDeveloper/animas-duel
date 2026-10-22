/**
 * Tick-based combat data in logical pixels. No rendering or roster dependencies.
 */

export type MoveId = 'light' | 'heavy' | 'air' | 'special' | 'super';
export type SpecialKind = 'leaf' | 'skull' | 'spirit' | 'headbutt' | 'lariat';

export interface Move {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  knockback: number;
  blockKnockback: number;
  hitstop: number;
  knockdown: boolean;
  meterGain: number;
  box: { x0: number; x1: number; y0: number; y1: number };
  dashSpeed?: number;
  projectile?: { speed: number; w: number; h: number; height: number; life: number };
}

export interface CombatProfile {
  power: number;
  speed: number;
  defense: number;
  powerMult: number;
  defenseMult: number;
  walkSpeed: number;
  jumpSpeed: number;
  airSpeed: number;
  dashMult: number;
  hurtbox: { w: number; h: number };
  pushboxHalfWidth: number;
  reach: number;
  special: SpecialKind;
}

function profile(power: number, speed: number, defense: number, w: number, h: number,
  pushboxHalfWidth: number, reach: number, special: SpecialKind): CombatProfile {
  return {
    power, speed, defense,
    powerMult: 1 + (power - 3) * 0.06,
    defenseMult: 1 - (defense - 3) * 0.06,
    walkSpeed: 0.9 + speed * 0.2,
    jumpSpeed: -6 * (0.96 + speed * 0.02),
    airSpeed: 1.2 + speed * 0.16,
    dashMult: 0.88 + speed * 0.04,
    hurtbox: { w, h }, pushboxHalfWidth, reach, special,
  };
}

export const CHARACTER_COMBAT: Record<string, CombatProfile> = {
  bean: profile(3, 5, 4, 22, 52, 11, 0.85, 'leaf'),
  flea: profile(5, 4, 4, 26, 62, 12, 1, 'headbutt'),
  ernesto: profile(4, 3, 3, 28, 76, 13, 1.2, 'skull'),
  elmacho: profile(5, 2, 5, 34, 82, 15, 1, 'lariat'),
  huesos: profile(5, 4, 3, 28, 78, 13, 1.3, 'spirit'),
};

export const MOVES: Record<Exclude<MoveId, 'special'>, Move> = {
  light: {
    startup: 5, active: 3, recovery: 9, damage: 6, hitstun: 14, blockstun: 9,
    knockback: 1.8, blockKnockback: 1.2, hitstop: 4, knockdown: false, meterGain: 8,
    box: { x0: 5, x1: 36, y0: 8, y1: 46 },
  },
  heavy: {
    startup: 10, active: 4, recovery: 18, damage: 12, hitstun: 22, blockstun: 13,
    knockback: 3.3, blockKnockback: 2, hitstop: 8, knockdown: true, meterGain: 14,
    box: { x0: 5, x1: 49, y0: 6, y1: 72 },
  },
  air: {
    startup: 4, active: 12, recovery: 10, damage: 9, hitstun: 18, blockstun: 11,
    knockback: 2.2, blockKnockback: 1.5, hitstop: 6, knockdown: false, meterGain: 10,
    box: { x0: 0, x1: 39, y0: -8, y1: 39 },
  },
  super: {
    startup: 14, active: 6, recovery: 26, damage: 38, hitstun: 32, blockstun: 24,
    knockback: 5, blockKnockback: 3, hitstop: 14, knockdown: true, meterGain: 0,
    box: { x0: 0, x1: 105, y0: 0, y1: 90 },
  },
};

export const SPECIAL_MOVES: Record<SpecialKind, Move> = {
  leaf: {
    startup: 12, active: 1, recovery: 22, damage: 9, hitstun: 20, blockstun: 12,
    knockback: 2.5, blockKnockback: 1.6, hitstop: 9, knockdown: true, meterGain: 12,
    box: { x0: 8, x1: 28, y0: 18, y1: 30 },
    projectile: { speed: 4.2, w: 14, h: 12, height: 24, life: 120 },
  },
  skull: {
    startup: 18, active: 1, recovery: 25, damage: 16, hitstun: 24, blockstun: 16,
    knockback: 3.2, blockKnockback: 2, hitstop: 9, knockdown: true, meterGain: 16,
    box: { x0: 8, x1: 30, y0: 16, y1: 38 },
    projectile: { speed: 2.4, w: 22, h: 22, height: 27, life: 190 },
  },
  spirit: {
    startup: 15, active: 1, recovery: 24, damage: 12, hitstun: 22, blockstun: 14,
    knockback: 2.8, blockKnockback: 1.8, hitstop: 9, knockdown: true, meterGain: 14,
    box: { x0: 8, x1: 30, y0: 2, y1: 18 },
    projectile: { speed: 3.2, w: 20, h: 16, height: 10, life: 150 },
  },
  headbutt: {
    startup: 12, active: 20, recovery: 20, damage: 13, hitstun: 23, blockstun: 15,
    knockback: 3.6, blockKnockback: 2.2, hitstop: 9, knockdown: true, meterGain: 15,
    box: { x0: 0, x1: 32, y0: 5, y1: 52 }, dashSpeed: 6.7,
  },
  lariat: {
    startup: 16, active: 28, recovery: 24, damage: 15, hitstun: 25, blockstun: 17,
    knockback: 4, blockKnockback: 2.4, hitstop: 9, knockdown: true, meterGain: 16,
    box: { x0: -12, x1: 48, y0: 5, y1: 64 }, dashSpeed: 3.5,
  },
};

export function getMove(charId: string, id: MoveId): Move {
  return id === 'special' ? SPECIAL_MOVES[CHARACTER_COMBAT[charId].special] : MOVES[id];
}

export function moveTier(id: MoveId): number {
  return id === 'light' || id === 'air' ? 1 : id === 'heavy' ? 2 : id === 'special' ? 3 : 4;
}
