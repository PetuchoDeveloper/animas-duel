/**
 * Arcade Intro Cinematic Scene.
 *
 * Plays the canon prequel animation of El Macho vs La Pulguita in the desert,
 * with arcade CRT framing, synchronized bilingual subtitles with fighter portraits,
 * audio volume leveling, smooth fade transitions to correct abrupt cutoff,
 * and responsive skip/playback controls.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { url } from '../game/assets';
import { ROSTER } from '../game/roster';
import { Portrait, u } from './ui';

interface IntroScreenProps {
  onFinish: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

interface SubtitleCue {
  start: number;
  end: number;
  speakerId?: 'flea' | 'elmacho';
  speakerName?: string;
  mood?: 'neutral' | 'shout' | 'smug' | 'hurt';
  textEs: string;
  textEn: string;
}

const CUES: SubtitleCue[] = [
  {
    start: 0.0,
    end: 2.8,
    textEs: 'Desierto de las Ánimas · El águila sagrada desciende sobre el nopal.',
    textEn: 'Desert of Souls · The sacred eagle lands upon the nopal cactus.',
  },
  {
    start: 2.85,
    end: 3.95,
    speakerId: 'elmacho',
    speakerName: 'El Macho',
    mood: 'shout',
    textEs: '¡RUAAGHH! ¡Fuera de mi camino!',
    textEn: 'RUAAGHH! Out of my way!',
  },
  {
    start: 4.0,
    end: 5.75,
    speakerId: 'flea',
    speakerName: 'La Pulguita',
    mood: 'shout',
    textEs: '¡Hey! ¡No le hagas eso a la naturaleza!',
    textEn: 'Hey! Do not do that to nature!',
  },
  {
    start: 5.8,
    end: 7.3,
    speakerId: 'elmacho',
    speakerName: 'El Macho',
    mood: 'smug',
    textEs: '¡A ver, pues deténme!',
    textEn: 'Let us see you try and stop me!',
  },
  {
    start: 7.35,
    end: 9.05,
    speakerId: 'flea',
    speakerName: 'La Pulguita',
    mood: 'shout',
    textEs: '¡Al Gran Sombrero Dorado! ¡Allá voy!',
    textEn: 'To The Golden Sombrero! Here I come!',
  },
  {
    start: 9.1,
    end: 9.75,
    textEs: '¡Comienza el Duelo de las Ánimas!',
    textEn: 'The Duel of Souls begins!',
  },
];

export function IntroScreen({ onFinish, isMuted, onToggleMute }: IntroScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(9.7);
  const [fading, setFading] = useState(false);
  const [scanlines, setScanlines] = useState(true);
  const [subMode, setSubMode] = useState<'both' | 'es' | 'off'>('both');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const finishedRef = useRef(false);

  const completeIntro = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFading(true);
    // Smooth transition to title
    window.setTimeout(() => {
      onFinish();
    }, 500);
  }, [onFinish]);

  // Attempt playback with audio, fallback if browser requires user gesture
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Autoplay with sound was prevented
        if (err.name === 'NotAllowedError') {
          setAudioBlocked(true);
          video.muted = true;
          video.play().catch(() => {});
        }
      });
    }
  }, [isMuted]);

  // Sync mute state with prop
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        completeIntro();
      } else if (e.code === 'KeyM') {
        onToggleMute();
      } else if (e.code === 'KeyC') {
        setSubMode((m) => (m === 'both' ? 'es' : m === 'es' ? 'off' : 'both'));
      } else if (e.code === 'KeyS') {
        setScanlines((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [completeIntro, onToggleMute]);

  // Time updates & smooth fade-out near video end (defect fix for abrupt ending)
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const current = video.currentTime;
    setTime(current);

    if (video.duration && !Number.isNaN(video.duration)) {
      setDuration(video.duration);
    }

    // Audio ease-out & visual fade before raw cutoff at ~8.95s
    if (current >= 8.95 && !fading && !finishedRef.current) {
      // Gentle volume ramp down
      if (!video.muted && video.volume > 0.05) {
        const remaining = Math.max(0, (video.duration || 9.7) - current);
        video.volume = Math.min(1, Math.max(0, remaining / 0.75));
      }
      setFading(true);
    }
  };

  const handleEnded = () => {
    completeIntro();
  };

  // Find active subtitle
  const activeCue = CUES.find((c) => time >= c.start && time < c.end);
  const speaker = activeCue?.speakerId ? ROSTER[activeCue.speakerId] : null;

  const progressPercent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  const handleUnblockAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().catch(() => {});
    setAudioBlocked(false);
  };

  return (
    <div
      className="layer flex flex-col justify-between overflow-hidden bg-ink select-none"
      onClick={completeIntro}
    >
      {/* Background & Video Container */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src="/assets/aistudio/Luchador_fights_eagle_in_desert_20261026164614_07d5688d.mp4"
          className="h-full w-full object-contain"
          playsInline
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />

        {/* Arcade CRT Scanlines filter */}
        {scanlines && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 2px)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.65)',
            }}
          />
        )}

        {/* Smooth cinematic fade-to-black at the end to prevent abrupt video cutoff */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-ink transition-opacity duration-500"
          style={{ opacity: fading ? 1 : 0 }}
        >
          <div className="flex flex-col items-center" style={{ gap: u(4) }}>
            <img src={url('ui/emblem.png')} alt="" style={{ width: u(48), height: u(48) }} />
            <h2 className="logo t16 text-center text-gold-hi shadow-text">Duelo de las Ánimas</h2>
            <p className="font-pixel t8 text-rose shadow-text">¡Comienza el Torneo!</p>
          </div>
        </div>
      </div>

      {/* Top Arcade Bar */}
      <div
        className="relative z-10 flex items-center justify-between"
        style={{ padding: `${u(6)} ${u(8)}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center" style={{ gap: u(4) }}>
          <span className="font-pixel t6 text-gold-hi shadow-text">
            PRÓLOGO · EL ORIGEN DEL DUELO
          </span>
          {audioBlocked && (
            <button
              type="button"
              className="btn btn-rose animate-pulse"
              style={{ padding: `${u(2)} ${u(4)}`, fontSize: 'calc(var(--u) * 5)' }}
              onClick={handleUnblockAudio}
            >
              🔊 Activar Sonido
            </button>
          )}
        </div>

        <div className="flex items-center" style={{ gap: u(3) }}>
          <button
            type="button"
            className="btn btn-quiet"
            style={{ padding: `${u(2)} ${u(4)}`, fontSize: 'calc(var(--u) * 5)' }}
            onClick={() => setSubMode((m) => (m === 'both' ? 'es' : m === 'es' ? 'off' : 'both'))}
            title="Subtítulos (C)"
          >
            Sub: {subMode === 'both' ? 'Es+En' : subMode === 'es' ? 'Es' : 'Off'}{' '}
            <span className="keycap">C</span>
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            style={{ padding: `${u(2)} ${u(4)}`, fontSize: 'calc(var(--u) * 5)' }}
            onClick={() => setScanlines((s) => !s)}
            title="Efecto CRT (S)"
          >
            CRT: {scanlines ? 'Sí' : 'No'} <span className="keycap">S</span>
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            style={{ padding: `${u(2)} ${u(4)}`, fontSize: 'calc(var(--u) * 5)' }}
            onClick={onToggleMute}
            aria-pressed={isMuted}
          >
            {isMuted ? 'Mudo' : 'Sonido'} <span className="keycap">M</span>
          </button>
          <button
            type="button"
            className="btn"
            style={{ padding: `${u(2.5)} ${u(5)}`, fontSize: 'calc(var(--u) * 5.5)' }}
            onClick={completeIntro}
          >
            Saltar <span className="keycap">Esc</span>
          </button>
        </div>
      </div>

      {/* Bottom Subtitles & Progress HUD */}
      <div
        className="relative z-10 flex flex-col items-center"
        style={{ padding: `0 ${u(12)} ${u(4)} ${u(12)}`, gap: u(3) }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic Subtitle Box with speaker portrait */}
        {subMode !== 'off' && activeCue && (
          <div
            className="panel flex items-center"
            style={{
              padding: `${u(3.5)} ${u(6)}`,
              gap: u(5),
              maxWidth: u(380),
              background: 'rgba(26, 16, 52, 0.92)',
              boxShadow: `0 0 0 ${u(1)} var(--color-gold), 0 ${u(3)} 0 rgba(0,0,0,0.6)`,
            }}
          >
            {activeCue.speakerId && (
              <div
                className="flex-shrink-0"
                style={{
                  padding: u(1),
                  background: 'var(--color-night)',
                  boxShadow: `0 0 0 ${u(1)} ${speaker?.color ?? 'var(--color-gold)'}`,
                }}
              >
                <Portrait id={activeCue.speakerId} mood={activeCue.mood ?? 'neutral'} scale={1.2} />
              </div>
            )}
            <div className="flex flex-col">
              {speaker && (
                <span
                  className="font-pixel t6 uppercase"
                  style={{ color: speaker.color, letterSpacing: '0.05em', marginBottom: u(1) }}
                >
                  {speaker.name}
                </span>
              )}
              <span className="font-body b11 font-bold text-bone drop-shadow">
                {activeCue.textEs}
              </span>
              {subMode === 'both' && activeCue.textEn && (
                <span
                  className="font-body b9 text-mist"
                  style={{ fontStyle: 'italic', marginTop: u(0.5) }}
                >
                  {activeCue.textEn}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Retro Progress Bar & Skip Prompt */}
        <div className="flex w-full items-center justify-between" style={{ gap: u(4) }}>
          <div
            className="flex-1 overflow-hidden"
            style={{
              height: u(3),
              background: 'var(--color-night)',
              boxShadow: `0 0 0 ${u(0.75)} var(--color-grape)`,
            }}
          >
            <div
              className="h-full bg-gold transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-pixel t6 text-mist opacity-80">
            [Espacio / Clic para continuar]
          </span>
        </div>
      </div>
    </div>
  );
}
