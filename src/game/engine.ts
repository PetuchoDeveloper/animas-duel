/**
 * Runs one match: reads keyboard and gamepads, steps the 60 Hz simulation, plays sounds for what
 * happened and asks the renderer to draw. The rules themselves live in sim.ts.
 */

import { createAI } from './ai';
import type { Assets } from './assets';
import { gameAudio } from './audio';
import { Renderer } from './render';
import { NO_INPUT, Sim, TICK_RATE, type GameMode, type Input, type SimEvent, type Slot } from './sim';

type Key = 'left' | 'right' | 'up' | 'down' | 'light' | 'heavy' | 'special' | 'super' | 'dodge';

const P1_KEYS: Record<Key, string[]> = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
  light: ['KeyF'], heavy: ['KeyG'], special: ['KeyV'], dodge: ['KeyH'], super: ['Space'],
};
const P2_KEYS: Record<Key, string[]> = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
  light: ['Comma', 'Numpad1'], heavy: ['Period', 'Numpad2'], special: ['Slash', 'Numpad3'],
  dodge: ['Quote', 'Numpad0'], super: ['Enter', 'NumpadEnter'],
};
/** Against the computer the arrow keys also drive player one, so either hand can steer. */
const SOLO_EXTRA: Partial<Record<Key, string[]>> = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
  light: ['KeyJ'], heavy: ['KeyK'], special: ['KeyL'], dodge: ['KeyU'], super: ['Enter'],
};
const GAME_KEYS = new Set([...Object.values(P1_KEYS), ...Object.values(P2_KEYS), ...Object.values(SOLO_EXTRA)].flat());

export interface MatchOptions {
  p1: string;
  p2: string;
  stage: number;
  mode: GameMode;
  /** El Macho's sabotage in story mode: barrels on the first sombrero, anvils on the second. */
  trouble?: 'barrels' | 'anvils' | null;
  onMatchOver: (winner: Slot) => void;
}

export class FightEngine {
  readonly sim: Sim;
  private renderer: Renderer;
  private ai: ((sim: Sim) => Input) | null = null;
  private held = new Set<string>();
  /** Keys pressed since the last tick, so a tap shorter than one frame still reaches the sim. */
  private tapped = new Set<string>();
  private touch: Partial<Input> = {};
  private paused = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private overReported = false;
  /** Sim ticks of slow motion left after a knockout. */
  private slowTicks = 0;

