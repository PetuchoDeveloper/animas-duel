/**
 * Title Screen for Duelo de las Ánimas: The King of Fiesta.
 * Atmospheric Day of the Dead portal, marigold petals, bespoke inline SVG title lockup,
 * primary Start CTA with Enter/Space keybindings, and mode selection.
 */

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Sparkles, Swords, User, BookOpen } from 'lucide-react';
import { GameMode } from '../game/engine';
import { gameAudio } from '../game/audio';

interface TitleScreenProps {
  onStartGame: (mode: GameMode) => void;
  onOpenLore: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenLore,
  isMuted,
  onToggleMute,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('story');

  useEffect(() => {
    // Check ?autostart=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      onStartGame('story');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        gameAudio.playGuitarChord('E_major');
        onStartGame(selectedMode);
      } else if (e.code === 'KeyM') {
        onToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMode, onStartGame, onToggleMute]);

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between items-center bg-gradient-to-b from-[#090214] via-[#1a082b] to-[#2c0e18] text-white p-6 sm:p-10 select-none overflow-hidden">
      {/* Ambient background particles: floating gold marigold petals */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-amber-400 blur-[1px] animate-pulse"
            style={{
              width: `${(i % 5) * 2 + 4}px`,
              height: `${(i % 5) * 2 + 4}px`,
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
              animationDuration: `${3 + (i % 4)}s`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Top Header: Mute Audio & Stage Teaser */}
      <div className="w-full max-w-5xl flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping" />
          <span className="text-xs uppercase tracking-widest text-amber-300/80 font-bold">
            Día de los Muertos · Arcade Edition
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            gameAudio.playGuitarChord('A_minor');
            onToggleMute();
          }}
          aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-semibold tracking-wider transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          <span>{isMuted ? 'SONIDO [M]' : 'MÚSICA ACTIVA'}</span>
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <div className="my-auto flex flex-col items-center text-center z-10 max-w-3xl">
        {/* Calavera Skull Crest SVG Emblem */}
        <div className="w-24 h-24 sm:w-32 sm:h-32 mb-2 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Sombrero brim outline */}
            <ellipse cx="50" cy="50" rx="46" ry="16" fill="#1e1b4b" stroke="#eab308" strokeWidth="3" />
            {/* Sombrero crown */}
            <path d="M 32 46 C 35 22, 65 22, 68 46 Z" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
            <ellipse cx="50" cy="46" rx="18" ry="4" fill="#dc2626" />
            {/* Calavera skull face */}
            <path
              d="M 36 50 C 36 38, 64 38, 64 50 C 64 64, 58 66, 58 74 L 42 74 C 42 66, 36 64, 36 50 Z"
              fill="#fef08a"
              stroke="#000000"
              strokeWidth="2"
            />
            {/* Eye sockets */}
            <circle cx="43" cy="52" r="5" fill="#7e22ce" />
            <circle cx="57" cy="52" r="5" fill="#7e22ce" />
            {/* Heart nose */}
            <path d="M 50 60 L 48 64 L 52 64 Z" fill="#dc2626" />
            {/* Teeth */}
            <rect x="44" y="69" width="3" height="4" fill="#000" />
            <rect x="49" y="69" width="3" height="4" fill="#000" />
            <rect x="54" y="69" width="3" height="4" fill="#000" />
          </svg>
        </div>

        {/* Title Lockup typography */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-600 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
          DUELO DE LAS ÁNIMAS
        </h1>
        <p className="text-sm sm:text-lg md:text-xl font-black tracking-widest text-purple-300 uppercase mt-1 mb-6 drop-shadow">
          THE KING OF FIESTA · 3 NIVELES DE SOMBRERO
        </p>

        {/* Mode Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setSelectedMode('story');
              gameAudio.playGuitarChord('A_minor');
            }}
            className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedMode === 'story'
                ? 'bg-gradient-to-b from-amber-600/40 to-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                : 'bg-black/50 border-amber-900/50 hover:border-amber-500/50 text-stone-300'
            }`}
          >
            <Sparkles size={20} className={selectedMode === 'story' ? 'text-amber-300' : 'text-stone-400'} />
            <span className="font-extrabold text-sm uppercase tracking-wide">MODO HISTORIA</span>
            <span className="text-[10px] text-amber-200/70">3 Niveles de Sombrero + Jefes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMode('versus');
              gameAudio.playGuitarChord('D_minor');
            }}
            className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedMode === 'versus'
                ? 'bg-gradient-to-b from-rose-600/40 to-black border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-105'
                : 'bg-black/50 border-amber-900/50 hover:border-rose-500/50 text-stone-300'
            }`}
          >
            <Swords size={20} className={selectedMode === 'versus' ? 'text-rose-400' : 'text-stone-400'} />
            <span className="font-extrabold text-sm uppercase tracking-wide">MULTIJUGADOR LOCAL</span>
            <span className="text-[10px] text-rose-200/70">1 vs 1 en un mismo teclado</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMode('training');
              gameAudio.playGuitarChord('G_major');
            }}
            className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              selectedMode === 'training'
                ? 'bg-gradient-to-b from-purple-600/40 to-black border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-105'
                : 'bg-black/50 border-amber-900/50 hover:border-purple-500/50 text-stone-300'
            }`}
          >
            <User size={20} className={selectedMode === 'training' ? 'text-purple-400' : 'text-stone-400'} />
            <span className="font-extrabold text-sm uppercase tracking-wide">PRÁCTICA LIBRE</span>
            <span className="text-[10px] text-purple-200/70">Prueba combos y supers</span>
          </button>
        </div>

        {/* Primary Start CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={() => {
              gameAudio.playGuitarChord('E_major');
              onStartGame(selectedMode);
            }}
            className="px-8 py-3.5 rounded-md bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-stone-950 font-black text-lg sm:text-xl uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.7)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            ¡INICIAR COMBATE! · [ENTER / ESPACIO]
          </button>

          <button
            type="button"
            onClick={onOpenLore}
            className="px-4 py-3 rounded-md bg-stone-900/80 hover:bg-stone-800 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen size={16} />
            <span>HISTORIA Y LORE</span>
          </button>
        </div>
      </div>

      {/* Bottom Safe Margin: Flat Control Hint Line */}
      <div className="w-full text-center text-xs sm:text-sm text-amber-200/60 font-medium tracking-wide z-10">
        P1: WASD Mover · F/G Golpes · H Esquivar · V Especial · Espacio Super | P2: Flechas Mover · U/I Golpes · P Especial · Enter Super | Esc Pausa
      </div>
    </div>
  );
};
