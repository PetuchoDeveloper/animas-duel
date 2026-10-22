/**
 * Headless fixed 60 Hz combat. One step is one tick; all contacts are collected
 * before any are applied, so neither slot wins a trade by update order.
 */

import { addSuperMeter, calculateDamage, checkCollision, resolveTimeout } from './combatRules.ts';
import type { Hitbox } from './combatRules.ts';
import { CHARACTER_COMBAT, getMove, moveTier } from './moves.ts';
import type { Move, MoveId } from './moves.ts';

export const TICK_RATE = 60;
export type GameMode = 'story' | 'versus' | 'training';
export type Slot = 0 | 1;
export type FighterState = 'idle' | 'walk' | 'jump' | 'land' | 'light' | 'heavy' | 'air'
  | 'special' | 'super' | 'hit' | 'block' | 'dodge' | 'knockdown' | 'getup' | 'ko' | 'win';
export type AttackPhase = 'startup' | 'active' | 'recovery' | 'none';
export type RoundPhase = 'intro' | 'fight' | 'koFreeze' | 'roundEnd' | 'matchEnd';
export interface Input {
  left: boolean; right: boolean; up: boolean; down: boolean;
  light: boolean; heavy: boolean; special: boolean; super: boolean; dodge: boolean;
}
export const NO_INPUT: Input = Object.freeze({
  left: false, right: false, up: false, down: false,
  light: false, heavy: false, special: false, super: false, dodge: false,
});

export interface SimFighter {
  readonly x: number; readonly y: number; readonly vx: number; readonly vy: number;
  readonly facing: 1 | -1;
  readonly health: number; readonly maxHealth: number; readonly meter: number;
  readonly state: FighterState; readonly stateTick: number; readonly stateLen: number;
  readonly phase: AttackPhase; readonly phaseTick: number; readonly phaseLen: number;
  readonly guarding: boolean; readonly invuln: boolean; readonly flash: number;
  readonly comboHits: number; readonly roundsWon: number; readonly slot: Slot;
  readonly charId: string; readonly anim: string; readonly lying: boolean;
}
export interface SimProjectile {
  id: number; owner: Slot; kind: string; x: number; y: number; vx: number;
  facing: 1 | -1; life: number; w: number; h: number;
}
export type HazardKind = 'barrel' | 'anvil';
export interface SimHazard {
  readonly id: number; readonly kind: HazardKind;
  readonly x: number; readonly y: number; readonly vx: number; readonly vy: number;
  readonly warn: number; readonly landed: number; readonly dir: 1 | -1;
}
export type SimEvent =
  | { type: 'roundStart'; round: number } | { type: 'fight' }
  | { type: 'swing'; slot: Slot; state: FighterState }
  | { type: 'jump' | 'land' | 'dodge'; slot: Slot }
  | { type: 'hit'; attacker: Slot; defender: Slot; move: MoveId | 'projectile'; damage: number;
      blocked: boolean; x: number; y: number; combo: number; knockdown: boolean }
  | { type: 'super'; slot: Slot } | { type: 'projectile'; slot: Slot; kind: string }
  | { type: 'hazardWarn'; kind: HazardKind; x: number }
  | { type: 'hazardHit'; slot: Slot; kind: HazardKind; damage: number; blocked: boolean; x: number; y: number }
  | { type: 'hazardLand'; x: number }
  | { type: 'ko'; slot: Slot } | { type: 'timeout' }
  | { type: 'roundEnd'; winner: Slot | 'draw' } | { type: 'matchEnd'; winner: Slot };

