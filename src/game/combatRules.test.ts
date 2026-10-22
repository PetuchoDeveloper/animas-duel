import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDamage,
  checkCollision,
  addSuperMeter,
  canExecuteSuper,
  evaluateRoundWinner,
  SOMBRERO_STAGES,
  ATTACK_DATA,
} from './combatRules.ts';

test('combo scaling reduces consecutive damage but maintains floor', () => {
  const base = 20;
  const firstHit = calculateDamage(base, 0);
  const secondHit = calculateDamage(base, 1);
  const fifthHit = calculateDamage(base, 4);
  const highCombo = calculateDamage(base, 20);

  assert.equal(firstHit, 20);
  assert.ok(secondHit < firstHit, 'second hit should be scaled down');
  assert.ok(fifthHit < secondHit, 'fifth hit should be scaled down further');
  assert.equal(highCombo, 5, 'combo scaling floor should be 25% of 20 = 5');
});

test('blocked attacks deal chip damage', () => {
  const normalDamage = calculateDamage(20, 0, false);
  const blockedDamage = calculateDamage(20, 0, true);

  assert.equal(normalDamage, 20);
  assert.equal(blockedDamage, 3, 'chip damage is 15% rounded = 3');
});

test('AABB collision detects overlapping hitboxes and non-overlapping boxes', () => {
  const p1Hurtbox = { x: 100, y: 100, width: 50, height: 80 };
  const overlappingAttack = { x: 130, y: 120, width: 40, height: 40 };
  const distantAttack = { x: 250, y: 120, width: 40, height: 40 };

  assert.equal(checkCollision(overlappingAttack, p1Hurtbox), true);
  assert.equal(checkCollision(distantAttack, p1Hurtbox), false);
});

test('super meter increments up to 100 and clamps', () => {
  let meter = 0;
  meter = addSuperMeter(meter, ATTACK_DATA.light.meterGain);
  assert.equal(meter, 8);
  meter = addSuperMeter(meter, 95);
  assert.equal(meter, 100, 'meter should cap at 100');
  assert.equal(canExecuteSuper(meter), true);
  assert.equal(canExecuteSuper(99), false);
});

test('round winner detects KO, draw, and active state', () => {
  assert.equal(evaluateRoundWinner(100, 100), 'IN_PROGRESS');
  assert.equal(evaluateRoundWinner(100, 0), 'P1');
  assert.equal(evaluateRoundWinner(0, 75), 'P2');
  assert.equal(evaluateRoundWinner(0, 0), 'DRAW');
});

test('3 Sombrero stages exist with increasing damage state', () => {
  assert.equal(SOMBRERO_STAGES.length, 3);
  assert.equal(SOMBRERO_STAGES[0].damageState, 'pristine');
  assert.equal(SOMBRERO_STAGES[1].damageState, 'cracked');
  assert.equal(SOMBRERO_STAGES[2].damageState, 'shattered');
});
