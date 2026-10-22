/**
 * Story cutscenes: portrait, name tag and a typewriter line in Spanish with an English subtitle.
 * Enter or a click finishes the line, then moves to the next; Esc skips the scene.
 */

import { useEffect, useRef, useState } from 'react';
import { gameAudio } from '../game/audio';
import { HEROES, ROSTER } from '../game/roster';
import type { DialogueLine } from '../game/storyDialogues';
import { Backdrop, Portrait, u } from './ui';

interface DialogueSceneProps {
  dialogues: DialogueLine[];
  stage: number;
  title: string;
  onComplete: () => void;
}

const CHARS_PER_SECOND = 50;

export function DialogueScene({ dialogues, stage, title, onComplete }: DialogueSceneProps) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const line = dialogues[index];
  const speaker = ROSTER[line.speakerId];
  const heroSide = HEROES.includes(line.speakerId);
  const done = shown >= line.spanishText.length;
  const timer = useRef(0);

  useEffect(() => {
    setShown(0);
    const start = performance.now();
    timer.current = window.setInterval(() => {
      const n = Math.floor(((performance.now() - start) / 1000) * CHARS_PER_SECOND);
      setShown(n);
      if (n >= line.spanishText.length) clearInterval(timer.current);
    }, 30);
    return () => clearInterval(timer.current);
  }, [index, line.spanishText.length]);

  const next = () => {
    if (!done) {
      setShown(line.spanishText.length);
      return;
    }
    gameAudio.playGuitarChord(index % 2 === 0 ? 'A_minor' : 'D_minor');
    if (index < dialogues.length - 1) setIndex(index + 1);
    else onComplete();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        next();
      } else if (e.code === 'Escape') onComplete();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="layer select-none" onClick={next}>
      <Backdrop stage={stage} dim={0.6} />

      <div className="absolute flex items-center justify-between" style={{ top: u(8), left: u(12), right: u(12) }}>
        <h2 className="font-pixel t6 text-gold-hi shadow-text">{title}</h2>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
        >
          Saltar <span className="keycap">Esc</span>
        </button>
      </div>

      <div className="absolute flex items-end" style={{ left: u(12), right: u(12), bottom: u(60), justifyContent: heroSide ? 'flex-start' : 'flex-end' }}>
        <div className="rise" key={index}>
          <Portrait id={line.speakerId} mood={line.mood} scale={2} flip={!heroSide} />
        </div>
      </div>

      <div className="panel absolute" style={{ left: u(12), right: u(12), bottom: u(10), height: u(46), padding: u(7) }}>
        <span className="font-pixel t6 absolute text-ink" style={{ top: u(-6), [heroSide ? 'left' : 'right']: u(8), background: heroSide ? 'var(--color-gold)' : 'var(--color-rose)', padding: `${u(1)} ${u(4)}` }}>
          {speaker.name}
        </span>
        <p className="b13 text-bone" style={{ minHeight: u(20) }}>
          {line.spanishText.slice(0, shown)}
          <span className="blink" aria-hidden>{done ? '' : '_'}</span>
        </p>
        <p className="b9 text-mist" style={{ marginTop: u(3), opacity: done ? 1 : 0 }}>{line.englishSub}</p>
        <span className="blink font-pixel t6 absolute text-gold-hi" style={{ right: u(8), bottom: u(5) }}>{done ? 'Enter >' : ''}</span>
      </div>
    </div>
  );
}