  constructor(
    canvas: HTMLCanvasElement,
    assets: Assets,
    private opts: MatchOptions,
  ) {
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas is not available');
    this.sim = new Sim({ p1: opts.p1, p2: opts.p2, mode: opts.mode, trouble: opts.trouble });
    this.renderer = new Renderer(ctx, assets, opts.stage, opts.mode);
    this.renderer.setCharacters([opts.p1, opts.p2]);
    if (opts.mode === 'story') this.ai = createAI({ slot: 1, difficulty: Math.min(2, opts.stage) as 0 | 1 | 2, rng: Math.random });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  start(): void {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.held.clear();
    this.tapped.clear();
    this.touch = {};
    gameAudio.duck(paused);
    if (!paused) this.last = performance.now();
  }

  /** Touch buttons feed player one. */
  setTouch(key: keyof Input, down: boolean): void {
    this.touch[key] = down;
  }

  /** Dev/test hook: advance exactly `ticks` simulation ticks with fixed inputs, then redraw. Silent. */
  debugStep(inputs: [Partial<Input>, Partial<Input>], ticks = 1): void {
    const full = (i: Partial<Input>): Input => ({ ...NO_INPUT, ...i });
    for (let n = 0; n < ticks; n++) {
      this.sim.step([full(inputs[0]), full(inputs[1])]);
      this.renderer.update(this.sim);
      this.renderer.consume(this.sim.events, this.sim);
    }
    this.renderer.draw(this.sim);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    gameAudio.duck(false);
  }

  // While paused the pause panel owns the keyboard: Enter and Space must reach its buttons.
  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.paused) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!this.held.has(e.code)) this.tapped.add(e.code);
    this.held.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };
  private onBlur = (): void => {
    this.held.clear();
    this.tapped.clear();
  };

  private frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    if (!this.paused) {
      this.acc = Math.min(this.acc + ((now - this.last) / 1000) * (this.slowTicks > 0 ? 0.3 : 1), 5 / TICK_RATE);
      while (this.acc >= 1 / TICK_RATE) {
        this.acc -= 1 / TICK_RATE;
        this.tick();
      }
    }
    this.last = now;
    this.renderer.draw(this.sim);
  };

  private tick(): void {
    const { sim } = this;
    const solo = this.opts.mode !== 'versus';
    const p1 = this.readInput(P1_KEYS, 0, solo ? SOLO_EXTRA : undefined);
    const p2 = this.ai ? this.ai(sim) : this.opts.mode === 'versus' ? this.readInput(P2_KEYS, 1) : NO_INPUT;
    this.tapped.clear();
    sim.step([p1, p2]);
    if (this.slowTicks > 0) this.slowTicks--;
    this.renderer.update(sim);
    this.renderer.consume(sim.events, sim);
    this.playSounds(sim.events);
    for (const e of sim.events) {
      if (e.type === 'matchEnd' && !this.overReported) {
        this.overReported = true;
        this.opts.onMatchOver(e.winner);
      }
    }
  }

  private readInput(keys: Record<Key, string[]>, pad: number, extra?: Partial<Record<Key, string[]>>): Input {
    const isDown = (c: string) => this.held.has(c) || this.tapped.has(c);
    const down = (k: Key) => keys[k].some(isDown) || (extra?.[k]?.some(isDown) ?? false);
    const input: Input = {
      left: down('left'), right: down('right'), up: down('up'), down: down('down'),
      light: down('light'), heavy: down('heavy'), special: down('special'), dodge: down('dodge'), super: down('super'),
    };
    if (pad === 0) for (const k of Object.keys(this.touch) as Key[]) input[k] ||= this.touch[k] ?? false;
    // against the computer any connected pad drives player one; in versus each player has their own
    const pads = [...(navigator.getGamepads?.() ?? [])];
    const gp = this.opts.mode === 'versus' ? pads[pad] : pads.find((g) => g) ?? null;
    if (gp) {
      const b = (i: number) => gp.buttons[i]?.pressed ?? false;
      input.left ||= gp.axes[0] < -0.4 || b(14);
      input.right ||= gp.axes[0] > 0.4 || b(15);
      input.up ||= gp.axes[1] < -0.6 || b(12);
      input.down ||= gp.axes[1] > 0.6 || b(13);
      input.light ||= b(2);
      input.heavy ||= b(3);
      input.special ||= b(1);
      input.dodge ||= b(0);
      input.super ||= b(7) || b(5);
    }
    return input;
  }

  private playSounds(events: SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'roundStart':
          gameAudio.playAnnouncerCall(e.round === 1 ? 'round1' : e.round === 2 ? 'round2' : 'final_round');
          break;
        case 'fight':
          gameAudio.playAnnouncerCall('ready_fight');
          break;
        case 'swing':
          if (e.state === 'special') gameAudio.playSpecialCast();
          else if (e.state !== 'super') gameAudio.playWhoosh();
          break;
        case 'jump':
        case 'dodge':
          gameAudio.playWhoosh();
          break;
        case 'super':
          gameAudio.playSuperActivate();
          gameAudio.playGuitarChord('E_major');
          break;
        case 'hit':
          if (e.blocked) gameAudio.playBlock();
          else if (e.move === 'light' || e.move === 'air') gameAudio.playLightHit();
          else gameAudio.playHeavyHit();
          if (e.move === 'super' && !e.blocked) gameAudio.playAnnouncerCall('super_finish');
          break;
        case 'ko':
        case 'timeout':
          if (e.type === 'ko') this.slowTicks = 36;
          gameAudio.playAnnouncerCall('ko');
          break;
        case 'matchEnd':
          gameAudio.playAnnouncerCall('victory');
          break;
        default:
      }
    }
  }
}
