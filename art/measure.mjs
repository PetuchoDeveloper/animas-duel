// Dev helper: node art/measure.mjs — how big each fighter looks and how far each attack visibly reaches,
// in px from the feet anchor, to compare with the hit boxes in src/game/moves.ts.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { ANCHOR_X, ANCHOR_Y } from './lib/rig.mjs';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['bean', 'flea', 'ernesto', 'elmacho', 'huesos'];
for (const id of ids) {
  const mod = await import(pathToFileURL(resolve('art/characters', `${id}.mjs`)).href);
  const anims = mod.animations();
  const ext = (img) => {
    let l = 1e9, r = -1e9, t = 1e9, b = -1e9;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.px[y * img.w + x]) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
    return { l: l - ANCHOR_X, r: r - ANCHOR_X, top: ANCHOR_Y - t, bot: ANCHOR_Y - b };
  };
  const idle = anims.idle.frames.map(ext);
  const out = [`${id}: idle x ${Math.min(...idle.map((e) => e.l))}..${Math.max(...idle.map((e) => e.r))}, height ${Math.max(...idle.map((e) => e.top))}`];
  for (const name of ['light', 'heavy', 'air', 'special', 'super']) {
    const a = anims[name], [s0, s1] = a.strike;
    const tips = a.frames.slice(s0, s1 + 1).map(ext);
    out.push(`${name} tip ${Math.max(...tips.map((e) => e.r))} (top ${Math.max(...tips.map((e) => e.top))}, low ${Math.min(...tips.map((e) => e.bot))})`);
  }
  console.log(out.join(' | '));
}
