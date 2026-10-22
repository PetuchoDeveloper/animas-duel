// Dev helper: node art/faces.mjs <character> <out.png> [zoom] — every expression of one fighter's head, side by side.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Img, C, upscale, blit } from './lib/raster.mjs';
import { writePng } from './lib/sheet.mjs';
import { solve2 } from './lib/kof.mjs';

const [id, out, zoom = '10'] = process.argv.slice(2);
const mod = await import(pathToFileURL(resolve('art/characters', `${id}.mjs`)).href);
const faces = ['neutral', 'blink', 'yell', 'hurt', 'smug', 'ko'];
const W = +(process.env.FW ?? 40), H = +(process.env.FH ?? 36);
const head = solve2(mod.S, mod.portrait.pose('neutral')).head;
const bx = Math.round(head[0] - W / 2 + +(process.env.DX ?? 2)), by = Math.round(head[1] - H / 2 + +(process.env.DY ?? 0));
const sheet = new Img(faces.length * W * +zoom, H * +zoom);
faces.forEach((face, i) => {
  const f = mod.drawFrame(mod.portrait.pose(face));
  const crop = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) crop.px[y * W + x] = f.get(bx + x, by + y);
  blit(sheet, upscale(crop, +zoom, '#2b1a3a'), i * W * +zoom, 0);
});
writePng(out, sheet);
console.log('wrote', out);
