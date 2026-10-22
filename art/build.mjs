// Renders every fighter's frames and packs them into src/assets/sprites/<id>.png, plus a
// portrait sheet and the metadata the engine imports. Run with `npm run art`.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { packSheet, writePng } from './lib/sheet.mjs';
import { Img, blit } from './lib/raster.mjs';
import { packEffects } from './fx.mjs';
import { STAGES } from './stages.mjs';
import { writeUi } from './ui.mjs';

const OUT = resolve('src/assets/sprites');
const IDS = ['bean', 'flea', 'ernesto', 'elmacho', 'huesos'];
const MOODS = { neutral: 'neutral', shout: 'yell', hurt: 'hurt', smug: 'smug' };
const PORTRAIT = 64;

mkdirSync(OUT, { recursive: true });
const atlas = { fighters: {}, portraits: { size: PORTRAIT, moods: Object.keys(MOODS), order: IDS } };
const sheet = new Img(Object.keys(MOODS).length * PORTRAIT, IDS.length * PORTRAIT);

for (const [row, id] of IDS.entries()) {
  const mod = await import(pathToFileURL(resolve('art/characters', `${id}.mjs`)).href);
  const anims = mod.animations();
  const { image, meta } = packSheet(anims);
  for (const [name, a] of Object.entries(anims)) if (a.strike) meta.anims[name].strike = a.strike;
  writePng(resolve(OUT, `${id}.png`), image);
  atlas.fighters[id] = meta;
  console.log(`${id}: ${image.w}x${image.h}, ${Object.keys(anims).length} animations`);

  Object.values(MOODS).forEach((face, col) => {
    const frame = mod.drawFrame(mod.portrait.pose(face));
    const [bx, by] = mod.portrait.box;
    const crop = new Img(PORTRAIT, PORTRAIT);
    for (let y = 0; y < PORTRAIT; y++) for (let x = 0; x < PORTRAIT; x++) crop.px[y * PORTRAIT + x] = frame.get(bx + x, by + y);
    blit(sheet, crop, col * PORTRAIT, row * PORTRAIT);
  });
}
writePng(resolve(OUT, 'portraits.png'), sheet);
const fx = packEffects();
writePng(resolve(OUT, 'fx.png'), fx.sheet);
atlas.fx = fx.meta;
writeFileSync(resolve('src/game/atlas.json'), JSON.stringify(atlas, null, 1) + '\n');

const STAGE_OUT = resolve('src/assets/stages');
mkdirSync(STAGE_OUT, { recursive: true });
STAGES.forEach((paint, i) => {
  const { back, fg } = paint();
  writePng(resolve(STAGE_OUT, `stage${i + 1}-back.png`), back);
  writePng(resolve(STAGE_OUT, `stage${i + 1}-fg.png`), fg);
});

const UI_OUT = resolve('src/assets/ui');
mkdirSync(UI_OUT, { recursive: true });
writeUi(UI_OUT);