type Press = 'super' | 'special' | 'heavy' | 'light' | 'dodge' | 'up';
const PRESSES: Press[] = ['super', 'special', 'heavy', 'light', 'dodge', 'up'];
const MIN_X = 28;
const MAX_X = 452;
const GRAVITY = 0.28;
const BARREL_FIRST = 480, BARREL_INTERVAL = 600, BARREL_WARN = 50;
const ANVIL_FIRST = 420, ANVIL_INTERVAL = 480, ANVIL_WARN = 55;
const BARREL_SPEED = 2.2, BARREL_SIZE = 28;
const ANVIL_SPEED = 7, ANVIL_TOP = -260, ANVIL_LANDED = 6;
type Fighter = { -readonly [K in keyof SimFighter]: SimFighter[K] } & {
  move: MoveId | null;
  generation: number;
  hasHit: boolean;
  connected: boolean;
  spawned: boolean;
  airUsed: boolean;
  dodgeCooldown: number;
  dodgeDir: number;
  lyingTick: number;
  juggleProtected: boolean;
  lastHurt: number | null;
  buffer: Partial<Record<Press, number>>;
};
type Projectile = SimProjectile & { move: Move; generation: number };
type Hazard = { -readonly [K in keyof SimHazard]: SimHazard[K] } & { hit: [boolean, boolean] };
interface Contact {
  attacker: Fighter; defender: Fighter; move: Move; id: MoveId | 'projectile';
  direction: 1 | -1; blocked: boolean; airborne: boolean; juggling: boolean;
  generation: number;
}
interface HazardContact {
  hazard: Hazard; defender: Fighter; blocked: boolean; juggling: boolean;
}

export class Sim {
  readonly mode: GameMode;
  private ids: [string, string];
  private pair!: [Fighter, Fighter];
  private shots: Projectile[] = [];
  private trouble: 'barrels' | 'anvils' | null;
  private troubleTicks = 0;
  private nextHazardId = 1;
  private obstacles: Hazard[] = [];
  private previous: [Input, Input] = [{ ...NO_INPUT }, { ...NO_INPUT }];
  private clock = 0;
  private nextProjectileId = 1;
  private roundWinner: Slot | 'draw' = 'draw';
  events: SimEvent[] = [];
  phase: RoundPhase = 'intro';
  phaseTick = 0;
  roundNumber = 1;
  timeTicks = 99 * TICK_RATE;
  freeze = 0;
  superUser: Slot | null = null;
  hitstop = 0;
  matchWinner: Slot | null = null;

  constructor(opts: { p1: string; p2: string; mode: GameMode; rng?: () => number;
    trouble?: 'barrels' | 'anvils' | null }) {
    if (!Object.hasOwn(CHARACTER_COMBAT, opts.p1) || !Object.hasOwn(CHARACTER_COMBAT, opts.p2)) {
      throw new RangeError('Unknown combat character');
    }
    this.ids = [opts.p1, opts.p2];
    this.mode = opts.mode;
    this.trouble = opts.trouble ?? null;
    // Combat has no random outcomes. Controllers own their injected RNG streams.
    this.reset();
  }

  get fighters(): [SimFighter, SimFighter] { return this.pair; }
  get projectiles(): SimProjectile[] { return this.shots; }
  get hazards(): SimHazard[] { return this.obstacles; }
  get timeLeft(): number { return Math.ceil(this.timeTicks / TICK_RATE); }

  reset(): void {
    this.clock = 0;
    this.roundNumber = 1;
    this.matchWinner = null;
    this.nextProjectileId = 1;
    this.nextHazardId = 1;
    this.previous = [{ ...NO_INPUT }, { ...NO_INPUT }];
    this.events = [];
    this.pair = [this.makeFighter(0), this.makeFighter(1)];
    this.startRound();
  }

  private makeFighter(slot: Slot): Fighter {
    return {
      slot, charId: this.ids[slot], x: slot === 0 ? 170 : 310, y: 0, vx: 0, vy: 0,
      facing: slot === 0 ? 1 : -1, health: 100, maxHealth: 100,
      meter: this.mode === 'training' ? 100 : 0, state: 'idle', stateTick: 0, stateLen: 0,
      phase: 'none', phaseTick: 0, phaseLen: 0, guarding: false, invuln: false,
      flash: 0, comboHits: 0, roundsWon: 0, anim: 'idle', lying: false,
      move: null, generation: 0, hasHit: false, connected: false, spawned: false,
      airUsed: false, dodgeCooldown: 0, dodgeDir: 0, lyingTick: 0,
      juggleProtected: false, lastHurt: null, buffer: {},
    };
  }

