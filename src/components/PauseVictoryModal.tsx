/**
 * Outcome-matched Modals: Pause, Stage Clear, Final Victory, and Game Over.
 * Structured with tabular stats, world-matched styling, and primary CTAs.
 */

import React from 'react';
import { Play, RotateCcw, Home, ArrowRight, Award } from 'lucide-react';
import { SOMBRERO_STAGES } from '../game/combatRules';
import { CHARACTER_ROSTER } from '../game/spriteData';
import { gameAudio } from '../game/audio';

interface PauseVictoryModalProps {
  type: 'pause' | 'victory' | 'gameover' | 'lore';
  stageIdx: number;
  winner: 'P1' | 'P2' | null;
  p1CharId: string;
  p2CharId: string;
  mode: string;
  onResume?: () => void;
  onRestartStage?: () => void;
  onNextStage?: () => void;
  onReturnTitle?: () => void;
  onViewEpilogue?: () => void;
}

export const PauseVictoryModal: React.FC<PauseVictoryModalProps> = ({
  type,
  stageIdx,
  winner,
  p1CharId,
  p2CharId,
  mode,
  onResume,
  onRestartStage,
  onNextStage,
  onReturnTitle,
  onViewEpilogue,
}) => {
  const currentStage = SOMBRERO_STAGES[stageIdx] || SOMBRERO_STAGES[0];
  const nextStage = SOMBRERO_STAGES[stageIdx + 1];
  const p1Char = CHARACTER_ROSTER[p1CharId] || CHARACTER_ROSTER.ernesto;
  const winnerChar = winner === 'P1' ? p1Char : CHARACTER_ROSTER[p2CharId] || CHARACTER_ROSTER.elmacho;

  const isFinalCampaignBoss = mode === 'story' && stageIdx === 2 && winner === 'P1';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none animate-fadeIn">
      {/* PAUSE MODAL */}
      {type === 'pause' && (
        <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-stone-900 to-black border-2 border-amber-500/80 p-6 text-center shadow-[0_0_30px_rgba(245,158,11,0.4)]">
          <h3 className="text-2xl font-black uppercase tracking-wider text-amber-300 mb-1">
            JUEGO EN PAUSA
          </h3>
          <p className="text-xs text-stone-400 font-mono mb-6">{currentStage.spanishTitle}</p>

          <div className="space-y-3">
            <button
              type="button"
              data-start="true"
              onClick={() => {
                gameAudio.playGuitarChord('E_major');
                onResume?.();
              }}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-102 cursor-pointer shadow-lg"
            >
              <Play size={18} fill="currentColor" />
              <span>REANUDAR [ESC / P]</span>
            </button>

            <button
              type="button"
              onClick={() => {
                gameAudio.playGuitarChord('A_minor');
                onRestartStage?.();
              }}
              className="w-full py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw size={16} />
              <span>REINICIAR SOMBRERO [R]</span>
            </button>

            <button
              type="button"
              onClick={() => {
                gameAudio.playGuitarChord('D_minor');
                onReturnTitle?.();
              }}
              className="w-full py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-400 hover:text-stone-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Home size={16} />
              <span>VOLVER AL MENÚ</span>
            </button>
          </div>
        </div>
      )}

      {/* VICTORY MODAL */}
      {type === 'victory' && (
        <div className="w-full max-w-md rounded-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border-2 border-amber-400 p-6 sm:p-8 text-center shadow-[0_0_40px_rgba(245,158,11,0.6)]">
          {/* Fanfare Sugar Skull */}
          <div className="w-16 h-16 mx-auto mb-3 text-amber-400">
            <Award className="w-full h-full drop-shadow-[0_0_12px_#f59e0b]" />
          </div>

          <span className="text-xs font-black uppercase tracking-widest text-amber-400">
            {isFinalCampaignBoss
              ? '✦ ¡CAMPEÓN SUPREMO DE MICTLÁN! ✦'
              : '✦ ¡SOMBRERO CONQUISTADO! ✦'}
          </span>
          <h2 className="text-2xl sm:text-4xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 mt-1 mb-2">
            ¡{winnerChar.name.toUpperCase()} VENCE!
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 font-medium mb-6">
            {isFinalCampaignBoss
              ? 'Has derrotado a Huesos en el Sombrero Destrozado. ¡Las almas cruzan hacia la vida!'
              : mode === 'story'
              ? `Has superado este nivel. El Sombrero sufre más daños al ascender: ${nextStage?.spanishTitle}.`
              : '¡Un combate memorable en la Noche de los Muertos!'}
          </p>

          {/* Action CTAs */}
          <div className="space-y-3">
            {isFinalCampaignBoss ? (
              <button
                type="button"
                data-start="true"
                onClick={onViewEpilogue}
                className="w-full py-3.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 hover:from-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.7)] transition-transform hover:scale-102 cursor-pointer"
              >
                <span>VER FINAL Y EPÍLOGO DE {p1Char.name.toUpperCase()}</span>
                <ArrowRight size={18} />
              </button>
            ) : mode === 'story' && nextStage ? (
              <button
                type="button"
                data-start="true"
                onClick={onNextStage}
                className="w-full py-3.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.7)] transition-transform hover:scale-102 cursor-pointer"
              >
                <span>SUBIR AL SIGUIENTE SOMBRERO (NIVEL {nextStage.level})</span>
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                data-start="true"
                onClick={onRestartStage}
                className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw size={16} />
                <span>REVANCHA / REINTENTAR</span>
              </button>
            )}

            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              VOLVER AL MENÚ PRINCIPAL
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER (DEFEAT) MODAL */}
      {type === 'gameover' && (
        <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-rose-950/90 via-stone-950 to-black border-2 border-rose-500 p-6 text-center shadow-[0_0_35px_rgba(244,63,94,0.5)]">
          <h3 className="text-3xl font-black uppercase tracking-wider text-rose-500 mb-1">
            ¡HAS CAÍDO!
          </h3>
          <p className="text-xs text-amber-200/80 font-bold uppercase tracking-wider mb-4">
            {currentStage.spanishTitle}
          </p>

          <p className="text-xs text-stone-300 mb-6">
            Tu espíritu aún no se rinde. La música y la pasión de tu pueblo te llaman de vuelta a la pelea.
          </p>

          <div className="space-y-3">
            <button
              type="button"
              data-start="true"
              onClick={() => {
                gameAudio.playGuitarChord('E_major');
                onRestartStage?.();
              }}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:scale-102 cursor-pointer shadow-lg"
            >
              <RotateCcw size={18} />
              <span>REINTENTAR ESTE SOMBRERO [ENTER]</span>
            </button>

            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              VOLVER AL MENÚ PRINCIPAL
            </button>
          </div>
        </div>
      )}

      {/* STORY LORE ARCHIVE MODAL */}
      {type === 'lore' && (
        <div className="w-full max-w-2xl rounded-2xl bg-stone-950 border-2 border-amber-500 p-6 sm:p-8 text-left shadow-[0_0_40px_rgba(245,158,11,0.5)] max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
            <h3 className="text-xl sm:text-2xl font-black uppercase text-amber-300">
              MITOLOGÍA: LOS TRES SOMBREROS SAGRADOS
            </h3>
            <button
              type="button"
              onClick={onReturnTitle}
              className="px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-300 cursor-pointer"
            >
              CERRAR [ESC]
            </button>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-stone-300 leading-relaxed">
            <div>
              <h4 className="text-amber-400 font-bold uppercase text-sm mb-1">
                ✦ La Leyenda del Día de Muertos y Mictlán
              </h4>
              <p>
                Cada cien años, durante la noche más sagrada del Día de Muertos, tres Sombreros Celestiales
                se alinean sobre el cielo de México. Son los peldaños que unen el mundo de los vivos con
                el inframundo de Mictlán, permitiendo a las ánimas regresar a abrazar a sus familias.
              </p>
            </div>

            <div>
              <h4 className="text-amber-400 font-bold uppercase text-sm mb-1">
                ✦ Los 3 Niveles y su Deterioro
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-300">
                <li>
                  <strong className="text-amber-300">Nivel 1: El Gran Sombrero Dorado.</strong> Un sombrero charro impecable
                  de terciopelo negro y bordados dorados. Custodiado por Don Hormigón en la plaza de las ofrendas.
                </li>
                <li>
                  <strong className="text-orange-300">Nivel 2: El Sombrero Agrietado.</strong> Los combates de los campeones
                  rasgan el fieltro y liberan chispas espirituales en la tormenta del crepúsculo.
                </li>
                <li>
                  <strong className="text-purple-300">Nivel 3: El Sombrero de Mictlán.</strong> Destrozado en pedazos flotantes
                  por la guadaña de Huesos, suspendido sobre el abismo por cadenas de fuego espectral.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-amber-400 font-bold uppercase text-sm mb-1">
                ✦ Los Protagonistas
              </h4>
              <p>
                <strong className="text-purple-300">Ernesto "El Catrín Cantor":</strong> Mariachi inmortal que busca cantar
                el huapango final a su bisnieta antes de que se apague la última veladora.
                <br />
                <strong className="text-rose-400">El Macho "El Coloso Calavera":</strong> Luchador legendario que prometió
                llevar su cinturón de oro a los niños de su antiguo barrio.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
