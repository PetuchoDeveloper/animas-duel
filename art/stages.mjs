// The three sombrero arenas, painted as 480x270 pixel-art layers: `back` (sky, scenery, the hat and
// its brim, which is the floor) and `fg` (things in front of the fighters). Animated bits such as
// flames, petals and lightning are added at runtime.
import { writePng } from './lib/sheet.mjs';
import { C, Img, ellipse, poly, line, rect, shade, vgrad, glow, rng, ridge, stars, cloud, bayer, noise2 } from './lib/scene.mjs';

export const W = 480, H = 270;
export const GROUND = 224; // feet line in canvas coordinates (shared with the engine)

const VELVET = { d: '#05030a', s: '#0e0818', m: '#1a1030', l: '#2c1c4c', h: '#463070' };
const GOLD = { d: '#5e3f06', s: '#a8760e', m: '#e2b028', l: '#ffd856', h: '#fff0a0' };
const SILVER = { d: '#3a3c52', s: '#6c7090', m: '#a8aec8', l: '#d8dcee', h: '#ffffff' };

const g = (hex) => C(hex);
const ramp = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, C(v)]));
const V = ramp(VELVET), GD = ramp(GOLD), SV = ramp(SILVER);

/** Painted hat crown: tapered cylinder with a lit side, set on the brim at `base`. */
function crown(img, { cx, base, topY, wBase, wTop, rampC, shoulderY = 78 }) {
  const hw = (y) => {
    const t = Math.max(0, Math.min(1, (y - topY) / (base - topY)));
    const round = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (shoulderY - y) / (shoulderY - topY)), 2.2)));
    return (wTop + (wBase - wTop) * t) / 2 * round;
  };
  for (let y = topY; y < base; y++) {
    const half = hw(y);
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const nx = (x + 0.5 - cx) / Math.max(1, half);
      if (Math.abs(nx) > 1) continue;
      const ny = -0.3 + 0.5 * ((y - topY) / (base - topY)) * 0 - Math.max(0, (shoulderY - y) / (shoulderY - topY)) * 0.8;
      const nz = Math.sqrt(Math.max(0.02, 1 - nx * nx));
      img.set(x, y, shade(rampC, nx, ny, nz, x, y, { dither: true }));
    }
  }
  return hw;
}

function papelPicado(img, y0, sag, seed, palette, step = 22, flagW = 17, flagH = 22) {
  const r = rng(seed);
  const rope = (x) => y0 + Math.sin((x / W) * Math.PI) * sag;
  for (let x = 0; x < W; x++) img.set(x, Math.round(rope(x)), g('#2a1a3e'));
  for (let x = 6, i = 0; x < W - flagW; x += step, i++) {
    const top = Math.round(rope(x + flagW / 2)) + 1;
    const base = palette[(i + Math.floor(r() * 2)) % palette.length];
    const sw = Math.sin(i * 1.7) > 0.4 ? 1 : 0;
    for (let yy = 0; yy < flagH; yy++) {
      for (let xx = 0; xx < flagW; xx++) {
        // scalloped bottom edge
        const edge = flagH - 2 - (xx % 4 < 2 ? 0 : 2);
        if (yy >= edge) continue;
        const shadeC = xx > flagW - 4 ? base.s : xx < 3 ? base.l : base.m;
        img.set(x + xx + sw * (yy > 12 ? 1 : 0), top + yy, shadeC);
      }
    }
    // cut-out pattern: a skull in the middle, diamonds above and below
    const hole = g('#1a0f2e');
    const cx = x + (flagW >> 1) + sw, cy = top + 10;
    for (const [dx, dy] of [[-2, -2], [2, -2], [-1, -3], [1, -3], [0, 0], [-1, 1], [1, 1], [-2, 3], [0, 3], [2, 3], [-3, -1], [3, -1]]) img.set(cx + dx, cy + dy, hole);
    for (const dy of [4, 5, 6]) img.set(cx - 2 + ((dy - 4) % 2), cy + dy, hole);
    for (const [dx, dy] of [[0, -8], [-1, -7], [1, -7], [0, -6]]) img.set(cx + dx, cy + dy, hole);
    for (let k = 0; k < flagW - 2; k += 3) img.set(x + 1 + k, top + 2, hole);
  }
}

