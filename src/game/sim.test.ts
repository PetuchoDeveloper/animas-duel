/**
 * Broad headless combat invariants and regressions. Fixture writes only arrange
 * positions/resources; actions and recovery always run through real sim ticks.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim, NO_INPUT } from './sim.ts';
import type { Input, SimEvent, SimFighter, Slot } from './sim.ts';
import { createAI } from './ai.ts';
import { CHARACTER_COMBAT, getMove } from './moves.ts';

type MutableFighter = { -readonly [K in keyof SimFighter]: SimFighter[K] };
function arrange(sim: Sim, slot: Slot, patch: Partial<MutableFighter>): void {
  Object.assign(sim.fighters[slot], patch);
}
function input(patch: Partial<Input> = {}): Input { return { ...NO_INPUT, ...patch }; }
function seeded(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function ticks(sim: Sim, count: number, a: Input = NO_INPUT, b: Input = NO_INPUT): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < count; i++) { sim.step([a, b]); events.push(...sim.events); }
  return events;
}
function ready(p1 = 'bean', p2 = 'bean', mode: 'versus' | 'training' = 'versus'): Sim {
  const sim = new Sim({ p1, p2, mode, rng: seeded(1) });
  ticks(sim, 90);
  assert.equal(sim.phase, 'fight');
  arrange(sim, 0, { x: 210 });
  arrange(sim, 1, { x: 244 });
  return sim;
}
function until(sim: Sim, predicate: () => boolean, limit = 240): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < limit && !predicate(); i++) events.push(...ticks(sim, 1));
  assert.ok(predicate(), `condition did not occur within ${limit} ticks`);
  return events;
}
function hits(events: SimEvent[]): Extract<SimEvent, { type: 'hit' }>[] {
  return events.filter((e): e is Extract<SimEvent, { type: 'hit' }> => e.type === 'hit');
}

test('story and versus AI matches terminate with bounded finite state, health and positions', () => {
  const pairs = [
    ['bean', 'ernesto'], ['bean', 'elmacho'], ['bean', 'huesos'],
    ['flea', 'ernesto'], ['flea', 'elmacho'], ['flea', 'huesos'],
    ['bean', 'flea'], ['elmacho', 'huesos'], ['ernesto', 'ernesto'], ['huesos', 'bean'],
  ];
  for (const [p1, p2] of pairs) for (const seed of [1, 23, 9876]) {
    const label = `${p1}/${p2} seed ${seed}`;
    const sim = new Sim({ p1, p2, mode: 'versus', rng: seeded(seed) });
    const controllers = [
      createAI({ slot: 0, difficulty: 2, rng: seeded(seed) }),
      createAI({ slot: 1, difficulty: 0, rng: seeded(seed + 3) }),
    ];
    const stuck = [0, 0];
    let landed = 0;
    for (let tick = 0; tick < 3 * 60 * 60 && sim.phase !== 'matchEnd'; tick++) {
      // A buffered action or meaty can replace idle on the very recovery tick.
      // Count that real input opportunity, even if no idle snapshot is rendered.
      const recovered = sim.fighters.map(f => sim.phase === 'fight' && sim.freeze === 0 && sim.hitstop === 0
        && f.stateLen > 0 && f.state !== 'knockdown' && f.stateTick + 1 >= f.stateLen);
      sim.step([controllers[0](sim), controllers[1](sim)]);
      landed += hits(sim.events).filter(e => !e.blocked).length;
      for (const f of sim.fighters) {
        assert.ok(Number.isFinite(f.health) && f.health >= 0 && f.health <= 100, label);
        assert.ok(Number.isFinite(f.x) && f.x >= 28 && f.x <= 452, label);
        assert.ok(Number.isFinite(f.y) && f.y <= 0, label);
        assert.ok(f.meter >= 0 && f.meter <= 100, label);
        const actionable = f.state === 'idle' || f.state === 'walk' || f.state === 'jump';
        stuck[f.slot] = sim.phase !== 'fight' || actionable || recovered[f.slot] ? 0 : stuck[f.slot] + 1;
        assert.ok(stuck[f.slot] <= 240, `${label}: stuck in ${f.state}`);
      }
      if (sim.fighters.every(f => f.y > -18)) {
        const gap = sim.fighters.reduce((sum, f) => sum + CHARACTER_COMBAT[f.charId].pushboxHalfWidth, 0);
        assert.ok(Math.abs(sim.fighters[0].x - sim.fighters[1].x) >= gap - 1e-8, label);
      }
    }
    assert.equal(sim.phase, 'matchEnd', label);
    assert.ok(sim.matchWinner !== null && landed > 0, label);
  }
});

test('a light interrupts heavy startup, clears the stale hitbox and allows another move', () => {
  const sim = ready();
  sim.step([input({ heavy: true }), input({ light: true })]);
  const events = ticks(sim, 90);
  assert.equal(hits(events).filter(e => e.attacker === 0).length, 0);
  assert.equal(sim.fighters[1].health, 100);
  assert.equal(sim.fighters[0].state, 'idle');
  assert.equal(sim.fighters[0].phase, 'none');
  assert.equal(sim.fighters[0].phaseLen, 0);
  arrange(sim, 0, { x: 210 }); arrange(sim, 1, { x: 244 });
  sim.step([input({ light: true }), NO_INPUT]);
  assert.equal(sim.fighters[0].state, 'light');
  assert.ok(hits(ticks(sim, 20)).some(e => e.attacker === 0));
});

test('intro, KO, round reset, timeout, draw tiebreak and match idling use exact tick transitions', () => {
  const sim = new Sim({ p1: 'bean', p2: 'flea', mode: 'versus' });
  sim.step([NO_INPUT, NO_INPUT]);
  assert.deepEqual(sim.events, [{ type: 'roundStart', round: 1 }]);
  ticks(sim, 69);
  assert.equal(sim.phase, 'intro');
  sim.step([NO_INPUT, NO_INPUT]);
  assert.deepEqual(sim.events, [{ type: 'fight' }]);
  ticks(sim, 19);
  assert.equal(sim.phase, 'fight');
  assert.equal(sim.timeTicks, 5940);
  arrange(sim, 0, { x: 210, health: 65, meter: 30 });
  arrange(sim, 1, { x: 244, health: 1 });
  sim.step([input({ heavy: true }), NO_INPUT]);
  until(sim, () => sim.phase === 'koFreeze');
  const meter = sim.fighters[0].meter;
  ticks(sim, 39);
  assert.equal(sim.phase, 'koFreeze');
  ticks(sim, 1);
  assert.equal(sim.phase, 'roundEnd');
  assert.equal(sim.fighters[0].state, 'win');
  ticks(sim, 149);
  assert.equal(sim.phase, 'roundEnd');
  ticks(sim, 1);
  assert.equal(sim.phase, 'intro');
  assert.equal(sim.roundNumber, 2);
  for (const f of sim.fighters) {
    assert.equal(f.health, 100); assert.equal(f.state, 'idle'); assert.equal(f.phase, 'none');
    assert.equal(f.invuln, false); assert.equal(f.comboHits, 0); assert.equal(f.vx, 0);
    assert.equal(f.y, 0); assert.equal(f.vy, 0); assert.equal(f.guarding, false);
  }
  assert.equal(sim.fighters[0].x, 170); assert.equal(sim.fighters[1].x, 310);
  assert.equal(sim.fighters[0].meter, meter);
  assert.equal(sim.fighters[0].roundsWon, 1);
  ticks(sim, 90);
  sim.timeTicks = 1;
  arrange(sim, 0, { health: 80 }); arrange(sim, 1, { health: 40 });
  ticks(sim, 1);
  assert.equal(sim.phase, 'roundEnd');
  assert.ok(sim.events.some(e => e.type === 'timeout'));
  assert.equal(sim.fighters[0].roundsWon, 2);
  ticks(sim, 150);
  assert.equal(sim.matchWinner, 0);
  ticks(sim, 1);
  const idle = JSON.stringify(sim);
  ticks(sim, 10);
  assert.equal(JSON.stringify(sim), idle);

  const draw = ready();
  draw.timeTicks = 1;
  ticks(draw, 1);
  assert.deepEqual(draw.fighters.map(f => f.roundsWon), [1, 1]);
  ticks(draw, 240);
  draw.timeTicks = 1;
  ticks(draw, 1);
  assert.deepEqual(draw.fighters.map(f => f.roundsWon), [2, 2]);
  ticks(draw, 150);
  assert.equal(draw.phase, 'intro'); assert.equal(draw.roundNumber, 3);
  ticks(draw, 90);
  arrange(draw, 1, { health: 99 }); draw.timeTicks = 1;
  ticks(draw, 151);
  assert.equal(draw.matchWinner, 0);
});

test('mirrored normals have identical reach and same-tick contacts trade into double KO', () => {
  for (const charId of Object.keys(CHARACTER_COMBAT)) for (const distance of [26, 36, 44, 52, 62]) {
    const right = ready(charId, charId);
    const left = ready(charId, charId);
    arrange(right, 0, { x: 220 }); arrange(right, 1, { x: 220 + distance });
    arrange(left, 0, { x: 260 }); arrange(left, 1, { x: 260 - distance });
    right.step([input({ heavy: true }), NO_INPUT]);
    left.step([input({ heavy: true }), NO_INPUT]);
    ticks(right, 20); ticks(left, 20);
    assert.equal(right.fighters[1].health, left.fighters[1].health, `${charId} ${distance}`);
  }
  const trade = ready();
  arrange(trade, 0, { health: 1 }); arrange(trade, 1, { health: 1 });
  trade.step([input({ light: true }), input({ light: true })]);
  const events = until(trade, () => trade.phase === 'koFreeze');
  assert.equal(hits(events).length, 2);
  assert.deepEqual(trade.fighters.map(f => f.health), [0, 0]);
  ticks(trade, 40);
  assert.deepEqual(trade.fighters.map(f => f.roundsWon), [1, 1]);

  // Different projectile heights cross without cancelling, allowing a real trade.
  const shots = ready('bean', 'huesos');
  arrange(shots, 0, { x: 170 }); arrange(shots, 1, { x: 310 });
  shots.step([input({ special: true }), input({ special: true })]);
  until(shots, () => shots.projectiles.length === 2);
  arrange(shots, 0, { health: 1 }); arrange(shots, 1, { health: 1 });
  for (const p of shots.projectiles) {
    const target = shots.fighters[1 - p.owner];
    const gap = CHARACTER_COMBAT[target.charId].hurtbox.w / 2 + p.w / 2;
    p.x = target.x - p.facing * (gap + Math.abs(p.vx) - 0.1);
  }
  ticks(shots, 1);
  assert.equal(hits(shots.events).filter(e => e.move === 'projectile').length, 2);
  assert.deepEqual(shots.fighters.map(f => f.health), [0, 0]);
  ticks(shots, 40);
  assert.deepEqual(shots.fighters.map(f => f.roundsWon), [1, 1]);
});

test('guard requires grounded actionable state, applies chip/stun/pushback and never kills with normals', () => {
  for (const held of [input({ down: true }), input({ right: true })]) {
    const sim = ready();
    arrange(sim, 1, { x: 240, health: 1 });
    sim.step([input({ light: true }), held]);
    let event: Extract<SimEvent, { type: 'hit' }> | undefined;
    for (let i = 0; i < 10 && !event; i++) {
      sim.step([NO_INPUT, held]); event = hits(sim.events)[0];
    }
    assert.ok(event?.blocked);
    assert.equal(sim.fighters[1].health, 1);
    assert.equal(sim.fighters[1].state, 'block');
    assert.equal(sim.fighters[1].stateLen, 9);
    assert.ok(sim.fighters[1].vx > 0 && sim.fighters[0].vx < 0);
    assert.equal(sim.fighters[1].guarding, true);
    ticks(sim, 5);
    assert.equal(sim.fighters[1].state, 'block');
  }
  const startup = ready();
  startup.step([input({ light: true }), input({ down: true, heavy: true })]);
  assert.equal(hits(ticks(startup, 10, NO_INPUT, input({ down: true })))[0]?.blocked, false);
  const jumping = ready('elmacho', 'elmacho');
  jumping.step([input({ heavy: true }), input({ up: true })]);
  const jumpingHits = hits(ticks(jumping, 12, NO_INPUT, input({ down: true })));
  assert.ok(jumpingHits.some(e => !e.blocked && e.knockdown));
});

test('dodge has fourteen invulnerable ticks, vulnerable recovery and a forty-five tick cooldown', () => {
  const sim = ready();
  sim.step([input({ dodge: true }), NO_INPUT]);
  assert.equal(sim.fighters[0].invuln, true);
  const x = sim.fighters[0].x;
  ticks(sim, 13);
  assert.equal(sim.fighters[0].invuln, true);
  assert.ok(sim.fighters[0].x < x);
  ticks(sim, 1);
  assert.equal(sim.fighters[0].invuln, false);
  assert.equal(sim.fighters[0].state, 'dodge');
  ticks(sim, 12);
  assert.equal(sim.fighters[0].state, 'idle');
  let dodges = 1;
  let longest = 0;
  let run = 0;
  for (let i = 0; i < 220; i++) {
    sim.step([input({ dodge: i % 2 === 0 }), NO_INPUT]);
    dodges += sim.events.filter(e => e.type === 'dodge').length;
    run = sim.fighters[0].invuln ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  assert.ok(dodges >= 2 && dodges <= 7);
  assert.ok(longest <= 14);
});

test('connected normals chain only upward, whiffs cannot cancel and late presses buffer for six ticks', () => {
  const connected = ready();
  connected.step([input({ light: true }), NO_INPUT]);
  until(connected, () => connected.fighters[1].health < 100);
  connected.step([input({ heavy: true }), NO_INPUT]);
  ticks(connected, 4);
  assert.equal(connected.fighters[0].state, 'heavy');
  connected.step([input({ light: true }), NO_INPUT]);
  assert.equal(connected.fighters[0].state, 'heavy');

  const whiff = ready();
  arrange(whiff, 1, { x: 420 });
  whiff.step([input({ light: true }), NO_INPUT]);
  ticks(whiff, 6);
  whiff.step([input({ heavy: true }), NO_INPUT]);
  assert.equal(whiff.fighters[0].state, 'light');
  ticks(whiff, 10);
  assert.equal(whiff.fighters[0].state, 'idle');
  whiff.step([input({ light: true }), NO_INPUT]);
  ticks(whiff, 11);
  whiff.step([input({ heavy: true }), NO_INPUT]);
  ticks(whiff, 5);
  assert.equal(whiff.fighters[0].state, 'heavy');

  const held = ready();
  arrange(held, 1, { x: 420 });
  const events = ticks(held, 100, input({ light: true }));
  assert.equal(events.filter(e => e.type === 'swing').length, 1);
});

test('air attack is once per jump, landing cancels it into six recovery ticks', () => {
  const sim = ready();
  arrange(sim, 1, { x: 420 });
  sim.step([input({ up: true, right: true }), NO_INPUT]);
  let swings = 0;
  let airTicks = 0;
  for (let t = 0; t < 65; t++) {
    sim.step([input({ light: t % 2 === 0 }), NO_INPUT]);
    swings += sim.events.filter(e => e.type === 'swing').length;
    if (sim.fighters[0].y < 0) airTicks++;
    if (sim.events.some(e => e.type === 'land')) {
      assert.equal(sim.fighters[0].state, 'land');
      assert.equal(sim.fighters[0].stateLen, 6);
      break;
    }
  }
  assert.equal(swings, 1);
  assert.ok(airTicks < 54);
  const landing = ready();
  arrange(landing, 1, { x: 420 });
  landing.step([input({ up: true }), NO_INPUT]);
  ticks(landing, 36);
  landing.step([input({ light: true }), NO_INPUT]);
  until(landing, () => landing.fighters[0].state === 'land');
  assert.equal(landing.fighters[0].phase, 'none');
  ticks(landing, 6);
  assert.equal(landing.fighters[0].state, 'idle');
});

test('projectiles are one per owner, cancel opposing projectiles, expire and survive interrupted casts', () => {
  const cancel = ready();
  arrange(cancel, 0, { x: 170 }); arrange(cancel, 1, { x: 310 });
  cancel.step([input({ special: true }), input({ special: true })]);
  let spawned = 0;
  let max = 0;
  let dealt = 0;
  for (let t = 0; t < 100; t++) {
    cancel.step([NO_INPUT, NO_INPUT]);
    spawned += cancel.events.filter(e => e.type === 'projectile').length;
    dealt += hits(cancel.events).length;
    max = Math.max(max, cancel.projectiles.length);
  }
  assert.equal(spawned, 2); assert.equal(max, 2); assert.equal(dealt, 0);
  assert.equal(cancel.projectiles.length, 0);
  for (const charId of ['bean', 'ernesto', 'huesos']) {
    const sim = ready(charId, 'bean');
    arrange(sim, 0, { x: 40 }); arrange(sim, 1, { x: 440 });
    let shots = 0;
    let landed = 0;
    for (let t = 0; t < 250; t++) {
      sim.step([input({ special: t % 2 === 0 }), NO_INPUT]);
      assert.ok(sim.projectiles.filter(p => p.owner === 0).length <= 1);
      shots += sim.events.filter(e => e.type === 'projectile').length;
      landed += hits(sim.events).length;
    }
    assert.ok(shots >= 2 && landed >= 1, charId);
    ticks(sim, 250);
    assert.equal(sim.projectiles.length, 0);
  }
  const interrupted = ready();
  arrange(interrupted, 0, { x: 170 }); arrange(interrupted, 1, { x: 310 });
  interrupted.step([input({ special: true }), NO_INPUT]);
  until(interrupted, () => interrupted.projectiles.length === 1);
  arrange(interrupted, 1, { x: 136 });
  interrupted.step([NO_INPUT, input({ light: true })]);
  until(interrupted, () => interrupted.fighters[0].state === 'hit');
  assert.equal(interrupted.projectiles.length, 1);
  arrange(interrupted, 1, { x: interrupted.projectiles[0].x + 50 });
  const survivingHits = hits(until(interrupted, () => interrupted.fighters[1].health < 100));
  assert.ok(survivingHits.some(e => e.move === 'projectile' && e.attacker === 0));

  const oldShot = ready();
  arrange(oldShot, 0, { x: 28, meter: 100 }); arrange(oldShot, 1, { x: 452 });
  oldShot.step([input({ special: true }), NO_INPUT]);
  ticks(oldShot, 35);
  assert.equal(oldShot.fighters[0].state, 'idle');
  const p = oldShot.projectiles[0];
  assert.ok(p);
  p.x = 452 - 11 - p.w / 2 - p.vx + 0.1;
  oldShot.step([input({ light: true }), NO_INPUT]);
  assert.ok(hits(oldShot.events).some(e => e.move === 'projectile'));
  until(oldShot, () => oldShot.fighters[0].phase === 'active');
  oldShot.step([input({ super: true }), NO_INPUT]);
  assert.equal(oldShot.fighters[0].state, 'light');
  assert.equal(oldShot.freeze, 0);
});

test('light loops, corner juggles and projectile loops cannot sustain more than twelve hits', () => {
  for (const charId of Object.keys(CHARACTER_COMBAT)) for (const opening of ['light', 'heavy', 'special'] as const) {
    const sim = ready(charId, 'elmacho', 'training');
    arrange(sim, 0, { x: 425 }); arrange(sim, 1, { x: 452 });
    sim.step([input({ [opening]: true }), NO_INPUT]);
    let maxCombo = 0;
    let landed = 0;
    for (let t = 0; t < 1200; t++) {
      const f = sim.fighters[0];
      const action = t % 2 === 0;
      sim.step([input({ right: true, light: action,
        heavy: action && f.state === 'light', special: action && f.state === 'heavy' }), NO_INPUT]);
      for (const hit of hits(sim.events)) {
        maxCombo = Math.max(maxCombo, hit.combo); landed++;
      }
      assert.ok(sim.fighters.every(fighter => fighter.meter >= 0 && fighter.meter <= 100));
    }
    assert.ok(landed > 0 && maxCombo <= 12, `${charId}/${opening}: ${maxCombo}`);
  }
  // Two contacts collected together cannot overrun an almost-full juggle budget.
  const overlap = ready('bean', 'elmacho', 'training');
  arrange(overlap, 0, { x: 28 }); arrange(overlap, 1, { x: 452 });
  overlap.step([input({ special: true }), NO_INPUT]);
  ticks(overlap, 35);
  arrange(overlap, 0, { x: 410, comboHits: 11 });
  const p = overlap.projectiles[0];
  assert.ok(p);
  p.x = 452 - 17 - p.w / 2 - p.vx * 6 + 0.1;
  overlap.step([input({ light: true }), NO_INPUT]);
  const simultaneous = hits(ticks(overlap, 5));
  assert.equal(simultaneous.length, 1);
  assert.equal(simultaneous[0].combo, 12);
  assert.equal(overlap.projectiles.length, 0);
  assert.equal(overlap.fighters[0].comboHits, 12);
});

test('super costs exactly 100, freezes both fighters and expires early freeze-buffered inputs', () => {
  const sim = ready();
  arrange(sim, 0, { meter: 100 });
  sim.step([input({ super: true }), NO_INPUT]);
  assert.equal(sim.fighters[0].meter, 0);
  assert.equal(sim.freeze, 36); assert.equal(sim.superUser, 0);
  assert.equal(sim.fighters[0].invuln, true);
  const positions = sim.fighters.map(f => [f.x, f.y, f.stateTick]);
  const time = sim.timeTicks;
  sim.step([NO_INPUT, input({ heavy: true })]);
  ticks(sim, 35);
  assert.deepEqual(sim.fighters.map(f => [f.x, f.y, f.stateTick]), positions);
  assert.equal(sim.timeTicks, time);
  assert.equal(sim.freeze, 0);
  sim.step([NO_INPUT, NO_INPUT]);
  assert.equal(sim.fighters[1].state, 'idle');
  assert.equal(sim.fighters[0].invuln, true);
  ticks(sim, 12);
  assert.equal(sim.fighters[0].invuln, true);
  ticks(sim, 1);
  assert.equal(sim.fighters[0].invuln, false);
  assert.ok(hits(sim.events).some(e => e.move === 'super'));
  assert.equal(sim.fighters[0].meter, 0);
  const blocked = ready();
  arrange(blocked, 0, { meter: 100 }); arrange(blocked, 1, { health: 1 });
  blocked.step([input({ super: true }), input({ down: true })]);
  const contacts = hits(ticks(blocked, 55, NO_INPUT, input({ down: true })));
  assert.ok(contacts.some(e => e.blocked && e.knockdown)); assert.equal(blocked.fighters[1].health, 0);
});

test('training ignores P2 controls, cannot KO P1, refills damage after 90 ticks and never times out', () => {
  const sim = ready('bean', 'bean', 'training');
  arrange(sim, 1, { health: 1 });
  sim.step([input({ light: true }), input({ heavy: true, right: true })]);
  until(sim, () => sim.fighters[1].health === 0);
  const time = sim.timeTicks;
  assert.equal(sim.fighters[1].state, 'ko');
  ticks(sim, 89, NO_INPUT, input({ light: true, up: true }));
  assert.equal(sim.fighters[1].health, 0);
  ticks(sim, 1);
  assert.equal(sim.fighters[1].health, 100); assert.equal(sim.fighters[1].state, 'idle');
  assert.equal(sim.phase, 'fight'); assert.equal(sim.timeTicks, time);
  assert.deepEqual(sim.fighters.map(f => f.meter), [100, 100]);
  sim.step([input({ super: true }), NO_INPUT]);
  assert.equal(sim.fighters[0].meter, 100);
  // P1's nonlethal clamp is also applied to incoming, already launched projectiles.
  const opponentShot = ready('bean', 'bean');
  arrange(opponentShot, 0, { x: 100, health: 1 }); arrange(opponentShot, 1, { x: 250 });
  opponentShot.step([NO_INPUT, input({ special: true })]);
  until(opponentShot, () => opponentShot.projectiles.length === 1);
  // Arrange a training fixture with a live enemy projectile without giving the dummy controls.
  const training = ready('bean', 'bean', 'training');
  arrange(training, 0, { x: 100, health: 1 }); arrange(training, 1, { x: 250 });
  training.projectiles.push(...opponentShot.projectiles);
  const contact = hits(ticks(training, 70));
  assert.ok(contact.some(e => e.defender === 0));
  assert.ok(training.fighters[0].health >= 1);
});

test('pushboxes stop grounded crossings, let high jumps pass, and corner hits recoil the attacker', () => {
  const ground = ready('elmacho', 'elmacho');
  arrange(ground, 0, { x: 422 }); arrange(ground, 1, { x: 452 });
  ticks(ground, 60, input({ right: true }), input({ left: true }));
  assert.ok(ground.fighters[0].x < ground.fighters[1].x);
  assert.ok(ground.fighters[1].x - ground.fighters[0].x >= 30);
  const corner = ready();
  arrange(corner, 0, { x: 418 }); arrange(corner, 1, { x: 452 });
  corner.step([input({ light: true }), NO_INPUT]);
  until(corner, () => corner.fighters[1].health < 100);
  const before = corner.fighters[0].x;
  ticks(corner, 7);
  assert.ok(corner.fighters[0].x < before);
  const jump = ready();
  jump.step([input({ up: true, right: true }), NO_INPUT]);
  ticks(jump, 32);
  assert.ok(jump.fighters[0].x > jump.fighters[1].x);
  assert.equal(jump.fighters[0].facing, 1);
  until(jump, () => jump.fighters[0].state === 'idle');
  ticks(jump, 1);
  assert.equal(jump.fighters[0].facing, -1);

  const mirroredCorner = (slot: Slot): Sim => {
    const sim = ready();
    arrange(sim, slot, { x: slot === 0 ? 28 : 452 });
    const target = (1 - slot) as Slot;
    arrange(sim, target, { x: slot === 0 ? 452 : 28 });
    const cast: [Input, Input] = [NO_INPUT, NO_INPUT]; cast[slot] = input({ special: true });
    sim.step(cast);
    until(sim, () => sim.projectiles.length === 1);
    const projectile = sim.projectiles[0];
    projectile.x = sim.fighters[target].x - projectile.facing * 15;
    ticks(sim, 1);
    until(sim, () => sim.hitstop === 0);
    const walk: [Input, Input] = [NO_INPUT, NO_INPUT];
    walk[slot] = input(slot === 0 ? { right: true } : { left: true });
    sim.step(walk);
    return sim;
  };
  const right = mirroredCorner(0);
  const left = mirroredCorner(1);
  assert.ok(Math.abs(right.fighters[0].x - (480 - left.fighters[1].x)) < 1e-8);
  assert.ok(Math.abs(right.fighters[1].x - (480 - left.fighters[0].x)) < 1e-8);
});

test('identical seeded inputs and pauses yield identical complete state; reset matches a fresh sim', () => {
  const a = new Sim({ p1: 'flea', p2: 'huesos', mode: 'versus', rng: seeded(88) });
  const b = new Sim({ p1: 'flea', p2: 'huesos', mode: 'versus', rng: seeded(88) });
  const controllers = [
    createAI({ slot: 0, difficulty: 2, rng: seeded(7) }),
    createAI({ slot: 1, difficulty: 1, rng: seeded(8) }),
  ];
  for (let t = 0; t < 2500; t++) {
    const inputs: [Input, Input] = [controllers[0](a), controllers[1](a)];
    a.step(inputs);
    // Arbitrary renderer reads between steps do not advance the paused sim.
    JSON.stringify(b.fighters); JSON.stringify(b.projectiles);
    b.step(inputs);
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  }
  a.reset();
  const fresh = new Sim({ p1: 'flea', p2: 'huesos', mode: 'versus' });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(fresh)));
  for (const charId of Object.keys(CHARACTER_COMBAT)) {
    assert.ok(getMove(charId, 'special').knockdown);
  }
});
