/**
 * Reactive, seeded controllers. Decisions use visible fighter/projectile state;
 * movement and guard plans expire and include a neutral tick between decisions.
 */

import { NO_INPUT } from './sim.ts';
import type { Input, Sim, Slot } from './sim.ts';
import { CHARACTER_COMBAT } from './moves.ts';

export function createAI(opts: { slot: Slot; difficulty: 0 | 1 | 2; rng: () => number }): (sim: Sim) => Input {
  const { slot, difficulty, rng } = opts;
  const reaction = [24, 16, 8][difficulty];
  let wait = 0;
  let hold = 0;
  let plan: Input = { ...NO_INPUT };
  let round = 0;
  return (sim: Sim): Input => {
    if (sim.roundNumber !== round || sim.phase !== 'fight') {
      round = sim.roundNumber;
      wait = hold = 0;
      plan = { ...NO_INPUT };
      return { ...NO_INPUT };
    }
    if (sim.freeze > 0 || sim.hitstop > 0) return { ...NO_INPUT };
    if (wait > 0) {
      wait--;
      if (hold > 0) { hold--; return { ...plan }; }
      return { ...NO_INPUT };
    }
    wait = reaction + Math.floor(rng() * 5);
    plan = { ...NO_INPUT };
    hold = 0;
    const self = sim.fighters[slot];
    const other = sim.fighters[1 - slot];
    const distance = Math.abs(self.x - other.x);
    const toward = other.x > self.x ? 'right' : 'left';
    const away = toward === 'right' ? 'left' : 'right';
    const profile = CHARACTER_COMBAT[self.charId];
    const projectile = profile.special === 'leaf' || profile.special === 'skull' || profile.special === 'spirit';
    const free = self.state === 'idle' || self.state === 'walk';
    const choose = (key: keyof Input, ticks = 0): Input => {
      plan[key] = true;
      hold = ticks;
      return { ...plan };
    };
    if (self.y < 0) {
      if (self.state === 'jump' && distance < 70) return choose('light');
      return { ...NO_INPUT };
    }
    if (!free) {
      // A visible confirmed normal may chain upward; whiffs are left punishable.
      if (difficulty > 0 && self.comboHits > 0 && self.phase !== 'startup') {
        if (self.state === 'light') return choose('heavy');
        if (self.state === 'heavy') return choose('special');
        if (self.state === 'special' && self.meter >= 100 && distance < 95) return choose('super');
      }
      return { ...NO_INPUT };
    }
    const threat = distance < 115 && (other.phase === 'startup' || other.phase === 'active');
    const incoming = sim.projectiles.some(p => p.owner !== slot && Math.abs(p.x - self.x) < 85
      && (self.x - p.x) * p.vx > 0);
    if ((threat || incoming) && rng() < [0.08, 0.32, 0.6][difficulty]) {
      return choose(away, Math.max(2, reaction - 3));
    }
    if (difficulty === 2 && other.y < -12 && distance < 65) return choose('heavy');
    if (self.meter >= 100 && distance < 90 && rng() < [0.3, 0.6, 0.85][difficulty]) return choose('super');
    // Dodge toward a recovering opponent occasionally, leaving vulnerable recovery.
    if (other.phase === 'recovery' && distance < 105 && rng() < [0.03, 0.1, 0.16][difficulty]) {
      plan[toward] = true;
      return choose('dodge');
    }
    const roll = rng();
    const pokeRange = 28 * profile.reach + CHARACTER_COMBAT[other.charId].hurtbox.w / 2;
    if (distance < pokeRange) {
      if (roll < [0.68, 0.48, 0.38][difficulty]) return choose('light');
      if (roll < 0.8) return choose('heavy');
      if (roll < 0.96) return choose('special');
      plan[toward] = true;
      return choose('up');
    }
    if (projectile && distance > 95 && roll < [0.16, 0.24, 0.3][difficulty]) return choose('special');
    if (!projectile && distance > 70 && distance < 210 && roll < [0.18, 0.26, 0.34][difficulty]) return choose('special');
    if (distance < 65 && roll < 0.32) return choose('heavy');
    if (distance < 150 && roll > 0.94) {
      plan[toward] = true;
      return choose('up');
    }
    // Short bursts toward striking distance, rather than a latched walk command.
    return choose(toward, Math.max(2, reaction - 3));
  };
}
