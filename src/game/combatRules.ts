/**
 * Core pure combat logic, damage calculation, combo scaling, and hit rules.
 * Decoupled from rendering for fast unit testing.
 */

export interface Hitbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttackDefinition {
  name: string;
  type: 'light' | 'heavy' | 'special' | 'super';
  baseDamage: number;
  hitstunMs: number;
  knockbackX: number;
  knockbackY: number;
  meterGain: number; // Meter awarded to attacker
  superCost?: number; // Meter consumed
}

export const ATTACK_DATA: Record<string, AttackDefinition> = {
  light: {
    name: 'Light Strike',
    type: 'light',
    baseDamage: 7,
    hitstunMs: 220,
    knockbackX: 3.5,
    knockbackY: -2,
    meterGain: 8,
  },
  heavy: {
    name: 'Heavy Strike',
    type: 'heavy',
    baseDamage: 14,
    hitstunMs: 380,
    knockbackX: 6.5,
    knockbackY: -4,
    meterGain: 15,
  },
  special1: {
    name: 'Spirit Flame / Charge',
    type: 'special',
    baseDamage: 18,
    hitstunMs: 440,
    knockbackX: 8.0,
    knockbackY: -5,
    meterGain: 20,
  },
  special2: {
    name: 'Fiesta Quake / Scythe Rush',
    type: 'special',
    baseDamage: 22,
    hitstunMs: 500,
    knockbackX: 9.0,
    knockbackY: -7,
    meterGain: 22,
  },
  super: {
    name: 'Calavera Climax Super',
    type: 'super',
    baseDamage: 40,
    hitstunMs: 800,
    knockbackX: 12.0,
    knockbackY: -9,
    meterGain: 0,
    superCost: 100,
  },
};

/**
 * Calculates damage with combo scaling (damage decay per consecutive hit in combo)
 */
export function calculateDamage(baseDamage: number, comboCount: number, isBlocked: boolean = false): number {
  if (isBlocked) {
    // Chip damage on block
    return Math.max(1, Math.round(baseDamage * 0.15));
  }
  // Standard fighting game combo scaling: minimum 25% damage
  const scale = Math.max(0.25, 1.0 - (comboCount * 0.12));
  return Math.max(1, Math.round(baseDamage * scale));
}

/**
 * AABB collision detection for fighting game hitboxes and hurtboxes
 */
export function checkCollision(hitbox: Hitbox, hurtbox: Hitbox): boolean {
  return (
    hitbox.x < hurtbox.x + hurtbox.width &&
    hitbox.x + hitbox.width > hurtbox.x &&
    hitbox.y < hurtbox.y + hurtbox.height &&
    hitbox.y + hitbox.height > hurtbox.y
  );
}

/**
 * Calculates new meter value capped at 100
 */
export function addSuperMeter(currentMeter: number, amount: number): number {
  return Math.min(100, Math.max(0, currentMeter + amount));
}

/**
 * Determines if super move can be executed
 */
export function canExecuteSuper(meter: number): boolean {
  return meter >= 100;
}

/**
 * Check match outcome given two player health values
 */
export function evaluateRoundWinner(
  p1Health: number,
  p2Health: number
): 'P1' | 'P2' | 'DRAW' | 'IN_PROGRESS' {
  if (p1Health <= 0 && p2Health <= 0) return 'DRAW';
  if (p1Health <= 0) return 'P2';
  if (p2Health <= 0) return 'P1';
  return 'IN_PROGRESS';
}

/**
 * Hat Stage damage progression mapping
 */
export interface SombreroStageInfo {
  level: number;
  name: string;
  spanishTitle: string;
  damageState: 'pristine' | 'cracked' | 'shattered';
  description: string;
  themeHue: string;
  bossId: string;
}

export const SOMBRERO_STAGES: SombreroStageInfo[] = [
  {
    level: 1,
    name: 'El Gran Sombrero Dorado',
    spanishTitle: 'Nivel 1: El Gran Sombrero Dorado',
    damageState: 'pristine',
    description: 'A grand pristine black velvet charro hat with shimmering gold trim and silver coins, hovering above the candle-lit plaza.',
    themeHue: '#f59e0b',
    bossId: 'hormigon',
  },
  {
    level: 2,
    name: 'El Sombrero Agrietado',
    spanishTitle: 'Nivel 2: El Sombrero Agrietado',
    damageState: 'cracked',
    description: 'Battle-worn and cracked hat with severed silver fringes and glowing spirit fissures, rising into twilight storm clouds.',
    themeHue: '#f97316',
    bossId: 'rival',
  },
  {
    level: 3,
    name: 'El Sombrero de Mictlán',
    spanishTitle: 'Nivel 3: El Sombrero Destrozado de Mictlán',
    damageState: 'shattered',
    description: 'Heavily shattered into jagged floating brim islands chained by spectral purple souls above the underworld abyss.',
    themeHue: '#a855f7',
    bossId: 'huesos',
  },
];
