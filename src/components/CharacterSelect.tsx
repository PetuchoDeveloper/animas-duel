/**
 * TKOF-inspired Character Select Screen with animated portrait cards,
 * stat meters, and stage select for Local Multiplayer.
 * Main heroes: El Frijolito (The Bean) and La Pulguita (The Flea).
 */

import React, { useState } from 'react';
import { CHARACTER_ROSTER, CharacterSpriteConfig } from '../game/spriteData';
import { SOMBRERO_STAGES } from '../game/combatRules';
import { gameAudio } from '../game/audio';
import { GameMode } from '../game/engine';

interface CharacterSelectProps {
  mode: GameMode;
  onSelectComplete: (p1Id: string, p2Id: string, stageIdx: number) => void;
  onBack: () => void;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({
  mode,
  onSelectComplete,
  onBack,
}) => {
  const rosterList = Object.values(CHARACTER_ROSTER);

  // In Story mode, player chooses between the 2 heroes: El Frijolito (The Bean) or La Pulguita (The Flea)
  const playableList = mode === 'story'
    ? rosterList.filter((c) => c.id === 'bean' || c.id === 'flea')
    : rosterList;

  const [p1SelectedId, setP1SelectedId] = useState<string>('bean');
  const [p2SelectedId, setP2SelectedId] = useState<string>(mode === 'story' ? 'ernesto' : 'flea');
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);
  const [activePickingPlayer, setActivePickingPlayer] = useState<'p1' | 'p2' | 'stage'>('p1');

  const p1Char = CHARACTER_ROSTER[p1SelectedId] || CHARACTER_ROSTER.bean;
  const p2Char = CHARACTER_ROSTER[p2SelectedId] || CHARACTER_ROSTER.ernesto;

  const handlePickFighter = (fighter: CharacterSpriteConfig) => {
    gameAudio.playGuitarChord('A_minor');
    if (activePickingPlayer === 'p1') {
      setP1SelectedId(fighter.id);
      if (mode === 'versus') {
        setActivePickingPlayer('p2');
      } else {
        // Story mode Level 1 Boss is Ernesto!
        setP2SelectedId('ernesto');
        onSelectComplete(fighter.id, 'ernesto', 0);
      }
    } else if (activePickingPlayer === 'p2') {
      setP2SelectedId(fighter.id);
      setActivePickingPlayer('stage');
    }
  };

