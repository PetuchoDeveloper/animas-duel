/**
 * Title screen: emblem, logo and the four ways into the game.
 */

import { useRef } from 'react';
import { url } from '../game/assets';
import { gameAudio } from '../game/audio';
import type { GameMode } from '../game/sim';
import { Backdrop, useArrowFocus, u } from './ui';

interface TitleScreenProps {
  onStartGame: (mode: GameMode) => void;
  onOpenLore: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const ENTRIES: { label: string; hint: string; mode?: GameMode }[] = [
  { label: 'Modo historia', hint: 'Los tres sombreros', mode: 'story' },
  { label: 'Duelo local', hint: 'Dos en un teclado', mode: 'versus' },
  { label: 'Práctica', hint: 'Combos sin prisa', mode: 'training' },
  { label: 'Mitología', hint: 'La leyenda' },
];

export function TitleScreen({ onStartGame, onOpenLore, isMuted, onToggleMute }: TitleScreenProps) {
  const menu = useRef<HTMLDivElement>(null);
  useArrowFocus(menu, true);

  // a held Enter from the splash screen must not also pick the first entry
  const openedAt = useRef(performance.now());

  const choose = (mode?: GameMode) => {
    if (performance.now() - openedAt.current < 400) return;
    gameAudio.playGuitarChord(mode ? 'E_major' : 'A_minor');
    if (mode) onStartGame(mode);
    else onOpenLore();
  };

  return (
    <div className="layer select-none">
      <Backdrop stage={0} dim={0.55} />

      <div className="absolute flex items-center justify-between" style={{ top: u(8), left: u(12), right: u(8) }}>
        <span className="font-pixel t6 text-gold-hi shadow-text">Arcade del Día de Muertos</span>
        <button type="button" className="btn btn-quiet" onClick={onToggleMute} aria-pressed={isMuted}>
          Sonido: {isMuted ? 'no' : 'sí'} <span className="keycap">M</span>
        </button>
      </div>

      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: u(16), gap: u(3) }}>
        <img src={url('ui/emblem.png')} alt="" style={{ width: u(52), height: u(52) }} />
        <h1 className="logo text-center" style={{ lineHeight: 1.4 }}>
          <span className="t12 block">Duelo de las</span>
          <span className="t24 block">Ánimas</span>
        </h1>
      </div>

      <div
        ref={menu}
        onKeyDown={(e) => {
          // a held Enter or Space would otherwise fire the focused button again and again
          if (e.repeat && (e.code === 'Enter' || e.code === 'Space')) e.preventDefault();
        }}
        className="absolute grid" style={{ top: u(152), left: '50%', transform: 'translateX(-50%)', gridTemplateColumns: `${u(120)} ${u(120)}`, gap: u(3) }}>
        {ENTRIES.map((e) => (
          <button key={e.label} type="button" className="btn flex-col" style={{ gap: u(2) }} onClick={() => choose(e.mode)}>
            <span>{e.label}</span>
            <span className="b9 normal-case" style={{ fontFamily: 'var(--font-body)', opacity: 0.8 }}>{e.hint}</span>
          </button>
        ))}
      </div>

      <p className="b9 absolute inset-x-0 text-center text-mist shadow-text" style={{ bottom: u(6) }}>
        Flechas para elegir · <span className="keycap">Enter</span> aceptar · <span className="keycap">Esc</span> pausa en combate
      </p>
    </div>
  );
}
