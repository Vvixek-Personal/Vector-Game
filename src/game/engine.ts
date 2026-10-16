// VECTOR game engine.
// Owns the canvas, the loop, input (keys, tap, swipe), and all mode rules.
// No level system: difficulty is fixed per mode, so the game stays simple.

import { SoundManager } from "./audio";
import { Fx } from "./fx";
import { playHaptic } from "./haptics";
import { bestScore, resolveKeyMap, type Settings, type ThemeId } from "./storage";
import { type GameModifiers, getModifierMultiplier } from "./modifiers";
import { loadMissions, updateMissionsProgress } from "./missions";
import {
  ALL_DIRS,
  BASE_SCORE,
  BONUS_MULT,
  COMBO_CAP,
  COMBO_STEP,
  DIAG_MULT,
  OPPOSITE_MULT,
  OVERDRIVE_STREAK,
  MODES,
  angleFromDirs,
  dirsForAngle,
  oppositeAngle,
  reactionRating,
  snapAngle,
  type ArrowMark,
  type DirName,
  type EngineEvents,
  type GameMode,
  type GameSummary,
  type HudState,
  type ModeDef,
  type Phase,
} from "./types";

const TAU = Math.PI * 2;
const CHORD_GRACE = 0.6;
const FOCUS_DURATION = 2.4;
const FOCUS_SCALE = 0.35;
const FOCUS_CHARGES = 3;
const SWIPE_MIN = 24;
const TAP_MAX_MOVE = 16;
const TAP_MAX_MS = 350;
const TAP_MIN_DIST = 48;
const DECOY_COUNT = 4;

const THEME_COLORS: Record<ThemeId, { bg: [string, string, string]; accent: string; decoy: string }> = {
  cyan: { bg: ["#0a061b", "#0e0730", "#0a0420"], accent: "#38e8ff", decoy: "#7c5cff" },
  amber: { bg: ["#100b05", "#211307", "#090603"], accent: "#ffb14d", decoy: "#fb7185" },
  violet: { bg: ["#0b0615", "#1a0b2e", "#07030e"], accent: "#c4b5fd", decoy: "#f0abfc" },
  mono: { bg: ["#050505", "#121212", "#030303"], accent: "#f8fafc", decoy: "#94a3b8" },
  aurora: { bg: ["#02100d", "#06261e", "#010807"], accent: "#6ee7b7", decoy: "#67e8f9" },
  cyber: { bg: ["#050816", "#0f172a", "#02040b"], accent: "#f43f5e", decoy: "#06b6d4" },
  emerald: { bg: ["#020f0a", "#052016", "#010704"], accent: "#10b981", decoy: "#84cc16" },
};

const LIGHT_THEMES: Record<string, { bg: [string, string, string]; accent: string; decoy: string }> = {
  cobalt: { bg: ["#dfe9ff", "#c8d8ff", "#eef3ff"], accent: "#2b6ef6", decoy: "#94a3e8" },
  tangerine: { bg: ["#ffeadb", "#ffd8be", "#fff4ea"], accent: "#e87a1e", decoy: "#e8a47e" },
  orchid: { bg: ["#eee6ff", "#dfd2ff", "#f7f2ff"], accent: "#7c4dff", decoy: "#b398e8" },
  spring: { bg: ["#dff5ec", "#c8eede", "#effaf5"], accent: "#0da06c", decoy: "#8fd4b8" },
  pearl: { bg: ["#eef0f4", "#dfe3ea", "#f8f9fb"], accent: "#5b6bb5", decoy: "#a6adc4" },
};

type RGB = [number, number, number];
const hex = (s: string): RGB => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
];
const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const lerp = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

interface Decoy {
  angle: number;
  spin: number;
  scale: number;
  alpha: number;
  offX: number;
  offY: number;
  phase: number;
  flick: number;
}

interface Dot {
  x: number;
  y: number;
  r: number;
  sp: number;
  ph: number;
}

interface CoopPlayer {
  held: Set<DirName>;
  chord: Set<DirName>;
  pend: boolean;
  at: number;
  input: number | null;
  armed: boolean;
  lives: number;
  /** Keys held across a round reset — need a fresh press. */
  stale: Set<string>;
}

class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed % 2147483647;
    if (this.s <= 0) this.s += 2147483646;
  }
  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
}

export class Engine {
  readonly sound = new SoundManager();
  phase: Phase = "menu";
  mode: GameMode = "arcade";

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private events: EngineEvents;
  private fx = new Fx();
  private settings: Settings;

  private raf = 0;
  private last = 0;
  private t = 0;
  private destroyed = false;
  private pausedAt = 0;
  private backgroundGradient: CanvasGradient | null = null;
  private beaconGradient: CanvasGradient | null = null;

  private w = 1;
  private h = 1;
  private dpr = 1;
  private cx = 0;
  private cy = 0;
  private centerX = 0;
  private centerY = 0;

  private def: ModeDef = MODES.arcade;

  // target
  private visualDir = 90;
  private requiredDir = 90;
  private mark: ArrowMark = "none";
  private decoys: Decoy[] = [];
  private dots: Dot[] = [];
  private timeLeft = 0;
  private reveal = 0;
  private roundStart = 0;
  private memoryPhase: "reveal" | "recall" | "" = "";
  private revealT = 0;
  private warned = false;

  // round commit
  private committed = false;

  // solo keyboard chord
  private keyMap: Map<string, DirName> = new Map();
  private held = new Set<DirName>();
  private chord = new Set<DirName>();
  private chordPending = false;
  private chordAt = 0;
  private armed = true;
  private physKeys = new Set<string>();
  private staleKeys = new Set<string>();

  // co-op
  private coop: [CoopPlayer, CoopPlayer] = [
    { held: new Set(), chord: new Set(), pend: false, at: 0, input: null, armed: true, lives: 2, stale: new Set() },
    { held: new Set(), chord: new Set(), pend: false, at: 0, input: null, armed: true, lives: 2, stale: new Set() },
  ];
  private coopKeys = new Set<string>();

  // versus
  private versus = { turn: 0 as 0 | 1, round: 1, scores: [0, 0] as [number, number] };
  private lastVersusAt = 0;

  // scores
  private score = 0;
  private best = 0;
  private streak = 0;
  private livesLeft = 3;
  private bestStreak = 0;
  private combo = 1;
  private overdrive = false;
  private total = 0;
  private waveStep = 0;
  private waves = 0;
  private swipes = 0;
  private correctCount = 0;
  private reactions: number[] = [];
  private fastest = 9999;

  // Boss Sequence Encounters & Rival Pace
  private bossRaid: { active: boolean; needed: number; remaining: number; targetName: string } | null = null;
  private bossRaidsCleared = 0;
  private overdriveCount = 0;
  private hitsSinceBoss = 0;

