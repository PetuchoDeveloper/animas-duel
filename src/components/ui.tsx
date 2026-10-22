/**
 * Small pieces every screen shares: the animated stage backdrop, pixel portraits, stat pips and
 * arrow-key focus movement for button lists.
 */

import React, { useEffect, useRef } from 'react';
import { ATLAS, loadAssets, portraitStyle } from '../game/assets';
import { Renderer } from '../game/render';
import type { Mood } from '../game/storyDialogues';

/** `n` logical pixels of the 480x270 screen, as a CSS length. */
export const u = (n: number): string => `calc(var(--u) * ${n})`;

/** A stage with drifting petals, embers and flames behind a menu. */
export function Backdrop({ stage = 0, dim = 0.5 }: { stage?: number; dim?: number }) {
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
        const scene = new Renderer(ctx, assets, stage, 'versus');
        let last = 0;
        const loop = (t: number) => {
          raf = requestAnimationFrame(loop);
          if (t - last < 32) return;
          last = t;
          scene.animate();
          scene.animate();
          scene.scenery(dim);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        // the menu still works over a plain background if the art cannot load
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [stage, dim]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full bg-ink" />;
}

/** A fighter's bust. `scale` is how many logical pixels each source pixel covers. */
export function Portrait({ id, mood = 'neutral', scale = 1, flip = false }: { id: string; mood?: Mood; scale?: number; flip?: boolean }) {
  const s = portraitStyle(id, mood, 1) as React.CSSProperties;
  const { size, moods, order } = ATLAS.portraits;
  const px = size * scale;
  return (
    <div
      role="img"
      aria-label={id}
      style={{
        width: u(px),
        height: u(px),
        backgroundImage: s.backgroundImage,
        backgroundSize: `${u(moods.length * px)} ${u(order.length * px)}`,
        backgroundPosition: `${u(-moods.indexOf(mood) * px)} ${u(-order.indexOf(id) * px)}`,
        imageRendering: 'pixelated',
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
    />
  );
}

/** Five-step meter for a 1..5 stat. */
export function Pips({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex" style={{ gap: u(1.5) }} aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ width: u(7), height: u(7), background: i <= value ? color : '#2c1c4c', boxShadow: `inset 0 ${u(-1.5)} 0 rgb(0 0 0 / 0.25)` }} />
      ))}
    </div>
  );
}

/** Up/Down (and Left/Right when `horizontal`) move focus between the buttons inside a container. */
export function useArrowFocus(ref: React.RefObject<HTMLElement | null>, horizontal = false) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const buttons = () => [...el.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
    buttons()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      const prev = e.code === 'ArrowUp' || (horizontal && e.code === 'ArrowLeft');
      const next = e.code === 'ArrowDown' || (horizontal && e.code === 'ArrowRight');
      if (!prev && !next) return;
      const list = buttons();
      if (!list.length) return;
      e.preventDefault();
      const i = list.indexOf(document.activeElement as HTMLButtonElement);
      list[(i + (next ? 1 : -1) + list.length) % list.length].focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ref, horizontal]);
}

/** Run `handler` on a keydown for any of `codes`. */
export function useKey(codes: string[], handler: (e: KeyboardEvent) => void, deps: React.DependencyList = []) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (codes.includes(e.code) && !e.repeat) handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
