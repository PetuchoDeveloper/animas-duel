/**
 * Pure helper invariants: damage floors, meter bounds, collision and timeout.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDamage, checkCollision, addSuperMeter, canExecuteSuper, resolveTimeout } from './combatRules.ts';

test('damage scales monotonically to a 25 percent floor; helper chip stays positive', () => {
  let last = 20;
  for (let combo = 0; combo < 30; combo++) {
    const damage = calculateDamage(20, combo);
    assert.ok(damage <= last && damage >= 5);
    last = damage;
  }
  assert.equal(last, 5);
  assert.equal(calculateDamage(20, 0, true), 3);
  assert.equal(calculateDamage(1, 0, true), 1);
});

test('collision is symmetric and touching edges do not overlap', () => {
  const a = { x: 0, y: -50, width: 20, height: 50 };
  const b = { x: 19, y: -40, width: 20, height: 40 };
  assert.equal(checkCollision(a, b), true);
  assert.equal(checkCollision(b, a), true);
  assert.equal(checkCollision(a, { ...b, x: 20 }), false);
  assert.equal(checkCollision(a, { ...b, y: 0 }), false);
});

test('meter clamps both bounds and super requires a full bar', () => {
  assert.equal(addSuperMeter(98, 8), 100);
  assert.equal(addSuperMeter(2, -100), 0);
  assert.equal(canExecuteSuper(100), true);
  assert.equal(canExecuteSuper(99), false);
});

test('timeout compares remaining health, including equality and double KO', () => {
  assert.equal(resolveTimeout(80, 40), 'P1');
  assert.equal(resolveTimeout(20, 75), 'P2');
  assert.equal(resolveTimeout(50, 50), 'DRAW');
  assert.equal(resolveTimeout(0, 0), 'DRAW');
  assert.equal(resolveTimeout(0, 1), 'P2');
});
