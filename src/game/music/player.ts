import { beatsPerBar, recordSong, scheduleSection, sectionBeats } from './score.ts';
import type { ScoreEvent, Section, Song, Track } from './score.ts';
import { playInstrument, stopOutput, advanceVoiceClock } from './instruments.ts';

export function scheduleVoice(ctx: BaseAudioContext, out: AudioNode, event: ScoreEvent): void {
  const notes = event.notes.length ? event.notes : [45];
  notes.forEach((note, i) => {
    const delay = event.track.instrument === 'vihuela' ? Math.min(i * 0.011, event.duration * 0.25) : 0;
    playInstrument(ctx, out, event.track.instrument, event.time + delay, event.duration - delay, 440 * 2 ** ((note - 69) / 12), { gain: event.gain, duty: event.track.duty });
  });
}
export function musicCompressor(ctx: BaseAudioContext, out: AudioNode): DynamicsCompressorNode {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18; compressor.ratio.value = 3.5; compressor.knee.value = 12;
  compressor.attack.value = 0.008; compressor.release.value = 0.16; compressor.connect(out);
  return compressor;
}
/** Offline times are absolute from zero; use a fresh context. No timers or browser globals. */
export function renderSong(ctx: BaseAudioContext, out: AudioNode, song: Song, opts: { section?: string; loops?: number } = {}): { duration: number } {
  const compressor = musicCompressor(ctx, out), bus = ctx.createGain();
  bus.gain.value = 0.9; bus.connect(compressor);
  const events: ScoreEvent[] = [];
  const result = recordSong(song, event => events.push(event), opts);
  const gains = new Map<Track, GainNode>();
  for (const event of events.sort((a, b) => a.time - b.time)) {
    let channel = gains.get(event.track);
    if (!channel) { channel = ctx.createGain(); channel.connect(bus); gains.set(event.track, channel); }
    advanceVoiceClock(ctx, event.time);
    scheduleVoice(ctx, channel, event);
  }
  // Nodes belong to this offline context; per-voice sources disconnect onended.
  return result;
}
export type Frame = { section: Section; start: number; end: number };
/** Pure transport shared by live playback and recorder tests. Scheduled futures can
 * be invalidated when a bar jump lands inside the scheduler's look-ahead window. */
