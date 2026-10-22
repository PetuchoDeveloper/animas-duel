/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { CharacterSelect } from './components/CharacterSelect';
import { DialogueScene } from './components/DialogueScene';
import { FightCanvas } from './components/FightCanvas';
import { LoreModal, MatchModal } from './components/MatchModal';
import { SplashScreen } from './components/SplashScreen';
import { TitleScreen } from './components/TitleScreen';
import { gameAudio } from './game/audio';
import { SOMBRERO_STAGES } from './game/combatRules';
import { BOSSES, ROSTER } from './game/roster';
import type { GameMode, Slot } from './game/sim';
import { STORY_DATA, type DialogueLine } from './game/storyDialogues';

type Screen = 'splash' | 'title' | 'select' | 'dialogue' | 'battle' | 'epilogue';
type Result = 'victory' | 'defeat' | null;

const INTROS = ['level1Intro', 'level2Intro', 'level3Intro'] as const;

/** Dev only: `?duel=mode:p1:p2:stage` jumps straight into a fight for testing. */
const quick = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('duel')?.split(':') : undefined;

export default function App() {
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
  const [scene, setScene] = useState<{ lines: DialogueLine[]; title: string }>({ lines: [], title: '' });

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

  const openStoryLevel = (hero: string, level: number) => {
    setStage(level);
    setP2(BOSSES[level]);
    setScene({
      lines: STORY_DATA[hero][INTROS[level]],
      title: `Nivel ${level + 1} · ${SOMBRERO_STAGES[level].name} · Jefe: ${ROSTER[BOSSES[level]].name}`,
    });
    setScreen('dialogue');
  };

  const onSelected = (a: string, b: string, s: number) => {
    setP1(a);
    if (mode === 'story') {
      openStoryLevel(a, 0);
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
      <div className="screen">
        {screen === 'splash' && <SplashScreen onFinish={() => setScreen('title')} />}

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

        {(screen === 'dialogue' || screen === 'epilogue') && (
          <DialogueScene
            key={scene.title}
            dialogues={scene.lines}
            stage={stage}
            title={scene.title}
            onComplete={screen === 'epilogue' ? toTitle : startBattle}
          />
        )}

        {screen === 'battle' && (
          <>
            <FightCanvas key={matchId} p1={p1} p2={p2} stage={stage} mode={mode} paused={paused || result !== null} onMatchOver={onMatchOver} />
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
                onNextStage={() => openStoryLevel(p1, stage + 1)}
                onEpilogue={() => {
                  setResult(null);
                  setScene({ lines: STORY_DATA[p1].epilogue, title: 'Epílogo · El triunfo de las ánimas' });
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