  private startRound(): void {
    this.pair = this.pair.map((old, slot) => ({
      ...this.makeFighter(slot as Slot), meter: old.meter, roundsWon: old.roundsWon,
    })) as [Fighter, Fighter];
    this.phase = 'intro';
    this.phaseTick = 0;
    this.timeTicks = 99 * TICK_RATE;
    this.freeze = this.hitstop = 0;
    this.superUser = null;
    this.shots = [];
    this.obstacles = [];
    this.troubleTicks = 0;
    this.roundWinner = 'draw';
  }

  step(inputs: [Input, Input]): void {
    this.events = [];
    if (this.phase === 'matchEnd') return;
    this.clock++;
    const held: [Input, Input] = [inputs[0], this.mode === 'training' ? NO_INPUT : inputs[1]];
    this.capturePresses(held);
    if (this.phase === 'intro') {
      if (this.phaseTick === 0) this.events.push({ type: 'roundStart', round: this.roundNumber });
      if (this.phaseTick === 70) this.events.push({ type: 'fight' });
      if (++this.phaseTick === 90) { this.phase = 'fight'; this.phaseTick = 0; }
      return;
    }
    if (this.phase === 'koFreeze') {
      if (++this.phaseTick === 40) this.enterRoundEnd();
      return;
    }
    if (this.phase === 'roundEnd') {
      for (const f of this.pair) { f.stateTick++; f.flash = Math.max(0, f.flash - 1); }
      this.moveFighters(true);
      this.pushboxes();
      if (++this.phaseTick === 150) this.finishRound();
      return;
    }
    this.refillTraining();
    if (this.freeze > 0) {
      if (--this.freeze === 0) this.superUser = null;
      return;
    }
    if (this.hitstop > 0) { this.hitstop--; return; }
    this.phaseTick++;
    for (const f of this.pair) this.advanceState(f);
    for (const f of this.pair) this.handleInput(f, held[f.slot]);
    // Super activation freezes the entire tick, including the other fighter.
    if (this.freeze > 0) return;
    const order = this.pair[0].x <= this.pair[1].x ? 1 : -1;
    const bothLow = this.pair.every(f => f.y > -18);
    this.moveFighters();
    this.pushboxes(bothLow ? order : undefined);
    for (const f of this.pair) this.updateFlags(f);
    this.updateProjectiles();
    const contacts = this.collectContacts();
    const hazardContacts = this.stepHazards();
    for (const contact of contacts) this.applyContact(contact);
    for (const contact of hazardContacts) this.applyHazardContact(contact);
    // Contacts can add pushback, but centres remain within walls at every step.
    this.pushboxes();
    if (this.mode === 'training') {
      for (const f of this.pair) f.meter = 100;
    } else {
      if (this.pair.some(f => f.health === 0)) {
        this.beginKO();
      } else if (--this.timeTicks === 0) {
        this.events.push({ type: 'timeout' });
        const result = resolveTimeout(this.pair[0].health, this.pair[1].health);
        this.roundWinner = result === 'DRAW' ? 'draw' : result === 'P1' ? 0 : 1;
        this.enterRoundEnd();
      }
    }
  }

  private capturePresses(inputs: [Input, Input]): void {
    for (const f of this.pair) {
      const input = inputs[f.slot];
      for (const key of PRESSES) {
        if (f.buffer[key] !== undefined && f.buffer[key]! < this.clock) delete f.buffer[key];
        if (this.phase === 'fight' && input[key] && !this.previous[f.slot][key]) {
          f.buffer[key] = this.clock + 6;
        }
      }
      this.previous[f.slot] = { ...input };
    }
  }

  private actionable(f: Fighter): boolean {
    return f.state === 'idle' || f.state === 'walk';
  }

  /** The only state writer: interrupted moves can never retain an active box. */
  private enter(f: Fighter, state: FighterState, length = 0): void {
    f.state = state;
    f.anim = state;
    f.stateTick = 0;
    f.stateLen = length;
    f.move = null;
    f.phase = 'none';
    f.phaseTick = f.phaseLen = 0;
    f.hasHit = f.connected = f.spawned = false;
    f.guarding = f.invuln = false;
    f.lying = false;
    if (state !== 'knockdown') f.juggleProtected = false;
    this.updateFlags(f);
  }

