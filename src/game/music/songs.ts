import { beatsPerBar, chord, machoMotif, midi, noteName, parse } from './score.ts';
import type { Instrument, Key, Section, Song, Track, TrackId } from './score.ts';

const all: (0 | 1 | 2)[] = [0, 1, 2];
function track(name: string, instrument: Instrument, pattern: string, beats: number, gain = 0.045, intensity: (0 | 1 | 2)[] = [1, 2]): Track {
  const ratio = beats / parse(pattern).beats;
  const repeat = Math.round(ratio);
  if (Math.abs(ratio - repeat) > 1e-8) throw new Error(`Non-integral phrase: ${name}`);
  return { name, instrument, pattern, repeat, gain, intensity };
}
const harmony = (symbols: string[], beat: number, octave = 3) => symbols.map(s => `${chord(s, octave).join('+')}:${beat}`).join(' ');
function fillDrums(pattern: string, bars: number, perBar: number, fill = false): string {
  const result = Array.from({ length: bars }, () => pattern);
  if (fill) result[bars - 1] = Array.from({ length: perBar * 8 }, () => 'x:0.125').join(' ');
  return result.join(' ');
}
// A score is assembled by phrase, never by random pitch selection. Each lead has a
// distinct original contour; secondary voices answer in the spaces between calls.
export const MAP_HERO = 'D4:0.5 F4:0.5 A4:1 B4:0.5 A4:0.5 E4:1 F4:1 E4:0.5 D4:0.5 A3:1 .:1';
const ERNESTO = 'D5:0.5 F5:0.5 A5:1 G5:0.5 F5:0.5 E5:1 D5:0.5 A4:0.5 C5:0.5 E5:0.5 F5:1 .:1';
const HUESOS = 'E5:0.5 B4:0.5 F5:0.5 E5:0.5 G5:0.5 F5:0.5 B4:0.5 .:0.5';
const TITLE = 'A4:1 E5:0.5 C5:0.5 B4:1 A4:1 E4:0.5 G4:0.5 A4:1 C5:1 .:1';
const THIRD = 'F5:0.5 A5:0.5 C6:1 Bb5:0.5 A5:0.5 G5:1 F5:0.5 C5:0.5 E5:0.5 G5:0.5 A5:1 .:1';
const motifPhrase = (tonic: string, beats: number, octave = 4, mode: 'minor' | 'major' | 'phrygian' = 'minor', speed = 1) => `${machoMotif(tonic, { octave, mode, speed })} .:${beats - 4.5 / speed}`;
function quoteAtEnd(base: string, beats: number, phrase: string, quoteBeats: number): string {
  const before = beats - quoteBeats;
  const length = parse(base).beats;
  if (before % length !== 0) throw new Error('Quote must follow complete phrases');
  return [...Array.from({ length: before / length }, () => base), phrase].join(' ');
}
function createSong(id: TrackId, title: string, bpm: number, meter: [number, number], key: Key, looping = true): Song {
  return { id, title, bpm, meter, key, looping, sections: [], chromatic: {}, budget: 0.68 };
}
function section(song: Song, name: string, bars: number, opts: { chords: string[]; lead?: string; voice?: Instrument; transpose?: number; key?: Key; loop?: boolean; sparse?: boolean; build?: boolean; final?: boolean; half?: boolean }): Section {
  const bpb = beatsPerBar(song), beats = bars * bpb;
  const tracks: Track[] = [];
  const add = (name: string, voice: Instrument, pattern: string, gain = 0.045, levels: (0 | 1 | 2)[] = [1, 2]) => tracks.push(track(name, voice, pattern, beats, gain, levels));
  const roots = opts.chords.map(c => /^([A-G][#b]?)/.exec(c)![1]);
  const bass = roots.map(r => bpb === 2 ? `${r}2:0.75 ${r}3:0.25 ${r}2:0.5 .:0.5` : `${r}2:0.75 .:0.25 ${r}3:0.5 ${r}2:0.5 .:0.5 ${r}2:0.5 ${r}3:0.5 .:0.5`).join(' ');
  const chords = harmony(opts.chords, bpb);
  const chops = opts.chords.map(c => bpb === 2 ? `.:0.5 ${chord(c).join('+')}:0.5 .:0.5 ${chord(c).join('+')}:0.5` : `.:0.5 ${chord(c).join('+')}:0.5 .:0.5 ${chord(c).join('+')}:0.5 .:0.5 ${chord(c).join('+')}:0.5 .:0.5 ${chord(c).join('+')}:0.5`).join(' ');
  if (opts.lead) add('lead', opts.voice ?? 'brass', opts.lead, opts.sparse ? 0.042 : 0.065, all);
  if (song.id === 'title') {
    const arp = opts.chords.map(c => chord(c, 3).concat(chord(c, 4)[0]).map(n => `${n}:1`).join(' ')).join(' ');
    add('petal arpeggio', 'vihuela', arp, 0.052, all);
    add('candle pad', 'choir', chords, 0.042, all);
    if (!opts.sparse) { add('guitarrón', 'bass', bass, 0.055, all); add('trumpet swell', 'brass', `.:4 ${chord(opts.chords[0], 4).join('+')}:4`, 0.04, [2]); }
  } else if (song.id === 'map') {
    add('walking road bass', 'bass', roots.map(r => `${r}2:1 ${noteName(midi(`${r}2`) + 7)}:1 ${r}3:1 ${r}2:1`).join(' '), 0.052, all);
    add('plucked response', 'pluck', '.:2 A4:0.5 G4:0.5 E4:1 .:4', 0.035, [2]);
    add('warm horizon', 'choir', chords, 0.034, all);
    add('shaker', 'shaker', 'x:0.5 x:0.5', 0.023, all);
    add('son clave', 'clave', 'x:0.75 .:0.75 x:0.5 .:0.5 x:0.5 .:1', 0.032);
  } else if (song.id === 'ernesto') {
    add('vihuela offbeats', 'vihuela', chops, 0.055, all);
    add('guitarrón', 'bass', opts.half ? roots.map(r => `${r}2:2 ${r}3:2`).join(' ') : bass, 0.072, all);
    if (!opts.sparse) {
      add('thirds answer', 'brass', THIRD, 0.042, [2]);
      add('pulse reply', 'pulse', '.:2 A4:0.5 C5:0.5 E5:1 .:1 F5:0.5 E5:0.5 D5:1 .:1', 0.037, [2]);
      add('rock kick', 'kick', 'x:1 .:0.5 x:0.5 .:1 x:0.5 .:0.5', 0.064, all);
      add('backbeat and fill', 'snare', fillDrums('.:1 x:1 .:1 x:1', bars, bpb, true), 0.052);
      add('cymbal motion', 'hat', 'x:0.5 x:0.5', 0.023);
      add('section crash', 'crash', `x:0.25 .:${beats - 0.25}`, 0.042, [2]);
      if (opts.build) add('skull riser', 'riser', `x:${beats}`, 0.038);
    }
  } else if (song.id === 'huesos') {
    add('funeral organ', 'organ', chords, 0.052, all);
    if (!opts.sparse) {
      add('spectral ah', 'choir', chords, 0.038);
      const subdivision = name === 'chase' || opts.final ? 0.125 : 0.25;
      add('hurried strings', 'strings', opts.chords.map(c => Array.from({ length: Math.round(bpb / subdivision) }, (_, i) => `${chord(c, 3)[i % 3]}:${subdivision}`).join(' ')).join(' '), 0.034, [2]);
      add('clockwork pluck', 'pluck', opts.chords.map(c => [...chord(c, 4).slice(0, 3), chord(c, 5)[0]].map(n => `${n}:0.5`).join(' ')).join(' '), 0.042);
      add('timpani downbeat', 'timpani', 'x:0.5 .:1.5', 0.065, all);
      add('scythe sweep', 'riser', `.:${beats - 1} x:1`, 0.036, [2]);
      add('compound shaker', 'shaker', 'x:0.3333333333333333 x:0.3333333333333333 x:0.3333333333333333 x:0.3333333333333333 x:0.3333333333333333 x:0.3333333333333333', 0.023);
    }
  } else if (song.id === 'macho') {
    add('arena choir', 'choir', chops, 0.05, all);
    if (!opts.sparse) {
      const riff = motifPhrase('C#', 8, 2, 'minor', 2);
      add('power riff', 'guitar', riff.split(' ').map(t => { const [n, d] = t.split(':'); return n === '.' ? t : `${n}+${noteName(midi(n) + ((midi(n) - midi('C#2')) % 12 === 6 ? 12 : 7))}:${d}`; }).join(' '), 0.078, all);
      add('double bass', 'bass', riff, 0.065, all);
      add('hero response', 'pulse', '.:4 E5:0.5 F#5:0.5 B5:1 A5:0.5 G#5:0.5 E5:1', 0.038, [2]);
      add('double kick', 'kick', 'x:0.5 x:0.5 .:0.5 x:0.5 x:0.5 x:0.5 .:0.5 x:0.5', 0.058, all);
      add('snare and roll', 'snare', fillDrums('.:1 x:1 .:1 x:1', bars, bpb, true), 0.045);
      add('steel hats', 'hat', 'x:0.25 x:0.25', 0.022);
      add('entrance timpani', 'timpani', 'x:1 .:3', 0.045, [2]);
      add('arena crash', 'crash', `x:0.25 .:${beats - 0.25}`, 0.033, [2]);
    }
  }
  for (const track of tracks) if (track.instrument === 'pulse') track.duty = name === 'verse' ? 0.125 : name === 'build' ? 0.25 : 0.5;
  if (opts.final) for (const track of tracks) if (track.intensity.includes(2) && !track.intensity.includes(1)) track.intensity = [1, 2];
  const s: Section = { name, bars, loop: opts.loop, key: opts.key, transpose: opts.transpose, crescendo: opts.build || (song.id === 'macho' && opts.sparse), tracks };
  song.sections.push(s);
  return s;
}

const title = createSong('title', 'Cempasúchil', 92, [4, 4], { tonic: 'A', mode: 'minor' });
title.chromatic = { 6: 'El Macho blue b5 in the final two bars only' };
section(title, 'petals', 8, { chords: ['Am', 'F', 'C', 'G'], lead: TITLE, voice: 'bell', loop: true });
section(title, 'relative-major', 8, { chords: ['C', 'G', 'Am', 'F'], lead: 'C5:1 G5:1 E5:0.5 D5:0.5 C5:1 E5:1 D5:1 G4:1 .:1', voice: 'brass', key: { tonic: 'C', mode: 'major' } });
section(title, 'shadow', 8, { chords: ['Am', 'F', 'Dm', 'Am'], lead: quoteAtEnd(TITLE, 32, motifPhrase('A', 8, 3), 8), voice: 'bell', sparse: true });

const map = createSong('map', 'El Camino de Pétalos', 108, [4, 4], { tonic: 'D', mode: 'dorian' });
map.swing = 0.06;
map.chromatic = { 6: 'Ab diminished chord and low El Macho b5 foreshadowing' };
section(map, 'road', 8, { chords: ['Dm', 'G', 'C', 'Dm'], lead: MAP_HERO, voice: 'marimba', loop: true });
section(map, 'lanterns', 8, { chords: ['F', 'G', 'Dm', 'C'], lead: 'A4:0.5 B4:0.5 D5:1 E5:1 D5:1 C5:0.5 A4:0.5 G4:1 F4:1 .:1', voice: 'marimba' });
const mapShadow = section(map, 'distant-mask', 8, { chords: ['Dm', 'G', 'Dm', 'Dm'], lead: quoteAtEnd(MAP_HERO, 32, motifPhrase('D', 16, 3), 16), voice: 'marimba' });
// Keep the last four bars on the explicit D–F–Ab diminished warning chord.
mapShadow.tracks.push(track('tritone warning', 'pluck', `.:16 ${chord('Ddim', 3).join('+')}:4 ${chord('Ddim', 3).join('+')}:4 ${chord('Ddim', 3).join('+')}:4 ${chord('Ddim', 3).join('+')}:4`, 32, 0.038));

const ernesto = createSong('ernesto', 'Serenata de Ultratumba', 148, [4, 4], { tonic: 'D', mode: 'minor' });
ernesto.chromatic = { 11: 'C# leading tone in A7b9: dominant of D harmonic minor' };
section(ernesto, 'intro', 2, { chords: ['Dm', 'A7b9'], lead: ERNESTO });
section(ernesto, 'verse', 16, { chords: ['Dm', 'Bb', 'Gm', 'A7b9'], lead: ERNESTO, loop: true });
section(ernesto, 'chorus', 16, { chords: ['Dm', 'F', 'Bb', 'A7b9'], lead: 'A5:1 F5:0.5 E5:0.5 D5:1 C5:1 F5:0.5 G5:0.5 A5:1 E5:0.5 C#5:0.5 D5:1' });
section(ernesto, 'breakdown', 8, { chords: ['Dm', 'Bb', 'Gm', 'A7b9'], sparse: true, half: true });
section(ernesto, 'build', 8, { chords: ['Gm', 'Bb', 'A7b9', 'A7b9'], lead: ERNESTO, voice: 'pulse', build: true });
section(ernesto, 'final', 16, { chords: ['Dm', 'F', 'Bb', 'A7b9'], lead: ERNESTO, transpose: 2, key: { tonic: 'E', mode: 'minor' }, final: true });

const huesos = createSong('huesos', 'Cosecha de Almas', 78, [6, 8], { tonic: 'E', mode: 'phrygian' });
huesos.beatQuarters = 1.5;
huesos.chromatic = { 2: 'F# in B7: E harmonic-minor dominant', 11: 'D# harmonic-minor cadence', 6: 'The one whispered El Macho quotation' };
section(huesos, 'intro', 4, { chords: ['Em', 'F', 'Em', 'B7'], lead: HUESOS, voice: 'bell' });
section(huesos, 'verse', 16, { chords: ['Em', 'F', 'Am', 'Em'], lead: HUESOS, voice: 'bell', loop: true });
section(huesos, 'chorus', 16, { chords: ['Em', 'C', 'F', 'B7'], lead: 'B5:0.5 G5:0.5 F5:0.5 E5:0.5 D#5:0.5 B4:0.5 E5:0.5 .:0.5', voice: 'bell' });
section(huesos, 'breakdown', 8, { chords: ['Em', 'F', 'Em', 'B7'], lead: quoteAtEnd(HUESOS, 16, motifPhrase('E', 8, 4, 'phrygian'), 8), voice: 'bell', sparse: true });
section(huesos, 'chase', 16, { chords: ['Em', 'F', 'Am', 'B7'], lead: HUESOS, voice: 'bell', transpose: 3, key: { tonic: 'G', mode: 'phrygian' } });
section(huesos, 'final', 16, { chords: ['Em', 'C', 'F', 'B7'], lead: HUESOS, voice: 'bell', transpose: 3, key: { tonic: 'G', mode: 'phrygian' }, final: true });

const macho = createSong('macho', '¡El Rey del Cuadrilátero!', 168, [4, 4], { tonic: 'C#', mode: 'minor' });
macho.chromatic = { 6: 'Signature blue b5 of the villain motif' };
section(macho, 'intro', 2, { chords: ['C#m', 'C#m'], lead: motifPhrase('C#', 8), voice: 'brass' });
section(macho, 'riff', 16, { chords: ['C#m', 'A', 'E', 'B'], lead: motifPhrase('C#', 8, 3), voice: 'guitar', loop: true });
section(macho, 'verse', 16, { chords: ['C#m', 'B', 'A', 'G#m'], lead: motifPhrase('C#', 8, 4, 'minor', 2), voice: 'pulse' });
section(macho, 'chorus', 16, { chords: ['C#m', 'A', 'E', 'B'], lead: motifPhrase('C#', 8), voice: 'brass' });
section(macho, 'breakdown', 8, { chords: ['C#m', 'A', 'C#m', 'G#m'], lead: motifPhrase('C#', 8, 3, 'minor', 0.75), voice: 'brass', sparse: true });
section(macho, 'bridge', 16, { chords: ['C#m', 'A', 'E', 'B'], lead: motifPhrase('C#', 8), transpose: 3, key: { tonic: 'E', mode: 'minor' } });
section(macho, 'final', 16, { chords: ['C#m', 'A', 'E', 'B'], lead: motifPhrase('C#', 8), transpose: 5, key: { tonic: 'F#', mode: 'minor' }, final: true });

const victory = createSong('victory', 'Corona de flores', 128, [4, 4], { tonic: 'C', mode: 'major' }, false);
victory.sections = [{ name: 'fanfare', bars: 4, tracks: [track('trumpets', 'brass', 'C5+E5:0.5 G5+B5:0.5 C6+E6:1 .:2 F5+A5:1 E5+G5:1 D5+F5:1 G5+B5:1 C5+E5+G5:8', 16, 0.12, all), track('timpani', 'timpani', 'x:1 .:3', 16, 0.09, all), track('crown bell', 'bell', '.:8 C6:8', 16, 0.08, all)] }];
const defeat = createSong('defeat', 'Pétalos caídos', 80, [4, 4], { tonic: 'A', mode: 'minor' }, false);
defeat.sections = [{ name: 'fall', bars: 2, tracks: [track('falling guitar', 'vihuela', 'A3:1 G3:1 F3:1 E3:1 D3:1 C3:1 A2:2', 8, 0.1, all), track('low brass', 'mutedBrass', 'A2+C3+E3:4 A1+C2+E2:4', 8, 0.1, all)] }];
const ending = createSong('ending', 'Cuando vuelve la luz', 80, [4, 4], { tonic: 'C', mode: 'major' }, false);
ending.chromatic = { 6: 'The defeated villain retains his blue note, with a major third' };
ending.sections = [
  { name: 'dawn', bars: 4, tracks: [track('guitar', 'vihuela', 'C4:1 E4:1 G4:1 E4:1 F4:1 A4:1 C5:1 A4:1', 16, 0.055, all), track('pad', 'choir', harmony(['C', 'F', 'Am', 'G'], 4), 16, 0.045, all)] },
  { name: 'home', bars: 4, tracks: [track('hero of the road', 'marimba', 'C4:0.5 E4:0.5 G4:1 A4:0.5 G4:0.5 D4:1 E4:1 D4:0.5 C4:0.5 G3:1 .:1', 16, 0.07, all), track('brass lift', 'brass', harmony(['C', 'F', 'Am', 'G'], 4, 4), 16, 0.07, all), track('bass', 'bass', 'C2:4 F2:4 A2:4 G2:4', 16, 0.06, all)] },
  { name: 'unmasked', bars: 4, tracks: [track('defeated motif', 'mutedBrass', motifPhrase('C', 16, 3, 'major', 0.5), 16, 0.06, all), track('compassion', 'choir', harmony(['C', 'Am', 'F', 'G'], 4), 16, 0.05, all)] },
  { name: 'resolve', bars: 4, tracks: [track('last trumpet', 'brass', 'F4+A4:2 G4+B4:2 E4+G4:4 D4+G4:4 C4+E4+G4:4', 16, 0.08, all), track('last bell', 'bell', '.:12 C6:4', 16, 0.05, all), track('home guitar', 'vihuela', harmony(['F', 'C', 'G', 'C'], 4), 16, 0.055, all)] },
];
export const SONGS: Record<TrackId, Song> = { title, map, ernesto, huesos, macho, victory, defeat, ending };
