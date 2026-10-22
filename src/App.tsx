/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { CharacterSelect } from './components/CharacterSelect';
import { DialogueScene } from './components/DialogueScene';
import { FightCanvas } from './components/FightCanvas';
import { LoreModal, MatchModal } from './components/MatchModal';
import { MapScreen } from './components/MapScreen';
import { SplashScreen } from './components/SplashScreen';
import { TitleScreen } from './components/TitleScreen';
import { gameAudio } from './game/audio';
import { BOSSES, ROSTER, SOMBREROS } from './game/roster';
import type { GameMode, Slot } from './game/sim';
import { storyScene, TROUBLE, type DialogueLine, type SceneId } from './game/storyDialogues';

type Screen = 'splash' | 'title' | 'select' | 'map' | 'dialogue' | 'battle' | 'epilogue';
type Result = 'victory' | 'defeat' | null;

/**
 * Pixel art stays crisp only when each art pixel is a whole number of device pixels, so the 480x270
 * screen snaps down to the nearest whole scale when that costs less than a fifth of the size.
 * shortcut: it counts CSS pixels, not device pixels, so a fractional devicePixelRatio is not honoured; upgrade if a target needs it.
 */
function useScreenSize(): { width: number; height: number } | undefined {
  const measure = () => {
    const fit = Math.min(window.innerWidth / 480, window.innerHeight / 270);
    const whole = Math.floor(fit);
    return whole >= 1 && whole / fit >= 0.8 ? { width: 480 * whole, height: 270 * whole } : undefined;
  };
  const [size, setSize] = useState(measure);
  useEffect(() => {
    const onResize = () => setSize(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/** Dev only: `?duel=mode:p1:p2:stage` jumps straight into a fight for testing. */
const quick = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('duel')?.split(':') : undefined;

export default function App() {
  const screenSize = useScreenSize();
  const [screen, setScreen] = useState<Screen>(quick ? 'battle' : 'splash');
  const [mode, setMode] = useState<GameMode>((quick?.[0] as GameMode) ?? 'story');
  const [p1, setP1] = useState(quick?.[1] ?? 'bean');
  const [p2, setP2] = useState(quick?.[2] ?? 'ernesto');
  const [stage, setStage] = useState(Number(quick?.[3] ?? 0));
  const [matchId, setMatchId] = useState(0);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [lore, setLore] = useState(false);
  const [muted, setMuted] = useState(gameAudio.getMuted());
  const [scene, setScene] = useState<{ lines: DialogueLine[]; title: string; done: () => void }>({ lines: [], title: '', done: () => {} });

  const toggleMute = useCallback(() => setMuted(gameAudio.toggleMute()), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyM') toggleMute();
      else if ((e.code === 'Escape' || e.code === 'KeyP') && screen === 'battle' && !result) setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, result, toggleMute]);

  const startBattle = () => {
    setPaused(false);
    setResult(null);
    setMatchId((n) => n + 1);
    setScreen('battle');
  };

  const playScene = (id: SceneId, hero: string, title: string, done: () => void) => {
    setScene({ lines: storyScene(id, hero), title, done });
  };

  /** The map before each sombrero: the hero walks to it, then the boss's introduction plays. */
  const openMap = (level: number) => {
    setStage(level);
    setP2(BOSSES[level]);
    setScreen('map');
  };

  const openStoryLevel = (hero: string, level: number) => {
    playScene(`level${level + 1}Intro` as SceneId, hero, `Nivel ${level + 1} · ${SOMBREROS[level].name} · Jefe: ${ROSTER[BOSSES[level]].name}`, startBattle);
    setScreen('dialogue');
  };

  /** After a won sombrero: El Macho makes trouble, then the map shows the next one. */
  const openOutro = (hero: string, level: number) => {
    playScene(`level${level + 1}Outro` as SceneId, hero, `Nivel ${level + 1} · Jefe vencido`, () => openMap(level + 1));
    setResult(null);
    setScreen('dialogue');
  };

  const onSelected = (a: string, b: string, s: number) => {
    setP1(a);
    if (mode === 'story') {
      openMap(0);
    } else {
      setP2(b);
      setStage(s);
      startBattle();
    }
  };

  const onMatchOver = (winner: Slot) => setResult(winner === 0 ? 'victory' : 'defeat');

  const toTitle = () => {
    setPaused(false);
    setResult(null);
    setLore(false);
    setScreen('title');
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-ink">
      <div className="screen" style={screenSize}>
        {screen === 'splash' && (
          <SplashScreen
            onFinish={() => {
              gameAudio.startBGM();
              setScreen('title');
            }}
          />
        )}

        {screen === 'title' && (
          <TitleScreen
            onStartGame={(m) => {
              setMode(m);
              setScreen('select');
            }}
            onOpenLore={() => setLore(true)}
            isMuted={muted}
            onToggleMute={toggleMute}
          />
        )}

        {screen === 'select' && <CharacterSelect mode={mode} onSelectComplete={onSelected} onBack={() => setScreen('title')} />}

        {screen === 'map' && <MapScreen key={stage} hero={p1} level={stage} onGo={() => openStoryLevel(p1, stage)} onBack={toTitle} />}

        {(screen === 'dialogue' || screen === 'epilogue') && (
          <DialogueScene key={scene.title} dialogues={scene.lines} stage={stage} title={scene.title} onComplete={scene.done} />
        )}

        {screen === 'battle' && (
          <>
            <FightCanvas key={matchId} p1={p1} p2={p2} stage={stage} mode={mode} trouble={mode === 'story' ? TROUBLE[stage] : null} paused={paused || result !== null} onMatchOver={onMatchOver} />
            {!result && !paused && (
              <button type="button" className="btn btn-quiet absolute" style={{ bottom: 'calc(var(--u) * 2)', left: '50%', transform: 'translateX(-50%)' }} onClick={() => setPaused(true)}>
                Pausa <span className="keycap">Esc</span>
              </button>
            )}
            {(paused || result) && (
              <MatchModal
                type={result ?? 'pause'}
                mode={mode}
                stageIdx={stage}
                p1={p1}
                p2={p2}
                onResume={() => setPaused(false)}
                onRestart={startBattle}
                onNextStage={() => openOutro(p1, stage)}
                onEpilogue={() => {
                  setResult(null);
                  playScene('epilogue', p1, 'Epílogo · El triunfo de las ánimas', toTitle);
                  setScreen('epilogue');
                }}
                onQuit={toTitle}
              />
            )}
          </>
        )}

        {lore && <LoreModal onClose={() => setLore(false)} />}
      </div>
    </div>
  );
}
