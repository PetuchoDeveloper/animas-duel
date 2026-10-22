import { MusicEngine, SONGS } from './music/index.ts';
import type { TrackId, StingerId } from './music/index.ts';
export type { TrackId, StingerId } from './music/index.ts';

/**
 * Procedural Web Audio synthesizer for Mexican Day of the Dead arcade fighting game.
 * Features arcade impact sound effects, guitar strums, brass fanfares, announcer calls,
 * and background festive mariachi guitar rhythm.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private music: MusicEngine | null = null;
  private wanted: { id: TrackId; section?: string; fadeIn?: number } | null = null;
  private interacted = false;
  private menuDucked = false;
  private wantedIntensity: 0 | 1 | 2 = 1;

  constructor() {
    if (typeof window === 'undefined') return;
    const activate = () => {
      this.interacted = true;
      for (const event of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(event, activate, true);
      this.beginMusic();
    };
    for (const event of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(event, activate, { capture: true, passive: true });
  }

  private initCtx() {
    if (typeof window === 'undefined') return;
    const activation = typeof navigator !== 'undefined' ? navigator.userActivation : undefined;
    if (!this.interacted && !activation?.hasBeenActive) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      try { this.ctx = new AudioCtx(); } catch { return; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.music?.silence();
    else this.beginMusic();
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

  // Music keeps the wanted selection across mute and suspended contexts.
  private ensureMusic(): MusicEngine | null {
    this.initCtx();
    if (!this.ctx) return null;
    if (!this.music) {
      this.music = new MusicEngine(this.ctx, this.ctx.destination);
      this.music.duck(this.menuDucked);
      this.music.setMusicIntensity(this.wantedIntensity);
    }
    return this.music;
  }

  private beginMusic(): void {
    if (this.isMuted || !this.wanted) return;
    this.ensureMusic()?.playTrack(this.wanted.id, this.wanted);
  }

  public playTrack(id: TrackId, opts?: { section?: string; fadeIn?: number }): void {
    if (!SONGS[id] || (opts?.section && !SONGS[id].sections.some(s => s.name === opts.section))) return;
    this.wanted = { id, ...opts };
    this.beginMusic();
  }

  public jumpTo(section: string): void {
    if (!this.wanted || !SONGS[this.wanted.id].sections.some(s => s.name === section)) return;
    this.wanted.section = section;
    if (!this.isMuted) this.music?.jumpTo(section);
  }

  public stopMusic(fadeOut?: number): void {
    this.wanted = null;
    this.music?.stopMusic(fadeOut);
  }

  public stinger(id: StingerId): void {
    if (!this.isMuted) this.ensureMusic()?.stinger(id);
  }

  public setMusicIntensity(level: 0 | 1 | 2): void {
    this.wantedIntensity = level;
    this.music?.setMusicIntensity(level);
  }

  public startBGM(): void { this.playTrack('title'); }
  public stopBGM(): void { this.stopMusic(); }

  /** Quieter music while a menu or the pause panel is up. */
  public duck(on: boolean): void {
    this.menuDucked = on;
    this.music?.duck(on);
  }
}

export const gameAudio = new SoundSystem();
