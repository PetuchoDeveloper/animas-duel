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
 * Timeout winner by remaining health ratio (both fighters have 100 maximum HP).
 */
export function resolveTimeout(p1Health: number, p2Health: number): 'P1' | 'P2' | 'DRAW' {
  return p1Health > p2Health ? 'P1' : p2Health > p1Health ? 'P2' : 'DRAW';
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
