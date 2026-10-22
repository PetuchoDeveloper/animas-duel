import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, MACHO_MOTIF, machoMotif, parse, midi, noteName, beatsPerBar, sectionBeats, duration, SCALES, PERCUSSION, recordSong, scheduleSection, Transport, MusicPlayer, MusicEngine, stingerScore, renderSong } from './music/index.ts';
import type { Song, ScoreEvent, TrackId } from './music/index.ts';

const ranges: Record<TrackId, [number, number]> = { title: [56, 72], map: [48, 64], ernesto: [100, 130], huesos: [100, 130], macho: [110, 140], victory: [6, 9], defeat: [5, 7], ending: [40, 55] };
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('every complete score parses, fills every bar, and meets both pass and loop duration contracts', () => {
  assert.deepEqual(Object.keys(SONGS).sort(), Object.keys(ranges).sort());
  for (const song of Object.values(SONGS)) {
    assert.ok(song.bpm > 0);
    assert.ok(song.sections.length);
    assert.equal(song.sections.some(s => s.loop), song.looping, song.id);
    const [lo, hi] = ranges[song.id];
    for (const seconds of [duration(song), ...(song.looping ? [duration(song, true)] : [])]) assert.ok(seconds >= lo && seconds <= hi, `${song.id}: ${seconds}s`);
    for (const section of song.sections) for (const track of section.tracks) {
      assert.ok(track.repeat >= 1 && Number.isInteger(track.repeat));
      near(parse(track.pattern).beats * track.repeat, sectionBeats(song, section));
      assert.ok(track.intensity.length > 0);
    }
  }
});

test('every pitched note and chord obeys its effective section key or a documented chromatic exception', () => {
  for (const song of Object.values(SONGS).filter(s => s.id !== 'ending')) for (const section of song.sections) {
    const key = section.key ?? song.key, tonic = midi(`${key.tonic}4`) % 12;
    scheduleSection(song, section, 0, event => {
      if (PERCUSSION.has(event.track.instrument)) return;
      for (const note of event.notes) {
        const degree = (note - tonic + 120) % 12;
        assert.ok(SCALES[key.mode].includes(degree) || song.chromatic[degree], `${song.id}/${section.name}/${event.track.name}: ${noteName(note)} outside ${key.tonic} ${key.mode}`);
      }
    });
  }
});

test('main themes differ in at least two musical axes, and all eight palettes are distinct', () => {
  const main = ['title', 'map', 'ernesto', 'huesos', 'macho'].map(id => SONGS[id as TrackId]);
  for (let i = 0; i < main.length; i++) for (const b of main.slice(i + 1)) {
    const a = main[i];
    const axes = [a.key.tonic !== b.key.tonic, a.key.mode !== b.key.mode, a.bpm !== b.bpm, String(a.meter) !== String(b.meter)];
    assert.ok(axes.filter(Boolean).length >= 2, `${a.id}/${b.id}`);
  }
  const palettes = Object.values(SONGS).map(song => [...new Set(song.sections.flatMap(s => s.tracks.map(t => t.instrument)))].sort().join(','));
  assert.equal(new Set(palettes).size, 8);
});
function motifMatches(song: Song, major = false): string[] {
  const result: string[] = [], expected = major ? [0, 4, 5, 6, 12] : [...MACHO_MOTIF.intervals];
  for (const section of song.sections) for (const track of section.tracks.filter(t => /lead|motif/.test(t.name))) {
    const events = parse(track.pattern).events.filter(e => e.notes.length === 1);
    for (let i = 0; i <= events.length - 5; i++) {
      const phrase = events.slice(i, i + 5), notes = phrase.map(e => e.notes[0]);
      if (notes.every((n, j) => n - notes[0] === expected[j])) result.push(section.name);
    }
  }
  return result;
}
test('the exact villain motif, rhythm, remoding, and strategically placed quotations survive arrangement', () => {
  const phrase = parse(machoMotif('C#'));
  assert.deepEqual(phrase.events.map(e => e.notes[0] - midi('C#4')), [0, 3, 5, 6, 12]);
  assert.deepEqual(phrase.events.map(e => e.duration), [0.5, 0.5, 0.5, 0.5, 1.5]);
  near(phrase.beats, 4.5);
  near(parse(machoMotif('D', { speed: 2, octave: 3 })).beats, 2.25);
  assert.deepEqual(parse(machoMotif('C', { mode: 'major' })).events.map(e => e.notes[0] - midi('C4')), [0, 4, 5, 6, 12]);
  assert.deepEqual(motifMatches(SONGS.title), ['shadow']);
  assert.deepEqual(motifMatches(SONGS.map), ['distant-mask']);
  assert.deepEqual(motifMatches(SONGS.huesos), ['breakdown']);
  assert.deepEqual(motifMatches(SONGS.ending, true), ['unmasked']);
  assert.ok(motifMatches(SONGS.macho).includes('chorus'));
});

