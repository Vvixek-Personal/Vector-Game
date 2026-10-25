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
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.updateGains();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
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
    const isMusicMuted = this.globalMuted || this.musicMuted;
    
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
