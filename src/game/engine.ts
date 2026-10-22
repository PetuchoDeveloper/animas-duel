/**
 * Core 60 FPS fighting game engine for Duelo de las Ánimas: The King of Fiesta.
 * Includes complete animation playback without mid-way cuts, sub-pixel physics,
 * hitboxes, particles, super freeze cinematics, and local multiplayer controls.
 */

import {
  ATTACK_DATA,
  calculateDamage,
  checkCollision,
  addSuperMeter,
  evaluateRoundWinner,
  Hitbox,
} from './combatRules';
import {
  CHARACTER_ROSTER,
  CharacterSpriteConfig,
  getCleanSpritesheetCanvas,
} from './spriteData';
import { SombreroStageSystem } from './sombreroStages';
import { gameAudio } from './audio';

export type GameMode = 'story' | 'versus' | 'training';

export interface FighterEntity {
  id: string;
  isP1: boolean;
  isAI: boolean;
  config: CharacterSpriteConfig;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  health: number;
  maxHealth: number;
  ghostHealth: number;
  meter: number; // 0 to 100 Calavera Super Gauge
  maxMeter: number;
  roundsWon: number;

  state:
    | 'idle'
    | 'walk'
    | 'run'
    | 'jump'
    | 'airAttack'
    | 'lightAttack'
    | 'heavyAttack'
    | 'special1'
    | 'special2'
    | 'super'
    | 'hit'
    | 'ko'
    | 'dodge';

  animTime: number;
  animFrame: number;
  hitstun: number;
  dodgeTimer: number;
  scaleX: number;
  scaleY: number;

  // Attack state tracking
  attackPhase: 'none' | 'active';
  hasHitInCurrentAttack: boolean;

  // Ghost trail for motion blur interpolation
  ghostTrails: Array<{ x: number; y: number; frame: number; anim: string; alpha: number; facing: 1 | -1 }>;

  // Hit flash indicator
  hitFlashTimer: number;

  // AI behavior variables
  aiDecisionTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  rotation: number;
  vRot: number;
}

export interface AnnouncerBanner {
  text: string;
  subText?: string;
  timer: number;
  maxTimer: number;
  color: string;
  scale: number;
}

export interface HitEffect {
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
  type: 'light' | 'heavy' | 'super' | 'block';
  damageText?: number;
}

