import type { Instrument } from './score.ts';

type Voice = { out: AudioNode; start: number; end: number; stop: (at: number) => void };
type Resources = { noise: AudioBuffer; waves: Map<number, PeriodicWave>; voices: Voice[]; curve: Float32Array<ArrayBuffer> };
const cache = new WeakMap<BaseAudioContext, Resources>();
export const MAX_VOICES = 56;
function resources(ctx: BaseAudioContext): Resources {
  let r = cache.get(ctx);
  if (r) return r;
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const samples = noise.getChannelData(0);
  // Stable offline renders; one noise buffer per context for every percussion voice.
  let seed = 1931;
  for (let i = 0; i < samples.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; samples[i] = seed / 2147483648; }
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(3 * (2 * i / (curve.length - 1) - 1));
  r = { noise, waves: new Map(), voices: [], curve };
  cache.set(ctx, r);
  return r;
}
function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const r = resources(ctx);
  let wave = r.waves.get(duty);
  if (!wave) {
    const real = new Float32Array(33), imag = new Float32Array(33);
    for (let n = 1; n < real.length; n++) { real[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI); imag[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI); }
    wave = ctx.createPeriodicWave(real, imag);
    r.waves.set(duty, wave);
  }
  return wave;
}
export type VoiceOptions = { gain?: number; duty?: 0.125 | 0.25 | 0.5 };
export function playInstrument(ctx: BaseAudioContext, out: AudioNode, instrument: Instrument, time: number, duration: number, frequency = 110, opts: VoiceOptions = {}): void {
  if (!(duration > 0) || !Number.isFinite(time) || !(frequency > 0)) return;
  const r = resources(ctx), end = time + duration;
  r.voices = r.voices.filter(v => v.end > ctx.currentTime);
  // A stinger may have queued voices later than a live music event. Count
  // interval overlaps, rather than assuming every caller schedules in order.
  let overlapping = r.voices.filter(v => v.start < end && v.end > time);
  while (overlapping.length >= MAX_VOICES) {
    const oldest = overlapping.reduce((a, b) => a.start <= b.start ? a : b);
    oldest.stop(time);
    r.voices = r.voices.filter(v => v !== oldest);
    overlapping = overlapping.filter(v => v !== oldest);
  }
  const nodes: AudioNode[] = [];
  const sources: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(); nodes.push(amp);
  const gain = Math.max(0.00001, opts.gain ?? 0.05);
  const slow = instrument === 'choir';
  const attack = Math.min(duration * 0.22, slow ? 0.22 : instrument === 'brass' ? 0.035 : 0.006);
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + attack);
  const plucked = ['vihuela', 'bell', 'marimba', 'pluck', 'kick', 'timpani', 'snare', 'hat', 'openHat', 'crash', 'shaker', 'clave'].includes(instrument);
  if (plucked) amp.gain.exponentialRampToValueAtTime(0.000001, Math.max(time + attack, end - Math.min(0.01, duration * 0.05)));
  else { amp.gain.setValueAtTime(gain * 0.8, Math.max(time + attack, end - Math.min(0.07, duration * 0.25))); }
  amp.gain.linearRampToValueAtTime(0, end);
  amp.connect(out);
  const filter = (type: BiquadFilterType, hz: number, q = 0.7): BiquadFilterNode => {
    const f = ctx.createBiquadFilter(); nodes.push(f); f.type = type; f.frequency.setValueAtTime(Math.min(hz, ctx.sampleRate * 0.45), time); f.Q.value = q; return f;
  };
  const oscillator = (type: OscillatorType, hz: number, weight: number, dest: AudioNode = amp, detune = 0, delay = 0): OscillatorNode => {
    const osc = ctx.createOscillator(), level = ctx.createGain();
    nodes.push(osc, level); sources.push(osc);
    osc.type = type; osc.frequency.setValueAtTime(hz, time); osc.detune.value = detune; level.gain.value = weight;
    osc.connect(level); level.connect(dest);
    osc.start(Math.min(time + delay, end)); osc.stop(end);
    return osc;
  };
  const noise = (dest: AudioNode, weight = 1) => {
    const src = ctx.createBufferSource(), level = ctx.createGain();
    nodes.push(src, level); sources.push(src); src.buffer = r.noise; src.loop = true; level.gain.value = weight;
    src.connect(level); level.connect(dest); src.start(time); src.stop(end);
  };
  if (instrument === 'pulse') {
    oscillator('sine', frequency, 1).setPeriodicWave(pulseWave(ctx, opts.duty ?? 0.25));
  } else if (instrument === 'brass' || instrument === 'mutedBrass') {
    const f = filter('lowpass', instrument === 'mutedBrass' ? 700 : 900); f.connect(amp);
    f.frequency.exponentialRampToValueAtTime(instrument === 'mutedBrass' ? 1500 : 4200, time + attack);
    f.frequency.exponentialRampToValueAtTime(800, end);
    for (const cents of [-5, 5]) { const osc = oscillator('sawtooth', frequency, 0.5, f, cents); osc.frequency.setValueAtTime(frequency * 0.97, time); osc.frequency.exponentialRampToValueAtTime(frequency, time + attack); }
  } else if (instrument === 'vihuela') {
    const f = filter('lowpass', 3600); f.connect(amp);
    oscillator('triangle', frequency, 0.65, f);
    oscillator('sawtooth', frequency * 2, 0.35, f, 0, 0.01);
  } else if (instrument === 'bass' || instrument === 'guitar' || instrument === 'strings') {
    const f = filter('lowpass', instrument === 'bass' ? 650 : instrument === 'guitar' ? 3000 : 2300); f.connect(amp);
    let input: AudioNode = f;
    if (instrument === 'guitar') { const shaper = ctx.createWaveShaper(); nodes.push(shaper); shaper.curve = r.curve; shaper.connect(f); input = shaper; }
    oscillator('sawtooth', frequency, instrument === 'bass' ? 0.45 : 0.7, input, -3);
    oscillator(instrument === 'bass' ? 'sine' : 'sawtooth', instrument === 'bass' ? frequency / 2 : frequency, instrument === 'bass' ? 0.55 : 0.3, input, 3);
  } else if (instrument === 'organ') {
    for (const [harmonic, weight] of [[1, 0.5], [2, 0.27], [3, 0.15], [4, 0.08]]) oscillator('sine', frequency * harmonic, weight, amp, harmonic % 2 ? -3 : 3);
    const depth = ctx.createGain(); nodes.push(depth); depth.gain.value = frequency * 0.003;
    oscillator('sine', 5, 1, depth); depth.connect((sources[0] as OscillatorNode).frequency);
  } else if (instrument === 'choir') {
    const f1 = filter('bandpass', 750, 2), f2 = filter('bandpass', 1200, 2);
    const mix = ctx.createGain(); nodes.push(mix); mix.gain.value = 0.5; f1.connect(mix); f2.connect(mix); mix.connect(amp);
    const input = ctx.createGain(); nodes.push(input); input.connect(f1); input.connect(f2);
    oscillator('sawtooth', frequency, 0.5, input, -8); oscillator('sawtooth', frequency, 0.5, input, 8);
  } else if (instrument === 'bell' || instrument === 'marimba' || instrument === 'pluck') {
    oscillator(instrument === 'pluck' ? 'triangle' : 'sine', frequency, 0.75);
    oscillator('sine', frequency * (instrument === 'bell' ? 2.76 : instrument === 'marimba' ? 4.01 : 2), 0.25);
  } else if (instrument === 'kick' || instrument === 'timpani') {
    const base = instrument === 'kick' ? 48 : 78;
    const osc = oscillator('sine', base * 2.2, 0.88);
    osc.frequency.exponentialRampToValueAtTime(base, time + Math.min(0.12, duration));
    const f = filter('lowpass', 350); f.connect(amp); noise(f, 0.12);
  } else if (instrument === 'clave') {
    oscillator('sine', 1700, 0.75); oscillator('sine', 2500, 0.25);
  } else {
    const f = filter(instrument === 'riser' ? 'bandpass' : 'highpass', instrument === 'snare' ? 1300 : instrument === 'riser' ? 200 : 6500);
    f.connect(amp); noise(f, instrument === 'snare' ? 0.75 : 1);
    if (instrument === 'snare') oscillator('triangle', 175, 0.25);
    if (instrument === 'riser') f.frequency.exponentialRampToValueAtTime(Math.min(10000, ctx.sampleRate * 0.4), end);
  }
  // Every source is stopped and every node disconnected, including stolen voices.
  let remaining = sources.length;
  const voice: Voice = { out, start: time, end, stop: at => {
    const stopAt = Math.max(ctx.currentTime, at);
    amp.gain.cancelScheduledValues(stopAt); amp.gain.setValueAtTime(0, stopAt);
    for (const source of sources) { try { source.stop(stopAt); } catch { /* already ended */ } }
    voice.end = stopAt;
  } };
  r.voices.push(voice);
  for (const source of sources) source.onended = () => {
    if (--remaining === 0) { for (const node of nodes) node.disconnect(); const index = r.voices.indexOf(voice); if (index >= 0) r.voices.splice(index, 1); }
  };
}
export const instruments = Object.fromEntries((['pulse', 'brass', 'mutedBrass', 'vihuela', 'bass', 'guitar', 'organ', 'choir', 'bell', 'marimba', 'pluck', 'strings', 'timpani', 'kick', 'snare', 'hat', 'openHat', 'crash', 'shaker', 'clave', 'riser'] as Instrument[]).map(name => [name, (ctx: BaseAudioContext, out: AudioNode, time: number, duration: number, frequency = 110, opts?: VoiceOptions) => playInstrument(ctx, out, name, time, duration, frequency, opts)])) as Record<Instrument, (ctx: BaseAudioContext, out: AudioNode, time: number, duration: number, frequency?: number, opts?: VoiceOptions) => void>;
export function snareRoll(ctx: BaseAudioContext, out: AudioNode, time: number, duration: number, hits = 16): void {
  for (let i = 0; i < hits; i++) playInstrument(ctx, out, 'snare', time + duration * i / hits, duration / hits, 110, { gain: 0.035 * (0.4 + 0.6 * i / hits) });
}

export function stopOutput(ctx: BaseAudioContext, out: AudioNode, at = ctx.currentTime): void {
  for (const voice of cache.get(ctx)?.voices ?? []) if (voice.out === out) voice.stop(at);
}

/** Offline-only clock advancement; renderSong has already sorted all events. */
export function advanceVoiceClock(ctx: BaseAudioContext, time: number): void {
  const r = cache.get(ctx);
  if (r) r.voices = r.voices.filter(v => v.end > time);
}
