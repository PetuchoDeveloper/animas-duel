// Dev helper: node art/preview.mjs <character> <out.png> [zoom] [anim,anim,...]
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { contactSheet, writePng } from './lib/sheet.mjs';

const [id, out, zoom = '3', only] = process.argv.slice(2);
const mod = await import(pathToFileURL(resolve('art/characters', `${id}.mjs`)).href);
const anims = mod.animations();
writePng(out, contactSheet(anims, { zoom: +zoom, only: only?.split(','), cropTop: +(process.env.CROP ?? 30), cropX: +(process.env.CX ?? 0), cropW: +(process.env.CW ?? 128), maxFrames: +(process.env.MAXF ?? 99) }));
console.log('wrote', out, Object.keys(anims).join(' '));