// ----------------------------------------------------------------------------------------------- stage 1
function stage1() {
  const back = new Img(W, H), fg = new Img(W, H);
  const r = rng(11);
  vgrad(back, 0, 0, W, 196, ['#080620', '#0e0a30', '#16103e', '#221650', '#341c60', '#52246a', '#7e2e6c', '#b04468', '#e07a50'], 0.5);
  stars(back, r, 90, 0, 120, [g('#fff4d0'), g('#c8d0ff'), g('#ffe0a0')]);

  // moon with halo
  glow(back, 392, 66, 54, [g('#1c1244'), g('#2a1a58'), g('#40286a')]);
  ellipse(back, 392, 66, 23, 23, (i) => (i.ny > 0.35 && i.nx > 0.3 ? g('#cdb97e') : i.nx < -0.4 ? g('#fff6d8') : g('#f2e6bc')));
  for (const [dx, dy, rr] of [[-6, -5, 4], [7, 4, 3], [-2, 9, 2.4], [8, -8, 2]]) ellipse(back, 392 + dx, 66 + dy, rr, rr, (i) => (i.ny < 0 ? g('#cbb878') : g('#e0d19c')));

  // thin stormless clouds catching sunset
  const rc = rng(5);
  cloud(back, 90, 96, 150, 26, { l: g('#6a3a78'), m: g('#4a2a64'), s: g('#352052') }, rc);
  cloud(back, 330, 118, 120, 22, { l: g('#8a4a70'), m: g('#5c3068'), s: g('#402458') }, rc);
  cloud(back, 200, 70, 90, 16, { l: g('#4a3070'), m: g('#34245c'), s: g('#281c4a') }, rc);

  // far hills and the town
  ridge(back, [[0, 160], [60, 148], [120, 158], [190, 142], [260, 156], [340, 146], [420, 154], [480, 150]], 200, g('#1c1448'), g('#34246a'));
  const town = g('#100a28'), townL = g('#241846');
  const rb = rng(21);
  for (let x = 0; x < W; ) {
    const bw = 14 + Math.floor(rb() * 20), bh = 18 + Math.floor(rb() * 26), top = 196 - bh;
    rect(back, x, top, bw, bh + 6, town);
    rect(back, x + bw - 2, top, 2, bh + 6, townL);
    if (rb() < 0.45) poly(back, [[x - 1, top], [x + bw / 2, top - 8], [x + bw + 1, top]], () => town, 0, 1);
    for (let wy = top + 5; wy < 192; wy += 7) for (let wx = x + 3; wx < x + bw - 3; wx += 6) if (rb() < 0.55) { back.set(wx, wy, g(rb() < 0.7 ? '#ffc247' : '#ff8a3a')); back.set(wx, wy + 1, g('#c8741a')); }
    x += bw + 1 + Math.floor(rb() * 4);
  }
  // church with twin towers
  rect(back, 70, 138, 52, 62, town); rect(back, 74, 118, 14, 30, town); rect(back, 106, 118, 14, 30, town);
  poly(back, [[72, 118], [81, 100], [90, 118]], () => town, 0, 1); poly(back, [[104, 118], [113, 100], [122, 118]], () => town, 0, 1);
  ellipse(back, 96, 140, 14, 10, () => town);
  rect(back, 94, 150, 5, 8, g('#ffc247')); rect(back, 78, 124, 3, 6, g('#ffc247')); rect(back, 110, 124, 3, 6, g('#ffc247'));

  papelPicado(back, 14, 12, 3, [
    { m: g('#e8407a'), l: g('#ff80a8'), s: g('#a02050') }, { m: g('#f08a24'), l: g('#ffb860'), s: g('#b25a10') },
    { m: g('#f5c12a'), l: g('#ffe27a'), s: g('#b08410') }, { m: g('#20b8a8'), l: g('#6ee8d6'), s: g('#107868') },
    { m: g('#9a50e0'), l: g('#c890ff'), s: g('#6a30a0') },
  ]);

  // the hat: crown behind the fighters, brim as the floor
  const brimCY = 270, brimRY = 82, brimRX = 380, topY = 176 - 0;
  const hw = crown(back, { cx: 240, base: 200, topY: 56, wBase: 230, wTop: 120, rampC: V });
  // hat band with coins
  for (let y = 168; y < 192; y++) {
    const half = hw(y);
    for (let x = Math.floor(240 - half); x <= Math.ceil(240 + half); x++) {
      const nx = (x + 0.5 - 240) / half;
      if (Math.abs(nx) > 1) continue;
      const lvl = y < 171 ? 'l' : y > 188 ? 's' : nx > 0.55 ? 's' : nx < -0.5 ? 'l' : 'm';
      back.set(x, y, GD[lvl]);
    }
  }
  for (let x = 128; x < 356; x += 15) {
    const nx = (x - 240) / 118;
    const cxp = 240 + nx * hw(180) * 0.95;
    ellipse(back, cxp, 180, 3.4 * Math.sqrt(1 - nx * nx * 0.6), 3.4, (i) => shade(SV, i.nx, i.ny, i.nz, i.x, i.y), 0);
  }
  // embroidered vines up the crown
  for (let k = -4; k <= 4; k++) {
    let px = 240 + k * 25, py = 164;
    for (let y = 164; y > 66; y -= 1) {
      const half = hw(y);
      const sway = Math.sin((y + k * 11) / 9) * 5;
      const x = 240 + (k * 25 + sway) * (half / 115);
      if (Math.abs(x - 240) < half - 2) back.set(Math.round(x), y, (y % 12 < 2) ? GD.l : GD.s);
      if (y % 18 === 0 && Math.abs(x - 240) < half - 6) { back.set(Math.round(x) + 2, y - 1, GD.m); back.set(Math.round(x) + 3, y - 2, GD.m); back.set(Math.round(x) - 2, y - 1, GD.m); back.set(Math.round(x) - 3, y - 2, GD.m); }
    }
  }
  ellipse(back, 240, 63, 47, 6.5, (i) => shade(V, i.nx * 0.6 - 0.2, i.ny * 0.5 - 0.5, 0.8, i.x, i.y, { dither: true }));
  for (let x = 194; x < 287; x++) { const y = Math.round(63 - 6.5 * Math.sqrt(Math.max(0, 1 - ((x - 240) / 47) ** 2))); back.set(x, y, GD.s); }
  // rim light from the moon on the crown's right edge
  for (let y = 62; y < 166; y++) { const x = Math.round(240 + hw(y) - 1); back.set(x, y, V.h); back.set(x - 1, y, V.l); }

  // floor: the brim seen from above
  const floorTop = (x) => brimCY - brimRY * Math.sqrt(Math.max(0, 1 - ((x - 240) / brimRX) ** 2));
  const rn = noise2(9);
  for (let x = 0; x < W; x++) {
    const ft = Math.round(floorTop(x));
    for (let y = ft; y < H; y++) {
      const depth = (y - ft) / (H - ft + 1), q = ((x - 240) / brimRX) ** 2 + ((y - brimCY) / brimRY) ** 2;
      const tone = 0.34 + depth * 0.3 + (rn(x, y * 2, 18) - 0.5) * 0.08 + (1 - Math.min(1, q)) * 0.06;
      const lvl = tone < 0.38 ? V.s : tone < 0.5 ? V.m : tone < 0.62 ? V.l : V.h;
      back.set(x, y, lvl);
      if (((x + y) & 3) === 0 && lvl !== V.s) back.set(x, y, lvl === V.h ? V.l : lvl === V.l ? V.m : V.s); // woven texture
    }
    // gold edge trim with pearls
    back.set(x, ft, GD.l); back.set(x, ft + 1, GD.m); back.set(x, ft + 2, GD.s);
    if (x % 10 === 0) { back.set(x, ft + 3, SV.l); back.set(x + 1, ft + 3, SV.m); back.set(x, ft + 4, SV.m); }
  }
  // concentric embroidery rings and fan stitches on the velvet
  for (const [scale, c, dash] of [[0.93, GD.s, 1], [0.8, GD.d, 3], [0.62, GD.d, 3]]) {
    for (let a = 0; a < 3600; a++) {
      const th = (a / 3600) * Math.PI;
      const x = Math.round(240 + Math.cos(th) * brimRX * scale), y = Math.round(brimCY - Math.sin(th) * brimRY * scale);
      if (back.inside(x, y) && y > floorTop(x) + 6 && (dash === 1 || a % 24 < 12)) back.set(x, y, c);
    }
  }
  const flower = (fx, fy, k) => {
    const rr = k > 1 ? 3 : 2;
    for (const [dx, dy] of [[0, -rr], [rr, 0], [0, rr], [-rr, 0], [rr - 1, -rr + 1], [-rr + 1, -rr + 1], [rr - 1, rr - 1], [-rr + 1, rr - 1]]) back.set(fx + dx, fy + dy, GD.m);
    for (const [dx, dy] of [[0, -rr + 1], [rr - 1, 0], [0, rr - 1], [-rr + 1, 0]]) back.set(fx + dx, fy + dy, GD.l);
    back.set(fx, fy, C('#c8302c'));
  };
  [[213, 40, 1], [232, 52, 2], [252, 64, 2]].forEach(([fy, sp, k], row) => {
    for (let x = 14 + (row % 2) * (sp / 2); x < W; x += sp) if (fy > floorTop(x) + 8) flower(Math.round(x), fy, k);
  });
  // floor shadows under the crown
  for (let x = 120; x < 360; x++) for (let y = 200; y < 214; y++) if (bayer(x, y) < 0.5 * (1 - (y - 200) / 14) && back.get(x, y)) back.set(x, y, V.d);

  // foreground: candle altars at the corners and a marigold garland along the bottom
  const cand = (x, y, h) => {
    rect(fg, x, y - h, 6, h, g('#f4ead0')); rect(fg, x + 4, y - h, 2, h, g('#cbbf9c')); rect(fg, x, y - h, 6, 2, g('#fffaee'));
    rect(fg, x + 2, y - h - 3, 2, 3, g('#2a1a1a'));
    rect(fg, x - 2, y - 1, 10, 3, g('#a8760e')); rect(fg, x - 2, y - 1, 10, 1, g('#ffd856'));
  };
  cand(18, 262, 20); cand(30, 264, 12); cand(448, 264, 14); cand(458, 262, 22); cand(8, 266, 8);
  for (let x = 0; x < W; x += 5) {
    const y = 266 + Math.round(Math.sin(x / 14) * 1.5);
    ellipse(fg, x + 2, y, 3.2, 2.6, (i) => (i.ny < -0.2 ? g('#ffb020') : g('#e8780c')), 0);
    fg.set(x + 2, y, g('#a84a08'));
  }
  return { back, fg };
}

