/**
 * The story map: three sombreros over a road of marigold petals. The hero's token walks to the next
 * sombrero, cleared ones are checked, the ones ahead are locked, and El Macho's mask marks where he
 * will make trouble. Enter climbs, Esc goes back.
 */

import { useEffect, useRef } from 'react';
import { ATLAS, loadAssets, type Assets } from '../game/assets';
import { gameAudio } from '../game/audio';
import { BOSSES, ROSTER, SOMBREROS } from '../game/roster';
import { TROUBLE } from '../game/storyDialogues';
import { Portrait, u, useKey } from './ui';

interface MapScreenProps {
  hero: string;
  /** The sombrero about to be fought, 0 to 2; the ones before it are cleared. */
  level: number;
  onGo: () => void;
  onBack: () => void;
}

const WARNING = [
  'El Macho rueda barriles por el suelo. Salta para esquivarlos.',
  'El Macho suelta yunques. Vigila las sombras en el piso.',
  'Aquí no hay trucos: el Macho pelea en persona.',
];
const ICON = { lock: 0, check: 1, macho: 2 };

const ease = (t: number) => t * t * (3 - 2 * t);

export function MapScreen({ hero, level, onGo, onBack }: MapScreenProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stopped = false;
    let raf = 0;
    loadAssets()
      .then((assets) => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d', { alpha: false });
        if (stopped || !canvas || !ctx) return;
        canvas.width = 480;
        canvas.height = 270;
        const start = performance.now();
        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);
          draw(ctx, assets, hero, level, (now - start) / 1000);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        // the buttons still work over a plain background
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [hero, level]);

  const go = () => {
    gameAudio.playGuitarChord('E_major');
    onGo();
  };
  useKey(['Enter', 'Space'], go, [go]);
  useKey(['Escape'], onBack, [onBack]);

  const boss = ROSTER[BOSSES[level]];
  const trouble = TROUBLE[level];
  return (
    <div className="layer select-none">
      <canvas ref={ref} className="absolute inset-0 h-full w-full bg-ink" style={{ imageRendering: 'pixelated' }} />
      <div className="absolute flex items-center justify-between" style={{ top: u(8), left: u(12), right: u(12) }}>
        <h2 className="font-pixel t8 text-gold-hi shadow-text">El camino de los tres sombreros</h2>
        <button type="button" className="btn btn-quiet" onClick={onBack}>Volver <span className="keycap">Esc</span></button>
      </div>
      <div className="panel absolute flex items-center" style={{ right: u(10), bottom: u(10), width: u(222), padding: u(6), gap: u(6) }}>
        <Portrait id={boss.id} mood={level === 2 ? 'smug' : 'neutral'} scale={1} />
        <div className="flex flex-1 flex-col" style={{ gap: u(2) }}>
          <span className="font-pixel t6 text-gold-hi">Nivel {level + 1} · {SOMBREROS[level].name}</span>
          <span className="b11 text-bone">Jefe: {boss.name}, {boss.title}</span>
          <span className={`b9 ${trouble ? 'text-rose' : 'text-violet'}`}>{WARNING[level]}</span>
          <button type="button" className="btn" style={{ marginTop: u(2) }} onClick={go}>Subir <span className="keycap">Enter</span></button>
        </div>
      </div>
    </div>
  );
}

/** Where the hero's token is at `t` seconds: it walks from the last cleared sombrero (or the road's start) to this level's. */
function tokenIndex(level: number, t: number): number {
  const { nodeAt } = ATLAS.map;
  const from = level > 0 ? nodeAt[level - 1] : 0;
  const k = ease(Math.min(1, Math.max(0, (t - 0.4) / 1.4)));
  return from + (nodeAt[level] - from) * k;
}

function draw(ctx: CanvasRenderingContext2D, assets: Assets, hero: string, level: number, t: number): void {
  const { nodes, road, hat } = ATLAS.map;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(assets.map.back, 0, 0);

  // petals along the road: dim ahead of the hero, gold behind, twinkling
  const at = tokenIndex(level, t);
  road.forEach(([x, y], i) => {
    if (i % 2) return;
    if (i <= at) {
      const tw = (Math.sin(t * 6 + i * 0.7) + 1) / 2;
      ctx.fillStyle = tw > 0.6 ? '#fff0a0' : '#ffa828';
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    } else {
      ctx.fillStyle = '#6a4048';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  });

  nodes.forEach((n, i) => {
    const bob = i === level ? Math.round(Math.sin(t * 3)) : 0;
    if (i === level) {
      // a pulsing ring of light under the sombrero to climb
      const pulse = (t * 1.6) % 1;
      ctx.strokeStyle = `rgba(255, 216, 86, ${0.7 * (1 - pulse)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(n.x, n.y + 1, 30 + pulse * 14, 8 + pulse * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = i > level ? 0.5 : 1;
    ctx.drawImage(assets.map.hats, i * hat.w, 0, hat.w, hat.h, n.x - hat.w / 2, n.y - 40 + bob, hat.w, hat.h);
    ctx.globalAlpha = 1;
    const icon = (k: number, x: number, y: number, scale = 1) => ctx.drawImage(assets.map.icons, k * 16, 0, 16, 16, Math.round(x), Math.round(y), 16 * scale, 16 * scale);
    if (i > level) icon(ICON.lock, n.x - 8, n.y - 24);
    if (i < level) icon(ICON.check, n.x + 22, n.y - 44 + Math.round(Math.sin(t * 2 + i)));
    // El Macho's mask over the sombreros he is meddling with; over the last one he waits in person
    if (i >= level && i < 2) icon(ICON.macho, n.x - 8, n.y - 62 - Math.round(Math.abs(Math.sin(t * 4 + i)) * 3));
    if (i === 2 && level <= 2) icon(ICON.macho, n.x - 16, n.y - 72 - Math.round(Math.abs(Math.sin(t * 3)) * 3), 2);
  });

  // the hero's token
  const idx = Math.min(road.length - 1, Math.floor(at));
  const [px, py] = road[idx];
  const { size, moods, order } = ATLAS.portraits;
  const hop = Math.round(Math.abs(Math.sin(t * 8)) * (at < ATLAS.map.nodeAt[level] - 0.5 ? 3 : 0));
  const tx = Math.round(px) - 16, ty = Math.round(py) + 5 - hop;
  ctx.fillStyle = '#a8760e';
  ctx.fillRect(tx - 2, ty - 2, 36, 36);
  ctx.fillStyle = '#ffd856';
  ctx.fillRect(tx - 1, ty - 1, 34, 34);
  ctx.fillStyle = '#1a1034';
  ctx.fillRect(tx, ty, 32, 32);
  ctx.drawImage(assets.portraits, moods.indexOf('neutral') * size + 14, order.indexOf(hero) * size + 8, 32, 32, tx, ty, 32, 32);

  if (level === 1 && (t * 0.8) % 3 < 0.12) {
    ctx.fillStyle = 'rgba(232, 221, 255, 0.18)';
    ctx.fillRect(0, 0, 480, 270);
  }
}
