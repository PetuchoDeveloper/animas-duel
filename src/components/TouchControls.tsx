/**
 * On-screen buttons for touch devices: a d-pad on the left, attacks on the right.
 * Only mounted when the primary pointer is coarse, so keyboards never see it.
 */

import type { Input } from '../game/sim';
import { u } from './ui';

type Key = keyof Input;

interface Pad {
  key: Key;
  label: string;
  col: number;
  row: number;
}

const PADS: Pad[] = [
  { key: 'up', label: '^', col: 2, row: 1 },
  { key: 'left', label: '<', col: 1, row: 2 },
  { key: 'down', label: 'v', col: 2, row: 2 },
  { key: 'right', label: '>', col: 3, row: 2 },
];
const ACTIONS: Pad[] = [
  { key: 'heavy', label: 'FUE', col: 1, row: 1 },
  { key: 'special', label: 'ESP', col: 2, row: 1 },
  { key: 'super', label: 'SUP', col: 3, row: 1 },
  { key: 'light', label: 'LIG', col: 1, row: 2 },
  { key: 'dodge', label: 'ESQ', col: 2, row: 2 },
];

export const hasTouch = (): boolean => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export function TouchControls({ onPress }: { onPress: (key: Key, down: boolean) => void }) {
  const button = (p: Pad) => (
    <button
      key={p.key}
      type="button"
      tabIndex={-1}
      aria-label={p.key}
      className="font-pixel t6 select-none text-bone"
      style={{
        gridColumn: p.col,
        gridRow: p.row,
        background: p.key === 'super' ? 'rgb(154 80 224 / 0.55)' : 'rgb(44 28 76 / 0.55)',
        boxShadow: `0 0 0 ${u(1)} rgb(226 176 40 / 0.65)`,
        touchAction: 'none',
        padding: 0,
      }}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId); // keeps the press alive when the finger slides off
        } catch {
          // the pointer is already gone; the press itself still counts
        }
        onPress(p.key, true);
      }}
      onPointerUp={() => onPress(p.key, false)}
      onPointerCancel={() => onPress(p.key, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {p.label}
    </button>
  );
  const grid = { display: 'grid', gridTemplateColumns: `repeat(3, ${u(26)})`, gridAutoRows: u(26), gap: u(3) };
  return (
    <div className="layer pointer-events-none">
      <div className="pointer-events-auto absolute" style={{ ...grid, left: u(8), bottom: u(30) }}>{PADS.map(button)}</div>
      <div className="pointer-events-auto absolute" style={{ ...grid, right: u(8), bottom: u(30) }}>{ACTIONS.map(button)}</div>
    </div>
  );
}