test('recorder produces positive durations, ordered notes per track, exact repeat offsets, and bounded nominal gains', () => {
  for (const song of Object.values(SONGS)) {
    for (const section of song.sections) {
      const last = new Map<string, number>();
      scheduleSection(song, section, 0, e => {
        assert.ok(e.duration > 0 && Number.isFinite(e.duration));
        assert.ok(e.time >= (last.get(e.track.name) ?? 0)); last.set(e.track.name, e.time);
        assert.ok(e.time + e.duration <= sectionBeats(song, section) * 60 / song.bpm + 1e-7);
      });
      assert.ok(section.tracks.reduce((n, t) => n + t.gain, 0) < song.budget, `${song.id}/${section.name} headroom`);
    }
    if (!song.looping) continue;
    const start = song.sections.find(s => s.loop)!;
    const events: ScoreEvent[] = [];
    const result = recordSong(song, e => events.push(e), { section: start.name, loops: 2 });
    const pass = duration(song, true);
    near(result.duration, 2 * pass);
    const first = events.filter(e => e.section === start && e.track === start.tracks[0]);
    const secondPass = first.filter(e => e.time >= pass - 1e-7);
    const firstPass = first.filter(e => e.time < pass - 1e-7);
    assert.equal(secondPass.length, firstPass.length);
    firstPass.forEach((e, i) => near(secondPass[i].time - e.time, pass));
  }
});

test('transport jumps at a bar, invalidates queued future sections, survives repeated jumps and skips non-loop intros', () => {
  const song = SONGS.macho, bar = beatsPerBar(song) * 60 / song.bpm;
  const t = new Transport(song, 0);
  t.extend(2 * bar + 0.15); // Already queued the next section across an intro boundary.
  near(t.jump('final', 2 * bar - 0.005)!, 2 * bar);
  const next = t.extend(2 * bar + 0.18);
  assert.equal(next[0].section.name, 'final'); near(next[0].start, 2 * bar);
  near(t.jump('bridge', 2 * bar - 0.001)!, 2 * bar);
  assert.equal(t.extend(2 * bar + 0.18)[0].section.name, 'bridge');
  const before = t.frames.slice(); assert.equal(t.jump('missing', bar), undefined); assert.deepEqual(t.frames, before);
  const loop = new Transport(song, 0); const frames = loop.extend(duration(song) + bar);
  assert.equal(frames.at(-1)!.section.name, 'riff'); near(frames.at(-1)!.start, duration(song));
  for (const s of Object.values(SONGS).filter(s => !s.looping)) {
    const once = new Transport(s, 0); once.extend(1000); assert.equal(once.frames.length, s.sections.length); assert.ok(once.ended);
  }
});

// Deliberately small Web Audio graph double: tests scheduling/lifecycle, never sound.
class Param {
  value = 1;
  calls: { kind: string; value: number; time: number }[] = [];
  setValueAtTime(v: number, t: number) { this.calls.push({ kind: 'set', value: v, time: t }); return this; }
  linearRampToValueAtTime(v: number, t: number) { this.calls.push({ kind: 'linear', value: v, time: t }); return this; }
  exponentialRampToValueAtTime(v: number, t: number) { this.calls.push({ kind: 'exponential', value: v, time: t }); return this; }
  cancelScheduledValues(t: number) { this.calls = this.calls.filter(c => c.time < t); return this; }
  cancelAndHoldAtTime(t: number) { this.cancelScheduledValues(t); return this; }
}
class NodeDouble {
  gain = new Param(); frequency = new Param(); detune = new Param(); Q = new Param();
  threshold = new Param(); ratio = new Param(); knee = new Param(); attack = new Param(); release = new Param();
  connections: unknown[] = []; starts: number[] = []; stops: number[] = [];
  onended: (() => void) | null = null;
  connect(out: unknown) { this.connections.push(out); return out; }
  disconnect() { this.connections = []; }
  start(t: number) { this.starts.push(t); }
  stop(t: number) { this.stops.push(t); }
  setPeriodicWave() {}
}
class ContextDouble {
  currentTime = 0; sampleRate = 8000;
  nodes: NodeDouble[] = [];
  make = () => { const n = new NodeDouble(); this.nodes.push(n); return n; };
  createGain = this.make; createOscillator = this.make; createBufferSource = this.make;
  createBiquadFilter = this.make; createWaveShaper = this.make; createDynamicsCompressor = this.make;
  createPeriodicWave() { return {}; }
  createBuffer(_channels: number, length: number) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  asAudio(): BaseAudioContext { return this as unknown as BaseAudioContext; }
}