  private recover(f: Fighter): void {
    this.enter(f, f.y < 0 ? 'jump' : 'idle');
    if (f.y === 0) {
      f.vx = 0;
      this.pair[1 - f.slot].comboHits = 0;
    }
  }

  private updateFlags(f: Fighter): void {
    if (f.move) {
      const m = getMove(f.charId, f.move);
      if (f.stateTick < m.startup) {
        f.phase = 'startup'; f.phaseTick = f.stateTick; f.phaseLen = m.startup;
      } else if (f.stateTick < m.startup + m.active) {
        f.phase = 'active'; f.phaseTick = f.stateTick - m.startup; f.phaseLen = m.active;
      } else {
        f.phase = 'recovery'; f.phaseTick = f.stateTick - m.startup - m.active; f.phaseLen = m.recovery;
      }
    }
    f.invuln = f.state === 'getup' || f.state === 'ko' || f.state === 'win'
      || (f.state === 'dodge' && f.stateTick < 14)
      || (f.state === 'super' && f.phase === 'startup')
      || (f.state === 'knockdown' && (f.lying || f.juggleProtected));
    if (f.state === 'block') f.guarding = true;
  }

  private advanceState(f: Fighter): void {
    f.stateTick++;
    f.flash = Math.max(0, f.flash - 1);
    f.dodgeCooldown = Math.max(0, f.dodgeCooldown - 1);
    if (f.state === 'knockdown' && f.lying) {
      if (f.stateTick - f.lyingTick >= 30) { this.enter(f, 'getup', 20); f.vx = 0; }
    } else if (f.stateLen > 0 && f.stateTick >= f.stateLen && f.state !== 'knockdown') {
      this.recover(f);
    }
    this.updateFlags(f);
  }

  private handleInput(f: Fighter, input: Input): void {
    const opponent = this.pair[1 - f.slot];
    if (f.y === 0 && this.actionable(f)) {
      if (f.x !== opponent.x) f.facing = f.x < opponent.x ? 1 : -1;
    }
    const available = this.actionable(f) || f.state === 'jump';
    for (const key of PRESSES) {
      if (f.buffer[key] === undefined) continue;
      if (key === 'up' || key === 'dodge') {
        if (!this.actionable(f) || f.y < 0 || (key === 'dodge' && f.dodgeCooldown > 0)) continue;
        f.buffer = {};
        if (key === 'up') {
          this.enter(f, 'jump');
          f.airUsed = false;
          f.vy = CHARACTER_COMBAT[f.charId].jumpSpeed;
          f.vx = (Number(input.right) - Number(input.left)) * CHARACTER_COMBAT[f.charId].airSpeed;
          this.events.push({ type: 'jump', slot: f.slot });
        } else {
          this.enter(f, 'dodge', 26);
          f.dodgeDir = Number(input.right) - Number(input.left) || (f.x < opponent.x ? -1 : 1);
          f.vx = f.dodgeDir * 3.6;
          // Cooldown starts at activation and outlasts the vulnerable recovery.
          f.dodgeCooldown = 45;
          this.events.push({ type: 'dodge', slot: f.slot });
        }
        return;
      }
      const id: MoveId = f.y < 0 && (key === 'light' || key === 'heavy') ? 'air' : key;
      if (f.y < 0 && (id !== 'air' || f.airUsed)) continue;
      if (id === 'super' && f.meter < 100) continue;
      if (id === 'special' && getMove(f.charId, id).projectile && this.shots.some(p => p.owner === f.slot)) continue;
      const cancel = f.move !== null && f.connected && f.phase !== 'startup'
        && id !== 'air' && moveTier(id) > moveTier(f.move);
      if (!available && !cancel) continue;
      f.buffer = {};
      this.startMove(f, id);
      return;
    }
    if (this.actionable(f) && f.y === 0) {
      const direction = Number(input.right) - Number(input.left);
      const guarding = input.down || direction === (f.x < opponent.x ? -1 : 1);
      const state = direction !== 0 && !input.down ? 'walk' : 'idle';
      if (f.state !== state) this.enter(f, state);
      f.guarding = guarding;
      f.vx = input.down ? 0 : direction * CHARACTER_COMBAT[f.charId].walkSpeed * (guarding ? 0.8 : 1);
    }
  }