// ----------------------------------------------------------------------------------------------- shared bits
/** Jagged glowing crack from (x0, y0) to (x1, y1), drawn as a dark halo plus a hot core. */
function crack(img, x0, y0, x1, y1, r, core, hot, halo, forks = 0) {
  const pts = [[x0, y0]];
  const n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push([x0 + (x1 - x0) * t + (r() - 0.5) * 8, y0 + (y1 - y0) * t + (r() - 0.5) * 5]);
  }
  pts.push([x1, y1]);
  const draw = (c, dy) => { for (let i = 0; i < pts.length - 1; i++) line(img, pts[i][0], pts[i][1] + dy, pts[i + 1][0], pts[i + 1][1] + dy, c); };
  if (halo) { draw(halo, -1); draw(halo, 1); }
  draw(core, 0);
  for (let i = 1; i < pts.length - 1; i += 2) img.set(Math.round(pts[i][0]), Math.round(pts[i][1]), hot);
  for (let k = 0; k < forks; k++) {
    const [fx, fy] = pts[1 + Math.floor(r() * (pts.length - 2))];
    crack(img, fx, fy, fx + (r() - 0.3) * 30, fy + 8 + r() * 10, r, core, hot, halo, 0);
  }
}

function floorSurface(img, ramps, rn, brimCY, brimRY, brimRX, trim) {
  const floorTop = (x) => brimCY - brimRY * Math.sqrt(Math.max(0, 1 - ((x - 240) / brimRX) ** 2));
  for (let x = 0; x < W; x++) {
    const ft = Math.round(floorTop(x));
    for (let y = ft; y < H; y++) {
      const depth = (y - ft) / (H - ft + 1);
      const tone = 0.34 + depth * 0.3 + (rn(x, y * 2, 18) - 0.5) * 0.1;
      const lvl = tone < 0.38 ? ramps.s : tone < 0.5 ? ramps.m : tone < 0.62 ? ramps.l : ramps.h;
      img.set(x, y, lvl);
      if (((x + y) & 3) === 0 && lvl !== ramps.s) img.set(x, y, lvl === ramps.h ? ramps.l : lvl === ramps.l ? ramps.m : ramps.s);
    }
    for (let k = 0; k < trim.length; k++) img.set(x, ft + k, trim[k]);
  }
  return floorTop;
}

