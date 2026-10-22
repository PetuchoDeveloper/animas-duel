/**
 * Mounts the isolated HTML5 Canvas and binds the FightEngine.
 * Decoupled from React reconciliation loop to guarantee 60fps performance.
 */

import React, { useEffect, useRef } from 'react';
import { FightEngine, GameMode } from '../game/engine';

interface FightCanvasProps {
  p1CharId: string;
  p2CharId: string;
  stageIdx: number;
  mode: GameMode;
  onHUDUpdate: (data: {
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
    matchState: string;
  }) => void;
  onMatchFinished: (winner: 'P1' | 'P2') => void;
  isPaused: boolean;
}

export const FightCanvas: React.FC<FightCanvasProps> = ({
  p1CharId,
  p2CharId,
  stageIdx,
  mode,
  onHUDUpdate,
  onMatchFinished,
  isPaused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FightEngine | null>(null);
  const hudIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fixed virtual resolution 960x540 for classic arcade 16:9 pixel crispness
    canvas.width = 960;
    canvas.height = 540;

    const engine = new FightEngine(canvas);
    engineRef.current = engine;

    engine.initMatch(p1CharId, p2CharId, stageIdx, mode);
    engine.onMatchOver = (winner) => {
      onMatchFinished(winner);
    };

    engine.start();

    // Throttled HUD update for React state (15Hz is plenty for HUD without bogging 60fps sim)
    hudIntervalRef.current = window.setInterval(() => {
      if (!engineRef.current) return;
      const eng = engineRef.current;
      onHUDUpdate({
        p1Hp: Math.round(eng.p1?.health || 0),
        p1GhostHp: Math.round(eng.p1?.ghostHealth || 0),
        p1Meter: Math.round(eng.p1?.meter || 0),
        p1Rounds: eng.p1?.roundsWon || 0,
        p2Hp: Math.round(eng.p2?.health || 0),
        p2GhostHp: Math.round(eng.p2?.ghostHealth || 0),
        p2Meter: Math.round(eng.p2?.meter || 0),
        p2Rounds: eng.p2?.roundsWon || 0,
        timer: Math.ceil(eng.roundTimer),
        comboP1: eng.comboP1,
        comboP2: eng.comboP2,
        matchState: eng.matchState,
      });
    }, 66);

    return () => {
      if (hudIntervalRef.current !== null) {
        clearInterval(hudIntervalRef.current);
      }
      engine.stop();
    };
  }, [p1CharId, p2CharId, stageIdx, mode]);

  useEffect(() => {
    if (!engineRef.current) return;
    if (isPaused) {
      engineRef.current.stop();
    } else {
      engineRef.current.start();
    }
  }, [isPaused]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        data-testid="fight-canvas"
        className="w-full h-full max-w-[1280px] max-h-[720px] object-contain shadow-2xl"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