  private startMove(f: Fighter, id: MoveId): void {
    const m = getMove(f.charId, id);
    this.enter(f, id, m.startup + m.active + m.recovery);
    f.move = id;
    f.generation++;
    if (id === 'air') f.airUsed = true;
    else f.vx = 0;
    if (id === 'super') {
      f.meter = this.mode === 'training' ? 100 : addSuperMeter(f.meter, -100);
      this.freeze = 36;
      this.superUser ??= f.slot;
      this.events.push({ type: 'super', slot: f.slot });
    }
    this.updateFlags(f);
    this.events.push({ type: 'swing', slot: f.slot, state: f.state });
  }

  private moveFighters(koOnly = false): void {
    const recoil = this.pair.map(f => !koOnly || f.state === 'ko' ? this.physics(f) : 0);
    // Resolve corner recoil after both movements, so clamping never favors a slot.
    for (const f of this.pair) f.x = Math.max(MIN_X, Math.min(MAX_X, f.x - recoil[1 - f.slot]));
  }

  private physics(f: Fighter): number {
    if (f.move) {
      const move = getMove(f.charId, f.move);
      if (move.dashSpeed) {
        f.vx = f.phase === 'active' && !f.hasHit
          ? f.facing * move.dashSpeed * CHARACTER_COMBAT[f.charId].dashMult : 0;
      }
    }
    if (f.state === 'dodge') f.vx = f.stateTick < 14 ? f.dodgeDir * 3.6 : 0;
    const desired = f.x + f.vx;
    f.x = Math.max(MIN_X, Math.min(MAX_X, desired));
    const overflow = desired - f.x;
    const recoil = ['hit', 'block', 'knockdown', 'ko'].includes(f.state) ? overflow : 0;
    if (f.y < 0 || f.vy < 0) {
      f.vy += GRAVITY;
      f.y += f.vy;
      if (f.y >= 0) {
        f.y = f.vy = 0;
        f.airUsed = false;
        if (f.state === 'knockdown' || f.state === 'ko') {
          f.lying = true;
          f.lyingTick = f.stateTick;
          if (f.state === 'knockdown') f.stateLen = f.stateTick + 30;
          f.vx = 0;
        } else {
          this.enter(f, 'land', 6);
          f.vx = 0;
          this.events.push({ type: 'land', slot: f.slot });
        }
      }
    }
    if (['hit', 'block', 'knockdown', 'ko'].includes(f.state)) f.vx *= 0.78;
    return recoil;
  }

  private pushboxes(order?: number): void {
    const [a, b] = this.pair;
    if (a.y <= -18 || b.y <= -18) return;
    const sign = order ?? (a.x <= b.x ? 1 : -1);
    const gap = CHARACTER_COMBAT[a.charId].pushboxHalfWidth + CHARACTER_COMBAT[b.charId].pushboxHalfWidth;
    const overlap = gap - (b.x - a.x) * sign;
    if (overlap <= 0) return;
    const roomA = sign === 1 ? a.x - MIN_X : MAX_X - a.x;
    const roomB = sign === 1 ? MAX_X - b.x : b.x - MIN_X;
    let shiftA = Math.min(overlap / 2, roomA);
    const shiftB = Math.min(overlap - shiftA, roomB);
    shiftA = Math.min(overlap - shiftB, roomA);
    a.x -= sign * shiftA;
    b.x += sign * shiftB;
  }

  private hurtbox(f: Fighter): Hitbox {
    const box = CHARACTER_COMBAT[f.charId].hurtbox;
    return { x: f.x - box.w / 2, y: f.y - box.h, width: box.w, height: box.h };
  }

  private attackBox(f: Fighter, m: Move): Hitbox {
    const { x0, y0, y1 } = m.box;
    const x1 = f.move === 'light' || f.move === 'heavy' || f.move === 'air'
      ? CHARACTER_COMBAT[f.charId].reach[f.move] : m.box.x1;
    return { x: f.x + (f.facing === 1 ? x0 : -x1), y: f.y - y1,
      width: x1 - x0, height: y1 - y0 };
  }

