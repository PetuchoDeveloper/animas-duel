/**
 * Story Dialogue Visual Novel Cutscene overlay.
 * Features speaker portraits, authentic Spanish narrative with English subtitles,
 * acoustic guitar strums, and keyboard space/enter progression.
 */

import React, { useState, useEffect } from 'react';
import { DialogueLine } from '../game/storyDialogues';
import { CHARACTER_ROSTER } from '../game/spriteData';
import { gameAudio } from '../game/audio';
import { FastForward } from 'lucide-react';

interface StoryDialogueOverlayProps {
  dialogues: DialogueLine[];
  onComplete: () => void;
  title: string;
}

export const StoryDialogueOverlay: React.FC<StoryDialogueOverlayProps> = ({
  dialogues,
  onComplete,
  title,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentLine = dialogues[currentIndex] || dialogues[0];
  const speaker = CHARACTER_ROSTER[currentLine.speakerId] || CHARACTER_ROSTER.ernesto;

  const handleNext = () => {
    gameAudio.playGuitarChord(currentIndex % 2 === 0 ? 'A_minor' : 'D_minor');
    if (currentIndex < dialogues.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'Escape') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, dialogues.length]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-t from-black via-black/85 to-transparent select-none animate-fadeIn">
      {/* Top Bar with Cutscene Title & Skip button */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-300 drop-shadow">
            {title}
          </h4>
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-stone-900/80 border border-stone-700 hover:border-amber-400 text-stone-300 hover:text-amber-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <span>SALTAR [ESC]</span>
          <FastForward size={14} />
        </button>
      </div>

      {/* Center/Bottom: Character Portrait & Dialogue Box */}
      <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-end gap-4 mt-auto">
        {/* Character Animated Portrait Box */}
        <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-xl border-2 border-amber-400 bg-stone-950 overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.5)] shrink-0 relative flex items-center justify-center">
          <img
            src={speaker.spritesheetPath}
            alt={currentLine.speakerName}
            className="w-full h-full object-cover scale-150 transition-transform duration-300"
            style={{ objectPosition: '10% 90%' }}
          />
          <div className="absolute bottom-0 inset-x-0 bg-black/80 py-0.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300">
            {currentLine.speakerName}
          </div>
        </div>

        {/* Dialogue Balloon */}
        <div
          onClick={handleNext}
          className="flex-1 w-full bg-gradient-to-r from-stone-950/95 via-stone-900/95 to-black/95 border-2 border-amber-500/80 rounded-xl p-4 sm:p-6 shadow-2xl relative cursor-pointer hover:border-amber-400 transition-colors"
        >
          {/* Speaker Name Tag */}
          <div className="inline-block px-3 py-1 rounded-sm bg-gradient-to-r from-amber-500 to-rose-600 text-black font-black text-xs uppercase tracking-wider mb-2">
            {currentLine.speakerName}
          </div>

          {/* Spanish Voice Text */}
          <p className="text-base sm:text-xl font-bold text-amber-100 leading-snug tracking-wide mb-2 drop-shadow">
            "{currentLine.spanishText}"
          </p>

          {/* English Subtitles */}
          <p className="text-xs sm:text-sm font-medium text-stone-300 italic tracking-normal border-t border-stone-800 pt-2">
            {currentLine.englishSub}
          </p>

          {/* Press Space/Enter Prompt */}
          <div className="mt-3 flex items-center justify-between text-[10px] text-amber-400/80 font-mono">
            <span>LÍNEA {currentIndex + 1} DE {dialogues.length}</span>
            <span className="animate-pulse">PRESIONA ESPACIO O HAZ CLIC PARA CONTINUAR ▶</span>
          </div>
        </div>
      </div>
    </div>
  );
};
