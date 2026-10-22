/**
 * Everything drawn on the 480x270 battle canvas: stage, fighters, effects, HUD and banners.
 * It only reads the simulation; sound and input live in engine.ts.
 */

import { ATLAS, type AnimMeta, type Assets } from './assets';
import { ROSTER, SOMBREROS, SUPER_NAMES } from './roster';
import type { FighterState, GameMode, Sim, SimEvent, SimFighter, Slot } from './sim';

export const W = 480;
export const H = 270;
/** Canvas row of the fighters' feet; matches the stage art in art/stages.mjs. */
export const GROUND = 224;

const FONT = '"Press Start 2P", monospace';
const OFFS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

interface Fx {
  row: string;
  x: number;
  y: number;
  flip: boolean;
  age: number;
  /** Ticks each frame stays on screen. */
  hold: number;
  frames: number;
  scale?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  depth: 0 | 1;
}

interface Banner {
  text: string;
  sub?: string;
  age: number;
  life: number;
  color: string;
}

interface Ghost {
  x: number;
  y: number;
  frame: number;
  anim: string;
  facing: 1 | -1;
  age: number;
}

const ANIM_OF: Record<FighterState, string> = {
  idle: 'idle', walk: 'walk', jump: 'jump', land: 'land', light: 'light', heavy: 'heavy', air: 'air',
  special: 'special', super: 'super', hit: 'hit', block: 'block', dodge: 'dodge', knockdown: 'ko',
  getup: 'getup', ko: 'ko', win: 'win',
};

