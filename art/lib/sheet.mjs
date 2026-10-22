// Packs animation frames into one PNG per fighter plus the metadata the engine reads.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Img, C, toRgba, upscale, blit } from './raster.mjs';
import { encodePng } from './png.mjs';
import { CELL_W, CELL_H, ANCHOR_X, ANCHOR_Y } from './rig.mjs';

export function writePng(path, img) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(img.w, img.h, toRgba(img)));
}

/**
 * anims: { name: { fps, loop, frames: Img[] } }, laid out one row per animation.
 * Returns { image, meta } where meta is JSON-serialisable.
 */
export function packSheet(anims) {
  const names = Object.keys(anims);
  const cols = Math.max(...names.map((n) => anims[n].frames.length));
  const sheet = new Img(cols * CELL_W, names.length * CELL_H);
  const meta = { cell: [CELL_W, CELL_H], anchor: [ANCHOR_X, ANCHOR_Y], anims: {} };
  names.forEach((name, row) => {
    const a = anims[name];
    a.frames.forEach((f, col) => blit(sheet, f, col * CELL_W, row * CELL_H));
    meta.anims[name] = { row, frames: a.frames.length, fps: a.fps, loop: a.loop };
  });
  return { image: sheet, meta };
}

/** Contact sheet for eyeballing: every frame zoomed, on a stage-coloured backdrop with a ground line. */
export function contactSheet(anims, { zoom = 2, only, bg = '#2b1a3a', cropTop = 0, cropX = 0, cropW = CELL_W, maxFrames = 99 } = {}) {
  const names = (only ?? Object.keys(anims)).filter((n) => anims[n]);
  const cols = Math.min(maxFrames, Math.max(...names.map((n) => anims[n].frames.length)));
  const cw = cropW * zoom;
  const ch = (CELL_H - cropTop) * zoom;
  const out = new Img(cols * cw, names.length * ch);
  for (let i = 0; i < out.px.length; i++) out.px[i] = C(bg);
  names.forEach((name, row) => {
    anims[name].frames.slice(0, cols).forEach((f, col) => {
      const crop = new Img(cropW, CELL_H - cropTop);
      for (let y = 0; y < crop.h; y++) for (let x = 0; x < crop.w; x++) {
        const c = f.px[(y + cropTop) * f.w + x + cropX];
        if (c) crop.px[y * crop.w + x] = c;
      }
      const big = upscale(crop, zoom);
      // ground line + anchor tick
      const gy = (ANCHOR_Y - cropTop + 1) * zoom;
      for (let x = 0; x < cw; x++) big.px[Math.min(big.h - 1, gy) * big.w + x] = big.px[gy * big.w + x] || C('#4a3560');
      blit(out, big, col * cw, row * ch);
    });
  });
  return out;
}