// ----------------------------------------------------------------------------------------------- stage 2
function stage2() {
  const back = new Img(W, H), fg = new Img(W, H);
  const r = rng(77);
  vgrad(back, 0, 0, W, 200, ['#0a0616', '#160c2a', '#28123e', '#401a4c', '#62244e', '#94383e', '#cc5c34', '#f0922e', '#ffc04a'], 0.5);
  stars(back, r, 40, 0, 60, [g('#d8c8ff'), g('#fff0c8')]);
  // storm clouds, dark bellies, burning edges
  const rc = rng(3);
  for (const [cx, cy, w, h] of [[80, 54, 200, 40], [250, 36, 240, 36], [420, 62, 190, 42], [160, 110, 160, 26], [360, 120, 170, 28]]) {
    cloud(back, cx, cy, w, h, { l: g('#7a3a56'), m: g('#3e1c3e'), s: g('#22102c') }, rc);
  }
  // two mountain ridges, the near one split by glowing cracks
  ridge(back, [[0, 150], [50, 126], [100, 142], [160, 108], [220, 138], [300, 112], [370, 140], [430, 118], [480, 134]], 210, g('#341a46'), g('#563068'));
  ridge(back, [[0, 176], [70, 158], [130, 174], [200, 152], [280, 172], [350, 156], [420, 172], [480, 160]], 214, g('#1e0e30'), g('#38204e'));
  const rk = rng(31);
  for (let i = 0; i < 9; i++) crack(back, 20 + i * 52, 180 + rk() * 8, 30 + i * 52 + rk() * 16, 206, rk, g('#ff7a22'), g('#ffe08a'), g('#3a0c0c'));
  // tattered papel picado on a sagging line
  papelPicado(back, 20, 22, 8, [
    { m: g('#a8304e'), l: g('#d86a82'), s: g('#701a34') }, { m: g('#b8661c'), l: g('#e0944a'), s: g('#78400c') },
    { m: g('#8a3ab0'), l: g('#b87ad8'), s: g('#5a2078') },
  ], 34, 16, 20);
  for (let i = 0; i < 28; i++) { const x = 8 + Math.floor(rk() * 460), y = 24 + Math.floor(rk() * 40); back.set(x, y, g('#1a0e2c')); back.set(x + 1, y, g('#1a0e2c')); }

  // the cracked hat
  const HAT = { d: '#080308', s: '#160a10', m: '#2a1418', l: '#46222a', h: '#74403e' };
  const Hh = ramp(HAT);
  const hw = crown(back, { cx: 240, base: 200, topY: 60, wBase: 236, wTop: 124, rampC: Hh });
  for (let y = 170; y < 192; y++) {
    const half = hw(y);
    for (let x = Math.floor(240 - half); x <= Math.ceil(240 + half); x++) {
      const nx = (x + 0.5 - 240) / half;
      if (Math.abs(nx) > 1) continue;
      const gap = (x > 296 && x < 322) || (x > 150 && x < 160) || (y > 184 && ((x * 7) % 23) < 3);
      back.set(x, y, gap ? Hh.s : (y < 173 ? GD.l : y > 189 ? GD.s : nx > 0.55 ? GD.s : GD.m));
    }
  }
  // dented coins and the severed silver fringe
  for (let x = 130; x < 352; x += 16) if ((x / 16) % 3) ellipse(back, 240 + (x - 240) * 0.92, 181, 3, 3, (i) => shade(SV, i.nx, i.ny, i.nz, i.x, i.y), 0);
  for (let x = 140; x < 340; x += 7) { const l = 4 + ((x * 7) % 9); if ((x / 7) % 4 !== 0) for (let k = 0; k < l; k++) back.set(x, 192 + k, k % 2 ? SV.m : SV.s); }
  crack(back, 262, 62, 232, 120, rk, g('#ff7a22'), g('#ffe08a'), g('#2a0808'), 2);
  crack(back, 232, 120, 276, 192, rk, g('#ff7a22'), g('#ffe08a'), g('#2a0808'), 2);
  crack(back, 190, 100, 206, 160, rk, g('#e86a1c'), g('#ffc060'), g('#2a0808'), 1);
  for (let y = 64; y < 168; y++) { const x = Math.round(240 + hw(y) - 1); back.set(x, y, Hh.h); back.set(x - 1, y, Hh.l); }

  // worn floor with glowing fissures
  const rn = noise2(19);
  const FL = ramp({ d: '#08030a', s: '#1c0e1c', m: '#2e1826', l: '#432434', h: '#5a3244' });
  const floorTop = floorSurface(back, FL, rn, 270, 82, 380, [GD.l, GD.m, GD.s]);
  for (let x = 4; x < W; x += 24) back.set(x, Math.round(floorTop(x)) + 3, SV.m);
  for (let i = 0; i < 7; i++) {
    const x0 = 30 + i * 70 + rk() * 20, y0 = floorTop(x0) + 10;
    crack(back, x0, y0, x0 + (rk() - 0.5) * 70, y0 + 26 + rk() * 26, rk, g('#ff7a22'), g('#ffe08a'), g('#2a0808'), 1);
  }
  // burnt candle stumps and fallen petals up front
  for (const [cx, cy, h] of [[16, 264, 10], [30, 266, 5], [452, 266, 8], [464, 264, 13]]) {
    rect(fg, cx, cy - h, 6, h, g('#bcae90')); rect(fg, cx + 4, cy - h, 2, h, g('#8a7c62')); rect(fg, cx - 2, cy - 1, 10, 3, GD.s);
    rect(fg, cx + 1, cy - h - 2, 4, 2, g('#2a1a1a'));
  }
  for (let x = 0; x < W; x += 9) ellipse(fg, x + 3, 267 + (x % 3), 3, 2, (i) => (i.ny < 0 ? g('#9a5a18') : g('#6a3c10')), 0);
  return { back, fg };
}