  private updateProjectiles(): void {
    for (const f of this.pair) {
      if (!f.move || f.phase !== 'active' || f.spawned) continue;
      const m = getMove(f.charId, f.move);
      if (!m.projectile) continue;
      f.spawned = true;
      if (this.shots.some(p => p.owner === f.slot)) continue;
      const p = m.projectile;
      const kind = CHARACTER_COMBAT[f.charId].special;
      this.shots.push({
        id: this.nextProjectileId++, owner: f.slot, kind, x: f.x + f.facing * p.x,
        y: f.y - p.height, vx: f.facing * p.speed, facing: f.facing,
        life: p.life, w: p.w, h: p.h, move: m, generation: f.generation,
      });
      this.events.push({ type: 'projectile', slot: f.slot, kind });
    }
    for (const p of this.shots) { p.x += p.vx; p.life--; }
    this.shots = this.shots.filter(p => p.life > 0 && p.x + p.w / 2 >= 0 && p.x - p.w / 2 <= 480);
    const cancelled = new Set<number>();
    for (const a of this.shots) for (const b of this.shots) {
      if (a.owner !== b.owner && checkCollision(this.projectileBox(a), this.projectileBox(b))) {
        cancelled.add(a.id); cancelled.add(b.id);
      }
    }
    this.shots = this.shots.filter(p => !cancelled.has(p.id));
  }

  private projectileBox(p: Projectile): Hitbox {
    return { x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h };
  }

  private stepHazards(): HazardContact[] {
    const contacts: HazardContact[] = [];
    if (!this.trouble || this.mode === 'training') return contacts;
    this.troubleTicks++;
    for (const h of this.obstacles) {
      if (h.warn > 0) {
        if (--h.warn > 0) continue;
        // The first active tick exposes the entry/top position before movement.
        if (h.kind === 'barrel') h.vx = h.dir * BARREL_SPEED;
        else { h.y = ANVIL_TOP; h.vy = ANVIL_SPEED; }
      } else if (h.kind === 'barrel') h.x += h.vx;
      else if (h.landed > 0) h.landed++;
      else {
        h.y = Math.min(0, h.y + h.vy);
        if (h.y === 0) {
          h.vy = 0; h.landed = 1;
          this.events.push({ type: 'hazardLand', x: h.x });
        }
      }
      if (h.x < -24 || h.x > 504 || h.landed > ANVIL_LANDED) continue;
      const barrel = h.kind === 'barrel';
      const box = { x: h.x - (barrel ? BARREL_SIZE / 2 : 13),
        y: h.y - (barrel ? BARREL_SIZE : 30), width: barrel ? BARREL_SIZE : 26,
        height: barrel ? BARREL_SIZE : 30 };
      for (const d of this.pair) {
        if (h.hit[d.slot] || d.invuln || d.state === 'ko' || d.health === 0
          || (barrel && d.y < -14) || !checkCollision(box, this.hurtbox(d))) continue;
        h.hit[d.slot] = true;
        contacts.push({ hazard: h, defender: d, blocked: this.isGuarding(d),
          juggling: d.state === 'knockdown' && !d.lying });
      }
    }
    this.obstacles = this.obstacles.filter(h => h.x >= -24 && h.x <= 504 && h.landed <= ANVIL_LANDED);
    const barrel = this.trouble === 'barrels';
    const first = barrel ? BARREL_FIRST : ANVIL_FIRST;
    const interval = barrel ? BARREL_INTERVAL : ANVIL_INTERVAL;
    if (this.troubleTicks < first || (this.troubleTicks - first) % interval !== 0) return contacts;
    const index = (this.troubleTicks - first) / interval;
    const dir = barrel && index % 2 === 0 ? -1 : 1;
    const kind = barrel ? 'barrel' : 'anvil';
    const x = barrel ? (dir === 1 ? -24 : 504)
      : Math.max(MIN_X + 10, Math.min(MAX_X - 10, this.pair[index % 2].x));
    this.obstacles.push({ id: this.nextHazardId++, kind, x, y: 0, vx: 0, vy: 0,
      warn: barrel ? BARREL_WARN : ANVIL_WARN, landed: 0, dir, hit: [false, false] });
    this.events.push({ type: 'hazardWarn', kind, x });
    return contacts;
  }

