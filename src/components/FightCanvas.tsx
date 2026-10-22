/**
 * Mounts the battle canvas and owns the engine's lifetime. Pausing is a flag, never a teardown,
 * so a paused round resumes exactly where it stopped.
 */

import { useEffect, useRef, useState } from 'react';
import { loadAssets } from '../game/assets';
import { FightEngine } from '../game/engine';
import type { GameMode, Slot } from '../game/sim';
import { u } from './ui';

interface FightCanvasProps {
  p1: string;
  p2: string;
  stage: number;
  mode: GameMode;
  paused: boolean;
  onMatchOver: (winner: Slot) => void;
}

export function FightCanvas({ p1, p2, stage, mode, paused, onMatchOver }: FightCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<FightEngine | null>(null);
  const latest = useRef({ paused, onMatchOver });
  latest.current = { paused, onMatchOver };
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadAssets()
      .then((assets) => {
        if (cancelled || !canvas.current) return;
        const e = new FightEngine(canvas.current, assets, { p1, p2, stage, mode, onMatchOver: (w) => latest.current.onMatchOver(w) });
        e.setPaused(latest.current.paused);
        e.start();
        engine.current = e;
        if (import.meta.env.DEV) (window as unknown as { __engine?: FightEngine }).__engine = e;
      })
      .catch((err: Error) => setError(err.message));
    return () => {
      cancelled = true;
      engine.current?.destroy();
      engine.current = null;
    };
  }, [p1, p2, stage, mode]);

  useEffect(() => {
    engine.current?.setPaused(paused);
  }, [paused]);

  return (
    <div className="layer bg-ink select-none">
      <canvas ref={canvas} data-testid="fight-canvas" className="block h-full w-full" />
      {error && <p className="font-pixel t8 absolute inset-0 flex items-center justify-center text-rose" style={{ padding: u(20) }}>{error}</p>}
    </div>
  );
}
