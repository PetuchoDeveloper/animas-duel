// Interface art: title emblem, round-win pips, marigold petals and the favicon.
import { C, Img, ellipse, capsule, poly, line, rect, stamp, shade, part, blit } from './lib/raster.mjs';
import { lit } from './lib/humanoid.mjs';
import { writePng } from './lib/sheet.mjs';
import { rng } from './lib/scene.mjs';

const BONE = { d: '#7a7690', s: '#b4b0c8', m: '#e8e4da', l: '#fbf8ee', h: '#ffffff', ink: '#2e2440' };
const HAT = { d: '#6a5a42', s: '#a8966e', m: '#d8c89c', l: '#efe2bc', h: '#fff8e0', ink: '#3a2e1c' };
const GOLD = { d: '#5e3f06', s: '#a8760e', m: '#e2b028', l: '#ffd856', h: '#fff0a0', ink: '#42290a' };
const PETAL = { d: '#b8480c', s: '#e87a14', m: '#ffa828', l: '#ffd050', h: '#fff0a0', ink: '#a03a08' };

/** A sugar skull in a charro hat ringed with marigolds: the game's mark. */
export function emblem() {
  const img = new Img(96, 96);
  const cx = 48;
  // marigold ring
  const r = rng(5);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2;
    const x = cx + Math.cos(a) * 40, y = 52 + Math.sin(a) * 38;
    part(img, (L) => {
      for (let k = 0; k < 6; k++) {
        const pa = (k / 6) * Math.PI * 2 + i;
        ellipse(L, x + Math.cos(pa) * 3.4, y + Math.sin(pa) * 3.4, 3, 3, lit(PETAL), PETAL.ink);
      }
      ellipse(L, x, y, 2.6, 2.6, lit(PETAL), PETAL.ink);
    });
  }
  // skull
  part(img, (L) => {
    ellipse(L, cx, 54, 25, 27, lit(BONE, { dither: true }), BONE.ink);
    ellipse(L, cx, 78, 15, 8, lit(BONE), BONE.ink);
  });
  // candy-skull decoration
  const dot = (x, y, rr, c) => ellipse(img, x, y, rr, rr, () => C(c));
  for (const sx of [-1, 1]) {
    const ex = cx + sx * 10.5;
    ellipse(img, ex, 54, 9.5, 10.5, () => C('#e8407a'));
    ellipse(img, ex, 54, 7, 8, () => C('#120a1c'));
    ellipse(img, ex, 54, 3.4, 3.8, (i) => (i.nx + i.ny < -0.2 ? C('#fff2b8') : C('#f5c12a')));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; dot(ex + Math.cos(a) * 11.5, 54 + Math.sin(a) * 12.5, 1.1, k % 2 ? '#20b8a8' : '#ffd23a'); }
  }
  // nose heart and teeth
  poly(img, [[cx - 3, 65], [cx + 3, 65], [cx, 71]], () => C('#120a1c'), 0, 1);
  for (let t = -10; t <= 10; t += 4) { rect(img, cx + t - 1, 79, 3, 6, C('#fbf8ee')); line(img, cx + t - 1, 79, cx + t - 1, 85, C('#7a7690')); }
  line(img, cx - 12, 78, cx + 12, 78, C('#120a1c')); line(img, cx - 12, 86, cx + 12, 86, C('#120a1c'));
  // forehead flower and cheek swirls
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; dot(cx + Math.cos(a) * 4, 41 + Math.sin(a) * 4, 2.1, k % 2 ? '#20b8a8' : '#9a50e0'); }
  dot(cx, 41, 2.2, '#ffd23a');
  // sombrero
  part(img, (L) => {
    ellipse(L, cx, 32, 44, 9, lit(HAT, { dither: true }), HAT.ink);
    ellipse(L, cx, 22, 17, 15, lit(HAT, { dither: true }), HAT.ink);
  });
  for (let x = -16; x <= 16; x++) {
    const y = 30 + Math.round(0.012 * x * x);
    img.set(cx + x, y, C(GOLD.l)); img.set(cx + x, y - 1, C(GOLD.m)); img.set(cx + x, y - 2, C(x & 1 ? GOLD.s : GOLD.m));
  }
  for (let x = -40; x <= 40; x += 5) { const y = 32 + 8.6 * Math.sqrt(Math.max(0, 1 - (x / 44) ** 2)); img.set(cx + x, Math.round(y), C(GOLD.m)); }
  return img;
}

/** Round-win sugar skull: lit when won. */
export function pip(won) {
  const img = new Img(16, 16);
  const ramp = won ? BONE : { d: '#1a1230', s: '#2a2048', m: '#3a2e62', l: '#4a3c78', h: '#5a4a8c', ink: '#0e0a1c' };
  part(img, (L) => {
    ellipse(L, 8, 7.2, 6.4, 6.4, lit(ramp), ramp.ink);
    ellipse(L, 8, 12, 3.8, 2.6, lit(ramp), ramp.ink);
  });
  const eye = won ? '#e8407a' : '#0e0a1c';
  ellipse(img, 5.3, 7, 1.9, 2, () => C(eye)); ellipse(img, 10.7, 7, 1.9, 2, () => C(eye));
  if (won) { img.set(5, 6, C('#ffd23a')); img.set(10, 6, C('#ffd23a')); img.set(8, 9, C('#2e2440')); }
  for (const x of [6, 8, 10]) img.set(x, 12, C(won ? '#7a7690' : '#0e0a1c'));
  return img;
}

/** Four-frame marigold petal strip, 10x10 each. */
export function petals() {
  const out = new Img(40, 10);
  for (let f = 0; f < 4; f++) {
    const w = [4.4, 3.6, 2.2, 3.6][f], img = new Img(10, 10);
    part(img, (L) => ellipse(L, 5, 5, w, 3.4, lit(PETAL), PETAL.ink), { outline: true });
    blit(out, img, f * 10, 0);
  }
  return out;
}

/** 32x32 tab icon: the emblem's skull face, no hat. */
export function favicon() {
  const img = new Img(32, 32);
  part(img, (L) => { ellipse(L, 16, 15, 11.5, 12, lit(BONE), BONE.ink); ellipse(L, 16, 26, 7, 4, lit(BONE), BONE.ink); });
  for (const sx of [-1, 1]) { ellipse(img, 16 + sx * 5, 15, 3.6, 4, () => C('#e8407a')); ellipse(img, 16 + sx * 5, 15, 2, 2.6, () => C('#120a1c')); }
  poly(img, [[14.5, 20], [17.5, 20], [16, 23]], () => C('#120a1c'), 0, 1);
  for (const x of [11, 14, 17, 20]) line(img, x, 25, x, 28, C('#7a7690'));
  // little sombrero brim so it reads at 16px
  part(img, (L) => { ellipse(L, 16, 7, 14, 3, lit(HAT), HAT.ink); ellipse(L, 16, 4, 6, 4, lit(HAT), HAT.ink); });
  return img;
}

export function writeUi(outDir) {
  writePng(`${outDir}/emblem.png`, emblem());
  writePng(`${outDir}/pip-won.png`, pip(true));
  writePng(`${outDir}/pip-empty.png`, pip(false));
  writePng(`${outDir}/petals.png`, petals());
  writePng(`${outDir}/favicon.png`, favicon());
}

if (process.argv[1].endsWith('ui.mjs') && process.argv[2]) { writeUi(process.argv[2]); console.log('wrote ui to', process.argv[2]); }
