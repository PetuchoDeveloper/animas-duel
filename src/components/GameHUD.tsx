/**
 * TKOF-inspired arcade HUD styled with Mexican Day of the Dead motifs:
 * Gold-framed health bars, trailing ghost damage, round win sugar skulls,
 * center countdown timer, and bottom Calavera Super Gauges.
 */

import React from 'react';
import { Volume2, VolumeX, Pause } from 'lucide-react';
import { gameAudio } from '../game/audio';
import { CHARACTER_ROSTER } from '../game/spriteData';

interface GameHUDProps {
  p1CharId: string;
  p2CharId: string;
  p1Hp: number;
  p1GhostHp: number;
  p1Meter: number;
  p1Rounds: number;
  p2Hp: number;
  p2GhostHp: number;
  p2Meter: number;
  p2Rounds: number;
  timer: number;
  comboP1: number;
  comboP2: number;
  stageName: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  p1CharId,
  p2CharId,
  p1Hp,
  p1GhostHp,
  p1Meter,
  p1Rounds,
  p2Hp,
  p2GhostHp,
  p2Meter,
  p2Rounds,
  timer,
  comboP1,
  comboP2,
  stageName,
  isMuted,
  onToggleMute,
  onPause,
}) => {
  const p1Cfg = CHARACTER_ROSTER[p1CharId] || CHARACTER_ROSTER.ernesto;
  const p2Cfg = CHARACTER_ROSTER[p2CharId] || CHARACTER_ROSTER.elmacho;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Bar: Health Bars, Timer, Round Icons */}
      <div className="w-full flex items-start justify-between gap-2 max-w-5xl mx-auto">
        {/* P1 Health Cluster */}
        <div className="flex-1 flex flex-col items-start">
          {/* Name & Rounds Won */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-sm sm:text-base font-black tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              style={{ color: p1Cfg.accentColor }}
            >
              {p1Cfg.name}
            </span>
            {/* Round Win Sugar Skulls */}
            <div className="flex items-center gap-1">
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-amber-400 flex items-center justify-center transition-all ${
                    idx < p1Rounds ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-black/60'
                  }`}
                  title="Round Win"
                >
                  {idx < p1Rounds && (
                    <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-black">
                      <circle cx="8" cy="7" r="5" />
                      <circle cx="6" cy="6" r="1.2" fill="#f59e0b" />
                      <circle cx="10" cy="6" r="1.2" fill="#f59e0b" />
                      <rect x="6.5" y="10" width="3" height="3" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Health Bar Frame */}
          <div className="w-full h-5 sm:h-7 bg-black/90 border-2 border-amber-500 rounded-sm overflow-hidden p-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.8)] relative">
            {/* Trailing Ghost Damage Bar */}
            <div
              className="absolute top-0.5 bottom-0.5 right-0.5 bg-rose-600 transition-all duration-300"
              style={{ width: `${Math.max(0, p1GhostHp)}%` }}
            />
            {/* Active Health Bar */}
            <div
              className="absolute top-0.5 bottom-0.5 right-0.5 bg-gradient-to-l from-amber-400 via-yellow-300 to-emerald-400 transition-all duration-75"
              style={{ width: `${Math.max(0, p1Hp)}%` }}
            />
            {/* Health readout */}
            <span className="absolute left-2 top-0 bottom-0 flex items-center text-[10px] sm:text-xs font-mono font-bold text-white drop-shadow">
              {p1Hp}%
            </span>
          </div>

          {/* Dynamic Combo Alert P1 */}
          {comboP1 > 1 && (
            <div className="mt-2 text-left animate-bounce">
              <span className="text-xl sm:text-3xl font-black text-amber-400 drop-shadow-[0_2px_4px_#000]">
                {comboP1} HITS!
              </span>
              <p className="text-[10px] sm:text-xs font-extrabold text-white tracking-widest uppercase">
                {comboP1 >= 5 ? '¡COMBO FANTÁSTICO!' : '¡BUEN GOLPE!'}
              </p>
            </div>
          )}
        </div>

        {/* Center Timer & Stage Info */}
        <div className="flex flex-col items-center px-2">
          {/* Timer Clock Frame */}
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-b from-stone-900 to-black border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-center">
            <span
              className={`font-black font-mono text-2xl sm:text-3xl tabular-nums ${
                timer <= 15 ? 'text-rose-500 animate-pulse' : 'text-amber-300'
              }`}
            >
              {timer.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-[9px] sm:text-[11px] font-bold text-amber-200 uppercase tracking-widest mt-1 text-center drop-shadow">
            {stageName}
          </span>
        </div>

        {/* P2 Health Cluster */}
        <div className="flex-1 flex flex-col items-end">
          {/* Name & Rounds Won */}
          <div className="flex items-center gap-2 mb-1">
            {/* Round Win Sugar Skulls */}
            <div className="flex items-center gap-1">
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-amber-400 flex items-center justify-center transition-all ${
                    idx < p2Rounds ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-black/60'
                  }`}
                  title="Round Win"
                >
                  {idx < p2Rounds && (
                    <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-black">
                      <circle cx="8" cy="7" r="5" />
                      <circle cx="6" cy="6" r="1.2" fill="#f59e0b" />
                      <circle cx="10" cy="6" r="1.2" fill="#f59e0b" />
                      <rect x="6.5" y="10" width="3" height="3" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <span
              className="text-sm sm:text-base font-black tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              style={{ color: p2Cfg.accentColor }}
            >
              {p2Cfg.name}
            </span>
          </div>

          {/* Health Bar Frame */}
          <div className="w-full h-5 sm:h-7 bg-black/90 border-2 border-amber-500 rounded-sm overflow-hidden p-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.8)] relative">
            {/* Trailing Ghost Damage Bar */}
            <div
              className="absolute top-0.5 bottom-0.5 left-0.5 bg-rose-600 transition-all duration-300"
              style={{ width: `${Math.max(0, p2GhostHp)}%` }}
            />
            {/* Active Health Bar */}
            <div
              className="absolute top-0.5 bottom-0.5 left-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 transition-all duration-75"
              style={{ width: `${Math.max(0, p2Hp)}%` }}
            />
            {/* Health readout */}
            <span className="absolute right-2 top-0 bottom-0 flex items-center text-[10px] sm:text-xs font-mono font-bold text-white drop-shadow">
              {p2Hp}%
            </span>
          </div>

          {/* Dynamic Combo Alert P2 */}
          {comboP2 > 1 && (
            <div className="mt-2 text-right animate-bounce">
              <span className="text-xl sm:text-3xl font-black text-rose-500 drop-shadow-[0_2px_4px_#000]">
                {comboP2} HITS!
              </span>
              <p className="text-[10px] sm:text-xs font-extrabold text-white tracking-widest uppercase">
                {comboP2 >= 5 ? '¡COMBO DEVASTADOR!' : '¡IMPACTO!'}
              </p>
            </div>
          )}
        </div>

        {/* Top-Right Utility Icon Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto ml-1">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            tabIndex={-1}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="w-8 h-8 rounded bg-black/80 border border-amber-500/60 hover:border-amber-400 text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            tabIndex={-1}
            aria-label="Pause Game"
            className="w-8 h-8 rounded bg-black/80 border border-amber-500/60 hover:border-amber-400 text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Pause size={16} />
          </button>
        </div>
      </div>

      {/* Bottom Bar: Super Calavera Gauges */}
      <div className="w-full max-w-5xl mx-auto flex items-end justify-between gap-4">
        {/* P1 Super Meter */}
        <div className="w-48 sm:w-64">
          <div className="flex items-center justify-between text-[10px] sm:text-xs font-black uppercase text-amber-300 mb-1">
            <span className="flex items-center gap-1">
              CALAVERA GAUGE {p1Meter >= 100 && '🔥 MAX READY!'}
            </span>
            <span className="font-mono">{p1Meter}%</span>
          </div>
          <div className="w-full h-3 sm:h-4 bg-black/90 border border-amber-400/80 rounded-sm overflow-hidden p-0.5 relative">
            <div
              className={`h-full transition-all duration-100 ${
                p1Meter >= 100
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-300 animate-pulse shadow-[0_0_12px_#c084fc]'
                  : 'bg-gradient-to-r from-violet-700 to-purple-400'
              }`}
              style={{ width: `${p1Meter}%` }}
            />
          </div>
          <span className="text-[9px] text-amber-200/80 font-mono mt-0.5 block">
            SUPER: [SPACE] / [RT]
          </span>
        </div>

        {/* Flat minimal control hint line */}
        <div className="hidden md:block text-center text-[10px] sm:text-xs font-medium text-amber-200/70 tracking-wider">
          P1: WASD Move · F/G/H Atk · V Spec · Space Super | P2: Arrows Move · U/I/O Atk · P Spec
        </div>

        {/* P2 Super Meter */}
        <div className="w-48 sm:w-64 flex flex-col items-end">
          <div className="flex items-center justify-between w-full text-[10px] sm:text-xs font-black uppercase text-amber-300 mb-1">
            <span className="font-mono">{p2Meter}%</span>
            <span className="flex items-center gap-1">
              {p2Meter >= 100 && '🔥 MAX READY!'} CALAVERA GAUGE
            </span>
          </div>
          <div className="w-full h-3 sm:h-4 bg-black/90 border border-amber-400/80 rounded-sm overflow-hidden p-0.5 relative">
            <div
              className={`h-full transition-all duration-100 ${
                p2Meter >= 100
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-300 animate-pulse shadow-[0_0_12px_#c084fc]'
                  : 'bg-gradient-to-l from-violet-700 to-purple-400'
              }`}
              style={{ width: `${p2Meter}%` }}
            />
          </div>
          <span className="text-[9px] text-amber-200/80 font-mono mt-0.5 block text-right">
            SUPER: [ENTER] / [NUM 0]
          </span>
        </div>
      </div>
    </div>
  );
};