// ----------------------------------------------------------------------------------------------- stage 3
function stage3() {
  const back = new Img(W, H), fg = new Img(W, H);
  const r = rng(303);
  vgrad(back, 0, 0, W, 216, ['#03010a', '#0a0420', '#150838', '#260c52', '#3e1066', '#5c1470', '#842072', '#b02e6e'], 0.5);
  stars(back, r, 70, 0, 130, [g('#c8a8ff'), g('#f0e0ff'), g('#8ad8ff')]);
  // the soul moon: a pale ring around a dark core
  glow(back, 96, 70, 56, [g('#1a0a40'), g('#2a1260'), g('#3c1c80')]);
  ellipse(back, 96, 70, 26, 26, (i) => (i.q > 0.55 ? g('#bfeaff') : i.q > 0.35 ? g('#6ab0ee') : g('#0a0420')));
  // mist banks
  const rc = rng(4);
  cloud(back, 120, 160, 260, 34, { l: g('#8a2c78'), m: g('#5a1c6c'), s: g('#3a1058') }, rc);
  cloud(back, 380, 150, 240, 30, { l: g('#8a2c78'), m: g('#5a1c6c'), s: g('#3a1058') }, rc);
  // stepped pyramid and obsidian spires with glowing eyes
  const OB = ramp({ d: '#04010a', s: '#0c0418', m: '#180a2c', l: '#2a1648', h: '#432868' });
  for (let i = 0; i < 6; i++) poly(back, [[330 + i * 6, 190 - i * 14], [490 - i * 6, 190 - i * 14], [490 - i * 6, 176 - i * 14], [330 + i * 6, 176 - i * 14]], (p) => shade(OB, p.nx, p.ny, p.nz, p.x, p.y), 0, 3);
  rect(back, 396, 94, 18, 12, OB.m);
  for (const [x, h] of [[30, 120], [170, 150], [226, 108], [290, 138]]) {
    poly(back, [[x, 200], [x + 4, 200 - h], [x + 14, 200 - h - 14], [x + 24, 200 - h], [x + 30, 200]], (p) => shade(OB, p.nx, p.ny, p.nz, p.x, p.y), 0, 5);
    ellipse(back, x + 14, 200 - h + 8, 3.4, 4.2, () => g('#12040c')); ellipse(back, x + 14, 200 - h + 8, 1.4, 1.8, () => g('#ff5a8a'));
  }
  // floating shards of the hat: crown pieces drifting over the void
  const SH = ramp({ d: '#0c0618', s: '#1c1030', m: '#30204c', l: '#4c3270', h: '#6e4c98' });
  const shard = (cx, cy, s, rot) => {
    const base = [[-1, -0.2], [-0.62, -0.95], [-0.1, -0.55], [0.5, -1], [1, -0.1], [0.7, 0.55], [0.1, 0.35], [-0.5, 0.9]];
    const pts = base.map(([x, y]) => [cx + (x * Math.cos(rot) - y * Math.sin(rot)) * s, cy + (x * Math.sin(rot) + y * Math.cos(rot)) * s]);
    poly(back, pts, (p) => shade(SH, p.nx, p.ny, p.nz, p.x, p.y, { dither: true }), 0, 4);
    // fragment of the gold hat band across the shard, with a coin
    const a = [cx + (-0.8 * Math.cos(rot) + 0.1 * Math.sin(rot)) * s, cy + (-0.8 * Math.sin(rot) - 0.1 * Math.cos(rot)) * s];
    const b = [cx + (0.8 * Math.cos(rot) + 0.1 * Math.sin(rot)) * s, cy + (0.8 * Math.sin(rot) - 0.1 * Math.cos(rot)) * s];
    for (const d of [0, 1, 2]) line(back, a[0], a[1] + d, b[0], b[1] + d, d === 0 ? GD.l : d === 1 ? GD.m : GD.s);
    ellipse(back, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1, 2.2, 2.2, (i) => shade(SV, i.nx, i.ny, i.nz, i.x, i.y), 0);
    // purple soul fire licking the underside
    for (let k = 0; k < 6; k++) { const fx = Math.round(cx - s * 0.5 + k * s * 0.2), fy = Math.round(cy + s * 0.7); back.set(fx, fy + 1, g('#a070ff')); back.set(fx, fy + 2, g('#6a3cc0')); if (k % 2) back.set(fx, fy + 3, g('#3a1a80')); }
  };
  shard(150, 96, 30, 0.3); shard(240, 70, 34, -0.2); shard(330, 100, 28, 0.7); shard(62, 134, 18, -0.5); shard(424, 60, 16, 0.9);
  // spectral chains
  const chain = (x0, y0, x1, y1) => { const n = 12; for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 6; ellipse(back, x, y, 2.2, 1.5, () => g(i % 2 ? '#b890ff' : '#7a50d0'), 0); } };
  chain(150, 100, 236, 70); chain(236, 76, 330, 100); chain(330, 106, 420, 62); chain(60, 136, 150, 108);

  // the floating slab we fight on, split in plates
  const rn = noise2(41);
  const FL = ramp({ d: '#05020c', s: '#150a26', m: '#26143e', l: '#3a2260', h: '#50347c' });
  const floorTop = floorSurface(back, FL, rn, 270, 82, 380, [g('#d8c0ff'), g('#8a5ad8'), g('#4a2a8a')]);
  const rk = rng(9);
  for (const x0 of [120, 250, 370]) crack(back, x0, floorTop(x0) + 6, x0 + (rk() - 0.5) * 30, 270, rk, g('#8a50ff'), g('#f0dcff'), g('#0a0420'), 0);
  // glowing runes on the plates
  for (const [x, y] of [[60, 232], [180, 246], [300, 238], [420, 250], [250, 216]]) {
    for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [0, 3], [2, 3], [0, 2]]) back.set(x + dx, y + dy, g('#a070ff'));
    back.set(x + 1, y + 1, g('#f0dcff'));
  }
  // foreground: stone torches with soul-fire (flames are animated at runtime)
  for (const x of [14, 458]) { rect(fg, x - 2, 240, 12, 30, g('#1a0e2c')); rect(fg, x + 6, 240, 4, 30, g('#2e1a4a')); rect(fg, x - 4, 238, 16, 5, g('#3a2060')); rect(fg, x - 4, 238, 16, 1, g('#6a40a8')); }
  for (let x = 0; x < W; x += 8) ellipse(fg, x + 3, 268, 4, 2.4, (i) => (i.ny < 0 ? g('#2a1648') : g('#150a28')), 0);
  return { back, fg };
}

export const STAGES = [stage1, stage2, stage3];

if (process.argv[1].endsWith('stages.mjs') && process.argv[2]) {
  STAGES.forEach((fn, i) => {
    const { back, fg } = fn();
    writePng(`${process.argv[2]}/stage${i + 1}-back.png`, back);
    writePng(`${process.argv[2]}/stage${i + 1}-fg.png`, fg);
  });
  console.log('wrote stages to', process.argv[2]);
}