  private applyHazardContact(c: HazardContact): void {
    const { hazard: h, defender: d, blocked, juggling } = c;
    if (d.health === 0) return;
    const barrel = h.kind === 'barrel';
    const damage = blocked ? this.chipDamage(d, barrel ? 9 : 13, 0.2, 1)
      : Math.min(d.health, barrel ? 9 : 13);
    const heavy = getMove(d.charId, 'heavy');
    const vy = juggling ? d.vy : -4.5;
    this.enter(d, blocked ? 'block' : 'knockdown', blocked ? heavy.blockstun : this.fallTicks(d.y, vy) + 30);
    if (!blocked) d.vy = vy;
    d.vx = barrel ? h.dir * (blocked ? heavy.blockKnockback : heavy.knockback) : 0;
    this.hurt(d, damage, 0, juggling);
    this.hitstop = Math.max(this.hitstop, heavy.hitstop);
    this.events.push({ type: 'hazardHit', slot: d.slot, kind: h.kind, damage, blocked,
      x: d.x, y: d.y - CHARACTER_COMBAT[d.charId].hurtbox.h / 2 });
  }

  private isGuarding(d: Fighter): boolean {
    return d.y === 0 && (d.state === 'block' || (this.actionable(d) && d.guarding));
  }

  private chipDamage(d: Fighter, base: number, chip: number, floor: number): number {
    return Math.min(Math.max(1, Math.round(base * chip)), Math.max(0, d.health - floor));
  }

  private collectContacts(): Contact[] {
    const contacts: Contact[] = [];
    const contact = (a: Fighter, d: Fighter, m: Move, id: MoveId | 'projectile', direction: 1 | -1, generation: number) => {
      contacts.push({ attacker: a, defender: d, move: m, id, direction, generation,
        blocked: this.isGuarding(d),
        airborne: d.y < 0, juggling: d.state === 'knockdown' && !d.lying });
    };
    for (const a of this.pair) {
      const d = this.pair[1 - a.slot];
      if (!a.move || a.phase !== 'active' || a.hasHit || d.invuln) continue;
      const m = getMove(a.charId, a.move);
      if (m.projectile || !checkCollision(this.attackBox(a, m), this.hurtbox(d))) continue;
      a.hasHit = a.connected = true;
      contact(a, d, m, a.move, a.facing, a.generation);
    }
    const spent = new Set<number>();
    for (const p of this.shots) {
      const a = this.pair[p.owner];
      const d = this.pair[1 - p.owner];
      if (!d.invuln && checkCollision(this.projectileBox(p), this.hurtbox(d))) {
        spent.add(p.id);
        contact(a, d, p.move, 'projectile', p.facing, p.generation);
      }
    }
    this.shots = this.shots.filter(p => !spent.has(p.id));
    return contacts;
  }

  private applyContact(c: Contact): void {
    const { attacker: a, defender: d, move: m, direction, blocked } = c;
    // A previously collected second contact must not overrun the juggle budget
    // or emit a second KO for a defender already defeated by the first contact.
    if (d.health === 0 || (!blocked && a.comboHits >= 12)) return;
    const minimum = this.mode === 'training' && d.slot === 0 ? 1 : 0;
    if (a.generation === c.generation && a.move !== null) a.connected = true;
    const base = m.damage * CHARACTER_COMBAT[a.charId].powerMult * CHARACTER_COMBAT[d.charId].defenseMult;
    let damage: number;
    let knockdown = false;
    if (blocked) {
      const chip = c.id === 'super' ? 0.25 : c.id === 'special' || c.id === 'projectile' ? 0.2 : 0.12;
      const floor = c.id === 'super' ? minimum : 1;
      damage = this.chipDamage(d, base, chip, floor);
      this.enter(d, 'block', m.blockstun);
      d.vx = direction * m.blockKnockback;
      a.vx -= direction * m.blockKnockback * 0.5;
    } else {
      damage = Math.min(Math.max(0, d.health - minimum), calculateDamage(base, a.comboHits, false));
      a.comboHits++;
      const stun = Math.max(1, Math.round(m.hitstun * Math.max(0.6, 1 - (a.comboHits - 1) * 0.08)));
      knockdown = m.knockdown || c.airborne || d.health - damage <= 0;
      const oldVy = d.vy;
      if (knockdown) {
        this.enter(d, 'knockdown', this.fallTicks(d.y, c.juggling ? oldVy : -4.5) + 30);
        // Juggles keep falling instead of relaunching forever. The hard budget
        // also bounds future move-data changes to at most twelve combo hits.
        d.vy = c.juggling ? oldVy : -4.5;
        d.juggleProtected = a.comboHits >= 12;
      } else {
        this.enter(d, 'hit', stun);
        d.vy = 0;
      }
      d.vx = direction * m.knockback;
    }
    a.meter = addSuperMeter(a.meter, m.meterGain * (blocked ? 0.5 : 1));
    d.meter = addSuperMeter(d.meter, blocked ? 3 : Math.max(2, m.meterGain * 0.4));
    this.hitstop = Math.max(this.hitstop, m.hitstop);
    this.hurt(d, damage, minimum, c.juggling);
    if (d.health === 0) knockdown = true;
    this.events.push({ type: 'hit', attacker: a.slot, defender: d.slot, move: c.id,
      damage, blocked, x: d.x, y: d.y - CHARACTER_COMBAT[d.charId].hurtbox.h / 2,
      combo: blocked ? 0 : a.comboHits, knockdown });
  }

