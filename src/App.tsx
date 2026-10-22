/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { StartAnimationIntro } from './components/StartAnimationIntro';
import { CharacterSelect } from './components/CharacterSelect';
import { FightCanvas } from './components/FightCanvas';
import { GameHUD } from './components/GameHUD';
import { StoryDialogueOverlay } from './components/StoryDialogueOverlay';
import { PauseVictoryModal } from './components/PauseVictoryModal';
import { GameMode } from './game/engine';
import { SOMBRERO_STAGES } from './game/combatRules';
import { STORY_DATA, DialogueLine } from './game/storyDialogues';
import { gameAudio } from './game/audio';

type Screen = 'intro' | 'title' | 'select' | 'dialogue' | 'battle' | 'epilogue';

export default function App() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [mode, setMode] = useState<GameMode>('story');

  // Fighters & Stage selection: El Frijolito (Bean) and La Pulguita (Flea) as main heroes!
  const [p1CharId, setP1CharId] = useState<string>('bean');
  const [p2CharId, setP2CharId] = useState<string>('ernesto');
  const [stageIdx, setStageIdx] = useState<number>(0);

  // Active dialogue queue
  const [dialogueQueue, setDialogueQueue] = useState<DialogueLine[]>([]);
  const [dialogueTitle, setDialogueTitle] = useState<string>('');

  // Combat status mirror for HUD
  const [hudState, setHudState] = useState({
    p1Hp: 100,
    p1GhostHp: 100,
    p1Meter: 35,
    p1Rounds: 0,
    p2Hp: 100,
    p2GhostHp: 100,
    p2Meter: 35,
    p2Rounds: 0,
    timer: 99,
    comboP1: 0,
    comboP2: 0,
    matchState: 'intro',
  });

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [matchWinner, setMatchWinner] = useState<'P1' | 'P2' | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [showLoreModal, setShowLoreModal] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    if (screen === 'intro' || screen === 'title' || screen === 'select') {
      document.body.dataset.state = 'title';
    } else if (isPaused) {
      document.body.dataset.state = 'paused';
    } else if (matchWinner !== null || showStatusModal) {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [screen, isPaused, matchWinner, showStatusModal]);

  const handleToggleMute = useCallback(() => {
    const muted = gameAudio.toggleMute();
    setIsMuted(muted);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen === 'battle') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          setIsPaused((prev) => !prev);
        }
      }
      if (e.code === 'KeyM') {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, handleToggleMute]);

  const handleFinishIntro = () => {
    setScreen('title');
  };

  const handleStartFromTitle = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setScreen('select');
  };

  const handleSelectComplete = (p1: string, p2: string, stage: number) => {
    setP1CharId(p1);
    setP2CharId(p2);
    setStageIdx(stage);

    if (mode === 'story') {
      const story = STORY_DATA[p1] || STORY_DATA.bean;
      setDialogueTitle('NIVEL 1: EL GRAN SOMBRERO DORADO (JEFE: ERNESTO)');
      setDialogueQueue(story.level1Intro);
      setScreen('dialogue');
    } else {
      setMatchWinner(null);
      setIsPaused(false);
      setShowStatusModal(false);
      setScreen('battle');
    }
  };

  const handleDialogueComplete = () => {
    setMatchWinner(null);
    setIsPaused(false);
    setShowStatusModal(false);
    setScreen('battle');
  };

  const handleMatchFinished = (winner: 'P1' | 'P2') => {
    setMatchWinner(winner);
    setShowStatusModal(true);
  };

  const handleNextStoryStage = () => {
    const nextIdx = stageIdx + 1;
    setStageIdx(nextIdx);
    setShowStatusModal(false);
    setMatchWinner(null);

    const story = STORY_DATA[p1CharId] || STORY_DATA.bean;

    if (nextIdx === 1) {
      // Level 2: Cracked Sombrero vs El Macho
      setP2CharId('elmacho');
      setDialogueTitle('NIVEL 2: EL SOMBRERO AGRIETADO (JEFE: EL MACHO)');
      setDialogueQueue(story.level2Intro);
      setScreen('dialogue');
    } else if (nextIdx === 2) {
      // Level 3: Shattered Sombrero of Mictlan vs Huesos
      setP2CharId('huesos');
      setDialogueTitle('NIVEL 3: EL SOMBRERO DE MICTLÁN (JEFE FINAL: HUESOS)');
      setDialogueQueue(story.level3Intro);
      setScreen('dialogue');
    }
  };

  const handleViewEpilogue = () => {
    setShowStatusModal(false);
    const story = STORY_DATA[p1CharId] || STORY_DATA.bean;
    setDialogueTitle('EPÍLOGO: EL TRIUNFO DE LAS ÁNIMAS');
    setDialogueQueue(story.epilogue);
    setScreen('epilogue');
  };

  const handleRestartStage = () => {
    setIsPaused(false);
    setShowStatusModal(false);
    setMatchWinner(null);
    setScreen('battle');
  };

  const handleReturnTitle = () => {
    setIsPaused(false);
    setShowStatusModal(false);
    setMatchWinner(null);
    setShowLoreModal(false);
    setScreen('title');
  };

  const currentStageInfo = SOMBRERO_STAGES[stageIdx] || SOMBRERO_STAGES[0];

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans">
      {/* 1. START ANIMATION INTRO */}
      {screen === 'intro' && (
        <StartAnimationIntro onFinish={handleFinishIntro} />
      )}

      {/* 2. TITLE SCREEN */}
      {screen === 'title' && (
        <TitleScreen
          onStartGame={handleStartFromTitle}
          onOpenLore={() => setShowLoreModal(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* 3. CHARACTER SELECT SCREEN */}
      {screen === 'select' && (
        <CharacterSelect
          mode={mode}
          onSelectComplete={handleSelectComplete}
          onBack={() => setScreen('title')}
        />
      )}

      {/* 4. STORY DIALOGUE CUTSCENE */}
      {(screen === 'dialogue' || screen === 'epilogue') && (
        <StoryDialogueOverlay
          dialogues={dialogueQueue}
          title={dialogueTitle}
          onComplete={screen === 'epilogue' ? handleReturnTitle : handleDialogueComplete}
        />
      )}

      {/* 5. ACTIVE BATTLE SCREEN */}
      {screen === 'battle' && (
        <div className="relative w-full h-full">
          <FightCanvas
            key={`${p1CharId}-${p2CharId}-${stageIdx}-${matchWinner ? 'reset' : 'play'}`}
            p1CharId={p1CharId}
            p2CharId={p2CharId}
            stageIdx={stageIdx}
            mode={mode}
            isPaused={isPaused}
            onHUDUpdate={setHudState}
            onMatchFinished={handleMatchFinished}
          />

          <GameHUD
            p1CharId={p1CharId}
            p2CharId={p2CharId}
            p1Hp={hudState.p1Hp}
            p1GhostHp={hudState.p1GhostHp}
            p1Meter={hudState.p1Meter}
            p1Rounds={hudState.p1Rounds}
            p2Hp={hudState.p2Hp}
            p2GhostHp={hudState.p2GhostHp}
            p2Meter={hudState.p2Meter}
            p2Rounds={hudState.p2Rounds}
            timer={hudState.timer}
            comboP1={hudState.comboP1}
            comboP2={hudState.comboP2}
            stageName={currentStageInfo.spanishTitle}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onPause={() => setIsPaused(true)}
          />

          {(isPaused || showStatusModal) && (
            <PauseVictoryModal
              type={
                isPaused
                  ? 'pause'
                  : matchWinner === 'P1'
                  ? 'victory'
                  : 'gameover'
              }
              stageIdx={stageIdx}
              winner={matchWinner}
              p1CharId={p1CharId}
              p2CharId={p2CharId}
              mode={mode}
              onResume={() => setIsPaused(false)}
              onRestartStage={handleRestartStage}
              onNextStage={handleNextStoryStage}
              onViewEpilogue={handleViewEpilogue}
              onReturnTitle={handleReturnTitle}
            />
          )}
        </div>
      )}

      {/* STORY LORE MODAL */}
      {showLoreModal && (
        <PauseVictoryModal
          type="lore"
          stageIdx={0}
          winner={null}
          p1CharId="bean"
          p2CharId="ernesto"
          mode={mode}
          onReturnTitle={() => setShowLoreModal(false)}
        />
      )}
    </div>
  );
}
