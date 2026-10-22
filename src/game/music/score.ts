export type TrackId = 'title' | 'map' | 'ernesto' | 'huesos' | 'macho' | 'victory' | 'defeat' | 'ending';
export type StingerId = 'machoTrouble' | 'machoLaugh' | 'impact' | 'roundWin' | 'ko';
export type Mode = 'minor' | 'major' | 'dorian' | 'phrygian';
export type Instrument = 'pulse' | 'brass' | 'mutedBrass' | 'vihuela' | 'bass' | 'guitar' | 'organ' | 'choir' | 'bell' | 'marimba' | 'pluck' | 'strings' | 'timpani' | 'kick' | 'snare' | 'hat' | 'openHat' | 'crash' | 'shaker' | 'clave' | 'riser';
export type Key = { tonic: string; mode: Mode };
export type Track = { name: string; instrument: Instrument; pattern: string; repeat: number; gain: number; intensity: (0 | 1 | 2)[]; duty?: 0.125 | 0.25 | 0.5 };
export type Section = { name: string; bars: number; loop?: boolean; key?: Key; transpose?: number; crescendo?: boolean; tracks: Track[] };
export type Song = { id: TrackId; title: string; bpm: number; meter: [number, number]; beatQuarters?: number; swing?: number; key: Key; chromatic: Record<number, string>; sections: Section[]; looping: boolean; budget: number };
export type Note = { notes: number[]; beat: number; duration: number };
export const SCALES: Record<Mode, number[]> = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10] };
const PITCHES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function midi(note: string): number {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(note);
  if (!m) throw new Error(`Invalid note: ${note}`);
  return (PITCHES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)) + (Number(m[3]) + 1) * 12;
}
export function noteName(n: number): string { return `${NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`; }
export function chord(symbol: string, octave = 3): string[] {
  const m = /^([A-G][#b]?)(m7|m|maj7|7b9|7|dim|5)?$/.exec(symbol);
  if (!m) throw new Error(`Unknown chord: ${symbol}`);
  const intervals: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], '7': [0, 4, 7, 10], '7b9': [0, 4, 7, 10, 13], dim: [0, 3, 6], '5': [0, 7, 12] };
  return intervals[m[2] ?? ''].map(n => noteName(midi(`${m[1]}${octave}`) + n));
}
export const MACHO_MOTIF = { intervals: [0, 3, 5, 6, 12], rhythm: [0.5, 0.5, 0.5, 0.5, 1.5], rest: 1 } as const;
export function machoMotif(tonic: string, opts: { mode?: 'minor' | 'major' | 'phrygian'; octave?: number; speed?: number } = {}): string {
  const root = midi(`${tonic}${opts.octave ?? 4}`);
  const speed = opts.speed ?? 1;
  if (!(speed > 0) || !Number.isFinite(speed)) throw new Error('Motif speed must be positive');
  // Preserve the identifying blue b5 in every mode; major defeats the minor third.
  return MACHO_MOTIF.intervals.map((n, i) => `${noteName(root + (opts.mode === 'major' && n === 3 ? 4 : n))}:${MACHO_MOTIF.rhythm[i] / speed}`).join(' ') + ` .:${1 / speed}`;
}
export function parse(pattern: string): { events: Note[]; beats: number } {
  let beat = 0;
  const events: Note[] = [];
  for (const token of pattern.trim().split(/\s+/).filter(Boolean)) {
    const [pitch, length, extra] = token.split(':');
    const duration = Number(length);
    if (extra || !Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid token: ${token}`);
    if (pitch !== '.') events.push({ notes: pitch === 'x' ? [] : pitch.split('+').map(midi), beat, duration });
    beat += duration;
  }
  return { events, beats: beat };
}
export function beatsPerBar(song: Song): number { return song.meter[0] * 4 / song.meter[1] / (song.beatQuarters ?? 1); }
export function sectionBeats(song: Song, section: Section): number { return section.bars * beatsPerBar(song); }
export function duration(song: Song, loopOnly = false): number {
  const start = loopOnly ? Math.max(0, song.sections.findIndex(s => s.loop)) : 0;
  return song.sections.slice(start).reduce((n, s) => n + sectionBeats(song, s) * 60 / song.bpm, 0);
}
export const PERCUSSION = new Set<Instrument>(['timpani', 'kick', 'snare', 'hat', 'openHat', 'crash', 'shaker', 'clave', 'riser']);
export type ScoreEvent = { track: Track; section: Section; time: number; duration: number; notes: number[]; gain: number };
export type Recorder = (event: ScoreEvent) => void;
export function scheduleSection(song: Song, section: Section, start: number, record: Recorder): void {
  const seconds = 60 / song.bpm;
  for (const track of section.tracks) {
    const pattern = parse(track.pattern);
    if (Math.abs(pattern.beats * track.repeat - sectionBeats(song, section)) > 1e-8) throw new Error(`${song.id}/${section.name}/${track.name}: pattern does not fill bars`);
    // Normalize chord polyphony; note releases end at their score boundary.
    const polyphony = Math.max(1, ...pattern.events.map(e => e.notes.length));
    for (let r = 0; r < track.repeat; r++) for (const event of pattern.events) {
      const beat = r * pattern.beats + event.beat;
      const swing = song.swing && Math.abs(beat % 1 - 0.5) < 1e-7 ? song.swing : 0;
      record({ track, section, time: start + (beat + swing) * seconds, duration: Math.max(0.001, (event.duration - swing) * seconds), notes: event.notes.map(n => n + (section.transpose ?? 0)), gain: track.gain / polyphony * (section.crescendo ? 0.35 + 0.65 * beat / sectionBeats(song, section) : 1) });
    }
  }
}
export function recordSong(song: Song, record: Recorder, opts: { section?: string; loops?: number } = {}): { duration: number } {
  const start = opts.section ? song.sections.findIndex(s => s.name === opts.section) : 0;
  if (start < 0) throw new Error(`Unknown section: ${opts.section}`);
  const loops = opts.loops ?? 1;
  if (!Number.isInteger(loops) || loops < 1) throw new Error('loops must be a positive integer');
  let time = 0;
  for (let pass = 0; pass < loops; pass++) {
    const from = pass === 0 ? start : Math.max(0, song.sections.findIndex(s => s.loop));
    for (const section of song.sections.slice(from)) {
      scheduleSection(song, section, time, record);
      time += sectionBeats(song, section) * 60 / song.bpm;
    }
  }
  return { duration: time };
}
