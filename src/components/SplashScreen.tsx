/**
 * First screen. A key press or click is required before anything plays, which is also what
 * lets the browser start audio.
 */

import { useEffect } from 'react';
import { url } from '../game/assets';
import { gameAudio } from '../game/audio';
import { Backdrop, u } from './ui';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const go = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      gameAudio.playGuitarChord('E_major');
      onFinish();
    };
    window.addEventListener('keydown', go);
    return () => window.removeEventListener('keydown', go);
  }, [onFinish]);

  return (
    <div
      className="layer flex cursor-pointer select-none flex-col items-center justify-center"
      onClick={() => {
        gameAudio.playGuitarChord('E_major');
        onFinish();
      }}
    >
      <Backdrop stage={0} dim={0.78} />
      <div className="rise relative flex flex-col items-center" style={{ gap: u(6) }}>
        <img src={url('ui/emblem.png')} alt="" style={{ width: u(96), height: u(96) }} />
        <h1 className="logo t16 text-center" style={{ lineHeight: 1.5 }}>
          Duelo de<br />las Ánimas
        </h1>
        <p className="font-pixel t8 text-teal shadow-text">The King of Fiesta</p>
      </div>
      <p className="blink font-pixel t8 absolute text-bone shadow-text" style={{ bottom: u(22) }}>
        Pulsa una tecla para empezar
      </p>
    </div>
  );
}