export class FightEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stageSystem: SombreroStageSystem;

  public mode: GameMode = 'story';
  public currentStageIdx: number = 0; // 0: Pristine, 1: Cracked, 2: Shattered Mictlan

  public p1!: FighterEntity;
  public p2!: FighterEntity;

  // Combat status
  public roundNumber: number = 1;
  public roundTimer: number = 99;
  public matchState: 'intro' | 'fight' | 'round_end' | 'match_end' = 'intro';
  public matchWinner: 'P1' | 'P2' | 'DRAW' | null = null;
  public comboP1: number = 0;
  public comboP2: number = 0;
  public comboTimerP1: number = 0;
  public comboTimerP2: number = 0;

  // Screen shake & hitstop
  public screenShake: number = 0;
  public hitstopTimer: number = 0;

  // Particle pool
  private particles: Particle[] = [];
  private hitEffects: HitEffect[] = [];

  // Announcer visual overlay
  public banner: AnnouncerBanner | null = null;

  // Super move freeze cinematic
  public superCinematicTimer: number = 0;
  public superUser: 'P1' | 'P2' | null = null;

  // Inputs tracking
  private keysHeld = new Set<string>();
  private keysJustPressed = new Set<string>();

  // Event callbacks for UI
  public onRoundOver?: (winner: 'P1' | 'P2' | 'DRAW') => void;
  public onMatchOver?: (winner: 'P1' | 'P2') => void;

  private running: boolean = false;
  private lastTime: number = 0;
  private animFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.stageSystem = new SombreroStageSystem();

    this.bindInputs();
  }

  public initMatch(
    p1CharId: string,
    p2CharId: string,
    stageIdx: number = 0,
    mode: GameMode = 'story'
  ) {
    this.mode = mode;
    this.currentStageIdx = stageIdx;
    this.roundNumber = 1;
    this.roundTimer = 99;
    this.matchState = 'intro';
    this.matchWinner = null;
    this.particles = [];
    this.hitEffects = [];

    const p1Cfg = CHARACTER_ROSTER[p1CharId] || CHARACTER_ROSTER.bean;
    const p2Cfg = CHARACTER_ROSTER[p2CharId] || CHARACTER_ROSTER.flea;

    // Preload & chroma-key clean sprite sheets
    getCleanSpritesheetCanvas(p1Cfg.spritesheetPath);
    getCleanSpritesheetCanvas(p2Cfg.spritesheetPath);

    this.p1 = this.createFighter(p1Cfg, true, false, 280, 1);
    this.p2 = this.createFighter(p2Cfg, false, mode !== 'versus', 680, -1);

    this.startRoundIntro();
  }

  private createFighter(
    config: CharacterSpriteConfig,
    isP1: boolean,
    isAI: boolean,
    startX: number,
    facing: 1 | -1
  ): FighterEntity {
    return {
      id: config.id,
      isP1,
      isAI,
      config,
      x: startX,
      y: 0,
      vx: 0,
      vy: 0,
      facing,
      health: 100,
      maxHealth: 100,
      ghostHealth: 100,
      meter: 35,
      maxMeter: 100,
      roundsWon: 0,
      state: 'idle',
      animTime: 0,
      animFrame: 0,
      hitstun: 0,
      dodgeTimer: 0,
      scaleX: 1,
      scaleY: 1,
      attackPhase: 'none',
      hasHitInCurrentAttack: false,
      ghostTrails: [],
      hitFlashTimer: 0,
      aiDecisionTimer: 0,
    };
  }

  private startRoundIntro() {
    this.matchState = 'intro';
    this.p1.x = 280;
    this.p1.y = 0;
    this.p1.vx = 0;
    this.p1.vy = 0;
    this.p1.state = 'idle';
    this.p1.animTime = 0;
    this.p1.attackPhase = 'none';
    this.p1.facing = 1;

    this.p2.x = 680;
    this.p2.y = 0;
    this.p2.vx = 0;
    this.p2.vy = 0;
    this.p2.state = 'idle';
    this.p2.animTime = 0;
    this.p2.attackPhase = 'none';
    this.p2.facing = -1;

    this.roundTimer = 99;

    const roundText = this.roundNumber === 3 ? 'FINAL ROUND' : `ROUND ${this.roundNumber}`;
    this.showBanner(roundText, '¡PREPÁRATE!', 1.4, '#fbbf24');
    gameAudio.playAnnouncerCall(this.roundNumber === 3 ? 'final_round' : 'round1');

    setTimeout(() => {
      if (!this.running) return;
      this.showBanner('¡A LUCHAR!', 'FIGHT!', 1.0, '#ef4444');
      gameAudio.playAnnouncerCall('ready_fight');
      this.matchState = 'fight';
    }, 1500);
  }

  private showBanner(text: string, subText: string, durationSec: number, color: string) {
    this.banner = {
      text,
      subText,
      timer: durationSec,
      maxTimer: durationSec,
      color,
      scale: 1.5,
    };
  }

  private bindInputs() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (!this.keysHeld.has(code)) {
        this.keysJustPressed.add(code);
      }
      this.keysHeld.add(code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.keysJustPressed.clear();
    });
  }

  public start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    gameAudio.startBGM();

    const loop = (time: number) => {
      if (!this.running) return;
      const rawDt = (time - this.lastTime) / 1000;
      this.lastTime = time;
      const dt = Math.min(rawDt, 0.05);

      this.update(dt, time / 1000);
      this.render(time / 1000);

      this.keysJustPressed.clear();
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    gameAudio.stopBGM();
  }

  private update(dt: number, time: number) {
    if (this.superCinematicTimer > 0) {
      this.superCinematicTimer -= dt;
      this.screenShake = Math.max(this.screenShake, 10);
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    if (this.banner) {
      this.banner.timer -= dt;
      if (this.banner.scale > 1.0) {
        this.banner.scale = Math.max(1.0, this.banner.scale - dt * 2);
      }
      if (this.banner.timer <= 0) {
        this.banner = null;
      }
    }

    this.stageSystem.update(dt);

    if (this.matchState === 'fight') {
      this.roundTimer -= dt * 0.8;
      if (this.roundTimer <= 0) {
        this.roundTimer = 0;
        this.handleTimeUp();
      }
    }

    // Process inputs & AI
    this.handleInputs(this.p1);
    if (this.p2.isAI) {
      this.updateAI(this.p2, this.p1, dt);
    } else {
      this.handleInputs(this.p2);
    }

    // Update fighters physics & animations
    this.updateFighter(this.p1, dt);
    this.updateFighter(this.p2, dt);

    // Auto-facing when not in attack
    if (this.p1.state !== 'ko' && this.p2.state !== 'ko') {
      if (this.p1.attackPhase === 'none' && (this.p1.state === 'idle' || this.p1.state === 'walk')) {
        this.p1.facing = this.p1.x < this.p2.x ? 1 : -1;
      }
      if (this.p2.attackPhase === 'none' && (this.p2.state === 'idle' || this.p2.state === 'walk')) {
        this.p2.facing = this.p2.x < this.p1.x ? 1 : -1;
      }
    }

    // Check hitboxes
    if (this.matchState === 'fight') {
      this.checkCombatInteractions(this.p1, this.p2);
      this.checkCombatInteractions(this.p2, this.p1);
    }

    this.p1.ghostHealth += (this.p1.health - this.p1.ghostHealth) * 0.08;
    this.p2.ghostHealth += (this.p2.health - this.p2.ghostHealth) * 0.08;

    if (this.comboTimerP1 > 0) {
      this.comboTimerP1 -= dt;
      if (this.comboTimerP1 <= 0) this.comboP1 = 0;
    }
    if (this.comboTimerP2 > 0) {
      this.comboTimerP2 -= dt;
      if (this.comboTimerP2 <= 0) this.comboP2 = 0;
    }

    this.updateParticlesAndEffects(dt);
  }

  private handleInputs(fighter: FighterEntity) {
    if (this.matchState !== 'fight' || fighter.hitstun > 0 || fighter.state === 'ko') return;

    // IMPORTANT: If currently executing an attack animation, let it play completely!
    if (fighter.attackPhase === 'active') return;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = fighter.isP1 ? gamepads[0] : gamepads[1];

    let moveLeft = false;
    let moveRight = false;
    let jump = false;
    let lightAtk = false;
    let heavyAtk = false;
    let kickDodge = false;
    let special = false;
    let superMove = false;

    if (fighter.isP1) {
      moveLeft = this.keysHeld.has('KeyA');
      moveRight = this.keysHeld.has('KeyD');
      jump = this.keysJustPressed.has('KeyW');
      lightAtk = this.keysJustPressed.has('KeyF');
      heavyAtk = this.keysJustPressed.has('KeyG');
      kickDodge = this.keysJustPressed.has('KeyH');
      special = this.keysJustPressed.has('KeyV');
      superMove = this.keysJustPressed.has('Space');
    } else {
      moveLeft = this.keysHeld.has('ArrowLeft') || this.keysHeld.has('KeyJ');
      moveRight = this.keysHeld.has('ArrowRight') || this.keysHeld.has('KeyL');
      jump = this.keysJustPressed.has('ArrowUp') || this.keysJustPressed.has('KeyI');
      lightAtk = this.keysJustPressed.has('Numpad4') || this.keysJustPressed.has('KeyU');
      heavyAtk = this.keysJustPressed.has('Numpad5') || this.keysJustPressed.has('KeyO');
      kickDodge = this.keysJustPressed.has('Numpad6') || this.keysJustPressed.has('KeyP');
      special = this.keysJustPressed.has('Numpad1') || this.keysJustPressed.has('Semicolon');
      superMove = this.keysJustPressed.has('Numpad0') || this.keysJustPressed.has('Enter');
    }

    if (gp) {
      moveLeft = moveLeft || gp.axes[0] < -0.3 || gp.buttons[14]?.pressed;
      moveRight = moveRight || gp.axes[0] > 0.3 || gp.buttons[15]?.pressed;
      jump = jump || gp.axes[1] < -0.4 || gp.buttons[12]?.pressed || gp.buttons[0]?.pressed;
      lightAtk = lightAtk || gp.buttons[2]?.pressed;
      heavyAtk = heavyAtk || gp.buttons[3]?.pressed;
      kickDodge = kickDodge || gp.buttons[1]?.pressed;
      special = special || gp.buttons[5]?.pressed;
      superMove = superMove || gp.buttons[7]?.pressed;
    }

    if (kickDodge && fighter.state !== 'jump' && fighter.dodgeTimer <= 0) {
      fighter.state = 'dodge';
      fighter.animTime = 0;
      fighter.animFrame = 0;
      fighter.dodgeTimer = 0.45;
      fighter.vx = fighter.facing * 340;
      gameAudio.playWhoosh();
      return;
    }

    if (superMove && fighter.meter >= 100 && fighter.state !== 'jump') {
      this.triggerSuper(fighter);
      return;
    }

    if (special && fighter.state !== 'jump') {
      fighter.state = 'special1';
      fighter.animTime = 0;
      fighter.animFrame = 0;
      fighter.attackPhase = 'active';
      fighter.hasHitInCurrentAttack = false;
      fighter.vx = fighter.facing * 180;
      gameAudio.playSpecialCast();
      return;
    }

    if (heavyAtk) {
      fighter.state = fighter.y < 0 ? 'airAttack' : 'heavyAttack';
      fighter.animTime = 0;
      fighter.animFrame = 0;
      fighter.attackPhase = 'active';
      fighter.hasHitInCurrentAttack = false;
      gameAudio.playWhoosh();
      return;
    }

    if (lightAtk) {
      fighter.state = fighter.y < 0 ? 'airAttack' : 'lightAttack';
      fighter.animTime = 0;
      fighter.animFrame = 0;
      fighter.attackPhase = 'active';
      fighter.hasHitInCurrentAttack = false;
      gameAudio.playWhoosh();
      return;
    }

    if (jump && fighter.y >= 0) {
      fighter.vy = -540;
      fighter.state = 'jump';
      fighter.animTime = 0;
      fighter.scaleX = 0.85;
      fighter.scaleY = 1.25;
      gameAudio.playWhoosh();
      return;
    }

    if (fighter.state !== 'jump' && fighter.state !== 'dodge') {
      const speed = 210;
      if (moveLeft) {
        fighter.vx = -speed;
        fighter.state = 'walk';
      } else if (moveRight) {
        fighter.vx = speed;
        fighter.state = 'walk';
      } else {
        fighter.vx = 0;
        fighter.state = 'idle';
      }
    }
  }

  private triggerSuper(fighter: FighterEntity) {
    fighter.meter = 0;
    fighter.state = 'super';
    fighter.animTime = 0;
    fighter.animFrame = 0;
    fighter.attackPhase = 'active';
    fighter.hasHitInCurrentAttack = false;
    fighter.vx = fighter.facing * 120;

    this.superCinematicTimer = 0.55;
    this.superUser = fighter.isP1 ? 'P1' : 'P2';
    this.screenShake = 16;
    gameAudio.playSuperActivate();
    gameAudio.playGuitarChord('E_major');

    this.spawnParticleBurst(fighter.x, fighter.y - 60, fighter.config.themeColor, 40);
  }

  private updateAI(ai: FighterEntity, target: FighterEntity, dt: number) {
    if (this.matchState !== 'fight' || ai.hitstun > 0 || ai.state === 'ko') return;
    if (ai.attackPhase === 'active') return;

    ai.aiDecisionTimer -= dt;
    const dist = Math.abs(ai.x - target.x);

    if (ai.aiDecisionTimer <= 0) {
      ai.aiDecisionTimer = 0.25 + Math.random() * 0.2;

      if (ai.meter >= 100 && dist < 220) {
        this.triggerSuper(ai);
        return;
      }

      if (dist < 110) {
        const roll = Math.random();
        if (roll < 0.4) {
          ai.state = 'lightAttack';
          ai.animTime = 0;
          ai.animFrame = 0;
          ai.attackPhase = 'active';
          ai.hasHitInCurrentAttack = false;
          gameAudio.playWhoosh();
        } else if (roll < 0.72) {
          ai.state = 'heavyAttack';
          ai.animTime = 0;
          ai.animFrame = 0;
          ai.attackPhase = 'active';
          ai.hasHitInCurrentAttack = false;
          gameAudio.playWhoosh();
        } else if (roll < 0.88) {
          ai.state = 'special1';
          ai.animTime = 0;
          ai.animFrame = 0;
          ai.attackPhase = 'active';
          ai.hasHitInCurrentAttack = false;
          gameAudio.playSpecialCast();
        } else {
          ai.state = 'dodge';
          ai.dodgeTimer = 0.45;
          ai.vx = -ai.facing * 280;
        }
      } else if (dist < 260) {
        if (Math.random() < 0.35) {
          ai.state = 'special1';
          ai.animTime = 0;
          ai.animFrame = 0;
          ai.attackPhase = 'active';
          ai.hasHitInCurrentAttack = false;
          gameAudio.playSpecialCast();
        } else {
          ai.vx = (target.x > ai.x ? 1 : -1) * 190;
          ai.state = 'walk';
        }
      } else {
        ai.vx = (target.x > ai.x ? 1 : -1) * 210;
        ai.state = 'walk';
        if (Math.random() < 0.15 && ai.y >= 0) {
          ai.vy = -500;
          ai.state = 'jump';
        }
      }
    }
  }

  private updateFighter(fighter: FighterEntity, dt: number) {
    if (fighter.hitFlashTimer > 0) {
      fighter.hitFlashTimer -= dt;
    }

    if (fighter.dodgeTimer > 0) {
      fighter.dodgeTimer -= dt;
      if (fighter.dodgeTimer <= 0 && fighter.state === 'dodge') {
        fighter.state = 'idle';
        fighter.vx = 0;
      }
    }

    // Physics
    const gravity = 1450;
    fighter.vy += gravity * dt;
    fighter.x += fighter.vx * dt;
    fighter.y += fighter.vy * dt;

    if (fighter.y >= 0) {
      if (fighter.vy > 100) {
        fighter.scaleX = 1.18;
        fighter.scaleY = 0.82;
      }
      fighter.y = 0;
      fighter.vy = 0;
      if (fighter.state === 'jump') {
        fighter.state = 'idle';
      }
    }

    fighter.scaleX += (1 - fighter.scaleX) * 0.2;
    fighter.scaleY += (1 - fighter.scaleY) * 0.2;

    const minX = 70;
    const maxX = 890;
    if (fighter.x < minX) fighter.x = minX;
    if (fighter.x > maxX) fighter.x = maxX;

    if (fighter.y >= 0 && fighter.state !== 'walk' && fighter.state !== 'dodge') {
      fighter.vx *= 0.85;
    }

    // COMPLETE ANIMATION PROGRESSION (Never cuts mid way)
    const anim = fighter.config.animations[fighter.state] || fighter.config.animations.idle;
    fighter.animTime += dt;
    const totalFrames = anim.frames.length;

    if (anim.loop) {
      fighter.animFrame = Math.floor(fighter.animTime * anim.fps) % totalFrames;
    } else {
      const currentFrame = Math.floor(fighter.animTime * anim.fps);
      if (currentFrame >= totalFrames) {
        // Complete full animation cycle
        if (fighter.state === 'ko') {
          fighter.animFrame = totalFrames - 1; // Stay down
        } else if (fighter.state === 'hit') {
          fighter.hitstun = 0;
          fighter.state = 'idle';
          fighter.animTime = 0;
          fighter.animFrame = 0;
        } else {
          // Attack / Special / Super finished! Return to idle
          fighter.attackPhase = 'none';
          fighter.state = fighter.y < 0 ? 'jump' : 'idle';
          fighter.animTime = 0;
          fighter.animFrame = 0;
        }
      } else {
        fighter.animFrame = currentFrame;
      }
    }

    // Motion blur trails
    if (['special1', 'special2', 'super', 'dodge'].includes(fighter.state)) {
      if (Math.random() < 0.4) {
        fighter.ghostTrails.push({
          x: fighter.x,
          y: fighter.y,
          frame: fighter.animFrame,
          anim: fighter.state,
          alpha: 0.6,
          facing: fighter.facing,
        });
      }
    }

    for (let i = fighter.ghostTrails.length - 1; i >= 0; i--) {
      fighter.ghostTrails[i].alpha -= dt * 2.5;
      if (fighter.ghostTrails[i].alpha <= 0) {
        fighter.ghostTrails.splice(i, 1);
      }
    }
  }

  private checkCombatInteractions(attacker: FighterEntity, defender: FighterEntity) {
    if (
      attacker.attackPhase === 'none' ||
      attacker.hasHitInCurrentAttack ||
      defender.state === 'ko' ||
      defender.state === 'dodge'
    ) {
      return;
    }

    // Active strike window check: strikes connect during mid frames (not frame 0 windup)
    const anim = attacker.config.animations[attacker.state];
    if (anim && anim.frames.length > 2) {
      if (attacker.animFrame < 1) return; // Wait for windup to pass!
    }

    let attackDef = ATTACK_DATA.light;
    if (attacker.state === 'heavyAttack') attackDef = ATTACK_DATA.heavy;
    else if (attacker.state === 'special1') attackDef = ATTACK_DATA.special1;
    else if (attacker.state === 'special2') attackDef = ATTACK_DATA.special2;
    else if (attacker.state === 'super') attackDef = ATTACK_DATA.super;
    else if (attacker.state === 'airAttack') attackDef = ATTACK_DATA.heavy;

    const reach = attacker.facing === 1 ? 55 : -85;
    const atkBox: Hitbox = {
      x: attacker.x + reach,
      y: attacker.y - 95,
      width: 75,
      height: 75,
    };

    const defBox: Hitbox = {
      x: defender.x - 30,
      y: defender.y - 110,
      width: 60,
      height: 110,
    };

    if (checkCollision(atkBox, defBox)) {
      attacker.hasHitInCurrentAttack = true;

      const isBlocking = defender.vx * defender.facing < -10 && defender.y >= 0;

      if (attacker.isP1) {
        this.comboP1++;
        this.comboTimerP1 = 1.6;
      } else {
        this.comboP2++;
        this.comboTimerP2 = 1.6;
      }
      const currentCombo = attacker.isP1 ? this.comboP1 : this.comboP2;

      const dmg = calculateDamage(attackDef.baseDamage, currentCombo - 1, isBlocking);
      defender.health = Math.max(0, defender.health - dmg);

      attacker.meter = addSuperMeter(attacker.meter, attackDef.meterGain);
      defender.meter = addSuperMeter(defender.meter, Math.round(attackDef.meterGain * 0.4));

      defender.hitFlashTimer = 0.08;
      this.screenShake = attackDef.type === 'super' ? 18 : attackDef.type === 'heavy' ? 8 : 4;
      this.hitstopTimer = attackDef.type === 'super' ? 0.08 : attackDef.type === 'heavy' ? 0.05 : 0.03;

      if (isBlocking) {
        gameAudio.playBlock();
        this.hitEffects.push({
          x: defender.x,
          y: defender.y - 60,
          timer: 0.2,
          maxTimer: 0.2,
          type: 'block',
        });
      } else {
        if (attackDef.type === 'super') {
          gameAudio.playHeavyHit();
          gameAudio.playAnnouncerCall('super_finish');
        } else if (attackDef.type === 'heavy') {
          gameAudio.playHeavyHit();
        } else {
          gameAudio.playLightHit();
        }

        defender.vx = attacker.facing * attackDef.knockbackX * 42;
        defender.vy = attackDef.knockbackY * 35;
        defender.hitstun = attackDef.hitstunMs / 1000;
        defender.state = 'hit';
        defender.animTime = 0;
        defender.animFrame = 0;

        this.spawnParticleBurst(defender.x, defender.y - 65, attackDef.type === 'super' ? '#c084fc' : '#fbbf24', 16);
        this.hitEffects.push({
          x: defender.x,
          y: defender.y - 70,
          timer: 0.45,
          maxTimer: 0.45,
          type: attackDef.type as 'light' | 'heavy' | 'super',
          damageText: dmg,
        });

        if (defender.health <= 0) {
          this.handleKO(defender, attacker);
        }
      }
    }
  }

  private handleKO(defeated: FighterEntity, winner: FighterEntity) {
    defeated.state = 'ko';
    defeated.animTime = 0;
    defeated.animFrame = 0;
    defeated.vx = -defeated.facing * 140;
    defeated.vy = -320;

    this.matchState = 'round_end';
    this.screenShake = 22;
    this.hitstopTimer = 0.12;
    gameAudio.playAnnouncerCall('ko');

    this.showBanner('¡K.O.!', `${winner.config.name.toUpperCase()} WINS!`, 2.5, '#ef4444');

    winner.roundsWon++;

    setTimeout(() => {
      if (!this.running) return;

      if (winner.roundsWon >= 2) {
        this.matchState = 'match_end';
        this.matchWinner = winner.isP1 ? 'P1' : 'P2';
        gameAudio.playAnnouncerCall('victory');

        if (this.onMatchOver) {
          this.onMatchOver(this.matchWinner);
        }
      } else {
        this.roundNumber++;
        this.startRoundIntro();
      }
    }, 2800);
  }

  private handleTimeUp() {
    this.matchState = 'round_end';
    const result = evaluateRoundWinner(this.p1.health, this.p2.health);
    gameAudio.playAnnouncerCall('ko');

    if (result === 'P1') {
      this.p1.roundsWon++;
      this.showBanner('¡TIEMPO!', `${this.p1.config.name.toUpperCase()} WINS!`, 2.5, '#fbbf24');
    } else if (result === 'P2') {
      this.p2.roundsWon++;
      this.showBanner('¡TIEMPO!', `${this.p2.config.name.toUpperCase()} WINS!`, 2.5, '#fbbf24');
    } else {
      this.showBanner('¡EMPATE!', 'DRAW!', 2.5, '#94a3b8');
    }

    setTimeout(() => {
      if (!this.running) return;
      if (this.p1.roundsWon >= 2 || this.p2.roundsWon >= 2) {
        this.matchState = 'match_end';
        this.matchWinner = this.p1.roundsWon > this.p2.roundsWon ? 'P1' : 'P2';
        if (this.onMatchOver) this.onMatchOver(this.matchWinner);
      } else {
        this.roundNumber++;
        this.startRoundIntro();
      }
    }, 2800);
  }

  private spawnParticleBurst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 260 + 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: Math.random() * 6 + 3,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 0.4 + 0.25,
        color,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 6,
      });
    }
  }

  private updateParticlesAndEffects(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 380 * dt;
      p.rotation += p.vRot * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      const eff = this.hitEffects[i];
      eff.timer -= dt;
      eff.y -= dt * 45;
      if (eff.timer <= 0) {
        this.hitEffects.splice(i, 1);
      }
    }
  }

  // ===================== RENDERING =====================

  private render(time: number) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.save();

    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(shakeX, shakeY);
    }

    this.stageSystem.renderBackground(this.ctx, w, h, time, this.currentStageIdx);
    this.stageSystem.renderHatPlatform(this.ctx, w, h, time, this.currentStageIdx);

    const groundY = h * 0.72;
    this.renderFighter(this.p1, groundY);
    this.renderFighter(this.p2, groundY);

    this.renderParticlesAndEffects();
    this.stageSystem.renderForeground(this.ctx, w, h, time, this.currentStageIdx);

    if (this.superCinematicTimer > 0) {
      this.renderSuperCinematic(w, h);
    }

    if (this.banner) {
      this.renderBanner(w, h);
    }

    this.ctx.restore();
  }

  private renderFighter(fighter: FighterEntity, groundY: number) {
    const sheetCanvas = getCleanSpritesheetCanvas(fighter.config.spritesheetPath);
    const anim = fighter.config.animations[fighter.state] || fighter.config.animations.idle;
    const frame = anim.frames[fighter.animFrame % anim.frames.length];

    const posX = fighter.x;
    const posY = groundY + fighter.y;

    this.ctx.save();

    // Shadow on Hat surface
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.ctx.beginPath();
    this.ctx.ellipse(posX, groundY - 2, 36 * fighter.scaleX, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Ghost trails
    for (const trail of fighter.ghostTrails) {
      if (!sheetCanvas) continue;
      const trailAnim = fighter.config.animations[trail.anim] || anim;
      const trailFrame = trailAnim.frames[trail.frame % trailAnim.frames.length];
      if (!trailFrame) continue;

      this.ctx.save();
      this.ctx.globalAlpha = trail.alpha * 0.4;
      this.ctx.translate(trail.x, groundY + trail.y);
      this.ctx.scale(trail.facing, 1);

      const tw = trailFrame.sw * 1.5;
      const th = trailFrame.sh * 1.5;
      this.ctx.drawImage(
        sheetCanvas,
        trailFrame.sx,
        trailFrame.sy,
        trailFrame.sw,
        trailFrame.sh,
        -tw * (trailFrame.originX || 0.5),
        -th * (trailFrame.originY || 0.95),
        tw,
        th
      );
      this.ctx.restore();
    }

    this.ctx.translate(posX, posY);
    this.ctx.scale(fighter.facing * fighter.scaleX, fighter.scaleY);

    if (sheetCanvas && frame) {
      const drawW = frame.sw * 1.5;
      const drawH = frame.sh * 1.5;
      const dx = -drawW * (frame.originX || 0.5);
      const dy = -drawH * (frame.originY || 0.95);

      if (fighter.hitFlashTimer > 0) {
        this.ctx.save();
        this.ctx.filter = 'brightness(3) contrast(2)';
        this.ctx.drawImage(
          sheetCanvas,
          frame.sx,
          frame.sy,
          frame.sw,
          frame.sh,
          dx,
          dy,
          drawW,
          drawH
        );
        this.ctx.restore();
      } else {
        this.ctx.drawImage(
          sheetCanvas,
          frame.sx,
          frame.sy,
          frame.sw,
          frame.sh,
          dx,
          dy,
          drawW,
          drawH
        );
      }
    }

    this.ctx.restore();
  }

  private renderParticlesAndEffects() {
    this.ctx.save();
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();
    }

    this.ctx.font = '900 24px "Impact", system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    for (const eff of this.hitEffects) {
      if (eff.damageText) {
        this.ctx.save();
        this.ctx.fillStyle = eff.type === 'super' ? '#c084fc' : '#fbbf24';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 4;
        this.ctx.strokeText(`-${eff.damageText}`, eff.x, eff.y);
        this.ctx.fillText(`-${eff.damageText}`, eff.x, eff.y);
        this.ctx.restore();
      }
    }
    this.ctx.restore();
  }

  private renderSuperCinematic(w: number, h: number) {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(w * 0.5, h * 0.5);
      this.ctx.lineTo(w * 0.5 + Math.cos(angle) * w, h * 0.5 + Math.sin(angle) * h);
      this.ctx.stroke();
    }

    this.ctx.font = '900 48px "Impact", system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 8;
    this.ctx.strokeText('¡SUPER CALAVERA!', w * 0.5, h * 0.35);
    this.ctx.fillText('¡SUPER CALAVERA!', w * 0.5, h * 0.35);

    this.ctx.restore();
  }

  private renderBanner(w: number, h: number) {
    if (!this.banner) return;
    this.ctx.save();
    this.ctx.translate(w * 0.5, h * 0.4);
    this.ctx.scale(this.banner.scale, this.banner.scale);

    this.ctx.font = '900 64px "Impact", system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = this.banner.color;
    this.ctx.strokeStyle = '#05010a';
    this.ctx.lineWidth = 10;
    this.ctx.strokeText(this.banner.text, 0, 0);
    this.ctx.fillText(this.banner.text, 0, 0);

    if (this.banner.subText) {
      this.ctx.font = '900 24px system-ui, sans-serif';
      this.ctx.fillStyle = '#fef08a';
      this.ctx.lineWidth = 4;
      this.ctx.strokeText(this.banner.subText, 0, 42);
      this.ctx.fillText(this.banner.subText, 0, 42);
    }

    this.ctx.restore();
  }
}
