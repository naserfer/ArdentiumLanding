/**
 * SPARKS — additive 2D particle system on one fixed canvas.
 * Embers drift upward and flicker; sparks fly as hot streaks, fall with gravity and cool
 * through white → gold → orange → red before they die.
 */
import { state } from "./ticker.js";

const COLORS = [
  [255, 250, 235], // white hot
  [255, 214, 140],
  [255, 160, 60],
  [255, 106, 26],
  [196, 50, 12],   // cooling
];

function heatColor(h, a) {
  const x = (1 - h) * (COLORS.length - 1);
  const i = Math.min(COLORS.length - 2, Math.floor(x));
  const f = x - i;
  const c0 = COLORS[i], c1 = COLORS[i + 1];
  return `rgba(${(c0[0] + (c1[0] - c0[0]) * f) | 0},${(c0[1] + (c1[1] - c0[1]) * f) | 0},${(c0[2] + (c1[2] - c0[2]) * f) | 0},${a})`;
}

export class Sparks {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.p = [];
    this.max = state.mobile ? 160 : 420;
    this.emitters = [];
    this.resize();
    addEventListener("resize", () => this.resize(), { passive: true });
  }

  resize() {
    this.dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(innerWidth * this.dpr);
    this.canvas.height = Math.round(innerHeight * this.dpr);
  }

  spawn(o) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push({
      x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
      life: 0, max: o.max || 1.2, size: o.size || 1.6,
      g: o.g ?? 520, drag: o.drag ?? 0.985, kind: o.kind || "spark",
      seed: Math.random() * 100,
    });
  }

  /** Radial burst — a hammer blow. */
  burst(x, y, n = 36, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      const sp = (180 + Math.random() * 620) * power;
      this.spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, max: 0.5 + Math.random() * 0.9, size: 1 + Math.random() * 1.6 });
    }
  }

  /** Line burst — used when a heading gets "struck". */
  line(x0, x1, y, n = 28) {
    for (let i = 0; i < n; i++) {
      const x = x0 + Math.random() * (x1 - x0);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const sp = 120 + Math.random() * 380;
      this.spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, max: 0.4 + Math.random() * 0.7, size: 0.8 + Math.random() * 1.3 });
    }
  }

  ember(x, y) {
    this.spawn({
      x, y, vx: (Math.random() - 0.5) * 30, vy: -(30 + Math.random() * 90),
      g: -12, drag: 0.995, max: 2.2 + Math.random() * 2.6, size: 0.8 + Math.random() * 1.8, kind: "ember",
    });
  }

  /** Continuous emitter: fn(dt) is called every frame and may call spawn/ember. */
  addEmitter(fn) { this.emitters.push(fn); }

  tick(s) {
    const { ctx, dpr } = this;
    const dt = s.dt;
    for (const e of this.emitters) e(dt, this);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.p.length) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i];
      q.life += dt;
      if (q.life >= q.max || q.y > innerHeight + 40 || q.y < -60) { this.p.splice(i, 1); continue; }
      q.vy += q.g * dt;
      q.vx *= q.drag; q.vy *= q.drag;
      if (q.kind === "ember") q.vx += Math.sin(s.time * 2 + q.seed) * 8 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;

      const h = 1 - q.life / q.max;
      if (q.kind === "ember") {
        const flick = 0.55 + 0.45 * Math.sin(s.time * 12 + q.seed * 7);
        ctx.fillStyle = heatColor(Math.min(1, h * 0.8 + 0.1), (0.35 + 0.5 * flick) * Math.min(1, h * 3));
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (0.6 + 0.4 * h), 0, 6.283);
        ctx.fill();
      } else {
        const k = 0.028;
        ctx.strokeStyle = heatColor(h, Math.min(1, h * 1.6));
        ctx.lineWidth = q.size * (0.4 + 0.6 * h);
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - q.vx * k, q.y - q.vy * k);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }
}
