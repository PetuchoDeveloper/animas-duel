// Renders every fighter's frames and packs them into src/assets/sprites/<id>.png plus one
// metadata file the engine imports. Run with `npm run art`.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { packSheet, writePng } from './lib/sheet.mjs';

const OUT = resolve('src/assets/sprites');
const IDS = ['bean', 'flea', 'ernesto', 'elmacho', 'huesos'];
const only = process.argv[2];

mkdirSync(OUT, { recursive: true });
const atlas = {};
for (const id of IDS) {
  if (only && only !== id) continue;
  const mod = await import(pathToFileURL(resolve('art/characters', `${id}.mjs`)).href);
  const anims = mod.animations();
  const { image, meta } = packSheet(anims);
  for (const [name, a] of Object.entries(anims)) if (a.strike) meta.anims[name].strike = a.strike;
  writePng(resolve(OUT, `${id}.png`), image);
  atlas[id] = meta;
  console.log(`${id}: ${image.w}x${image.h}, ${Object.keys(anims).length} animations`);
}
if (!only) writeFileSync(resolve('src/game/atlas.json'), JSON.stringify(atlas, null, 1) + '\n');
