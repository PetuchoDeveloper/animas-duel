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
