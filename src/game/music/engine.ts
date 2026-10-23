import { SONGS } from './songs.ts';
import { machoMotif, midi, parse } from './score.ts';
import type { Key, ScoreEvent, StingerId, TrackId } from './score.ts';
import { stopOutput } from './instruments.ts';
import { fade, musicCompressor, MusicPlayer, scheduleVoice } from './player.ts';

export function stingerScore(id: StingerId, key: Key = { tonic: 'C#', mode: 'minor' }): { duration: number; events: ScoreEvent[] } {
  const duration = id === 'machoTrouble' ? 2.5 : id === 'impact' ? 0.6 : 1.5;
  const bpm = id === 'machoTrouble' ? 108 : 160;
  const root = midi(`${key.tonic}4`);
  const line = id === 'machoTrouble' ? machoMotif(key.tonic, { mode: key.mode === 'major' ? 'major' : key.mode === 'phrygian' ? 'phrygian' : 'minor' }) : '';
  const events: ScoreEvent[] = [];
  const add = (instrument: ScoreEvent['track']['instrument'], notes: number[], time: number, length: number, gain: number) => {
    const track = { name: id, instrument, pattern: 'x:1', repeat: 1, gain, intensity: [0, 1, 2] as (0 | 1 | 2)[] };
    events.push({ track, section: { name: id, bars: 1, tracks: [track] }, notes, time, duration: length, gain });
  };
  if (id === 'machoTrouble') {
    for (const note of parse(line).events) {
      for (const voice of ['brass', 'choir'] as const) add(voice, note.notes, note.beat * 60 / bpm, note.duration * 60 / bpm, 0.12);
    }
  } else if (id === 'machoLaugh') {
    [12, 7, 3, 0].forEach((n, i) => add('mutedBrass', [root + n], i * 0.3, 0.16, 0.2));
    add('timpani', [], 0, 0.55, 0.2);
  } else if (id === 'impact') {
    add('kick', [], 0, 0.6, 0.3); add('crash', [], 0, 0.6, 0.18); add('timpani', [], 0, 0.6, 0.22);
  } else {
    const offsets = id === 'roundWin' ? [0, 4, 7, 12] : [12, 6, 3, 0];
    offsets.forEach((n, i) => add('brass', [root + n], i * 0.22, i === 3 ? 0.8 : 0.18, 0.16));
    add(id === 'ko' ? 'kick' : 'bell', id === 'ko' ? [] : [root + 24], 0, 1.4, 0.12);
  }
  return { duration, events: events.sort((a, b) => a.time - b.time) };
}
/** Owns the two crossfade slots; game-level mute/wanted state lives in audio.ts. */
type StingerSlot = { bus: GainNode; end: number; timer?: ReturnType<typeof setTimeout> };
export class MusicEngine {
  private ctx: BaseAudioContext;
  private music: GainNode;
  private menu: GainNode;
  private ducking: GainNode;
  private stingers: GainNode;
  private current: MusicPlayer | undefined;
  private retiring: MusicPlayer | undefined;
  private intensity: 0 | 1 | 2 = 1;
  private duckUntil = 0;
  private stingerSlots: StingerSlot[] = [];
  constructor(ctx: BaseAudioContext, out: AudioNode) {
    this.ctx = ctx;
    const compressor = musicCompressor(ctx, out);
    this.music = ctx.createGain(); this.menu = ctx.createGain(); this.ducking = ctx.createGain(); this.stingers = ctx.createGain();
    this.music.gain.value = 0.9; this.stingers.gain.value = 1;
    this.music.connect(this.menu); this.menu.connect(this.ducking); this.ducking.connect(compressor); this.stingers.connect(compressor);
  }
  playTrack(id: TrackId, opts: { section?: string; fadeIn?: number } = {}): void {
    const song = SONGS[id];
    if (!song || (opts.section && !song.sections.some(s => s.name === opts.section))) return;
    if (this.current?.active && this.current.song.id === id) {
      if (opts.section && opts.section !== this.current.section) this.current.jumpTo(opts.section);
      return;
    }
    this.retiring?.dispose();
    this.retiring = this.current;
    this.retiring?.stop(opts.fadeIn ?? 0.6);
    this.current = new MusicPlayer(this.ctx, this.music, song, { ...opts, intensity: this.intensity });
  }
  jumpTo(section: string): void {
    if (!this.current?.song.sections.some(s => s.name === section)) return;
    this.current.jumpTo(section);
  }
  stopMusic(fadeOut = 0.8): void {
    this.retiring?.dispose(); this.retiring = this.current; this.current = undefined;
    this.retiring?.stop(fadeOut);
  }
  duck(on: boolean): void { fade(this.menu.gain, this.ctx.currentTime, on ? 0.37 : 1, 0.08); }
  setMusicIntensity(level: 0 | 1 | 2): void { this.intensity = level; this.current?.setIntensity(level); }
  stinger(id: StingerId): void {
    const now = this.ctx.currentTime;
    const player = this.current;
    const section = player?.transport.frames.find(f => f.start <= now && f.end > now)?.section;
    const score = stingerScore(id, section?.key ?? player?.song.key);
    // Bound repeated impact events; each slot owns its source nodes and timer.
    for (const slot of this.stingerSlots.filter(s => s.end <= now)) this.disposeStinger(slot);
    if (this.stingerSlots.length >= 3) this.disposeStinger(this.stingerSlots[0]);
    const bus = this.ctx.createGain(); bus.gain.value = 0.5; bus.connect(this.stingers);
    const slot: StingerSlot = { bus, end: now + score.duration }; this.stingerSlots.push(slot);
    for (const event of score.events) scheduleVoice(this.ctx, bus, { ...event, time: now + event.time });
    slot.timer = setTimeout(() => this.disposeStinger(slot), score.duration * 1000 + 30);
    // Separate gain stages keep menu ducking intact when this envelope releases.
    this.duckUntil = Math.max(this.duckUntil, now + score.duration);
    fade(this.ducking.gain, now, 10 ** (-4 / 20), 0.02);
    this.ducking.gain.setValueAtTime(10 ** (-4 / 20), this.duckUntil);
    this.ducking.gain.linearRampToValueAtTime(1, this.duckUntil + 0.6);
  }
  private disposeStinger(slot: StingerSlot): void {
    if (slot.timer !== undefined) clearTimeout(slot.timer);
    stopOutput(this.ctx, slot.bus); slot.bus.disconnect();
    this.stingerSlots = this.stingerSlots.filter(s => s !== slot);
  }
  silence(): void {
    this.current?.dispose(); this.retiring?.dispose(); this.current = undefined; this.retiring = undefined;
    for (const slot of [...this.stingerSlots]) this.disposeStinger(slot);
    this.duckUntil = this.ctx.currentTime;
    fade(this.ducking.gain, this.ctx.currentTime, 1, 0);
  }
}