/** Candle flames in stage 1's foreground art (x, y of the wick tip). */
const CANDLES: [number, number][] = [[21, 237], [33, 247], [451, 247], [461, 235], [11, 253]];
/** Soul-fire torches in stage 3's foreground art. */
const TORCHES: [number, number][] = [[14, 236], [458, 236]];

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export class Renderer {
  private fx: Fx[] = [];
  private dust: Particle[] = [];
  private motes: Particle[] = [];
  private ghosts: Ghost[][] = [[], []];
  private banner: Banner | null = null;
  private shake = 0;
  private flash = 0;
  private flashColor = '#ffffff';
  private bolt: { x: number; age: number } | null = null;
  private nextBolt = 240;
  private lyingTicks = [0, 0];
  private ghostHealth = [100, 100];
  private ghostHold = [0, 0];
  private tick = 0;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private assets: Assets,
    private stage: number,
    private mode: GameMode,
  ) {
    const count = stage === 0 ? 26 : stage === 1 ? 46 : 30;
    for (let i = 0; i < count; i++) this.motes.push(this.newMote(true));
  }

  private newMote(anywhere: boolean): Particle {
    const s = this.stage;
    return {
      x: rand(0, W),
      y: anywhere ? rand(0, H) : s === 0 ? -8 : H + 4,
      vx: s === 0 ? rand(-0.15, 0.35) : rand(-0.2, 0.2),
      vy: s === 0 ? rand(0.18, 0.5) : s === 1 ? rand(-0.9, -0.3) : rand(-0.5, -0.15),
      phase: rand(0, 6.28),
      depth: Math.random() < 0.3 ? 1 : 0,
    };
  }

  // ------------------------------------------------------------------ per-tick state

  /** Reacts to what the sim just did: sparks, dust, banners, shake. */
  consume(events: SimEvent[], sim: Sim): void {
    for (const e of events) {
      switch (e.type) {
        case 'roundStart': {
          const [a, b] = sim.fighters;
          const final = a.roundsWon === 1 && b.roundsWon === 1;
          this.banner = {
            text: final ? 'RONDA FINAL' : `RONDA ${e.round}`,
            sub: e.round === 1 ? SOMBREROS[this.stage].name : undefined,
            age: 0, life: 70, color: '#ffd856',
          };
          break;
        }
        case 'fight':
          this.banner = { text: '¡A LUCHAR!', age: 0, life: 50, color: '#ff5a4a' };
          break;
        case 'hit': {
          const row = e.blocked ? 'sparkBlock' : e.move === 'super' ? 'sparkSuper' : e.move === 'heavy' || e.move === 'special' || e.move === 'projectile' ? 'sparkHeavy' : 'sparkLight';
          const att = sim.fighters[e.attacker];
          this.addFx(row, e.x, GROUND + e.y, att.facing === -1, row === 'sparkSuper' ? 3 : 2);
          this.shake = Math.max(this.shake, e.blocked ? 1 : e.move === 'super' ? 6 : e.knockdown ? 4 : 2);
          if (e.knockdown && !e.blocked) this.addFx('shock', sim.fighters[e.defender].x, GROUND + 4, false, 3);
          break;
        }
        case 'jump':
        case 'land':
          this.addFx('dust', sim.fighters[e.slot].x, GROUND - 14, false, 2);
          break;
        case 'dodge':
          this.addFx('dust', sim.fighters[e.slot].x, GROUND - 14, sim.fighters[e.slot].facing === -1, 2);
          break;
        case 'super':
          this.flash = 8;
          this.flashColor = '#ffffff';
          break;
        case 'ko':
          this.banner = { text: '¡K.O.!', age: 0, life: 110, color: '#ff4a5a' };
          this.flash = 10;
          this.flashColor = '#ffffff';
          this.shake = 7;
          break;
        case 'timeout':
          this.banner = { text: '¡TIEMPO!', age: 0, life: 110, color: '#ffd856' };
          break;
        case 'roundEnd': {
          if (e.winner === 'draw') this.banner = { text: 'EMPATE', age: 0, life: 140, color: '#b4b0c8' };
          else this.banner = { text: ROSTER[sim.fighters[e.winner].charId].name.toUpperCase(), sub: 'GANA LA RONDA', age: 0, life: 140, color: ROSTER[sim.fighters[e.winner].charId].accent };
          break;
        }
        default:
      }
    }
  }

  /** Forget everything transient, for a rematch on the same stage. */
  reset(): void {
    this.fx = [];
    this.ghosts = [[], []];
    this.banner = null;
    this.shake = this.flash = 0;
    this.ghostHealth = [100, 100];
    this.ghostHold = [0, 0];
  }

  private addFx(row: string, x: number, y: number, flip: boolean, hold = 2): void {
    const meta = ATLAS.fx.rows[row];
    this.fx.push({ row, x, y, flip, age: 0, hold, frames: meta.frames });
  }

  /** Advance animation clocks one sim tick. */
  update(sim: Sim): void {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.4);
    if (this.flash > 0) this.flash--;
    if (this.banner && ++this.banner.age > this.banner.life) this.banner = null;
    this.fx = this.fx.filter((f) => ++f.age < f.frames * f.hold);

    sim.fighters.forEach((f, i) => {
      this.lyingTicks[i] = f.lying ? this.lyingTicks[i] + 1 : 0;
      // health bar chip: the pale chunk lingers, then catches up
      if (f.health > this.ghostHealth[i]) this.ghostHealth[i] = f.health;
      else if (f.health < this.ghostHealth[i]) {
        if (this.ghostHold[i] > 0) this.ghostHold[i]--;
        else this.ghostHealth[i] = Math.max(f.health, this.ghostHealth[i] - 0.45);
      }
      if (f.health >= this.ghostHealth[i]) this.ghostHold[i] = 24;
      // afterimages while dashing or powering up
      if (f.state === 'dodge' || (f.state === 'special' && Math.abs(f.vx) > 1.5) || (f.state === 'super' && f.phase !== 'startup')) {
        if (this.tick % 3 === 0) this.ghosts[i].push({ x: f.x, y: f.y, frame: this.frameOf(f).frame, anim: this.frameOf(f).anim, facing: f.facing, age: 0 });
      }
      this.ghosts[i] = this.ghosts[i].filter((g) => ++g.age < 14);
      if (f.state === 'walk' && f.stateTick % 14 === 7) this.addFx('dust', f.x - f.facing * 8, GROUND - 14, f.facing === -1, 2);
    });

    this.animate();
  }

  /** Drifting scenery only (petals, embers, lightning); menus call this on their own. */
  animate(): void {
    this.tick++;
    for (const m of this.motes) {
      m.phase += 0.05;
      m.x += m.vx + (this.stage === 0 ? Math.sin(m.phase) * 0.3 : Math.sin(m.phase) * 0.15);
      m.y += m.vy;
      if (m.y > H + 8 || m.y < -10 || m.x < -8 || m.x > W + 8) Object.assign(m, this.newMote(false));
    }

    if (this.stage === 1) {
      if (this.bolt && ++this.bolt.age > 14) this.bolt = null;
      if (--this.nextBolt <= 0) {
        this.bolt = { x: rand(60, 420), age: 0 };
        this.nextBolt = rand(260, 560);
      }
    }
  }

  // ------------------------------------------------------------------ drawing

  draw(sim: Sim): void {
    const { ctx, assets } = this;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05030c';
    ctx.fillRect(0, 0, W, H);

    const sh = Math.round(this.shake);
    if (sh > 0) ctx.translate(Math.round(rand(-sh, sh)), Math.round(rand(-sh, sh) * 0.6));

    ctx.drawImage(assets.stageBack[this.stage], 0, 0);
    this.drawBackFx();

    const order = [...sim.fighters].sort((a, b) => Number(this.isAttacking(a)) - Number(this.isAttacking(b)));
    for (const f of order) this.drawShadow(f);
    for (const f of order) this.drawGhosts(f.slot);
    for (const f of order) this.drawFighter(f, sim);
    for (const f of order) this.drawSwing(f);
    for (const p of sim.projectiles) this.drawProjectile(p);
    for (const fx of this.fx) this.drawFx(fx);

    ctx.drawImage(assets.stageFg[this.stage], 0, 0);
    this.drawFrontFx();
    ctx.restore();

    if (sim.freeze > 0 && sim.superUser !== null) this.drawSuperCinematic(sim);
    this.drawHud(sim);
    this.drawBanner();
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(0.7, this.flash / 12);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (this.stage === 1 && this.bolt && this.bolt.age < 5) {
      ctx.globalAlpha = 0.35 - this.bolt.age * 0.06;
      ctx.fillStyle = '#e8ddff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  /** Menus: the stage with its drifting petals and flames, no fighters. */
  scenery(dim = 0): void {
    const { ctx, assets } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(assets.stageBack[this.stage], 0, 0);
    if (dim > 0) {
      ctx.fillStyle = `rgb(7 3 18 / ${dim})`;
      ctx.fillRect(0, 0, W, H);
    }
    this.drawBackFx();
    ctx.drawImage(assets.stageFg[this.stage], 0, 0);
    this.drawFrontFx();
  }

  private isAttacking(f: SimFighter): boolean {
    return f.phase !== 'none' || f.state === 'super';
  }

  private drawBackFx(): void {
    const { ctx } = this;
    if (this.stage === 1 && this.bolt) {
      // jagged bolt from the clouds down to the horizon
      ctx.fillStyle = '#f4eaff';
      let x = this.bolt.x;
      for (let y = 20; y < 170; y += 5) {
        x += Math.round(Math.sin(y * 12.9898 + this.bolt.x) * 3);
        if (this.bolt.age < 8) ctx.fillRect(x, y, 2, 5);
      }
    }
    for (const m of this.motes) if (m.depth === 0) this.drawMote(m);
  }

  private drawFrontFx(): void {
    const { ctx } = this;
    for (const m of this.motes) if (m.depth === 1) this.drawMote(m);
    const t = this.tick;
    if (this.stage === 0) {
      for (const [i, [x, y]] of CANDLES.entries()) this.flame(x, y, 3, 5, ['#ff7a1a', '#ffc43a', '#fff2a8'], t + i * 5);
    } else if (this.stage === 2) {
      for (const [i, [x, y]] of TORCHES.entries()) this.flame(x + 3, y, 6, 12, ['#6a3cc0', '#a070ff', '#f0dcff'], t + i * 7);
    }
    ctx.globalAlpha = 1;
  }

  private flame(x: number, y: number, w: number, h: number, colors: string[], t: number): void {
    const { ctx } = this;
    const flick = Math.sin(t * 0.5) * 0.5 + Math.sin(t * 0.83) * 0.5;
    const ht = Math.round(h + flick * 1.5);
    for (let row = 0; row < ht; row++) {
      const u = row / ht;
      const half = Math.max(1, Math.round((w / 2) * Math.sin(Math.PI * Math.min(1, 0.25 + u * 0.85))));
      const lean = Math.round(Math.sin(t * 0.3 + u * 3) * u * 1.2);
      ctx.fillStyle = u > 0.55 ? colors[0] : u > 0.25 ? colors[1] : colors[2];
      ctx.fillRect(Math.round(x - half + lean), Math.round(y - ht + row + 1), half * 2, 1);
    }
  }

  private drawMote(m: Particle): void {
    const { ctx, assets } = this;
    const x = Math.round(m.x), y = Math.round(m.y);
    if (this.stage === 0) {
      const frame = Math.floor(m.phase * 1.3) & 3;
      ctx.drawImage(assets.petals, frame * 10, 0, 10, 10, x, y, 10, 10);
    } else if (this.stage === 1) {
      ctx.fillStyle = Math.floor(m.phase * 3) % 3 === 0 ? '#ffe08a' : '#ff8a2a';
      ctx.fillRect(x, y, 2, 2);
    } else {
      const blink = Math.floor(m.phase * 2) % 2;
      ctx.fillStyle = blink ? '#d8c0ff' : '#8a5ad8';
      ctx.fillRect(x, y, 2, 2);
      ctx.fillStyle = '#4a2a8a';
      ctx.fillRect(x, y + 2, 1, 2);
    }
  }

  private drawShadow(f: SimFighter): void {
    const { ctx } = this;
    const lift = Math.min(1, -f.y / 90);
    const rx = Math.round(15 - lift * 7);
    const x = Math.round(f.x), y = GROUND + 2;
    ctx.fillStyle = 'rgba(5, 2, 12, 0.5)';
    for (let r = -2; r <= 2; r++) {
      const w = Math.round(rx * Math.sqrt(1 - (r / 3) ** 2));
      ctx.fillRect(x - w, y + r, w * 2, 1);
    }
  }

  private frameOf(f: SimFighter): { anim: string; frame: number } {
    const anim = ANIM_OF[f.state];
    const meta = ATLAS.fighters[f.charId].anims[anim] as AnimMeta;
    const n = meta.frames;
    const clamp = (v: number) => Math.max(0, Math.min(n - 1, v));
    switch (f.state) {
      case 'idle':
      case 'block':
      case 'win':
        return { anim, frame: Math.floor((f.stateTick * meta.fps) / 60) % n };
      case 'walk': {
        const i = Math.floor((f.stateTick * meta.fps) / 60) % n;
        return { anim, frame: f.vx * f.facing < -0.1 ? n - 1 - i : i };
      }
      case 'jump':
        return { anim, frame: f.vy < -1.2 ? 0 : f.vy > 1.2 ? 2 : 1 };
      case 'land':
        return { anim, frame: 0 };
      case 'light':
      case 'heavy':
      case 'air':
      case 'special':
      case 'super': {
        const [s0, s1] = meta.strike ?? [1, Math.min(2, n - 1)];
        const t = f.phaseLen > 0 ? f.phaseTick / f.phaseLen : 0;
        if (f.phase === 'startup') return { anim, frame: s0 <= 0 ? 0 : clamp(Math.floor(t * s0)) };
        if (f.phase === 'active') return { anim, frame: clamp(s0 + Math.floor(t * (s1 - s0 + 1))) };
        const rest = n - 1 - s1;
        return { anim, frame: rest <= 0 ? clamp(s1) : clamp(s1 + 1 + Math.min(rest - 1, Math.floor(t * rest))) };
      }
      case 'hit':
        return { anim, frame: f.stateTick < 4 ? 0 : f.stateLen > 0 && f.stateTick > f.stateLen - 5 ? 2 : 1 };
      case 'dodge':
      case 'getup':
        return { anim, frame: clamp(Math.floor((f.stateLen > 0 ? f.stateTick / f.stateLen : 0) * n)) };
      case 'knockdown':
      case 'ko': {
        if (f.lying) return { anim, frame: this.lyingTicks[f.slot] < 7 ? 3 : 4 };
        return { anim, frame: f.vy < 0 ? 0 : f.y > -14 ? 2 : 1 };
      }
      default:
        return { anim, frame: 0 };
    }
  }

  private drawCell(id: string, anim: string, frame: number, x: number, y: number, facing: 1 | -1, white = false, alpha = 1): void {
    const { ctx, assets } = this;
    const a = ATLAS.fighters[id];
    const [cw, ch] = a.cell;
    const [ax, ay] = a.anchor;
    const row = a.anims[anim].row;
    const src = white ? assets.flash[id] : assets.fighters[id];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), 0);
    if (facing === -1) ctx.scale(-1, 1);
    ctx.drawImage(src, frame * cw, row * ch, cw, ch, -ax, Math.round(y) - ay, cw, ch);
    ctx.restore();
  }

  private drawFighter(f: SimFighter, sim: Sim): void {
    const { anim, frame } = this.frameOf(f);
    // a sprite blinks while it is invulnerable after a knockdown, and flashes white on a hit
    const blinkOut = f.invuln && f.state === 'getup' && this.tick % 4 < 2;
    if (blinkOut) return;
    // a body lying in the corner would otherwise be cut off by the screen edge
    const down = f.state === 'knockdown' || f.state === 'ko';
    const x = down ? Math.max(60, Math.min(W - 60, f.x)) : f.x;
    this.drawCell(f.charId, anim, frame, x, GROUND + f.y, f.facing);
    if (f.flash > 0) this.drawCell(f.charId, anim, frame, x, GROUND + f.y, f.facing, true, 0.85);
    if (f.state === 'super' && sim.freeze === 0 && f.phase !== 'recovery') this.drawAura(f);
  }

  private drawAura(f: SimFighter): void {
    const { ctx } = this;
    const color = ROSTER[f.charId].accent;
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i++) {
      const a = this.tick * 0.2 + i * 1.05;
      const x = Math.round(f.x + Math.cos(a) * 20), y = Math.round(GROUND + f.y - 30 + Math.sin(a * 1.3) * 26);
      ctx.fillRect(x, y, 2, 2);
    }
  }

  private drawGhosts(slot: Slot): void {
    const id = this.charIds[slot];
    for (const g of this.ghosts[slot]) this.drawCell(id, g.anim, g.frame, g.x, GROUND + g.y, g.facing, true, 0.28 * (1 - g.age / 14));
  }

  private charIds: [string, string] = ['', ''];
  setCharacters(ids: [string, string]): void {
    this.charIds = ids;
  }

  private drawSwing(f: SimFighter): void {
    if ((f.state !== 'light' && f.state !== 'heavy' && f.state !== 'air') || f.phase !== 'active') return;
    const heavy = f.state === 'heavy';
    const row = `${heavy ? 'slashHeavy' : 'slashLight'}_${f.charId}`;
    const meta = ATLAS.fx.rows[row];
    const idx = Math.min(meta.frames - 1, Math.floor((f.phaseTick / Math.max(1, f.phaseLen)) * meta.frames));
    const reach = heavy ? 28 : 22;
    this.blitFx(row, idx, f.x + f.facing * reach, GROUND + f.y - (f.state === 'air' ? 26 : heavy ? 40 : 36), f.facing === -1);
  }

  private drawProjectile(p: { kind: string; x: number; y: number; facing: 1 | -1; life: number }): void {
    const meta = ATLAS.fx.rows[p.kind];
    if (!meta) return;
    const frame = Math.floor(this.tick / 4) % meta.frames;
    this.blitFx(p.kind, frame, p.x, GROUND + p.y, p.facing === -1);
  }

  private drawFx(f: Fx): void {
    this.blitFx(f.row, Math.min(f.frames - 1, Math.floor(f.age / f.hold)), f.x, f.y, f.flip);
  }

  private blitFx(row: string, frame: number, x: number, y: number, flip: boolean): void {
    const { ctx, assets } = this;
    const size = ATLAS.fx.cell;
    const r = ATLAS.fx.rows[row].row;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(assets.fx, frame * size, r * size, size, size, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // ------------------------------------------------------------------ HUD

  private text(s: string, x: number, y: number, size: number, color: string, opt: { align?: CanvasTextAlign; outline?: string; shadow?: string } = {}): void {
    const { ctx } = this;
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = opt.align ?? 'left';
    ctx.textBaseline = 'top';
    x = Math.round(x);
    y = Math.round(y);
    if (opt.outline) {
      ctx.fillStyle = opt.outline;
      for (const [dx, dy] of OFFS) ctx.fillText(s, x + dx, y + dy);
    }
    if (opt.shadow) {
      ctx.fillStyle = opt.shadow;
      ctx.fillText(s, x + 1, y + 1);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  private drawHud(sim: Sim): void {
    const { ctx, assets } = this;
    const BAR = 190;
    const [p1, p2] = sim.fighters;
    const draw = (f: SimFighter, left: boolean) => {
      const x0 = left ? 12 : W - 12 - BAR;
      const y0 = 17;
      const info = ROSTER[f.charId];
      this.text(info.name.toUpperCase(), left ? x0 : x0 + BAR, 5, 8, info.accent, { align: left ? 'left' : 'right', outline: '#05030c' });
      // frame
      ctx.fillStyle = '#e2b028';
      ctx.fillRect(x0 - 3, y0 - 3, BAR + 6, 18);
      ctx.fillStyle = '#05030c';
      ctx.fillRect(x0 - 1, y0 - 1, BAR + 2, 14);
      const ratio = Math.max(0, f.health) / f.maxHealth;
      const ghost = Math.max(ratio, this.ghostHealth[f.slot] / f.maxHealth);
      const fillRect = (r: number, color: string, top = 0, h = 12) => {
        const w = Math.round(BAR * r);
        ctx.fillStyle = color;
        ctx.fillRect(left ? x0 + BAR - w : x0, y0 + top, w, h);
      };
      fillRect(ghost, '#ff8a76');
      const low = ratio <= 0.25;
      const body = low ? (this.tick % 16 < 8 ? '#e8303c' : '#ff6a5a') : ratio <= 0.5 ? '#f59a1c' : '#f5c12a';
      fillRect(ratio, body);
      fillRect(ratio, low ? '#ff9a8a' : ratio <= 0.5 ? '#ffc060' : '#ffe27a', 0, 3);
      fillRect(ratio, low ? '#8a1424' : ratio <= 0.5 ? '#b25a10' : '#b08410', 9, 3);
      // tick marks every 10%
      ctx.fillStyle = 'rgba(5, 3, 12, 0.55)';
      for (let i = 1; i < 10; i++) ctx.fillRect(x0 + Math.round((BAR * i) / 10) - 1, y0, 1, 12);
      // round pips
      for (let i = 0; i < 2; i++) {
        const img = i < f.roundsWon ? assets.pipWon : assets.pipEmpty;
        ctx.drawImage(img, left ? x0 + i * 18 : x0 + BAR - 16 - i * 18, 34);
      }
      // super gauge
      const my = 251;
      const mx = left ? 12 : W - 12 - 132;
      ctx.fillStyle = '#05030c';
      ctx.fillRect(mx - 2, my - 2, 136, 11);
      ctx.fillStyle = '#46307a';
      ctx.fillRect(mx - 1, my - 1, 134, 9);
      ctx.fillStyle = '#0f0824';
      ctx.fillRect(mx, my, 132, 7);
      const full = f.meter >= 100;
      const mw = Math.round((132 * f.meter) / 100);
      ctx.fillStyle = full ? (this.tick % 10 < 5 ? '#ffffff' : '#e8a0ff') : '#9a50e0';
      ctx.fillRect(left ? mx : mx + 132 - mw, my, mw, 7);
      if (!full) {
        ctx.fillStyle = '#c890ff';
        ctx.fillRect(left ? mx : mx + 132 - mw, my, mw, 2);
      }
      this.text(full ? '¡SUPER!' : 'CALAVERA', left ? mx : mx + 132, my - 11, 8, full ? '#ffd856' : '#b4b0c8', { align: left ? 'left' : 'right', outline: '#05030c' });
      // combo
      if (f.comboHits >= 2) {
        const cx = left ? 14 : W - 14;
        this.text(`${f.comboHits}`, cx, 70, 24, info.accent, { align: left ? 'left' : 'right', outline: '#05030c' });
        this.text('GOLPES', cx, 98, 8, '#f2eee0', { align: left ? 'left' : 'right', outline: '#05030c' });
      }
    };
    draw(p1, true);
    draw(p2, false);

    // timer
    ctx.fillStyle = '#e2b028';
    ctx.fillRect(214, 6, 52, 30);
    ctx.fillStyle = '#0f0824';
    ctx.fillRect(216, 8, 48, 26);
    const t = this.mode === 'training' ? '--' : String(sim.timeLeft).padStart(2, '0');
    const urgent = this.mode !== 'training' && sim.timeLeft <= 10 && sim.phase === 'fight';
    this.text(t, 240, 14, 16, urgent && this.tick % 30 < 15 ? '#ff5a4a' : '#ffd856', { align: 'center', shadow: '#05030c' });
    if (this.mode === 'training') this.text('PRÁCTICA', 240, 40, 8, '#b4b0c8', { align: 'center', outline: '#05030c' });
  }

  private drawBanner(): void {
    const b = this.banner;
    if (!b) return;
    const settle = Math.min(1, b.age / 8);
    const y = Math.round(84 - (1 - settle) * 18);
    const out = b.age > b.life - 8 && b.age % 2 === 0;
    if (out) return;
    const size = b.text.length > 9 ? 24 : 32;
    this.text(b.text, W / 2, y, size, b.color, { align: 'center', outline: '#05030c', shadow: '#05030c' });
    if (b.sub) this.text(b.sub, W / 2, y + size + 10, 8, '#f2eee0', { align: 'center', outline: '#05030c' });
  }

  private drawSuperCinematic(sim: Sim): void {
    const { ctx, assets } = this;
    const f = sim.fighters[sim.superUser as Slot];
    const left = f.slot === 0;
    const info = ROSTER[f.charId];
    const t = 36 - sim.freeze; // 0..36
    ctx.fillStyle = 'rgba(7, 3, 18, 0.6)';
    ctx.fillRect(0, 0, W, H);
    // a band across the screen, speed lines streaking toward the user's side
    const y0 = 66, bh = 108;
    const grow = Math.min(1, t / 5);
    const h = Math.round(bh * grow);
    ctx.fillStyle = '#120a28';
    ctx.fillRect(0, y0 + (bh - h) / 2, W, h);
    ctx.fillStyle = info.accent;
    ctx.fillRect(0, y0 + (bh - h) / 2, W, 2);
    ctx.fillRect(0, y0 + (bh + h) / 2 - 2, W, 2);
    if (grow < 1) return;
    ctx.fillStyle = info.color;
    for (let i = 0; i < 18; i++) {
      const y = y0 + 6 + ((i * 37) % (bh - 12));
      const len = 30 + ((i * 29) % 80);
      const span = W + len;
      const x = ((i * 71 + t * 46) % span);
      ctx.fillRect(left ? W - x : x - len, y, len, 1 + (i % 3 === 0 ? 1 : 0));
    }
    // portrait pops out of the band on the user's side
    const { size, moods, order } = ATLAS.portraits;
    const slide = Math.min(1, (t - 5) / 5);
    const pw = size * 2;
    const px = left ? Math.round(10 - (1 - slide) * (pw + 20)) : Math.round(W - 10 - pw + (1 - slide) * (pw + 20));
    ctx.save();
    if (!left) {
      ctx.translate(px + pw, 0);
      ctx.scale(-1, 1);
    } else ctx.translate(px, 0);
    ctx.drawImage(assets.portraits, moods.indexOf('shout') * size, order.indexOf(f.charId) * size, size, size, 0, y0 - 10, pw, pw);
    ctx.restore();
    const tx = left ? 160 : W - 160;
    const align = left ? 'left' : 'right';
    this.text(SUPER_NAMES[f.charId].toUpperCase(), tx, y0 + 38, 16, '#ffd856', { align, outline: '#05030c', shadow: '#05030c' });
    this.text(info.name.toUpperCase(), tx, y0 + 64, 8, info.accent, { align, outline: '#05030c' });
  }
}
