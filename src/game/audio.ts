/**
 * Procedural Web Audio synthesizer for Mexican Day of the Dead arcade fighting game.
 * Features arcade impact sound effects, guitar strums, brass fanfares, announcer calls,
 * and background festive mariachi guitar rhythm.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmInterval: number | null = null;
  private bgmPlaying: boolean = false;
  /** The game wants music; muting only silences it, so unmuting must not start music nobody asked for. */
  private bgmWanted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.haltBGM();
    else if (this.bgmWanted) this.beginBGM();
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Quick Spanish guitar strum chord
   */
  public playGuitarChord(chordType: 'A_minor' | 'D_minor' | 'E_major' | 'G_major' | 'F_major' = 'A_minor') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const chords: Record<string, number[]> = {
      A_minor: [220, 329.63, 440, 523.25, 659.25],
      D_minor: [293.66, 369.99, 440, 587.33],
      E_major: [164.81, 246.94, 329.63, 415.3, 493.88],
      G_major: [196, 246.94, 293.66, 392, 493.88],
      F_major: [174.61, 220, 261.63, 349.23, 440],
    };

    const notes = chords[chordType] || chords.A_minor;
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.025);

      gain.gain.setValueAtTime(0.001, now + idx * 0.025);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.025 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.025 + 0.55);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.025);
      osc.stop(now + idx * 0.025 + 0.6);
    });
  }

  /**
   * Fast punch / light attack sound
   */
  public playLightHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Heavy crunch hit / slam with bass impact
   */
  public playHeavyHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Sub bass drop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.29);

    // Noise burst for crunchy bone impact
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    whiteNoise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    whiteNoise.start(now);
  }

  /**
   * Block / Guard impact
   */
  public playBlock() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Whoosh for dashes / swings
   */
  public playWhoosh() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Special move cast (spectral energy or rock burst)
   */
  public playSpecialCast() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.22);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Super move activation flash chime
   */
  public playSuperActivate() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0.2, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.42);
    });
  }

  /**
   * TKOF Announcer synthesized fanfares
   */
  public playAnnouncerCall(type: 'ready_fight' | 'ko' | 'round1' | 'round2' | 'final_round' | 'super_finish' | 'victory') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (type === 'ready_fight') {
      // Dramatic brass gong + "FIGHT" chord
      this.playBrassChords([
        { freqs: [220, 277, 330], time: 0, dur: 0.35 },
        { freqs: [293, 370, 440], time: 0.45, dur: 0.6 },
      ]);
    } else if (type === 'ko') {
      // Massive descending gong
      this.playBrassChords([
        { freqs: [440, 350, 220], time: 0, dur: 0.25 },
        { freqs: [165, 110, 55], time: 0.2, dur: 0.9 },
      ]);
    } else if (type === 'super_finish') {
      // Triumphant Calavera climax
      this.playBrassChords([
        { freqs: [330, 392, 493], time: 0, dur: 0.2 },
        { freqs: [440, 554, 659], time: 0.18, dur: 0.2 },
        { freqs: [587, 740, 880], time: 0.36, dur: 0.8 },
      ]);
    } else if (type === 'victory') {
      // Mariachi trumpet victory fanfare
      this.playBrassChords([
        { freqs: [392, 493, 587], time: 0, dur: 0.15 },
        { freqs: [440, 554, 659], time: 0.16, dur: 0.15 },
        { freqs: [493, 622, 740], time: 0.32, dur: 0.18 },
        { freqs: [587, 740, 880], time: 0.52, dur: 0.7 },
      ]);
    }
  }

  private playBrassChords(chords: { freqs: number[]; time: number; dur: number }[]) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    chords.forEach((c) => {
      c.freqs.forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + c.time);

        // Lowpass filter to give warm brass body
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now + c.time);

        gain.gain.setValueAtTime(0.001, now + c.time);
        gain.gain.linearRampToValueAtTime(0.14, now + c.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + c.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + c.time);
        osc.stop(now + c.time + c.dur + 0.05);
      });
    });
  }

  // ------------------------------------------------------------------ background music
  // A little mariachi loop: oom-pah bass and strum, a shaker on every step and a trumpet
  // tune every four bars. Scheduled a fraction of a second ahead so it never drifts.

  private static readonly STEP = 60 / 138 / 2; // an eighth note at 138 bpm
  private static readonly BARS = [
    { bass: [110, 164.81], chord: [220, 261.63, 329.63] }, // A minor
    { bass: [87.31, 130.81], chord: [174.61, 220, 261.63] }, // F
    { bass: [98, 146.83], chord: [196, 246.94, 293.66] }, // G
    { bass: [82.41, 123.47], chord: [164.81, 207.65, 246.94] }, // E
  ];
  // [step within the 32-step loop, frequency, length in steps]
  private static readonly TUNE: [number, number, number][] = [
    [0, 659.25, 2], [2, 659.25, 1], [3, 587.33, 1], [4, 523.25, 2], [6, 493.88, 2],
    [8, 440, 2], [10, 523.25, 2], [12, 440, 3],
    [16, 392, 2], [18, 493.88, 2], [20, 587.33, 2], [22, 493.88, 2],
    [24, 415.3, 2], [26, 493.88, 2], [28, 659.25, 4],
  ];
  private musicBus: GainNode | null = null;
  private nextStepTime = 0;
  private step = 0;

  private tone(freq: number, time: number, dur: number, type: OscillatorType, vol: number, lowpass = 0, vibrato = false) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    let tail: AudioNode = osc;
    if (lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      osc.connect(f);
      tail = f;
    }
    tail.connect(gain);
    gain.connect(this.musicBus);
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.value = freq * 0.012;
      lfo.connect(depth);
      depth.connect(osc.frequency);
      lfo.start(time);
      lfo.stop(time + dur + 0.05);
    }
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  private shaker(time: number, vol: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5500;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.musicBus);
    src.start(time);
  }

  private playStep(step: number, time: number) {
    const bar = SoundSystem.BARS[Math.floor(step / 8) % 4];
    const s = step % 8;
    if (s % 2 === 0) this.tone(bar.bass[(s / 2) % 2], time, 0.34, 'triangle', 0.3, 500);
    else bar.chord.forEach((f, i) => this.tone(f, time + i * 0.014, 0.28, 'triangle', s === 3 || s === 7 ? 0.075 : 0.05));
    this.shaker(time, s % 2 ? 0.07 : 0.035);
    for (const [at, f, len] of SoundSystem.TUNE) {
      if (at === step % 32) this.tone(f, time, len * SoundSystem.STEP * 0.95, 'sawtooth', 0.05, 2200, true);
    }
  }

  public startBGM() {
    this.bgmWanted = true;
    this.beginBGM();
  }

  public stopBGM() {
    this.bgmWanted = false;
    this.haltBGM();
  }

  private beginBGM() {
    if (this.bgmPlaying || this.isMuted) return;
    this.initCtx();
    const ctx = this.ctx;
    if (!ctx) return;
    this.bgmPlaying = true;
    if (!this.musicBus) {
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.6;
      this.musicBus.connect(ctx.destination);
    }
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setValueAtTime(0.6, ctx.currentTime);
    this.step = 0;
    this.nextStepTime = ctx.currentTime + 0.08;
    this.bgmInterval = window.setInterval(() => {
      while (this.nextStepTime < ctx.currentTime + 0.2) {
        this.playStep(this.step++, this.nextStepTime);
        this.nextStepTime += SoundSystem.STEP;
      }
    }, 40);
  }

  private haltBGM() {
    this.bgmPlaying = false;
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  /** Quieter music while a menu or the pause panel is up. */
  public duck(on: boolean) {
    if (!this.ctx || !this.musicBus) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(on ? 0.22 : 0.6, now, 0.08);
  }
}

export const gameAudio = new SoundSystem();
