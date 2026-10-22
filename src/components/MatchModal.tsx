/**
 * Panels that sit over the battle or the title: pause, match result, and the lore archive.
 */

import { useRef } from 'react';
import { gameAudio } from '../game/audio';
import { ROSTER, SOMBREROS } from '../game/roster';
import type { GameMode } from '../game/sim';
import { Portrait, useArrowFocus, useKey, u } from './ui';

const K = ({ children }: { children: React.ReactNode }) => <span className="keycap">{children}</span>;

/** Who presses what. `compact` is the one-line version for the select screen. */
export function ControlsList({ mode, compact = false }: { mode: GameMode; compact?: boolean }) {
  const solo = mode !== 'versus';
  if (compact) {
    return (
      <p className="text-center">
        <K>A</K> <K>D</K> mover · <K>W</K> saltar · <K>S</K> guardia · <K>F</K> <K>G</K> golpes · <K>V</K> especial · <K>H</K> esquiva · <K>Espacio</K> super
      </p>
    );
  }
  return (
    <div className="b9 text-mist" style={{ display: 'grid', gridTemplateColumns: solo ? '1fr' : '1fr 1fr', gap: u(6) }}>
      <p>
        <span className="font-pixel t6 text-gold-hi">{solo ? 'Controles' : 'Jugador 1'}</span>
        <br />
        <K>A</K> <K>D</K> mover · <K>W</K> saltar · <K>S</K> guardia<br />
        <K>F</K> ligero · <K>G</K> fuerte · <K>V</K> especial<br />
        <K>H</K> esquiva · <K>Espacio</K> super
        {solo && <><br />También las flechas, y <K>J</K> <K>K</K> <K>L</K> <K>U</K> <K>Enter</K></>}
      </p>
      {!solo && (
        <p>
          <span className="font-pixel t6 text-rose">Jugador 2</span>
          <br />
          <K>Flechas</K> mover, saltar, guardia<br />
          <K>,</K> ligero · <K>.</K> fuerte · <K>/</K> especial<br />
          <K>'</K> esquiva · <K>Enter</K> super
        </p>
      )}
    </div>
  );
}

interface MatchModalProps {
  type: 'pause' | 'victory' | 'defeat';
  mode: GameMode;
  stageIdx: number;
  p1: string;
  p2: string;
  onResume: () => void;
  onRestart: () => void;
  onNextStage: () => void;
  onEpilogue: () => void;
  onQuit: () => void;
}

