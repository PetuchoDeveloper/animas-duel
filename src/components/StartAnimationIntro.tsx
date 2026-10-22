/**
 * Start Animation Intro sequence for Duelo de las Ánimas.
 * Features a mystical Day of the Dead portal awakening, swirling marigolds,
 * rising glowing calavera skull emblem, and dramatic audio chords.
 */

import React, { useEffect, useState } from 'react';
import { gameAudio } from '../game/audio';

interface StartAnimationIntroProps {
  onFinish: () => void;
}

export const StartAnimationIntro: React.FC<StartAnimationIntroProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<number>(0);

  useEffect(() => {
    // Sound chord
    gameAudio.playGuitarChord('E_major');

    const t1 = setTimeout(() => {
      setPhase(1); // Portal expands
      gameAudio.playGuitarChord('A_minor');
    }, 1200);

    const t2 = setTimeout(() => {
      setPhase(2); // Skull emblem emerges
      gameAudio.playAnnouncerCall('ready_fight');
    }, 2800);

    const t3 = setTimeout(() => {
      setPhase(3); // Title explodes
    }, 4500);

    const t4 = setTimeout(() => {
      onFinish(); // Auto transition
    }, 6500);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'Enter', 'Escape'].includes(e.code)) {
        onFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="relative w-full h-full min-h-screen bg-black flex flex-col items-center justify-center p-6 select-none overflow-hidden cursor-pointer"
    >
      {/* Background portal glow ring */}
      <div
        className={`absolute rounded-full transition-all duration-1000 ${
          phase >= 1
            ? 'w-[400px] h-[400px] sm:w-[650px] sm:h-[650px] bg-gradient-to-r from-purple-900/60 via-amber-600/40 to-rose-700/60 blur-3xl animate-spin'
            : 'w-10 h-10 bg-amber-400 blur-xl'
        }`}
        style={{ animationDuration: '20s' }}
      />

      {/* Floating Petal Storm */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-amber-400/80 animate-ping"
            style={{
              width: `${(i % 4) * 3 + 4}px`,
              height: `${(i % 4) * 3 + 4}px`,
              left: `${(i * 13) % 100}%`,
              top: `${(i * 19) % 100}%`,
              animationDuration: `${1.5 + (i % 3)}s`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Center Awakening Calavera Skull */}
      <div
        className={`z-10 flex flex-col items-center transition-all duration-700 transform ${
          phase >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
      >
        <div className="w-32 h-32 sm:w-48 sm:h-48 drop-shadow-[0_0_35px_rgba(245,158,11,0.8)] animate-pulse">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <ellipse cx="50" cy="50" rx="46" ry="16" fill="#1e1b4b" stroke="#eab308" strokeWidth="3" />
            <path d="M 32 46 C 35 22, 65 22, 68 46 Z" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
            <ellipse cx="50" cy="46" rx="18" ry="4" fill="#dc2626" />
            <path
              d="M 36 50 C 36 38, 64 38, 64 50 C 64 64, 58 66, 58 74 L 42 74 C 42 66, 36 64, 36 50 Z"
              fill="#fef08a"
              stroke="#000000"
              strokeWidth="2"
            />
            {/* Glowing purple eyes */}
            <circle cx="43" cy="52" r="5" fill="#a855f7" />
            <circle cx="57" cy="52" r="5" fill="#a855f7" />
            <circle cx="43" cy="52" r="2.5" fill="#ffffff" />
            <circle cx="57" cy="52" r="2.5" fill="#ffffff" />
            <path d="M 50 60 L 48 64 L 52 64 Z" fill="#dc2626" />
            <rect x="44" y="69" width="3" height="4" fill="#000" />
            <rect x="49" y="69" width="3" height="4" fill="#000" />
            <rect x="54" y="69" width="3" height="4" fill="#000" />
          </svg>
        </div>

        <span className="text-amber-400 font-black text-sm uppercase tracking-widest mt-4 animate-bounce">
          ✦ EL VELO ENTRE LOS MUNDOS SE ABRE ✦
        </span>
      </div>

      {/* Dramatic Title reveal in phase 3 */}
      <div
        className={`z-10 mt-6 text-center transition-all duration-500 transform ${
          phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <h1 className="text-4xl sm:text-7xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-600 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          DUELO DE LAS ÁNIMAS
        </h1>
        <p className="text-sm sm:text-xl font-black text-purple-300 uppercase tracking-widest mt-1">
          THE KING OF FIESTA
        </p>
      </div>

      {/* Bottom prompt */}
      <div className="absolute bottom-8 z-10 text-stone-400 text-xs uppercase tracking-widest font-mono animate-pulse">
        HAZ CLIC O PRESIONA CUALQUIER TECLA PARA CONTINUAR ▶
      </div>
    </div>
  );
};