  /** Projectiles and arena hazards share health loss and the single KO writer. */
  private hurt(d: Fighter, damage: number, minimum: number, juggling: boolean): void {
    d.health = Math.max(minimum, d.health - damage);
    d.lastHurt = this.clock;
    d.flash = 8;
    if (d.health === 0) {
      this.enter(d, 'ko');
      d.vy = juggling ? d.vy : -4.5;
      this.events.push({ type: 'ko', slot: d.slot });
    }
    this.updateFlags(d);
  }

  private fallTicks(y: number, vy: number): number {
    let ticks = 0;
    do { vy += GRAVITY; y += vy; ticks++; } while (y < 0 && ticks < 240);
    return ticks;
  }

  private refillTraining(): void {
    if (this.mode !== 'training') return;
    for (const f of this.pair) {
      f.meter = 100;
      if (f.lastHurt !== null && this.clock - f.lastHurt >= 90) {
        f.health = 100;
        f.lastHurt = null;
        if (f.state === 'ko') {
          f.y = f.vy = f.vx = 0;
          this.recover(f);
        }
      }
    }
  }

  private beginKO(): void {
    this.roundWinner = this.pair[0].health === 0 && this.pair[1].health === 0
      ? 'draw' : this.pair[0].health === 0 ? 1 : 0;
    this.phase = 'koFreeze';
    this.phaseTick = 0;
    this.hitstop = this.freeze = 0;
    this.superUser = null;
    this.shots = [];
  }

  private enterRoundEnd(): void {
    this.phase = 'roundEnd';
    this.phaseTick = 0;
    this.hitstop = this.freeze = 0;
    this.superUser = null;
    this.shots = [];
    for (const f of this.pair) {
      f.buffer = {};
      if (this.roundWinner === 'draw' || f.slot === this.roundWinner) {
        f.roundsWon++;
        if (this.roundWinner !== 'draw') { this.enter(f, 'win'); f.y = f.vy = f.vx = 0; }
        else if (f.state !== 'ko') { this.enter(f, 'idle'); f.y = f.vy = f.vx = 0; }
      } else if (f.state !== 'ko') {
        // time-out loser: a small hop backwards, then down
        this.enter(f, 'ko'); f.y = 0; f.vy = -3.2; f.vx = -f.facing * 1.2;
      }
    }
    this.pushboxes();
    this.events.push({ type: 'roundEnd', winner: this.roundWinner });
  }

  private finishRound(): void {
    const [a, b] = this.pair;
    if (Math.max(a.roundsWon, b.roundsWon) >= 2 && a.roundsWon !== b.roundsWon) {
      this.matchWinner = a.roundsWon > b.roundsWon ? 0 : 1;
      this.phase = 'matchEnd';
      this.phaseTick = 0;
      this.events.push({ type: 'matchEnd', winner: this.matchWinner });
    } else {
      this.roundNumber++;
      this.startRound();
    }
  }
}