export function MatchModal({ type, mode, stageIdx, p1, p2, onResume, onRestart, onNextStage, onEpilogue, onQuit }: MatchModalProps) {
  const box = useRef<HTMLDivElement>(null);
  useArrowFocus(box);
  const story = mode === 'story';
  const last = stageIdx >= SOMBREROS.length - 1;
  const stage = SOMBREROS[stageIdx];
  const hero = ROSTER[p1];
  const rival = ROSTER[p2];
  const click = (fn: () => void) => () => {
    gameAudio.playGuitarChord('E_major');
    fn();
  };

  let heading = 'Pausa';
  let sub = `Nivel ${stage.level}: ${stage.name}`;
  let tone = '';
  if (type === 'victory') {
    heading = story ? (last ? '¡Campeón de Mictlán!' : '¡Sombrero conquistado!') : `¡${hero.name} vence!`;
    sub = story ? (last ? 'El Macho cae y los tres pétalos vuelven al portal.' : `El siguiente sombrero espera: ${SOMBREROS[stageIdx + 1].name}.`) : 'Un combate para recordar en la Noche de Muertos.';
  } else if (type === 'defeat') {
    heading = story ? '¡Has caído!' : `¡${rival.name} vence!`;
    sub = story ? 'Tu espíritu aún no se rinde. Levántate y vuelve a subir.' : 'Una revancha cura cualquier derrota.';
    tone = 'panel-rose';
  }

  return (
    <div className="layer flex items-center justify-center" style={{ background: 'rgb(7 3 18 / 0.78)' }}>
      <div ref={box} className={`panel ${tone} rise flex flex-col items-center text-center`} style={{ width: u(210), padding: u(10), gap: u(6) }}>
        {type !== 'pause' && (
          <div className="flex items-end" style={{ gap: u(6) }}>
            <Portrait id={type === 'victory' ? p1 : p2} mood="smug" scale={1} />
            {!story && <Portrait id={type === 'victory' ? p2 : p1} mood="hurt" scale={1} flip />}
          </div>
        )}
        <h2 className="font-pixel t12 text-gold-hi shadow-text" style={{ lineHeight: 1.4 }}>{heading}</h2>
        <p className="b11 text-mist">{sub}</p>

        {type === 'pause' && <ControlsList mode={mode} />}

        <div className="flex flex-col" style={{ gap: u(2), width: '100%' }}>
          {type === 'pause' && (
            <button type="button" className="btn" onClick={click(onResume)}>Reanudar <K>Esc</K></button>
          )}
          {type === 'victory' && story && !last && <button type="button" className="btn" onClick={click(onNextStage)}>Subir al nivel {stageIdx + 2}</button>}
          {type === 'victory' && story && last && <button type="button" className="btn" onClick={click(onEpilogue)}>Ver el epílogo</button>}
          {(type === 'defeat' || (type === 'victory' && !story)) && (
            <button type="button" className="btn" onClick={click(onRestart)}>{story ? 'Reintentar este sombrero' : 'Revancha'}</button>
          )}
          {type === 'pause' && <button type="button" className="btn btn-quiet" onClick={click(onRestart)}>Reiniciar combate</button>}
          <button type="button" className="btn btn-quiet" onClick={click(onQuit)}>Volver al menú</button>
        </div>
      </div>
    </div>
  );
}

export function LoreModal({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useArrowFocus(box);
  useKey(['Escape'], onClose, [onClose]);
  return (
    <div className="layer flex items-center justify-center" style={{ background: 'rgb(7 3 18 / 0.85)' }}>
      <div ref={box} className="panel rise flex flex-col" style={{ width: u(330), padding: u(10), gap: u(6) }}>
        <div className="flex items-center justify-between">
          <h2 className="font-pixel t10 text-gold-hi shadow-text">Los tres sombreros sagrados</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cerrar <K>Esc</K></button>
        </div>
        <p className="b11 text-bone">
          Cada cien años, en la noche más sagrada del Día de Muertos, tres sombreros celestiales se alinean sobre México.
          Son los peldaños que unen el mundo de los vivos con Mictlán, para que las ánimas vuelvan a abrazar a sus familias.
        </p>
        <ul className="b11 flex flex-col text-mist" style={{ gap: u(4) }}>
          <li><strong className="text-gold-hi">Nivel 1, El Gran Sombrero Dorado.</strong> Terciopelo negro y bordados de oro, vigilado por Ernesto en la plaza de las ofrendas.</li>
          <li><strong className="text-marigold">Nivel 2, El Sombrero Agrietado.</strong> Los combates rasgan el fieltro bajo la tormenta, y Huesos corta el aire con su guadaña.</li>
          <li><strong className="text-violet">Nivel 3, El Sombrero de Mictlán.</strong> Hecho pedazos flotantes y atado al abismo por cadenas espectrales: el cuadrilátero de El Macho.</li>
        </ul>
        <p className="b11 text-mist">
          <strong className="text-violet">Ernesto, el Catrín Cantor,</strong> quiere cantar el último huapango a su bisnieta antes de que se apague la última veladora.{' '}
          <strong className="text-rose">El Macho</strong> roba un pétalo tras cada pelea y sabotea las arenas con barriles y yunques; solo el último combate es contra él en persona.
        </p>
      </div>
    </div>
  );
}
