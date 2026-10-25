// Visual effects: particles, floating text, shake, hit-stop.
// Owns its own state so the engine stays focused on gameplay.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  ring: boolean;
  ringSpeed: number;
}

interface FloatText {
  y0: number;
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
}

const TAU = Math.PI * 2;

export class Fx {
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  shake = 0;
  hitStop = 0;
  flashRed = 0;
  flashWhite = 0;

  clear() {
    this.particles = [];
    this.floats = [];
    this.shake = 0;
    this.hitStop = 0;
    this.flashRed = 0;
    this.flashWhite = 0;
  }

  update(dt: number, t: number) {
    this.shake = Math.max(0, this.shake - this.shake * 8 * dt - 6 * dt);
    this.flashRed = Math.max(0, this.flashRed - dt * 2.2);
    this.flashWhite = Math.max(0, this.flashWhite - dt * 3.2);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.max) {
        this.particles.splice(i, 1);
        continue;
      }
      if (!p.ring) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.12, dt);
        p.vy *= Math.pow(0.12, dt);
      }
    }

    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life += dt;
      f.y += f.vy * dt;
      f.vy *= Math.pow(0.2, dt);
      if (f.life >= f.max) this.floats.splice(i, 1);
    }
    void t;
  }

  float(text: string, color: string, x: number, y: number, size = 22) {
    this.floats.push({ x, y, y0: y, vy: -46, life: 0, max: 0.95, text, color, size });
    if (this.floats.length > 10) this.floats.shift();
  }

  /** Directional burst on a correct hit. */
  hit(x: number, y: number, base: number, dirDeg: number, color: string) {
    this.ring(x, y, base * 0.4, color, 1.3);
    const pool = [color, "#ffffff", "#ffd166"];
    for (let i = 0; i < 18; i++) {
      const ang = (dirDeg * Math.PI) / 180 + (Math.random() - 0.5) * 1.1;
      const sp = 220 + Math.random() * 420;
      this.dot(x, y, ang, sp, color ? pool[i % pool.length] : "#ffffff");
    }
  }

  /** Red shrapnel on a miss. */
  miss(x: number, y: number, base: number) {
    this.ring(x, y, base * 0.5, "#ff5a6e", 1.5);
    for (let i = 0; i < 20; i++) {
      const ang = Math.random() * TAU;
      const sp = 140 + Math.random() * 240;
      this.dot(x, y, ang, sp, Math.random() < 0.5 ? "#f87171" : "#ffb4bd");
    }
  }

  /** Expanding celebratory ring for level/wave/round milestones. */
  ring(x: number, y: number, size: number, color: string, ringSpeed: number) {
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.6, size, color, ring: true, ringSpeed });
  }

  confettiBurst(x: number, y: number, base: number) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x, y, vx: 0, vy: 0, life: -i * 0.1, max: 0.8, size: base * 0.35,
        color: "#ffd166", ring: true, ringSpeed: 2.2,
      });
    }
  }

  private dot(x: number, y: number, ang: number, sp: number, color: string) {
    this.particles.push({
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: 0,
      max: 0.35 + Math.random() * 0.5,
      size: 2 + Math.random() * 2.5,
      color,
      ring: false,
      ringSpeed: 0,
    });
  }

  confetti(w: number, h: number) {
    const colors = ["#ffd166", "#a5f3fc", "#ffffff", "#a78bfa", "#2ee6b6"];
    for (let i = 0; i < 70; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: -Math.random() * h * 0.3,
        vx: (Math.random() - 0.5) * 80,
        vy: 120 + Math.random() * 200,
        life: -Math.random() * 0.4,
        max: 1.2 + Math.random(),
        size: 2 + Math.random() * 3,
        color: colors[i % colors.length],
        ring: false,
        ringSpeed: 0,
      });
    }
  }

  shakeBy(amount: number) {
    this.shake = Math.max(this.shake, amount);
  }

  /** Short screen-flash burst — used for low-time warnings. */
  flashOnce(strength = 0.25) {
    this.flashWhite = Math.max(this.flashWhite, strength);
  }

  render(ctx: CanvasRenderingContext2D, showFloats = true, reducedMotion = false) {
    for (const p of reducedMotion ? [] : this.particles) {
      if (p.life < 0) continue;
      const k = p.life / p.max;
      ctx.globalAlpha = 1 - k;
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.5, 4 * (1 - k));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + k * 160 * p.ringSpeed, 0, TAU);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - k), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const f of showFloats ? this.floats : []) {
      const k = f.life / f.max;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `800 ${f.size}px "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.fillText(f.text, f.x, reducedMotion ? f.y0 : f.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
}