  // focus slow-mo
  private focusCharges = FOCUS_CHARGES;
  private focusActive = false;
  private focusLeft = 0;
  private hudEmitAt = 0;
  private runClock = 0;

  // theme colors (tweened)
  private bgA: RGB;
  private bgB: RGB;
  private bgC: RGB;
  private accent: RGB;
  private decoyCol: RGB;
  private targetColor: RGB;

  private rng = new Rng(12345);
  private modifiers: GameModifiers = {};

  constructor(canvas: HTMLCanvasElement, settings: Settings, events: EngineEvents) {
    this.canvas = canvas;
    this.events = events;
    this.settings = settings;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;

    const c = this.themeColors(settings);
    this.bgA = hex(c.bg[0]);
    this.bgB = hex(c.bg[1]);
    this.bgC = hex(c.bg[2]);
    this.accent = hex(c.accent);
    this.decoyCol = hex(c.decoy);
    this.targetColor = hex(c.accent);

    this.configure(settings);
    this.resize();
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);

    // Menus are HTML/CSS. The canvas only needs a loop during an active run.
  }

  destroy() {
    this.destroyed = true;
    this.stopRendering();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.sound.destroy();
  }

  // ---------------------------------------------------------- public api

  setAudioPack(audioPackId?: string) {
    this.sound.setAudioPackId(audioPackId);
  }

  configure(settings: Settings) {
    this.settings = settings;
    this.keyMap = resolveKeyMap(settings);
    this.sound.setMusicStyle(settings.musicStyle);
    this.sound.setGlobalMuted(settings.soundEnabled === false);
    const c = this.themeColors(settings);
    this.bgA = hex(c.bg[0]);
    this.bgB = hex(c.bg[1]);
    this.bgC = hex(c.bg[2]);
    this.accent = hex(c.accent);
    this.decoyCol = hex(c.decoy);
    this.targetColor = hex(c.accent);
    this.backgroundGradient = null;
    this.beaconGradient = null;
    if (this.phase === "paused" || this.phase === "over") this.render();
  }

  startGame(mode: GameMode, modifiers?: GameModifiers) {
    if (this.destroyed) return;
    this.stopRendering();
    this.pausedAt = 0;
    this.mode = mode;
    this.def = MODES[mode];
    this.modifiers = modifiers ? { ...modifiers } : {};
    
    const seed = mode === "weekly" ? this.weeklySeed() : (this.def.seeded ? this.dailySeed() : Math.floor(Math.random() * 1e9) + 1);
    this.rng = new Rng(seed);

    this.fx.clear();
    this.score = 0;
    this.best = bestScore(mode);
    this.livesLeft = this.modifiers.suddenRisk ? 1 : this.def.lives;
    this.streak = 0;
    this.bestStreak = 0;
    this.combo = 1;
    this.overdrive = false;
    this.swipes = 0;
    this.correctCount = 0;
    this.reactions = [];
    this.fastest = 9999;
    this.bossRaid = null;
    this.bossRaidsCleared = 0;
    this.overdriveCount = 0;
    this.hitsSinceBoss = 0;
    this.sound.setStreak(0);
    this.total = this.def.total ?? 0;
    this.waveStep = 0;
    this.waves = 0;
    this.versus = { turn: 0, round: 1, scores: [0, 0] };
    this.lastVersusAt = 0;
    this.coop = [
      { held: new Set(), chord: new Set(), pend: false, at: 0, input: null, armed: true, lives: this.def.lives, stale: new Set() },
      { held: new Set(), chord: new Set(), pend: false, at: 0, input: null, armed: true, lives: this.def.lives, stale: new Set() },
    ];
    this.coopKeys.clear();
    this.focusCharges = FOCUS_CHARGES;
    this.focusActive = false;
    this.focusLeft = 0;
    this.runClock = 0;
    this.clearSoloInput();
    this.phase = "playing";
    this.sound.start();
    this.sound.startBgm(1);
    this.events.onPhase("playing");
    this.spawn();
    this.emitHud();
    this.render();
    this.startRendering();
  }

  pause() {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    this.pausedAt = performance.now();
    this.stopRendering();
    this.ptr.active = false;
    this.clearSoloInput();
    this.coopAbort();
    this.sound.stopBgm();
    this.events.onPhase("paused");
  }

  resume() {
    if (this.phase !== "paused") return;
    const pausedFor = performance.now() - this.pausedAt;
    this.roundStart += pausedFor;
    if (this.lastVersusAt) this.lastVersusAt += pausedFor;
    this.phase = "playing";
    this.clearSoloInput();
    this.coopAbort();
    this.sound.startBgm(1);
    this.events.onPhase("playing");
    this.startRendering();
  }

  toMenu() {
    this.phase = "menu";
    this.stopRendering();
    this.clearSoloInput();
    this.coopAbort();
    this.ptr.active = false;
    this.focusActive = false;
    this.fx.clear();
    this.sound.stopBgm();
    this.events.onPhase("menu");
  }

  triggerFocus() {
    if (this.phase !== "playing" || !this.focusAvailable()) return;
    if (this.focusActive || this.focusCharges <= 0) return;
    this.focusCharges--;
    this.focusActive = true;
    this.focusLeft = FOCUS_DURATION;
    this.sound.slowmoEnter();
    this.emitHud();
  }

  pressDir(d: DirName) {
    this.soloPress(d);
  }

  releaseDir(d: DirName) {
    this.soloRelease(d);
  }

  private focusAvailable() {
    return this.def.players === 1;
  }

  // ---------------------------------------------------------- theme

  private themeColors(s: Settings): { bg: [string, string, string]; accent: string; decoy: string } {
    if (s.uiMode === "light") return LIGHT_THEMES[s.colorway] ?? LIGHT_THEMES.cobalt;
    return THEME_COLORS[s.theme] ?? THEME_COLORS.cyan;
  }

  private weeklySeed(): number {
    const d = new Date();
    const year = d.getFullYear();
    const start = new Date(year, 0, 1);
    const diff = (d.getTime() - start.getTime()) + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60000;
    const week = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
    const str = `${year}_W${week}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) || 12345;
  }

  private dailySeed(): number {
    const d = new Date();
    const str = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) || 12345;
  }

  // ---------------------------------------------------------- loop

  private startRendering() {
    if (this.destroyed || this.raf || this.phase !== "playing") return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private stopRendering() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (ts: number) => {
    this.raf = 0;
    if (this.destroyed || this.phase !== "playing") return;
    try {
      const dt = clamp((ts - this.last) / 1000, 0, 0.05);
      this.last = ts;
      if (this.fx.hitStop > 0) {
        this.fx.hitStop = Math.max(0, this.fx.hitStop - dt);
      } else {
        this.t += dt;
        this.update(dt);
      }
      this.render();
    } catch (err) {
      console.error("VECTOR tick error", err);
      this.pause();
    }
    if (!this.destroyed && this.phase === "playing" && !this.raf) {
      this.raf = requestAnimationFrame(this.tick);
    }
  };

  private update(dt: number) {
    this.fx.update(dt, this.t);
    this.reveal = this.settings.reducedMotion ? 1 : Math.min(1, this.reveal + dt / 0.18);
    this.runClock += dt;

    if (this.focusActive) {
      this.focusLeft -= dt;
      if (this.focusLeft <= 0) {
        this.focusActive = false;
        this.sound.slowmoExit();
        this.emitHud();
      }
    }

    if (this.phase !== "playing") return;

    // Chord safety nets: pending chords normally resolve via a second press or
    // release. While keys are still held we keep waiting (no time pressure);
    // only commit a stale chord once hands are off.
    if (this.chordPending && this.t - this.chordAt > CHORD_GRACE) {
      if (this.held.size === 0 && this.phase === "playing" && !this.committed && this.chord.size > 0) {
        this.resolveChord(true);
      } else {
        this.chordAt = this.t;
      }
    }
    if (this.mode === "coop") {
      const coopIdx: Array<0 | 1> = [0, 1];
      for (const p of coopIdx) {
        const pl = this.coop[p];
        if (!pl.pend) continue;
        if (this.t - pl.at > CHORD_GRACE) {
          if (pl.held.size === 0 && pl.input === null && pl.chord.size > 0) {
            this.coopResolve(p, true);
          } else {
            pl.at = this.t;
          }
        }
      }
    }

    // memory: reveal -> recall
    if (this.mode === "memory") {
      if (this.memoryPhase === "reveal") {
        this.revealT += dt;
        if (this.revealT >= (this.def.reveal ?? 0.9)) {
          this.memoryPhase = "recall";
          this.timeLeft = this.def.roundTime;
          this.roundStart = performance.now();
          this.emitHud();
        }
        return;
      }
    }

    // rush/blitz total clock
    if (this.def.total) {
      this.total = Math.max(0, this.total - dt);
      if (this.total <= 0) {
        this.over();
        return;
      }
    }

    // round timer (slowed by focus)
    this.timeLeft -= dt * (this.focusActive ? FOCUS_SCALE : 1);
    if (!this.warned && this.timeLeft < 0.45 && this.timeLeft > 0) {
      this.warned = true;
      this.sound.lowTime();
    }
    if (this.timeLeft <= 0) {
      this.handleTimeout();
      return;
    }

    // Keep countdown / focus / co-op ready states fresh between events.
    if (this.t - this.hudEmitAt > 0.1) {
      this.hudEmitAt = this.t;
      this.emitHud();
    }
  }

  // ---------------------------------------------------------- target lifecycle

  private rand() {
    return this.def.seeded ? this.rng.next() : Math.random();
  }

  private spawn() {
    this.committed = false;
    if (this.mode === "coop") this.coopFreshRound();

    const pool = ALL_DIRS;
    let dir = this.visualDir;
    while (dir === this.visualDir) dir = pool[Math.floor(this.rand() * pool.length)];
    this.visualDir = dir;

    const r = this.rand();
    this.mark = r < 0.08 ? "bonus" : r < 0.23 ? "opposite" : "none";
    let req = this.mark === "opposite" ? oppositeAngle(this.visualDir) : this.visualDir;
    if (this.modifiers.mirrorRealm) {
      req = oppositeAngle(req);
    }
    this.requiredDir = req;
    if (this.mark === "bonus") this.sound.bonusSpawn();

    const speedMult = this.modifiers.hyperSpeed ? 1.35 : 1.0;
    this.timeLeft = this.def.roundTime / speedMult;
    this.reveal = 0;
    this.revealT = 0;
    this.warned = false;
    this.roundStart = performance.now();
    this.memoryPhase = this.mode === "memory" ? "reveal" : "";
    this.buildDecoys();
    this.emitHud();
  }

  private buildDecoys() {
    this.decoys = [];
    for (let i = 0; i < DECOY_COUNT; i++) {
      this.decoys.push({
        angle: Math.floor(this.rand() * 8) * 45,
        spin: (Math.random() - 0.5) * 2.2,
        scale: 0.66 + Math.random() * 0.3,
        alpha: 0.1 + Math.random() * 0.1,
        offX: (Math.random() - 0.5) * 40,
        offY: (Math.random() - 0.5) * 32,
        phase: Math.random() * TAU,
        flick: 3 + Math.random() * 5,
      });
    }
  }

  // ---------------------------------------------------------- solo input

  private soloPress(d: DirName) {
    if (this.held.has(d)) return;
    this.held.add(d);
    if (this.phase !== "playing" || this.def.players === 2) return;
    this.sound.tap();
    this.haptic("tap");
    if (this.committed || !this.armed) return;

    if (this.chordPending) {
      this.chord.add(d);
      if (this.chord.size >= 2) this.resolveChord();
      return;
    }
    this.chord = new Set([d]);
    this.chordPending = true;
    this.chordAt = this.t;
    // Cardinal targets commit instantly — right or wrong. Diagonals wait for key two.
    if (dirsForAngle(this.requiredDir).length === 1) this.resolveChord();
  }

  private soloRelease(d: DirName) {
    if (!this.held.delete(d)) return;
    if (this.held.size === 0) {
      this.armed = true;
      // Releasing with an incomplete chord commits it as an attempt (a miss),
      // so a wrong choice always registers instead of vanishing.
      if (this.chordPending) {
        if (this.phase === "playing" && !this.committed && this.chord.size > 0) {
          this.resolveChord(true);
        } else {
          this.chordPending = false;
          this.chord.clear();
        }
      }
    }
  }

  private clearSoloInput() {
    if (this.physKeys.size > 0) this.staleKeys = new Set(this.physKeys);
    this.held.clear();
    this.chord.clear();
    this.chordPending = false;
    this.armed = true;
  }

  private resolveChord(force = false) {
    const dirs = [...this.chord];
    if (dirs.length === 0) {
      this.chordPending = false;
      return;
    }
    const need = dirsForAngle(this.requiredDir);
    if (!force && need.length === 2 && dirs.length < 2) return; // wait for the second key
    this.chordPending = false;
    this.chord.clear();
    this.armed = this.held.size === 0;
    const ang = angleFromDirs(dirs);
    if (ang === null) {
      this.armed = true;
      return;
    }
    this.commit(ang);
  }

  /** One committed 8-way direction from any input source (keys, tap, swipe). */
  private commit(ang: number) {
    if (this.phase !== "playing" || this.committed) return;
    if (this.mode === "coop") return; // coop uses its own per-player flow
    if (this.mode === "memory" && this.memoryPhase !== "recall") return;

    this.committed = true;
    this.swipes++;
    const reactionMs = performance.now() - this.roundStart;
    this.reactions.push(reactionMs);
    this.fastest = Math.min(this.fastest, reactionMs);
    this.fx.hitStop = this.settings.reducedMotion ? 0 : 0.016;

    if (this.mode === "versus") {
      this.commitVersus(ang);
      return;
    }

    // Every committed input always counts. A pre-reveal press still tells us
    // the player moved; it just feels gentler if it was a correct one.
    if (ang === this.requiredDir) {
      this.correct(reactionMs);
    } else {
      this.miss("wrong");
    }
  }

  // ---------------------------------------------------------- correct / miss

  private correct(reactionMs: number) {
    this.correctCount++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.combo = Math.min(COMBO_CAP, 1 + Math.floor(this.streak / COMBO_STEP));
    const wasOver = this.overdrive;
    this.overdrive = this.streak >= OVERDRIVE_STREAK;
    if (this.overdrive && !wasOver) {
      this.overdriveCount++;
      this.sound.overdriveEnter();
      this.fx.float("OVERDRIVE ×2", "#ffd166", this.cx, this.cy - this.arrowSize() * 2.1, 24);
    }
    this.sound.setStreak(this.streak);

    const rating = reactionRating(reactionMs);
    const diag = dirsForAngle(this.requiredDir).length === 2 ? DIAG_MULT : 1;
    const markMult = this.mark === "bonus" ? BONUS_MULT : this.mark === "opposite" ? OPPOSITE_MULT : 1;
    const modMult = getModifierMultiplier(this.modifiers);
    const pts = Math.round((BASE_SCORE * diag * markMult * this.combo * (this.overdrive ? 2 : 1) + rating.bonus) * modMult);
    this.score += pts;

    // Boss Sequence Encounter Mechanics
    this.hitsSinceBoss++;
    if (!this.bossRaid && this.hitsSinceBoss >= 15 && this.streak >= 4) {
      this.hitsSinceBoss = 0;
      const bossHp = 4 + Math.min(4, Math.floor(this.correctCount / 25));
      const bossNames = ["CHRONOS NEXUS", "VOID WYRM", "ASTRAL PHANTOM", "MECHA TITAN", "SOLAR OVERLORD"];
      const targetName = bossNames[this.bossRaidsCleared % bossNames.length];
      this.bossRaid = { active: true, needed: bossHp, remaining: bossHp, targetName };
      this.sound.bossRaidStart();
      this.fx.float(`⚠️ RAID: ${targetName}!`, "#f43f5e", this.cx, this.cy - this.arrowSize() * 2.2, 24);
      this.haptic("overdrive");
    } else if (this.bossRaid?.active) {
      this.bossRaid.remaining--;
      if (this.bossRaid.remaining <= 0) {
        this.bossRaid = null;
        this.bossRaidsCleared++;
        this.sound.bossRaidSuccess();
        const raidBonus = Math.round(600 * modMult);
        this.score += raidBonus;
        this.fx.confettiBurst(this.cx, this.cy, this.arrowSize() * 1.5);
        this.fx.float(`💥 BOSS ANNIHILATED! +${raidBonus}`, "#ffd166", this.cx, this.cy - this.arrowSize() * 2.2, 24);
        this.haptic("combo");
      } else {
        this.fx.float(`BOSS HP -1 (${this.bossRaid.remaining}/${this.bossRaid.needed})`, "#f43f5e", this.cx, this.cy - this.arrowSize() * 1.7, 18);
      }
    }

    this.fx.hit(this.cx, this.cy, this.arrowSize(), this.visualDir, rgba(this.accent));
    this.fx.float(
      (this.mark === "bonus" ? "★ +" : this.mark === "opposite" ? "⇄ +" : diag > 1 ? "◆ +" : "+") + pts,
      this.mark === "bonus" ? "#ffd166" : rating.color,
      this.cx,
      this.cy - this.arrowSize() * 1.55,
    );
    if (this.combo > 1 && this.streak % COMBO_STEP === 0) {
      const isMax = this.combo >= COMBO_CAP;
      this.sound.comboComplete(this.combo, isMax);
      this.sound.announce(isMax ? "Max combo!" : `Combo ${this.combo}`, this.settings.announcer);
      this.fx.float(isMax ? `MAX COMBO ×${this.combo}` : `COMBO ×${this.combo}`, "#ffd166", this.cx, this.cy - this.arrowSize() * 1.95, 22);
      this.haptic("combo");
    }
    this.sound.correct(this.streak, rating.label === "Lightning");
    this.haptic("hit");
    if (!this.settings.reducedMotion && this.streak >= 10) {
      this.fx.shakeBy(Math.min(2 + this.streak / 6, 8));
    }

    // mode hooks
    if (this.def.onHit) {
      this.total = Math.min((this.def.total ?? 0) + 10, this.total + this.def.onHit);
      this.fx.float(`+${this.def.onHit}s`, "#2ee6b6", this.cx, this.cy + this.arrowSize() * 1.5, 18);
    }
    if (this.def.waveSize) {
      this.waveStep++;
      if (this.waveStep >= this.def.waveSize) {
        this.waveStep = 0;
        this.waves++;
        const bonus = 25;
        this.score += bonus;
        this.fx.confettiBurst(this.cx, this.cy, this.arrowSize());
        this.fx.float(`WAVE +${bonus}`, "#a5f3fc", this.cx, this.cy - this.arrowSize() * 2, 24);
        this.sound.levelUp();
      }
    }

    this.spawn();
    this.emitHud();
  }

  private miss(kind: "wrong" | "timeout") {
    this.streak = 0;
    this.combo = 1;
    this.overdrive = false;
    this.sound.setStreak(0);
    if (this.bossRaid?.active) {
      this.bossRaid.remaining = Math.min(this.bossRaid.needed, this.bossRaid.remaining + 1);
    }
    this.fx.miss(this.cx, this.cy, this.arrowSize());
    this.fx.shakeBy(this.settings.reducedMotion || this.settings.screenShake === false ? 0 : 14);
    if (kind === "wrong") {
      this.sound.wrong();
      this.haptic("error");
    } else {
      this.sound.timeout();
    }

    if (this.modifiers.suddenRisk) {
      this.livesLeft = 0;
      this.over();
      return;
    }

    if (this.def.lives < 999) {
      // Lives are per-player in co-op, handled there.
      this.livesLeft--;
      if (this.livesLeft <= 0) {
        this.over();
        return;
      }
      // Same arrow stays: unlock input and give a bit of time to retry.
      this.committed = false;
      this.timeLeft = Math.max(this.timeLeft, this.def.roundTime * 0.6);
      this.emitHud();
      return;
    }

    if (this.def.onMiss) {
      this.total = Math.max(0, this.total + this.def.onMiss);
      this.fx.float(`${this.def.onMiss}s`, "#ff8fa3", this.cx, this.cy + this.arrowSize() * 1.5, 18);
      if (this.total <= 0) {
        this.over();
        return;
      }
    }

    // Endless modes (zen, blitz): just let the player retry the same arrow.
    this.committed = false;
    this.timeLeft = Math.max(this.timeLeft, this.def.roundTime * 0.6);
    this.emitHud();
  }

  private handleTimeout() {
    if (this.phase !== "playing") return;
    if (this.mode === "coop") {
      this.coopTimeout();
      return;
    }
    if (this.mode === "versus") {
      // Current player scores nothing and the match advances.
      this.versusAdvance(false);
      return;
    }
    this.swipes++;
    this.miss("timeout");
  }

  // ---------------------------------------------------------- versus (hot seat)

  private commitVersus(ang: number) {
    // Hot-seat guard: require a small gap between the two players' commits so a
    // fast accidental double-tap by one player can't be counted as the other's turn.
    const now = performance.now();
    if (this.lastVersusAt && now - this.lastVersusAt < 500) return;
    this.lastVersusAt = now;
    this.committed = false;
    const correct = ang === this.requiredDir;
    if (correct) {
      this.versus.scores[this.versus.turn] += 25;
      this.fx.hit(this.cx, this.cy, this.arrowSize(), this.visualDir, rgba(this.accent));
      this.sound.correct(2);
    } else {
      this.fx.miss(this.cx, this.cy, this.arrowSize());
      this.sound.wrong();
    }
    this.versusAdvance(correct);
  }

  private versusAdvance(_correct: boolean) {
    if (this.versus.turn === 0) {
      this.versus.turn = 1;
      this.timeLeft = this.def.roundTime;
      this.reveal = 0;
      this.roundStart = performance.now();
      this.committed = false;
      this.clearSoloInput();
      this.emitHud();
      return;
    }
    this.versus.turn = 0;
    this.versus.round++;
    this.committed = false;
    this.lastVersusAt = 0;
    if (this.versus.round > (this.def.rounds ?? 15)) {
      this.over();
      return;
    }
    this.spawn();
    this.emitHud();
  }

  // ---------------------------------------------------------- co-op

  private coopFreshRound() {
    for (let p = 0; p < 2; p++) {
      const pl = this.coop[p];
      const stale = new Set<string>();
      for (const code of this.coopKeys) {
        if ((p === 0 ? COOP_P1 : COOP_P2)[code]) stale.add(code);
      }
      pl.held.clear();
      pl.chord.clear();
      pl.pend = false;
      pl.input = null;
      pl.armed = true;
      pl.stale = stale;
    }
  }

  private coopAbort() {
    this.coopKeys.clear();
    for (const pl of this.coop) {
      pl.held.clear();
      pl.chord.clear();
      pl.pend = false;
      pl.input = null;
      pl.armed = true;
      pl.stale.clear();
    }
  }

  private coopPress(p: 0 | 1, d: DirName, code: string) {
    const pl = this.coop[p];
    if (pl.stale.has(code)) return;
    if (pl.held.has(d)) return;
    pl.held.add(d);
    if (this.phase !== "playing") return;
    this.sound.tap();
    this.haptic("tap");
    if (pl.input !== null || !pl.armed) return;

    if (pl.pend) {
      pl.chord.add(d);
      if (pl.chord.size >= 2) this.coopResolve(p);
      return;
    }
    pl.chord = new Set([d]);
    pl.pend = true;
    pl.at = this.t;
    // Cardinal targets commit instantly — right or wrong. Diagonals wait for key two.
    if (dirsForAngle(this.requiredDir).length === 1) this.coopResolve(p);
  }

  private coopRelease(p: 0 | 1, d: DirName, code: string) {
    const pl = this.coop[p];
    pl.stale.delete(code);
    if (!pl.held.delete(d)) return;
    if (pl.held.size === 0) {
      pl.armed = true;
      // Releasing an incomplete chord commits it as an attempt (a miss),
      // so a wrong choice always registers instead of hanging the round.
      if (pl.pend) {
        if (this.phase === "playing" && pl.input === null && pl.chord.size > 0) {
          this.coopResolve(p, true);
        } else {
          pl.pend = false;
          pl.chord.clear();
        }
      }
    }
  }

  private coopResolve(p: 0 | 1, force = false) {
    const pl = this.coop[p];
    const dirs = [...pl.chord];
    if (dirs.length === 0) {
      pl.pend = false;
      return;
    }
    const need = dirsForAngle(this.requiredDir);
    if (!force && need.length === 2 && dirs.length < 2) return;
    pl.pend = false;
    pl.chord.clear();
    pl.armed = pl.held.size === 0;
    const ang = angleFromDirs(dirs);
    if (ang === null) {
      pl.armed = true;
      return;
    }
    if (pl.input !== null) return;
    pl.input = ang;
    this.emitHud();
    if (this.coop[0].input !== null && this.coop[1].input !== null) this.coopEval();
  }

  private coopEval() {
    const [p0, p1] = this.coop;
    const c0 = p0.input === this.requiredDir;
    const c1 = p1.input === this.requiredDir;

    if (c0 && c1) {
      this.correctCount++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.combo = Math.min(COMBO_CAP, 1 + Math.floor(this.streak / COMBO_STEP));
      this.score += 15 * this.combo;
      this.fx.hit(this.cx, this.cy, this.arrowSize(), this.visualDir, rgba(this.accent));
      this.fx.float(`+${15 * this.combo}`, "#a5f3fc", this.cx, this.cy - this.arrowSize() * 1.55);
      if (this.combo > 1 && this.streak % COMBO_STEP === 0) {
        const isMax = this.combo >= COMBO_CAP;
        this.sound.comboComplete(this.combo, isMax);
        this.sound.announce(isMax ? "Max combo!" : `Combo ${this.combo}`, this.settings.announcer);
        this.fx.float(isMax ? `MAX COMBO ×${this.combo}` : `COMBO ×${this.combo}`, "#ffd166", this.cx, this.cy - this.arrowSize() * 1.95, 22);
        this.haptic("combo");
      }
      this.sound.correct(this.streak);
      this.haptic("hit");
      if (!this.settings.reducedMotion && this.streak >= 10) {
        this.fx.shakeBy(Math.min(2 + this.streak / 6, 8));
      }
      this.fx.hitStop = this.settings.reducedMotion ? 0 : 0.016;
      this.coopFreshRound();
      this.spawn();
      this.emitHud();
      return;
    }

    this.streak = 0;
    this.combo = 1;
    this.fx.miss(this.cx, this.cy, this.arrowSize());
    this.fx.shakeBy(this.settings.reducedMotion || this.settings.screenShake === false ? 0 : 14);
    this.sound.wrong();
    this.haptic("error");
    if (!c0) p0.lives--;
    if (!c1) p1.lives--;
    this.emitHud();
    if (p0.lives <= 0 || p1.lives <= 0) {
      this.over();
      return;
    }
    this.coopFreshRound();
    this.spawn();
    this.emitHud();
  }

  private coopTimeout() {
    const [p0, p1] = this.coop;
    const c0 = p0.input === this.requiredDir;
    const c1 = p1.input === this.requiredDir;
    if (c0 && c1) return;
    this.streak = 0;
    this.combo = 1;
    if (!c0) p0.lives--;
    if (!c1) p1.lives--;
    this.fx.miss(this.cx, this.cy, this.arrowSize());
    this.sound.timeout();
    this.emitHud();
    if (p0.lives <= 0 || p1.lives <= 0) {
      this.over();
      return;
    }
    this.coopFreshRound();
    this.spawn();
    this.emitHud();
  }

  // ---------------------------------------------------------- game over

  private over() {
    if (this.phase === "over") return;
    this.phase = "over";
    this.stopRendering();
    this.ptr.active = false;
    this.sound.stopBgm();
    this.sound.gameOver();

    const newBest = this.score > this.best && this.score > 0;
    if (newBest) this.fx.confetti(this.w, this.h);

    const [a, b] = this.versus.scores;
    const accuracy = this.swipes > 0 ? Math.round((this.correctCount / this.swipes) * 100) : 100;
    let rank: "SSS" | "S" | "A" | "B" | "C" = "C";
    if (accuracy === 100 && this.bestStreak >= 15) rank = "SSS";
    else if (accuracy >= 90 && this.bestStreak >= 10) rank = "S";
    else if (accuracy >= 80) rank = "A";
    else if (accuracy >= 65) rank = "B";

    const summary: GameSummary = {
      mode: this.mode,
      score: this.score,
      best: Math.max(this.best, this.score),
      newBest,
      accuracy,
      bestStreak: this.bestStreak,
      avgReactionMs: this.reactions.length
        ? Math.round(this.reactions.reduce((x, y) => x + y, 0) / this.reactions.length)
        : 0,
      fastestMs: this.fastest === 9999 ? 0 : this.fastest,
      versus: this.mode === "versus" ? [a, b] : null,
      winner:
        this.mode === "versus"
          ? a === b
            ? 2
            : a > b
              ? 0
              : 1
          : null,
      waves: this.waves,
      hits: this.correctCount,
      misses: Math.max(0, this.swipes - this.correctCount),
      playSeconds: Math.round(this.runClock),
      rank,
      modifierMultiplier: getModifierMultiplier(this.modifiers),
      bossRaidsCleared: this.bossRaidsCleared,
    };

    try {
      const missions = loadMissions();
      updateMissionsProgress(missions, {
        runs: 1,
        score: this.score,
        streak: this.bestStreak,
        perfectHits: this.reactions.filter((r) => r < 340).length,
        bossRaids: this.bossRaidsCleared,
        overdriveCount: this.overdriveCount,
      });
    } catch {}

    this.events.onPhase("over");
    this.events.onOver(summary);
  }

  // ---------------------------------------------------------- hud

  private emitHud() {
    const pbPaceDelta = this.best > 0
      ? (this.score > this.best
          ? this.score - this.best
          : Math.round(this.score - this.best * Math.min(1, this.correctCount / Math.max(1, Math.round(this.best / 24)))))
      : undefined;

    const hud: HudState = {
      score: this.score,
      streak: this.streak,
      combo: this.combo,
      overdrive: this.overdrive,
      mark: this.mark,
      need: dirsForAngle(this.requiredDir),
      lives: this.mode === "coop" ? 0 : this.livesLeft,
      coopLives: [this.coop[0].lives, this.coop[1].lives],
      coopReady: [this.coop[0].input !== null, this.coop[1].input !== null],
      total: this.def.total ? this.total : null,
      waveStep: this.def.waveSize ? this.waveStep : 0,
      waveSize: this.def.waveSize ?? 0,
      versus: this.mode === "versus"
        ? {
            turn: this.versus.turn,
            round: Math.min(this.versus.round, this.def.rounds ?? 15),
            total: this.def.rounds ?? 15,
            scores: [...this.versus.scores] as [number, number],
          }
        : null,
      memory: this.mode === "memory" ? this.memoryPhase : "",
      focusCharges: this.focusCharges,
      focusActive: this.focusActive,
      focusFrac: this.focusActive ? Math.max(0, this.focusLeft / FOCUS_DURATION) : 0,
      focusAvailable: this.focusAvailable(),
      modifiers: this.modifiers,
      modifierMultiplier: getModifierMultiplier(this.modifiers),
      pbPaceDelta,
      bossRaid: this.bossRaid ? { ...this.bossRaid } : null,
    };
    this.events.onHud(hud);
  }

  private onResize = () => this.resize();

  private onBlur = () => {
    if (this.settings.autoPauseBlur === false) return;
    if (this.phase === "playing") this.pause();
  };

  private onVisibility = () => {
    if (this.settings.autoPauseBlur === false) return;
    if (document.hidden && this.phase === "playing") this.pause();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.phase !== "playing" || e.defaultPrevented) return;
    if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']")) return;
    if (e.code === "KeyF") {
      this.triggerFocus();
      return;
    }
    if (e.repeat) return;

    if (this.mode === "coop") {
      const p1 = COOP_P1[e.code];
      const p2 = COOP_P2[e.code];
      if (p1 || p2) {
        e.preventDefault();
        this.coopKeys.add(e.code);
        if (p1) this.coopPress(0, p1, e.code);
        else this.coopPress(1, p2, e.code);
      }
      return;
    }

    const d = this.keyMap.get(e.code);
    if (!d) return;
    e.preventDefault();
    this.physKeys.add(e.code);
    if (this.staleKeys.has(e.code)) return;
    this.soloPress(d);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (this.mode === "coop") {
      const p1 = COOP_P1[e.code];
      const p2 = COOP_P2[e.code];
      this.coopKeys.delete(e.code);
      if (p1) this.coopRelease(0, p1, e.code);
      else if (p2) this.coopRelease(1, p2, e.code);
      return;
    }
    this.physKeys.delete(e.code);
    this.staleKeys.delete(e.code);
    const d = this.keyMap.get(e.code);
    if (d) this.soloRelease(d);
  };

  // tap + swipe on the arena
  private ptr = { active: false, x: 0, y: 0, t0: 0, fired: false };

  private onPointerDown = (e: PointerEvent) => {
    this.ptr = { active: true, x: e.clientX, y: e.clientY, t0: performance.now(), fired: false };
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.ptr.active || this.ptr.fired) return;
    if (this.phase !== "playing" || this.mode === "coop") return;
    if (this.mode === "memory" && this.memoryPhase !== "recall") return;
    const dx = e.clientX - this.ptr.x;
    const dy = e.clientY - this.ptr.y;
    if (dx * dx + dy * dy >= SWIPE_MIN * SWIPE_MIN) {
      // Swipe: direction is where you are dragging.
      this.ptr.fired = true;
      this.commit(snapAngle((Math.atan2(dy, dx) * 180) / Math.PI));
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.ptr.active) return;
    const wasFired = this.ptr.fired;
    this.ptr.active = false;
    if (wasFired) return;
    if (this.phase !== "playing" || this.mode === "coop") return;

    const dx = e.clientX - this.ptr.x;
    const dy = e.clientY - this.ptr.y;
    const moved = Math.hypot(dx, dy);
    const heldFor = performance.now() - this.ptr.t0;
    if (moved > TAP_MAX_MOVE || heldFor > TAP_MAX_MS) return;

    // Tap: direction is where you tapped, relative to the arena center.
    const vx = e.clientX - this.centerX;
    const vy = e.clientY - this.centerY;
    const dist = Math.hypot(vx, vy);
    if (dist < TAP_MIN_DIST) return;
    this.commit(snapAngle((Math.atan2(vy, vx) * 180) / Math.PI));
  };

  // ---------------------------------------------------------- feel

  private haptic(kind: "tap" | "hit" | "combo" | "error" | "levelup") {
    const s = clamp(this.settings.haptics / 100, 0, 1);
    if (s <= 0) return;
    if (kind === "tap") {
      if (!this.settings.hapticsKind) return;
      playHaptic("selection", s);
    } else if (this.settings.hapticsKind) {
      playHaptic(kind === "hit" ? "medium" : kind === "combo" ? "heavy" : kind === "error" ? "error" : "success", s);
    }
  }


  // ---------------------------------------------------------- render

  private arrowPath(s: number) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(s, 0);
    c.lineTo(s * 0.32, -s * 0.52);
    c.lineTo(s * 0.32, -s * 0.26);
    c.lineTo(-s, -s * 0.26);
    c.lineTo(-s, s * 0.26);
    c.lineTo(s * 0.32, s * 0.26);
    c.lineTo(s * 0.32, s * 0.52);
    c.closePath();
  }

  private drawBadge(s: number) {
    const c = this.ctx;
    const mark = this.mark;
    if (mark === "none") return;
    // Stay visible once the arrow has appeared at all (reveal > 0.05).
    if (this.reveal < 0.05) return;
    const r = s * 0.42 * (1 + Math.sin(this.t * 5) * 0.05);

    c.save();
    c.translate(this.cx, this.cy);
    if (mark === "bonus") {
      c.rotate(this.t * 1.4);
      c.shadowColor = "#ffd166";
      c.shadowBlur = 16;
      c.fillStyle = "#ffd166";
      c.beginPath();
      c.arc(0, 0, r, 0, TAU);
      c.fill();
      c.rotate(-this.t * 1.4);
      c.shadowBlur = 0;
      c.fillStyle = "#3a2b00";
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r * 0.62 : r * 0.26;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      c.closePath();
      c.fill();
    } else {
      c.shadowColor = "#ffffff";
      c.shadowBlur = 14;
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(0, 0, r, 0, TAU);
      c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = "#0b1020";
      c.fillStyle = "#0b1020";
      c.lineWidth = Math.max(2, r * 0.22);
      c.lineCap = "round";
      c.lineJoin = "round";
      const y = r * 0.26;
      c.beginPath();
      c.moveTo(-r * 0.52, -y);
      c.lineTo(r * 0.52, -y);
      c.stroke();
      c.beginPath();
      c.moveTo(r * 0.52, -y);
      c.lineTo(r * 0.26, -y - r * 0.2);
      c.lineTo(r * 0.26, -y + r * 0.2);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(r * 0.52, y);
      c.lineTo(-r * 0.52, y);
      c.stroke();
      c.beginPath();
      c.moveTo(-r * 0.52, y);
      c.lineTo(-r * 0.26, y - r * 0.2);
      c.lineTo(-r * 0.26, y + r * 0.2);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    // Crisp high-DPI rendering without blur
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.backgroundGradient = null;
    this.beaconGradient = null;
    this.cx = this.w / 2;
    this.cy = this.h > this.w * 1.05 ? this.h * 0.42 : this.h / 2;
    this.centerX = rect.left + this.w / 2;
    this.centerY = rect.top + this.cy;

    const n = Math.min(90, Math.floor((this.w * this.h) / 20000));
    this.dots = [];
    for (let i = 0; i < n; i++) {
      this.dots.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: 0.8 + Math.random() * 1.3,
        sp: 0.4 + Math.random() * 1.0,
        ph: Math.random() * TAU,
      });
    }
    if (this.phase === "paused" || this.phase === "over") this.render();
  }

  private arrowSize() {
    const isTall = this.h > this.w * 1.05;
    const avail = isTall ? Math.min(this.w, this.h * 0.58) : Math.min(this.w, this.h * 0.85);
    const maxSz = isTall ? 140 : 155;
    return Math.min(avail * 0.25, maxSz);
  }

  private render() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (!this.backgroundGradient) {
      this.backgroundGradient = c.createLinearGradient(0, 0, 0, this.h);
      this.backgroundGradient.addColorStop(0, rgba(this.bgA));
      this.backgroundGradient.addColorStop(0.5, rgba(this.bgB));
      this.backgroundGradient.addColorStop(1, rgba(this.bgC));
    }
    c.fillStyle = this.backgroundGradient;
    c.fillRect(0, 0, this.w, this.h);

    c.fillStyle = rgba(lerp(this.targetColor, [255, 255, 255], 0.4));
    for (const d of this.dots) {
      c.globalAlpha = 0.06 + 0.08 * (0.5 + 0.5 * Math.sin(this.t * d.sp + d.ph));
      c.beginPath();
      c.arc(d.x, d.y, d.r, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;

    c.save();
    if (!this.settings.reducedMotion && this.fx.shake > 0.2) {
      c.translate((Math.random() * 2 - 1) * this.fx.shake, (Math.random() * 2 - 1) * this.fx.shake);
    }

    const base = this.arrowSize();

    // beacon
    if (!this.beaconGradient) {
      this.beaconGradient = c.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, base * 2.4);
      this.beaconGradient.addColorStop(0, rgba(this.targetColor, 0.1));
      this.beaconGradient.addColorStop(1, rgba(this.targetColor, 0));
    }
    c.fillStyle = this.beaconGradient;
    c.fillRect(this.cx - base * 2.4, this.cy - base * 2.4, base * 4.8, base * 4.8);

    // crosshair + ticks
    c.strokeStyle = "rgba(255,255,255,0.045)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(this.cx - base * 1.9, this.cy);
    c.lineTo(this.cx + base * 1.9, this.cy);
    c.moveTo(this.cx, this.cy - base * 1.9);
    c.lineTo(this.cx, this.cy + base * 1.9);
    c.stroke();
    for (let k = 0; k < 8; k++) {
      const a = (k * 45 * Math.PI) / 180;
      const diag = k % 2 === 1;
      c.strokeStyle = rgba(this.targetColor, diag ? 0.2 : 0.12);
      c.lineWidth = diag ? 2 : 1.5;
      c.beginPath();
      c.moveTo(this.cx + Math.cos(a) * base * 1.62, this.cy + Math.sin(a) * base * 1.62);
      c.lineTo(this.cx + Math.cos(a) * base * (diag ? 1.78 : 1.72), this.cy + Math.sin(a) * base * (diag ? 1.78 : 1.72));
      c.stroke();
    }

    if (this.phase !== "menu") {
      // decoys
      for (const d of this.decoys) {
        c.save();
        const driftTime = this.settings.reducedMotion ? 0 : this.t;
        c.translate(this.cx + d.offX + Math.sin(driftTime * d.flick + d.phase) * 5, this.cy + d.offY + Math.cos(driftTime * d.flick * 0.8 + d.phase) * 4);
        c.rotate((d.angle * Math.PI) / 180 + d.spin * driftTime * 0.2);
        c.globalAlpha = clamp(d.alpha * this.reveal, 0, 0.2);
        c.fillStyle = rgba(this.decoyCol);
        this.arrowPath(base * d.scale);
        c.fill();
        c.restore();
      }
      c.globalAlpha = 1;

      // timer ring
      const frac = clamp(this.timeLeft / Math.max(0.001, this.def.roundTime), 0, 1);
      const rr = base * 1.45;
      c.lineWidth = base * 0.055;
      c.strokeStyle = "rgba(255,255,255,0.09)";
      c.beginPath();
      c.arc(this.cx, this.cy, rr, 0, TAU);
      c.stroke();
      let ringColor = rgba(this.targetColor);
      if (this.focusActive) ringColor = "#a5f3fc";
      else if (frac < 0.28 && Math.sin(this.t * 16) > 0) ringColor = "#ffffff";
      c.strokeStyle = ringColor;
      c.lineCap = "round";
      c.beginPath();
      c.arc(this.cx, this.cy, rr, -Math.PI / 2, -Math.PI / 2 + frac * TAU);
      c.stroke();
      c.lineCap = "butt";

      // versus turn tags
      if (this.mode === "versus") {
        c.font = `800 ${base * 0.16}px "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
        c.textAlign = "center";
        c.fillStyle = this.versus.turn === 0 ? rgba(this.targetColor) : "rgba(255,255,255,0.35)";
        c.fillText(`P1 · ${this.versus.scores[0]}`, this.cx - base * 1.2, this.cy + base * 1.95);
        c.fillStyle = this.versus.turn === 1 ? rgba(this.targetColor) : "rgba(255,255,255,0.35)";
        c.fillText(`P2 · ${this.versus.scores[1]}`, this.cx + base * 1.2, this.cy + base * 1.95);
      }

      // co-op lives
      if (this.mode === "coop") {
        c.font = `800 ${base * 0.14}px "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
        c.textAlign = "center";
        c.fillStyle = "rgba(255,255,255,0.8)";
        const p0ready = this.coop[0].input !== null ? " ✓" : "";
        const p1ready = this.coop[1].input !== null ? " ✓" : "";
        c.fillText(`P1 ${"♥".repeat(Math.max(0, this.coop[0].lives))}${p0ready}`, this.cx - base * 1.2, this.cy + base * 1.95);
        c.fillText(`P2 ${"♥".repeat(Math.max(0, this.coop[1].lives))}${p1ready}`, this.cx + base * 1.2, this.cy + base * 1.95);
      }

      // target arrow (hidden in memory recall)
      const hidden = this.mode === "memory" && this.memoryPhase === "recall";
      if (!hidden) {
        const pop = easeOutBack(clamp(this.reveal, 0, 1));
        const s = base * clamp(0.85 + pop * 0.15, 0.85, 1.04);

        if (dirsForAngle(this.requiredDir).length === 2) {
          for (const d of dirsForAngle(this.requiredDir)) {
            const a = d === "N" ? -Math.PI / 2 : d === "S" ? Math.PI / 2 : d === "E" ? 0 : Math.PI;
            c.save();
            c.translate(this.cx, this.cy);
            c.rotate(a);
            c.globalAlpha = 0.2 * this.reveal;
            c.lineWidth = 2;
            c.strokeStyle = rgba(this.targetColor);
            this.arrowPath(s * 0.82);
            c.stroke();
            c.restore();
          }
          c.globalAlpha = 1;
        }

        c.save();
        c.translate(this.cx, this.cy);
        let arrowRot = (this.visualDir * Math.PI) / 180;
        if (this.modifiers.vortexSpin && !this.settings.reducedMotion) {
          const spinFrac = 1 - clamp(this.timeLeft / Math.max(0.001, this.def.roundTime), 0, 1);
          arrowRot += Math.sin(spinFrac * Math.PI) * 0.75;
        }
        c.rotate(arrowRot);
        if (this.modifiers.phantomMirage) {
          c.globalAlpha = 0.25 + 0.75 * Math.abs(Math.cos(this.t * 6));
        }
        c.shadowColor = rgba(this.targetColor);
        c.shadowBlur = this.settings.reducedMotion ? 0 : 12;
        const tg = c.createLinearGradient(-s, 0, s, 0);
        tg.addColorStop(0, rgba(lerp(this.targetColor, [0, 0, 0], 0.45)));
        tg.addColorStop(0.5, rgba(this.targetColor));
        tg.addColorStop(1, rgba(lerp(this.targetColor, [255, 255, 255], 0.75)));
        c.fillStyle = tg;
        this.arrowPath(s);
        c.fill();
        c.shadowBlur = 0;
        c.lineJoin = "round";
        c.lineWidth = Math.max(2, s * 0.045);
        c.strokeStyle = rgba(lerp(this.targetColor, [255, 255, 255], 0.85));
        c.stroke();
        c.restore();

        this.drawBadge(s);
      } else {
        // memory recall: a soft pulsing hint circle
        c.strokeStyle = "rgba(255,255,255,0.25)";
        c.lineWidth = 2;
        c.setLineDash([6, 10]);
        c.beginPath();
        c.arc(this.cx, this.cy, base * 0.8, this.t * 0.8, this.t * 0.8 + TAU);
        c.stroke();
        c.setLineDash([]);
      }
    }

    this.fx.render(c);
    c.restore();

    if (this.fx.flashWhite > 0) {
      c.fillStyle = rgba(this.accent, this.fx.flashWhite * 0.3);
      c.fillRect(0, 0, this.w, this.h);
    }
    if (this.fx.flashRed > 0) {
      c.fillStyle = `rgba(248,60,60,${this.fx.flashRed * 0.25})`;
      c.fillRect(0, 0, this.w, this.h);
    }
  }
}

// Fixed co-op key maps: Player 1 = WASD, Player 2 = arrows.
const COOP_P1: Record<string, DirName> = { KeyW: "N", KeyS: "S", KeyA: "W", KeyD: "E" };
const COOP_P2: Record<string, DirName> = { ArrowUp: "N", ArrowDown: "S", ArrowLeft: "W", ArrowRight: "E" };