  const handleConfirmVersus = () => {
    gameAudio.playGuitarChord('E_major');
    onSelectComplete(p1SelectedId, p2SelectedId, selectedStageIdx);
  };

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between items-center bg-gradient-to-b from-[#090214] via-[#150522] to-[#25081c] text-white p-4 sm:p-8 select-none overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between z-10 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded bg-black/60 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          ← VOLVER AL MENÚ
        </button>

        <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-amber-300 drop-shadow">
          {mode === 'story' ? 'ELIGE TU HÉROE: EL FRIJOL O LA PULGA' : 'SELECCIÓN DE LUCHADORES'}
        </h2>

        <span className="text-xs text-purple-300 font-mono uppercase">
          {mode === 'story' ? 'MODO HISTORIA' : activePickingPlayer === 'p1' ? 'P1 ELIGE' : activePickingPlayer === 'p2' ? 'P2 ELIGE' : 'ELIGE SOMBRERO'}
        </span>
      </div>

      {/* Main Grid: Player 1 Card | Roster Grid | Player 2 Card */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center my-auto z-10">
        {/* P1 Hero Preview Card */}
        <div
          className="flex flex-col items-center p-4 rounded-xl border-2 bg-gradient-to-b from-stone-900/90 to-black/90 shadow-2xl relative"
          style={{ borderColor: p1Char.accentColor }}
        >
          <span className="absolute -top-3 left-4 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black">
            JUGADOR 1
          </span>

          <div className="w-32 h-32 rounded-lg overflow-hidden border border-amber-500/50 bg-black flex items-center justify-center mb-3">
            <img
              src={p1Char.spritesheetPath}
              alt={p1Char.name}
              className="w-full h-full object-cover scale-150"
              style={{ objectPosition: p1Char.id === 'bean' ? '5% 92%' : p1Char.id === 'flea' ? '55% 92%' : '10% 90%' }}
            />
          </div>

          <h3 className="text-xl font-black uppercase tracking-wider" style={{ color: p1Char.accentColor }}>
            {p1Char.name}
          </h3>
          <p className="text-xs text-amber-200/80 font-bold uppercase tracking-widest mb-3">
            {p1Char.title}
          </p>

          <div className="w-full space-y-1.5 text-xs font-bold text-stone-300">
            <div className="flex justify-between items-center">
              <span>PODER:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`w-4 h-2 rounded-sm ${s <= p1Char.power ? 'bg-amber-400' : 'bg-stone-800'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>VELOCIDAD:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`w-4 h-2 rounded-sm ${s <= p1Char.speed ? 'bg-amber-400' : 'bg-stone-800'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>DEFENSA:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`w-4 h-2 rounded-sm ${s <= p1Char.defense ? 'bg-amber-400' : 'bg-stone-800'}`}
                  />
                ))}
              </div>
            </div>
            <div className="text-[11px] text-amber-300/80 mt-2 text-center">
              ESTILO: {p1Char.style} · ALCANCE: {p1Char.reach}
            </div>
          </div>
        </div>

        {/* Center: Roster Selection Grid */}
        <div className="flex flex-col items-center">
          <p className="text-xs text-amber-200/90 font-bold tracking-widest uppercase mb-3 text-center">
            {activePickingPlayer === 'stage'
              ? 'SELECCIONA EL SOMBRERO DE COMBATE'
              : mode === 'story'
              ? 'SELECCIONA A TU HÉROE'
              : `SELECCIONA LUCHADOR (${activePickingPlayer === 'p1' ? 'P1' : 'P2'})`}
          </p>

          {activePickingPlayer !== 'stage' ? (
            <div className={`grid ${mode === 'story' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-3 w-full`}>
              {playableList.map((fighter) => {
                const isP1Selected = p1SelectedId === fighter.id;
                const isP2Selected = p2SelectedId === fighter.id;
                return (
                  <button
                    key={fighter.id}
                    type="button"
                    onClick={() => handlePickFighter(fighter)}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all cursor-pointer relative ${
                      isP1Selected
                        ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-105'
                        : isP2Selected && mode === 'versus'
                        ? 'border-rose-400 bg-rose-950/40 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                        : 'border-stone-800 bg-black/60 hover:border-amber-500/60'
                    }`}
                  >
                    {isP1Selected && (
                      <span className="absolute -top-2 -left-2 bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded">
                        P1
                      </span>
                    )}
                    {isP2Selected && mode === 'versus' && (
                      <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                        P2
                      </span>
                    )}

                    <div className="w-16 h-16 rounded overflow-hidden bg-stone-900 border border-stone-700">
                      <img
                        src={fighter.spritesheetPath}
                        alt={fighter.name}
                        className="w-full h-full object-cover scale-150"
                        style={{
                          objectPosition:
                            fighter.id === 'bean' ? '5% 92%' : fighter.id === 'flea' ? '55% 92%' : '10% 90%',
                        }}
                      />
                    </div>
                    <span className="font-black text-xs uppercase tracking-wide text-white">
                      {fighter.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            // Stage Selection for Versus Mode
            <div className="w-full space-y-2">
              {SOMBRERO_STAGES.map((stg, idx) => (
                <button
                  key={stg.level}
                  type="button"
                  onClick={() => {
                    setSelectedStageIdx(idx);
                    gameAudio.playGuitarChord('G_major');
                  }}
                  className={`w-full p-2.5 rounded-lg border-2 text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                    selectedStageIdx === idx
                      ? 'border-amber-400 bg-amber-950/60 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                      : 'border-stone-800 bg-black/60 hover:border-amber-500/50'
                  }`}
                >
                  <span className="font-black text-xs uppercase" style={{ color: stg.themeHue }}>
                    {stg.spanishTitle}
                  </span>
                  <span className="text-[10px] text-stone-300 line-clamp-1">{stg.description}</span>
                </button>
              ))}

              <button
                type="button"
                data-start="true"
                onClick={handleConfirmVersus}
                className="w-full mt-3 py-3 rounded bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-black font-black text-sm uppercase tracking-wider shadow-lg transition-transform hover:scale-102 active:scale-95 cursor-pointer"
              >
                ¡CONFIRMAR DUELO Y PELEAR!
              </button>
            </div>
          )}
        </div>

        {/* P2 Hero Preview Card */}
        <div
          className="flex flex-col items-center p-4 rounded-xl border-2 bg-gradient-to-b from-stone-900/90 to-black/90 shadow-2xl relative"
          style={{ borderColor: p2Char.accentColor }}
        >
          <span className="absolute -top-3 right-4 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
            {mode === 'story' ? 'JEFE NIVEL 1' : 'JUGADOR 2'}
          </span>

          <div className="w-32 h-32 rounded-lg overflow-hidden border border-rose-500/50 bg-black flex items-center justify-center mb-3">
            <img
              src={p2Char.spritesheetPath}
              alt={p2Char.name}
              className="w-full h-full object-cover scale-150"
              style={{
                objectPosition:
                  p2Char.id === 'bean' ? '5% 92%' : p2Char.id === 'flea' ? '55% 92%' : '10% 90%',
              }}
            />
          </div>

          <h3 className="text-xl font-black uppercase tracking-wider" style={{ color: p2Char.accentColor }}>
            {p2Char.name}
          </h3>
          <p className="text-xs text-rose-200/80 font-bold uppercase tracking-widest mb-3">
            {p2Char.title}
          </p>

          <div className="w-full space-y-1.5 text-xs font-bold text-stone-300">
            <div className="flex justify-between items-center">
              <span>PODER:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`w-4 h-2 rounded-sm ${s <= p2Char.power ? 'bg-rose-400' : 'bg-stone-800'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>VELOCIDAD:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`w-4 h-2 rounded-sm ${s <= p2Char.speed ? 'bg-rose-400' : 'bg-stone-800'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>DEFENSA:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`w-4 h-2 rounded-sm ${s <= p2Char.defense ? 'bg-rose-400' : 'bg-stone-800'}`}
                  />
                ))}
              </div>
            </div>
            <div className="text-[11px] text-rose-300/80 mt-2 text-center">
              ESTILO: {p2Char.style} · ALCANCE: {p2Char.reach}
            </div>
          </div>
        </div>
      </div>

      {/* Control Hint Footer */}
      <div className="text-xs text-amber-200/60 font-medium tracking-wide text-center mt-4">
        {mode === 'story'
          ? 'El Frijolito y La Pulguita son los héroes que ascenderán los 3 Sombreros contra Ernesto, El Macho y Huesos.'
          : 'P1 usa WASD + F/G/H/V · P2 usa Flechas + U/I/O/P'}
      </div>
    </div>
  );
};