export class Transport {
  readonly song: Song;
  frames: Frame[] = [];
  private index: number;
  private next: number;
  constructor(song: Song, start: number, section?: string) {
    this.song = song; this.next = start;
    this.index = section ? song.sections.findIndex(s => s.name === section) : 0;
    if (this.index < 0) throw new Error(`Unknown section: ${section}`);
  }
  extend(horizon: number): Frame[] {
    const added: Frame[] = [];
    while (this.next < horizon && this.index < this.song.sections.length) {
      const section = this.song.sections[this.index];
      const frame = { section, start: this.next, end: this.next + sectionBeats(this.song, section) * 60 / this.song.bpm };
      this.frames.push(frame); added.push(frame); this.next = frame.end;
      this.index++;
      if (this.index === this.song.sections.length && this.song.looping) this.index = Math.max(0, this.song.sections.findIndex(s => s.loop));
    }
    return added;
  }
  nextBar(now: number): number {
    const frame = this.frames.find(f => f.start <= now + 1e-9 && f.end > now + 1e-9) ?? this.frames.find(f => f.start > now);
    const origin = frame?.start ?? this.next;
    const bar = beatsPerBar(this.song) * 60 / this.song.bpm;
    if (origin > now) return origin;
    return origin + (Math.floor((now - origin + 1e-8) / bar) + 1) * bar;
  }
  jump(section: string, now: number): number | undefined {
    const index = this.song.sections.findIndex(s => s.name === section);
    if (index < 0) return undefined;
    const at = this.nextBar(now);
    this.frames = this.frames.filter(f => f.start < at);
    for (const frame of this.frames) if (frame.end > at) frame.end = at;
    this.index = index; this.next = at;
    return at;
  }
  prune(now: number): void { this.frames = this.frames.filter(f => f.end > now); }
  get ended(): boolean { return !this.song.looping && this.index >= this.song.sections.length; }
}
type LiveFrame = { frame: Frame; events: ScoreEvent[]; cursor: number; channels: Map<Track, GainNode> };
export function fade(param: AudioParam, time: number, target: number, duration: number): void {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(time);
  else { const current = param.value; param.cancelScheduledValues(time); param.setValueAtTime(current, time); }
  param.linearRampToValueAtTime(target, time + Math.max(0, duration));
}
export class MusicPlayer {
  readonly song: Song;
  readonly bus: GainNode;
  readonly transport: Transport;
  private ctx: BaseAudioContext;
  private live: LiveFrame[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private fadeEnd = Infinity;
  private disposed = false;
  private jumpTarget: { section: string; at: number } | undefined;
  private level: 0 | 1 | 2;
  private pendingLevel: { at: number; level: 0 | 1 | 2 } | undefined;
  constructor(ctx: BaseAudioContext, out: AudioNode, song: Song, opts: { section?: string; fadeIn?: number; intensity?: 0 | 1 | 2 } = {}) {
    this.ctx = ctx; this.song = song; this.level = opts.intensity ?? 1;
    this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.connect(out);
    this.transport = new Transport(song, ctx.currentTime + 0.03, opts.section);
    fade(this.bus.gain, ctx.currentTime, 1, opts.fadeIn ?? 0.6);
    this.tick(); this.timer = setInterval(() => this.tick(), 25);
  }
  get active(): boolean { return !this.disposed; }
  get section(): string | undefined {
    if (this.jumpTarget && this.ctx.currentTime < this.jumpTarget.at) return this.jumpTarget.section;
    return this.transport.frames.find(f => f.end > this.ctx.currentTime)?.section.name;
  }
  private disposeFrame(frame: LiveFrame, at: number): void {
    for (const channel of frame.channels.values()) { stopOutput(this.ctx, channel, at); channel.disconnect(); }
  }
  private tick(): void {
    if (this.disposed) return;
    const now = this.ctx.currentTime;
    if (now >= this.fadeEnd) { this.dispose(); return; }
    if (this.pendingLevel && now >= this.pendingLevel.at) { this.level = this.pendingLevel.level; this.pendingLevel = undefined; }
    // A backgrounded tab skips missed bars rather than bursting stale notes.
    // Transport remains on the original absolute clock.
    for (const frame of this.transport.extend(now + 0.18)) {
      if (frame.end <= now) continue;
      const events: ScoreEvent[] = [];
      scheduleSection(this.song, frame.section, frame.start, event => events.push(event));
      const live: LiveFrame = { frame, events: events.sort((a, b) => a.time - b.time), cursor: 0, channels: new Map() };
      for (const track of frame.section.tracks) {
        const channel = this.ctx.createGain(); channel.gain.value = track.intensity.includes(this.level) ? 1 : 0; channel.connect(this.bus);
        if (this.pendingLevel) this.mix(channel, track, this.pendingLevel.at, this.pendingLevel.level);
        live.channels.set(track, channel);
      }
      this.live.push(live);
    }
    for (const live of this.live) {
      while (live.cursor < live.events.length && live.events[live.cursor].time < now + 0.18) {
        const event = live.events[live.cursor++];
        if (event.time >= live.frame.end || event.time < now - 0.025) continue;
        scheduleVoice(this.ctx, live.channels.get(event.track)!, { ...event, time: Math.max(now, event.time), duration: Math.min(event.duration, live.frame.end - Math.max(now, event.time)) });
      }
    }
    this.live = this.live.filter(live => { if (live.frame.end <= now) { this.disposeFrame(live, now); return false; } return true; });
    this.transport.prune(now);
    if (this.transport.ended && !this.live.length) this.dispose();
  }
  jumpTo(section: string): void {
    if (!this.active) return;
    const at = this.transport.jump(section, this.ctx.currentTime);
    if (at === undefined) return;
    this.jumpTarget = { section, at };
    for (const live of this.live) {
      if (live.frame.end > at || live.frame.start >= at) live.frame.end = at;
      for (const channel of live.channels.values()) {
        // Already queued notes after the bar are silent, even if the jump is
        // requested only milliseconds before that bar.
        fade(channel.gain, Math.max(this.ctx.currentTime, at - 0.006), 0, 0.006);
        stopOutput(this.ctx, channel, at);
      }
    }
    this.tick();
  }
  private mix(channel: GainNode, track: Track, at: number, level: 0 | 1 | 2): void { fade(channel.gain, at, track.intensity.includes(level) ? 1 : 0, 0.025); }
  setIntensity(level: 0 | 1 | 2): void {
    const at = this.transport.nextBar(this.ctx.currentTime);
    this.pendingLevel = { at, level };
    for (const live of this.live) for (const [track, channel] of live.channels) this.mix(channel, track, at, level);
  }
  stop(seconds = 0.8): void {
    this.fadeEnd = Math.min(this.fadeEnd, this.ctx.currentTime + Math.max(0, seconds));
    fade(this.bus.gain, this.ctx.currentTime, 0, Math.max(0, this.fadeEnd - this.ctx.currentTime));
    if (seconds <= 0) this.dispose();
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.timer !== undefined) clearInterval(this.timer);
    for (const live of this.live) this.disposeFrame(live, this.ctx.currentTime);
    this.live = []; this.bus.disconnect();
  }
}
