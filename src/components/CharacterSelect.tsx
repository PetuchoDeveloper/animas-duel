/**
 * Fighter and stage selection. Arrow keys move the cursor, Enter confirms, Esc steps back.
 * Story mode offers the two heroes; versus and practice offer everyone.
 */

import { useEffect, useRef, useState } from 'react';
import { url } from '../game/assets';
import { gameAudio } from '../game/audio';
import { BOSSES, HEROES, ROSTER, SOMBREROS, type Fighter } from '../game/roster';
import type { GameMode } from '../game/sim';
import { ControlsList } from './MatchModal';
import { Pips, Portrait, Backdrop, u } from './ui';

interface CharacterSelectProps {
  mode: GameMode;
  onSelectComplete: (p1: string, p2: string, stageIdx: number) => void;
  onBack: () => void;
}

type Step = 'p1' | 'p2' | 'stage';

export function CharacterSelect({ mode, onSelectComplete, onBack }: CharacterSelectProps) {
  const ids = mode === 'story' ? HEROES : Object.keys(ROSTER);
  const [step, setStep] = useState<Step>('p1');
  const [cursor, setCursor] = useState(0);
  const [picks, setPicks] = useState<{ p1: string; p2: string }>({ p1: ids[0], p2: ids[ids.length > 1 ? 1 : 0] });
  const [stage, setStage] = useState(0);
  const versus = mode !== 'story';

  const cursorId = ids[cursor];
  const shown = {
    p1: step === 'p1' ? cursorId : picks.p1,
    p2: !versus ? BOSSES[0] : step === 'p2' ? cursorId : picks.p2,
  };

  /** `index` is the tile that was activated, which a click or tap can differ from the keyboard cursor. */
  const confirm = (index = cursor) => {
    gameAudio.playGuitarChord('A_minor');
    const chosen = step === 'stage' ? cursorId : ids[index];
    if (step === 'p1') {
      if (!versus) {
        onSelectComplete(chosen, BOSSES[0], 0);
        return;
      }
      setPicks((p) => ({ ...p, p1: chosen }));
      setCursor(ids.indexOf(picks.p2));
      setStep('p2');
    } else if (step === 'p2') {
      setPicks((p) => ({ ...p, p2: chosen }));
      setCursor(stage);
      setStep('stage');
    } else {
      gameAudio.playGuitarChord('E_major');
      onSelectComplete(picks.p1, picks.p2, index);
    }
  };

  const back = () => {
    if (step === 'stage') {
      setCursor(ids.indexOf(picks.p2));
      setStep('p2');
    } else if (step === 'p2') {
      setCursor(ids.indexOf(picks.p1));
      setStep('p1');
    } else onBack();
  };

  // Arrow keys (or A/D) move focus along the picker; focus drives the cursor, and Enter or Space
  // then activate the focused button natively. Esc steps back.
  const picker = useRef<HTMLDivElement>(null);
  useEffect(() => {
    picker.current?.querySelectorAll<HTMLButtonElement>('button')[cursor]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const prev = e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'KeyA';
      const next = e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'KeyD';
      if (prev || next) {
        const list = picker.current?.querySelectorAll<HTMLButtonElement>('button');
        if (list?.length) list[(cursor + (next ? 1 : -1) + list.length) % list.length].focus();
      } else if ((e.code === 'Escape' || e.code === 'Backspace') && !e.repeat) back();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (step === 'stage') setStage(cursor);
  }, [cursor, step]);

  const heading = step === 'p1' ? (versus ? 'Jugador 1: elige luchador' : 'Elige a tu héroe') : step === 'p2' ? 'Jugador 2: elige luchador' : 'Elige el sombrero';

  return (
    <div className="layer select-none">
      <Backdrop stage={step === 'stage' ? stage : 0} dim={0.72} />

      <div className="absolute flex items-center justify-between" style={{ top: u(8), left: u(12), right: u(12) }}>
        <button type="button" className="btn btn-quiet" onClick={back}>
          Volver <span className="keycap">Esc</span>
        </button>
        <h2 className="font-pixel t8 text-gold-hi shadow-text">{heading}</h2>
        <span style={{ width: u(60) }} />
      </div>

      <div className="absolute flex items-start justify-between" style={{ top: u(34), left: u(10), right: u(10) }}>
        <FighterCard id={shown.p1} tag={versus ? '1P' : 'Héroe'} tone="gold" />
        <div className="flex flex-col items-center" style={{ gap: u(6), width: u(170) }}>
          {step !== 'stage' ? (
            <div ref={picker} className="flex" style={{ gap: u(5) }}>
              {ids.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  aria-label={ROSTER[id].name}
                  onMouseEnter={() => setCursor(i)}
                  onFocus={() => setCursor(i)}
                  onClick={() => confirm(i)}
                  className="relative block"
                  style={{
                    padding: u(2),
                    background: i === cursor ? (step === 'p2' ? 'var(--color-rose)' : 'var(--color-gold)') : 'var(--color-grape)',
                    cursor: 'pointer',
                    boxShadow: `0 0 0 ${u(1.5)} var(--color-ink)`,
                  }}
                >
                  <div style={{ background: 'var(--color-night)', overflow: 'hidden', width: u(30), height: u(30) }}>
                    <div style={{ marginLeft: u(-17), marginTop: u(-8) }}>
                      <Portrait id={id} />
                    </div>
                  </div>
                  {picks.p1 === id && step === 'p2' && <Tag text="1P" color="var(--color-gold)" corner="left" />}
                </button>
              ))}
            </div>
          ) : (
            <div ref={picker} className="flex flex-col" style={{ gap: u(4), width: '100%' }}>
              {SOMBREROS.map((s, i) => (
                <button
                  key={s.level}
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onFocus={() => setCursor(i)}
                  onClick={() => confirm(i)}
                  className="flex items-center text-left"
                  style={{
                    gap: u(5),
                    padding: u(3),
                    background: i === stage ? 'var(--color-gold)' : 'var(--color-grape)',
                    color: i === stage ? 'var(--color-ink)' : 'var(--color-bone)',
                    cursor: 'pointer',
                  }}
                >
                  <img src={url(`stages/stage${i + 1}-back.png`)} alt="" style={{ width: u(48), height: u(27) }} />
                  <span className="flex flex-col" style={{ gap: u(2) }}>
                    <span className="font-pixel t6">Nivel {s.level}</span>
                    <span className="b9">{s.name}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="b9 text-center text-mist shadow-text" style={{ minHeight: u(24) }}>
            {step === 'stage' ? SOMBREROS[stage].blurb : <>El mismo teclado para dos: {mode === 'training' ? 'el rival se queda quieto.' : 'cada quien con sus teclas.'}</>}
          </p>
        </div>
        <FighterCard id={shown.p2} tag={versus ? '2P' : 'Jefe nivel 1'} tone="rose" />
      </div>

      <div className="absolute inset-x-0 flex justify-center" style={{ bottom: u(8) }}>
        {step === 'stage' ? (
          <button type="button" className="btn btn-rose" onClick={() => confirm()} style={{ width: u(120) }}>
            ¡A pelear! <span className="keycap">Enter</span>
          </button>
        ) : (
          <div className="b9 text-mist shadow-text">
            <ControlsList compact mode={mode} />
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({ text, color, corner }: { text: string; color: string; corner: 'left' | 'right' }) {
  return (
    <span className="font-pixel t6 absolute text-ink" style={{ top: u(-5), [corner]: u(-3), background: color, padding: `${u(1)} ${u(2)}` }}>
      {text}
    </span>
  );
}

function FighterCard({ id, tag, tone }: { id: string; tag: string; tone: 'gold' | 'rose' }) {
  const f: Fighter = ROSTER[id];
  return (
    <div className={`panel ${tone === 'rose' ? 'panel-rose' : ''} flex flex-col items-center`} style={{ width: u(122), padding: u(6), gap: u(4) }}>
      <span className="font-pixel t6 absolute text-ink" style={{ top: u(-6), left: u(6), background: tone === 'rose' ? 'var(--color-rose)' : 'var(--color-gold)', padding: `${u(1)} ${u(3)}` }}>
        {tag}
      </span>
      <div style={{ background: 'var(--color-night)', boxShadow: `0 0 0 ${u(1.5)} var(--color-grape)` }}>
        <Portrait id={id} scale={1.5} flip={tone === 'rose'} />
      </div>
      <h3 className="font-pixel t8 text-center shadow-text" style={{ color: f.accent }}>{f.name}</h3>
      <p className="b9 text-center text-mist" style={{ minHeight: u(24) }}>{f.title}</p>
      <dl className="b9 w-full" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: `${u(2)} ${u(4)}`, alignItems: 'center' }}>
        <dt>Poder</dt><dd><Pips value={f.power} color={f.accent} /></dd>
        <dt>Velocidad</dt><dd><Pips value={f.speed} color={f.accent} /></dd>
        <dt>Defensa</dt><dd><Pips value={f.defense} color={f.accent} /></dd>
      </dl>
      <p className="b9 w-full text-center" style={{ color: f.accent }}>{f.special}</p>
    </div>
  );
}
