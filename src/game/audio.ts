// Synthesized sound effects + dynamic procedural synthwave music engine.
// 100% Web Audio API — zero external assets, offline, low latency.
import type { MusicStyle } from "./storage";

export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;
  private musicMuted = false;
  private globalMuted = false;
  private audioPackId: string | undefined = undefined;

  // BGM scheduler
  private bgmPlaying = false;
  private nextNoteTime = 0;
  private step = 0;
  private bgmTimer: number | null = null;
  private bpm = 116;
  private stageLevel = 1;
  private musicStyle: MusicStyle = "drive";
  private lastSpokenAt = 0;

  destroy() {
    this.stopBgm();
    if (this.ctx && this.ctx.state !== "closed") void this.ctx.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.updateGains();
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setGlobalMuted(m: boolean) {
    this.globalMuted = m;
    this.updateGains();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.updateGains();
  }

  setMusicMuted(m: boolean) {
    this.musicMuted = m;
    this.updateGains();
  }

  private updateGains() {
    const isMuted = this.globalMuted || this.muted;
    const isMusicMuted = this.globalMuted || this.muted || this.musicMuted;
    
    if (this.sfxGain) {
      this.sfxGain.gain.value = isMuted ? 0 : 0.65;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = isMusicMuted ? 0 : 0.22;
    }
  }

  setMusicStyle(style: MusicStyle) {
    this.musicStyle = style;
  }
  
  setAudioPackId(packId: string | undefined) {
    this.audioPackId = packId;
  }

  announce(text: string, enabled: boolean) {
    if (!enabled || this.muted || this.globalMuted || typeof speechSynthesis === "undefined") return;
    const now = performance.now();
    if (now - this.lastSpokenAt < 700) return;
    this.lastSpokenAt = now;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.25;
      u.pitch = 0.9;
      u.volume = 0.55;
      speechSynthesis.speak(u);
    } catch {
      /* optional browser feature */
    }
  }

  // ------------------------------------------------------------- SFX

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0,
    slideTo?: number,
  ) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.04);
  }

  private noise(dur: number, vol: number, delay = 0) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const buf = this.ctx.createBuffer(
      1,
      Math.floor(this.ctx.sampleRate * dur),
      this.ctx.sampleRate,
    );
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  tap() {
    this.tone(1180, 0.025, "square", 0.04);
  }

  click() {
    this.tone(620, 0.05, "square", 0.16);
  }

  correct(streak: number, lightning = false) {
    const f = 440 * Math.pow(2, Math.min(streak, 24) / 24);
    
    if (this.audioPackId === "retro") {
      this.tone(f, 0.1, "square", 0.3);
      this.tone(f * 1.5, 0.15, "square", 0.2, 0.02);
      if (lightning) this.noise(0.1, 0.2);
    } else if (this.audioPackId === "ethereal") {
      this.tone(f * 2, 0.3, "sine", 0.4);
      this.tone(f * 2.5, 0.4, "sine", 0.2, 0.05);
      if (lightning) this.tone(f * 3, 0.5, "sine", 0.1, 0.1);
    } else if (this.audioPackId === "cyber") {
      this.tone(f * 0.5, 0.1, "sawtooth", 0.4);
      this.noise(0.05, 0.3);
      if (lightning) this.tone(f, 0.1, "sawtooth", 0.3, 0.02);
    } else if (this.audioPackId === "synth") {
      this.tone(f * 0.75, 0.12, "sawtooth", 0.45, 0, f * 0.5);
      this.tone(f * 1.5, 0.08, "square", 0.25, 0.01);
      if (lightning) {
        this.tone(f * 2, 0.15, "sawtooth", 0.35, 0.02);
        this.noise(0.08, 0.2);
      }
    } else if (this.audioPackId === "chiptune") {
      // 8-Bit rapid arpeggio
      this.tone(f, 0.04, "square", 0.35);
      this.tone(f * 1.25, 0.04, "square", 0.32, 0.025);
      this.tone(f * 1.5, 0.06, "square", 0.3, 0.05);
      if (lightning) {
        this.tone(f * 2, 0.08, "square", 0.35, 0.075);
      }
    } else if (this.audioPackId === "lofi") {
      // Warm, mellow acoustic resonance
      this.tone(f * 0.5, 0.25, "sine", 0.4);
      this.tone(f * 0.75, 0.2, "triangle", 0.2, 0.02);
      if (lightning) {
        this.tone(f, 0.3, "sine", 0.25, 0.04);
      }
    } else if (this.audioPackId === "zen") {
      this.tone(f * 0.5, 0.4, "triangle", 0.5);
      this.tone(f * 0.5, 0.5, "sine", 0.4, 0.02);
      if (lightning) this.tone(f * 0.25, 0.6, "sine", 0.4, 0.04);
    } else {
      // Default
      this.tone(f, 0.11, "triangle", 0.5);
      this.tone(f * 1.5, 0.16, "sine", 0.25, 0.02);
      if (lightning) {
        this.tone(f * 2, 0.2, "sine", 0.35, 0.04);
        this.noise(0.08, 0.15);
      }
    }
  }

  combo(mult: number) {
    this.comboComplete(mult, mult >= 5);
  }

  comboComplete(mult: number, isMax = false) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    // Distinctive energetic combo completion sound signature:
    // 1. Snappy sub-bass punch (frequency sweep from 180Hz down to 55Hz)
    this.tone(180, 0.28, "sine", 0.5, 0, 55);

    // 2. Rising harmonic chime cascade (Major 9th crystalline sparkle)
    const root = 523.25; // C5
    const freqs = [root, root * 1.25, root * 1.5, root * 1.875, root * 2.25, root * 2.67];
    const notesCount = Math.min(freqs.length, mult + 2);

    for (let i = 0; i < notesCount; i++) {
      const f = freqs[i];
      const d = i * 0.038;
      // Rich dual harmonic oscillators with fast chime decay
      this.tone(f, 0.2, "triangle", 0.42, d);
      this.tone(f * 2, 0.14, "sine", 0.25, d + 0.008);
    }

    // 3. Resonant crystalline shimmer chord
    const tailDelay = notesCount * 0.038;
    this.tone(root * 2, 0.42, "sine", 0.4, tailDelay, root * 2.5);
    this.tone(root * 3, 0.38, "triangle", 0.3, tailDelay + 0.02);
    this.tone(root * 4, 0.32, "sine", 0.22, tailDelay + 0.04);

    if (isMax) {
      // Epic peak combo celebration with high sparkle burst and shimmer sweep
      this.tone(2093.0, 0.55, "triangle", 0.45, tailDelay + 0.03);
      this.tone(3135.96, 0.48, "sine", 0.35, tailDelay + 0.07);
      this.noise(0.18, 0.22, tailDelay);
    }
  }

  reverseWarning() {
    // soft two-note "flip" chime — minimal, not harsh
    this.tone(660, 0.09, "sine", 0.28);
    this.tone(495, 0.12, "sine", 0.28, 0.08);
  }

  bonusSpawn() {
    this.tone(1318, 0.1, "sine", 0.25);
    this.tone(1760, 0.14, "sine", 0.22, 0.07);
  }

  bonusCollect() {
    [880, 1108, 1318, 1760].forEach((f, i) =>
      this.tone(f, 0.16, "triangle", 0.36, i * 0.05),
    );
    this.noise(0.12, 0.12);
  }

  shieldEarn() {
    this.tone(392, 0.16, "triangle", 0.35);
    this.tone(587, 0.2, "triangle", 0.35, 0.09);
  }

  shieldBreak() {
    this.tone(720, 0.12, "square", 0.22, 0, 240);
    this.noise(0.22, 0.3);
    this.tone(480, 0.18, "triangle", 0.3, 0.05);
  }

  slowmoEnter() {
    this.tone(880, 0.35, "sine", 0.3, 0, 220);
    this.tone(440, 0.4, "triangle", 0.2, 0.05, 160);
  }

  slowmoExit() {
    this.tone(220, 0.2, "sine", 0.2, 0, 660);
  }

  setStreak(streak: number) {
    // Dynamically increase procedural music tempo and tone urgency with combo streak
    const baseBpm = 116;
    const bonusBpm = Math.min(32, Math.floor(streak / 5) * 3);
    this.bpm = baseBpm + bonusBpm;
  }

  bossRaidStart() {
    // Alarming dramatic boss encounter siren + sub bass drop
    this.tone(140, 0.45, "sawtooth", 0.6, 0, 50);
    this.noise(0.25, 0.35);
    [220, 277, 330, 440].forEach((f, i) =>
      this.tone(f, 0.18, "sawtooth", 0.4, i * 0.08),
    );
  }

  bossRaidSuccess() {
    // Victorious boss defeat chord fanfare + sparkling cascade
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      this.tone(f, 0.35, "triangle", 0.5, i * 0.07);
      this.tone(f * 2, 0.25, "sine", 0.35, i * 0.07 + 0.02);
    });
    this.noise(0.3, 0.25, 0.35);
  }

  badgePop() {
    this.tone(990, 0.07, "sine", 0.22);
  }

  overdriveEnter() {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      this.tone(f, 0.18, "sawtooth", 0.32, i * 0.05),
    );
    this.noise(0.3, 0.25);
  }

  lowTime() {
    this.tone(980, 0.05, "square", 0.2);
  }

  wrong() {
    this.tone(180, 0.26, "sawtooth", 0.5, 0, 70);
    this.tone(120, 0.3, "square", 0.28, 0.02, 55);
    this.noise(0.2, 0.32);
  }

  timeout() {
    this.tone(320, 0.2, "sawtooth", 0.4, 0, 130);
    this.tone(200, 0.3, "sawtooth", 0.35, 0.12, 70);
  }

  levelUp() {
    [523, 659, 784, 1046].forEach((f, i) =>
      this.tone(f, 0.14, "triangle", 0.42, i * 0.06),
    );
  }

  start() {
    [392, 523, 659].forEach((f, i) =>
      this.tone(f, 0.12, "triangle", 0.4, i * 0.06),
    );
  }

  gameOver() {
    [440, 349, 293, 220, 164].forEach((f, i) =>
      this.tone(f, 0.32, "sawtooth", 0.28, i * 0.13),
    );
    this.noise(0.4, 0.2, 0.1);
  }

  // ------------------------------------------------------------- ARCADE SPIN & WIN FX

  // Whirring high-pitch acceleration & deceleration during spin
  startSpinWhir(durationMs = 4400) {
    this.ensure();
    if (!this.ctx || !this.sfxGain || this.muted) return () => {};

    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const durSec = durationMs / 1000;

    // High-pitched synth whirring oscillator + filter modulation
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = "sawtooth";
    osc2.type = "sine";

    filter.type = "bandpass";
    filter.Q.value = 4.5;

    // Pitch rises rapidly to high-pitched whir (850Hz -> 2100Hz), then smoothly winds down to 240Hz
    const peakTime = t0 + Math.min(0.6, durSec * 0.15);
    osc1.frequency.setValueAtTime(420, t0);
    osc1.frequency.exponentialRampToValueAtTime(1950, peakTime);
    osc1.frequency.exponentialRampToValueAtTime(260, t0 + durSec);

    osc2.frequency.setValueAtTime(630, t0);
    osc2.frequency.exponentialRampToValueAtTime(2925, peakTime);
    osc2.frequency.exponentialRampToValueAtTime(390, t0 + durSec);

    filter.frequency.setValueAtTime(700, t0);
    filter.frequency.exponentialRampToValueAtTime(2600, peakTime);
    filter.frequency.exponentialRampToValueAtTime(380, t0 + durSec);

    // Whir amplitude envelope
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.24, t0 + 0.08);
    gain.gain.setValueAtTime(0.22, t0 + durSec - 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + durSec + 0.05);
    osc2.stop(t0 + durSec + 0.05);

    // Return stop callback in case of interruption
    return () => {
      try {
        const stopTime = ctx.currentTime;
        gain.gain.cancelScheduledValues(stopTime);
        gain.gain.setValueAtTime(gain.gain.value, stopTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.08);
        setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
          } catch {
            /* ignore */
          }
        }, 100);
      } catch {
        /* ignore */
      }
    };
  }

  // Pin click as needle hits sector pegs
  spinTick(speedRatio = 1) {
    this.ensure();
    const f = 1400 + Math.min(1200, speedRatio * 800);
    this.tone(f, 0.02, "square", 0.08);
    this.tone(f * 1.5, 0.015, "triangle", 0.06);
  }

  // Rarity-based celebrations
  rewardFanfare(rarity: "common" | "rare" | "epic" | "ultra") {
    this.ensure();
    if (!this.ctx || !this.sfxGain || this.muted) return;

    if (rarity === "common") {
      // Pleasant light chime
      [523.25, 659.25, 783.99].forEach((f, i) => {
        this.tone(f, 0.16, "sine", 0.28, i * 0.06);
      });
    } else if (rarity === "rare") {
      // Ascending energetic fanfare + sparkle
      [440, 554.37, 659.25, 880, 1108.73].forEach((f, i) => {
        this.tone(f, 0.2, "triangle", 0.35, i * 0.065);
        this.tone(f * 2, 0.12, "sine", 0.2, i * 0.065 + 0.01);
      });
      this.noise(0.15, 0.18, 0.32);
    } else if (rarity === "epic") {
      // Deep punch + soaring purple orchestral synth arpeggio
      this.tone(130.81, 0.35, "sine", 0.5, 0, 65.4); // bass drop
      const notes = [329.63, 440, 523.25, 659.25, 880, 1046.5, 1318.5];
      notes.forEach((f, i) => {
        this.tone(f, 0.25, "sawtooth", 0.28, i * 0.055);
        this.tone(f * 1.5, 0.2, "triangle", 0.22, i * 0.055 + 0.01);
      });
      // Grand chord bloom
      setTimeout(() => {
        [523.25, 659.25, 880, 1046.5].forEach((f) => {
          this.tone(f, 0.5, "sine", 0.28);
        });
        this.noise(0.25, 0.2);
      }, 420);
    } else if (rarity === "ultra") {
      // Epic Jackpot / Ultra Gold Blast
      this.tone(110, 0.5, "sine", 0.65, 0, 45); // Sub thunder
      const fanfare = [
        { f: 523.25, d: 0 },
        { f: 659.25, d: 0.07 },
        { f: 783.99, d: 0.14 },
        { f: 1046.5, d: 0.21 },
        { f: 1318.5, d: 0.28 },
        { f: 1567.98, d: 0.35 },
        { f: 2093.0, d: 0.44 },
      ];
      fanfare.forEach(({ f, d }) => {
        this.tone(f, 0.35, "triangle", 0.45, d);
        this.tone(f * 1.5, 0.25, "sawtooth", 0.28, d + 0.01);
        this.tone(f * 2, 0.2, "sine", 0.25, d + 0.02);
      });
      // Triumphant triumphant sustained crown chord
      setTimeout(() => {
        [523.25, 659.25, 783.99, 1046.5, 1567.98].forEach((f) => {
          this.tone(f, 0.85, "triangle", 0.32);
          this.tone(f * 2, 0.7, "sine", 0.25);
        });
        this.noise(0.4, 0.3);
      }, 480);
    }
  }

  // ------------------------------------------------------------- BGM ENGINE

  startBgm(level = 1) {
    this.ensure();
    this.stageLevel = level;
    this.bpm = Math.min(148, 116 + (level - 1) * 3);
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.step = 0;
    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
      this.scheduleBgm();
    }
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  updateBgmIntensity(level: number, overdrive: boolean) {
    this.stageLevel = level;
    this.bpm = Math.min(156, (overdrive ? 136 : 116) + (level - 1) * 3);
  }

  private scheduleBgm = () => {
    if (!this.bgmPlaying || !this.ctx || !this.musicGain) return;
    const lookahead = 0.15;
    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      this.playBgmStep(this.nextNoteTime, this.step);
      const stepDur = 60 / this.bpm / 4; // 16th notes
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % 32;
    }
    this.bgmTimer = window.setTimeout(this.scheduleBgm, 45);
  };

  private playBgmStep(t: number, s: number) {
    if (!this.ctx || !this.musicGain || this.muted || this.musicMuted) return;

    // Synthwave minor scale (A minor / D minor / F / E)
    const roots =
      this.musicStyle === "calm"
        ? [55, 55, 65.41, 65.41, 73.42, 73.42, 65.41, 65.41]
        : this.musicStyle === "pulse"
          ? [65.41, 65.41, 82.41, 73.42, 65.41, 98, 82.41, 73.42]
          : [55, 55, 55, 55, 65.41, 65.41, 73.42, 82.41];
    const root = roots[Math.floor(s / 4) % roots.length];

    // Driving rolling bass (every 8th note)
    if (this.musicStyle !== "calm" ? s % 2 === 0 : s % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(root, t);

      f.type = "lowpass";
      const cutoff =
        (this.musicStyle === "calm" ? 190 : this.musicStyle === "pulse" ? 380 : 260) +
        Math.min(600, this.stageLevel * 50);
      f.frequency.setValueAtTime(cutoff, t);
      f.frequency.exponentialRampToValueAtTime(90, t + 0.12);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(this.musicStyle === "calm" ? 0.14 : 0.24, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);

      osc.connect(f);
      f.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 0.15);
    }

    // Hi-hat / pulse on upbeats
    if (this.musicStyle !== "calm" && s % 4 === 2) {
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.035), this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.setValueAtTime(7000, t);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      src.connect(f);
      f.connect(g);
      g.connect(this.musicGain);
      src.start(t);
    }

    // Arpeggiated melody line (stages 2+)
    if (this.stageLevel >= 2 && (s % 2 === 1 || s % 4 === 0)) {
      const arpNotes = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 659.25];
      const noteIdx = (s * 3 + Math.floor(s / 8)) % arpNotes.length;
      const freq = arpNotes[noteIdx];

      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }
}

// Global shared instance for UI components outside the canvas Engine (e.g., Arcade Lucky Spin)
let sharedSoundInstance: SoundManager | null = null;

export function getSharedSound(): SoundManager {
  if (!sharedSoundInstance) {
    sharedSoundInstance = new SoundManager();
  }
  return sharedSoundInstance;
}