test('offline and live share voice scheduling; jumps cancel queued notes and crossfades keep at most two players', () => {
  const ctx = new ContextDouble(), out = ctx.make() as unknown as AudioNode;
  const offline = renderSong(ctx.asAudio(), out, SONGS.victory);
  near(offline.duration, 7.5);
  assert.ok(ctx.nodes.filter(n => n.starts.length).every(n => n.stops.length && n.stops[0] > n.starts[0]));
  const engine = new MusicEngine(ctx.asAudio(), out);
  const internals = engine as unknown as { current?: MusicPlayer; retiring?: MusicPlayer };
  try {
    engine.playTrack('macho'); const a = internals.current!;
    engine.playTrack('macho'); assert.equal(internals.current, a);
    const beforeSameSection = a.transport.frames[0];
    engine.playTrack('macho', { section: 'intro' }); assert.equal(a.transport.frames[0], beforeSameSection);
    engine.jumpTo('final');
    const boundary = a.transport.nextBar(ctx.currentTime);
    assert.ok(ctx.nodes.some(n => n.starts.length && n.stops.includes(boundary)), 'old queued sources must stop at jump');
    // A section request must compare against the audible section after natural advancement.
    const natural = new MusicEngine(ctx.asAudio(), out);
    natural.playTrack('macho', { section: 'chorus' });
    const np = (natural as unknown as { current: MusicPlayer }).current;
    ctx.currentTime = np.transport.frames[0].end + 0.02;
    (np as unknown as { tick: () => void }).tick();
    assert.equal(np.section, 'breakdown');
    natural.playTrack('macho', { section: 'chorus' }); assert.equal(np.section, 'chorus');
    natural.silence();
    engine.playTrack('map'); const b = internals.current!;
    assert.ok(a.active && b.active);
    engine.playTrack('huesos'); const c = internals.current!;
    assert.equal(a.active, false); assert.ok(b.active && c.active);
    engine.stopMusic(0); assert.equal(b.active, false); assert.equal(c.active, false);
    engine.playTrack('title');
    for (let i = 0; i < 8; i++) engine.stinger('impact');
    const slots = engine as unknown as { stingerSlots: unknown[] };
    assert.equal(slots.stingerSlots.length, 3);
    engine.silence(); assert.equal(internals.current, undefined); assert.equal(slots.stingerSlots.length, 0);
  } finally { engine.silence(); }
});

test('stingers are bounded one shots, quote the current tonic, and unsupported platforms stay silent', async () => {
  for (const id of ['machoTrouble', 'machoLaugh', 'impact', 'roundWin', 'ko'] as const) {
    const score = stingerScore(id, { tonic: 'D', mode: 'dorian' });
    assert.ok(score.events.length > 0);
    for (const event of score.events) assert.ok(event.duration > 0 && event.time + event.duration <= score.duration + 1e-7, id);
  }
  assert.equal(stingerScore('machoTrouble', { tonic: 'D', mode: 'dorian' }).events[0].notes[0], midi('D4'));
  const { gameAudio } = await import('./audio.ts');
  assert.doesNotThrow(() => { gameAudio.playTrack('title'); gameAudio.stinger('impact'); gameAudio.stopMusic(); gameAudio.toggleMute(); gameAudio.toggleMute(); });
});


test('wanted track and intensity survive gesture deferral and mute; invalid jumps cannot poison resumption', async () => {
  const { gameAudio } = await import('./audio.ts');
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const handlers = new Map<string, () => void>();
  let created = 0;
  class BrowserContext extends ContextDouble {
    destination = this.make(); state = 'running';
    constructor() { super(); created++; }
    async resume() {}
  }
  const browser = { AudioContext: BrowserContext, addEventListener: (name: string, fn: () => void) => handlers.set(name, fn), removeEventListener: (name: string) => handlers.delete(name) };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  const SoundSystem = gameAudio.constructor as new () => typeof gameAudio;
  const sound = new SoundSystem();
  const state = sound as unknown as { music: MusicEngine | null; wanted: { id: string; section?: string } };
  try {
    sound.setMusicIntensity(0); sound.playTrack('macho', { section: 'chorus' });
    assert.equal(created, 0); assert.equal(state.music, null);
    handlers.get('pointerdown')!(); assert.equal(created, 1);
    const engineState = state.music! as unknown as { current: MusicPlayer | undefined; intensity: number };
    assert.equal(engineState.intensity, 0); assert.equal(engineState.current?.section, 'chorus');
    sound.jumpTo('missing'); assert.equal(state.wanted.section, 'chorus');
    sound.toggleMute(); assert.equal(engineState.current, undefined);
    sound.jumpTo('final'); sound.toggleMute(); assert.equal(engineState.current?.section, 'final');
    sound.toggleMute(); sound.stopMusic(); sound.toggleMute(); assert.equal(engineState.current, undefined);
  } finally {
    sound.stopMusic(0);
    if (original) Object.defineProperty(globalThis, 'window', original); else Reflect.deleteProperty(globalThis, 'window');
  }
});
