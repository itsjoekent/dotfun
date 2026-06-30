/**
 * GuessOffBackground — procedural boxing-poster / arcade-versus canvas backdrop.
 *
 * Layer order (back → front):
 *   1. Base atmospheric gradient + vignette
 *   2. Poster burst rays
 *   3. Arena / ring lighting (spotlights, center column, diagonal beams)
 *   4. Halftone comic texture (pre-rendered offscreen)
 *   5. Speed-line / impact graphics
 *   6. Ghost typography ("VS", "GUESS OFF!")
 *   7. Boxing poster framing (ropes, corners, border glow, ticks)
 *   8. Foreground dust, grain, light sweep
 *
 * Adjust colors in PALETTE_A / PALETTE_B.
 * Adjust animation speed via ANIM constants below.
 * Adjust transition timing via TRANSITION_* constants.
 */

export type ActivePlayer = 'A' | 'B';

export interface GuessOffBackgroundOptions {
  /** 0 = subtle, 1 = dramatic. Default 0.75 */
  intensity?: number;
  /** Starting palette without transition punch */
  initialPlayer?: ActivePlayer;
}

/** RGB tuple for interpolation */
type RGB = [number, number, number];

interface Palette {
  shadow: RGB;
  base: RGB;
  mid: RGB;
  highlight: RGB;
  flare: RGB;
  /** Subtle opposing-color accent lighting */
  accent: RGB;
}

// ─── Palette A: racing-red → amber-gold warm side ────────────────────────────
const PALETTE_A: Palette = {
  shadow: [80, 10, 12],
  base: [180, 25, 28],
  mid: [245, 97, 18], // blaze-orange
  highlight: [250, 141, 8], // deep-saffron
  flare: [250, 190, 51], // amber-gold
  accent: [60, 109, 151], // cornflower-ocean from opponent
};

// ─── Palette B: cornflower-ocean cool side ───────────────────────────────────
const PALETTE_B: Palette = {
  shadow: [15, 28, 42],
  base: [35, 60, 85],
  mid: [60, 109, 151], // cornflower-ocean
  highlight: [85, 125, 165],
  flare: [120, 155, 195],
  accent: [251, 40, 44], // racing-red from opponent
};

// ─── Animation tuning ─────────────────────────────────────────────────────────
const ANIM = {
  rayParallaxSpeed: 0.00008,
  spotlightPulseSpeed: 0.0012,
  sweepSpeed: 0.00015,
  particleDrift: 1,
  speedLineSpeed: 2.5,
};

// ─── Transition tuning ────────────────────────────────────────────────────────
const TRANSITION_DURATION_MS = 700;
const TRANSITION_FLASH_PEAK = 0.35;
const TRANSITION_RAY_PULSE = 0.1;
const TRANSITION_GLOW_BOOST = 0.6;

interface Ray {
  angle: number;
  halfWidth: number;
  opacity: number;
  kind: 'shadow' | 'mid' | 'highlight' | 'dark';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface SpeedLine {
  x: number;
  y: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  width: number;
}

function rgb([r, g, b]: RGB, a = 1): string {
  return a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function lerpPalette(a: Palette, b: Palette, t: number): Palette {
  return {
    shadow: lerpRGB(a.shadow, b.shadow, t),
    base: lerpRGB(a.base, b.base, t),
    mid: lerpRGB(a.mid, b.mid, t),
    highlight: lerpRGB(a.highlight, b.highlight, t),
    flare: lerpRGB(a.flare, b.flare, t),
    accent: lerpRGB(a.accent, b.accent, t),
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class GuessOffBackground {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private intensity: number;

  private width = 0;
  private height = 0;
  private dpr = 1;

  private running = false;
  private rafId = 0;
  private startTime = 0;
  private resizeObserver: ResizeObserver | null = null;

  /** 0 = palette A, 1 = palette B */
  private paletteT = 0;
  private targetPaletteT = 0;
  private transitionFromT = 0;
  private transitionStart = 0;
  private transitioning = false;

  private flash = 0;
  private rayPulse = 1;
  private centerGlowBoost = 0;

  private rays: Ray[] = [];
  private particles: Particle[] = [];
  private speedLines: SpeedLine[] = [];

  private halftoneCanvas: HTMLCanvasElement | null = null;
  private noiseCanvas: HTMLCanvasElement | null = null;

  private readonly rng = mulberry32(0x6f6666);

  constructor(canvas: HTMLCanvasElement, options: GuessOffBackgroundOptions = {}) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2d context');
    this.canvas = canvas;
    this.ctx = ctx;
    this.intensity = options.intensity ?? 0.75;

    if (options.initialPlayer) {
      const t = options.initialPlayer === 'A' ? 0 : 1;
      this.paletteT = t;
      this.targetPaletteT = t;
    }

    this.initRays();
    this.initParticles();
    this.initSpeedLines();
    this.handleResize();
    this.setupResize();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = performance.now();
    this.tick(this.startTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.halftoneCanvas = null;
    this.noiseCanvas = null;
  }

  /** A = red/orange (computer), B = blue/cyan (human) */
  setActivePlayer(player: ActivePlayer): void {
    const target = player === 'A' ? 0 : 1;
    if (Math.abs(this.targetPaletteT - target) < 0.001 && !this.transitioning) return;

    this.transitionFromT = this.paletteT;
    this.targetPaletteT = target;
    this.transitionStart = performance.now();
    this.transitioning = true;
  }

  setIntensity(value: number): void {
    this.intensity = Math.max(0, Math.min(1, value));
  }

  // ─── Setup ──────────────────────────────────────────────────────────────────

  private setupResize(): void {
    const ro = new ResizeObserver(() => this.handleResize());
    ro.observe(document.documentElement);
    this.resizeObserver = ro;
    window.addEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = (): void => {
    this.handleResize();
  };

  private handleResize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.buildHalftoneTexture();
    this.buildNoiseTexture();
    this.initParticles();
    this.initSpeedLines();
  }

  private initRays(): void {
    const count = 32;
    this.rays = [];
    const rand = mulberry32(0x726179);
    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * Math.PI * 2;
      const kinds: Ray['kind'][] = ['shadow', 'mid', 'highlight', 'dark'];
      this.rays.push({
        angle: baseAngle + (rand() - 0.5) * 0.25,
        halfWidth: 0.04 + rand() * 0.09,
        opacity: 0.15 + rand() * 0.45,
        kind: kinds[i % kinds.length],
      });
    }
  }

  private initParticles(): void {
    const count = 55;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.rng() * this.width,
        y: this.rng() * this.height,
        vx: (this.rng() - 0.5) * 0.15,
        vy: -0.05 - this.rng() * 0.2,
        size: 0.5 + this.rng() * 2,
        alpha: 0.08 + this.rng() * 0.25,
      });
    }
  }

  private initSpeedLines(): void {
    const count = 18;
    this.speedLines = [];
    for (let i = 0; i < count; i++) {
      this.speedLines.push({
        x: this.rng() * this.width * 1.4 - this.width * 0.2,
        y: this.rng() * this.height * 1.4 - this.height * 0.2,
        length: 40 + this.rng() * 120,
        angle: Math.PI / 4 + (this.rng() - 0.5) * 0.15,
        speed: 1.5 + this.rng() * 2,
        opacity: 0.04 + this.rng() * 0.08,
        width: 0.5 + this.rng() * 1.5,
      });
    }
  }

  private buildHalftoneTexture(): void {
    const w = this.width;
    const h = this.height;
    if (w === 0 || h === 0) return;

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;

    const clusters = [
      { cx: 0, cy: 0, r: Math.min(w, h) * 0.35 },
      { cx: w, cy: 0, r: Math.min(w, h) * 0.3 },
      { cx: 0, cy: h, r: Math.min(w, h) * 0.32 },
      { cx: w, cy: h, r: Math.min(w, h) * 0.28 },
      { cx: w * 0.08, cy: h * 0.45, r: Math.min(w, h) * 0.18 },
      { cx: w * 0.92, cy: h * 0.55, r: Math.min(w, h) * 0.16 },
    ];

    const rand = mulberry32(0x68616c66);
    for (const cluster of clusters) {
      const dotCount = Math.floor(cluster.r * cluster.r * 0.015);
      for (let i = 0; i < dotCount; i++) {
        const angle = rand() * Math.PI * 2;
        const dist = Math.sqrt(rand()) * cluster.r;
        const px = cluster.cx + Math.cos(angle) * dist;
        const py = cluster.cy + Math.sin(angle) * dist;
        if (px < -10 || py < -10 || px > w + 10 || py > h + 10) continue;

        const norm = dist / cluster.r;
        const radius = (1.2 - norm * 0.9) * (1.5 + rand() * 2.5);
        const isHighlight = rand() < 0.08;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = isHighlight
          ? `rgba(255,255,255,${0.06 + rand() * 0.06})`
          : `rgba(0,0,0,${0.12 + rand() * 0.18})`;
        ctx.fill();
      }
    }

    this.halftoneCanvas = c;
  }

  private buildNoiseTexture(): void {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    const rand = mulberry32(0x6e6f6973);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rand() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 18 + rand() * 30;
    }
    ctx.putImageData(img, 0, 0);
    this.noiseCanvas = c;
  }

  // ─── Animation loop ─────────────────────────────────────────────────────────

  private tick = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    const elapsed = now - this.startTime;
    this.updateTransition(now);
    this.updateParticles();
    this.updateSpeedLines();

    const palette = this.getCurrentPalette();
    const cx = this.width * 0.5;
    const cy = this.height * 0.42;
    const I = this.intensity;

    const { ctx } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    this.drawBaseGradient(ctx, palette, cx, cy, I);
    this.drawBurstRays(ctx, palette, cx, cy, elapsed, I);
    this.drawArenaLighting(ctx, palette, cx, cy, elapsed, I);
    this.drawHalftone(ctx, I);
    this.drawSpeedLines(ctx, palette, I);
    this.drawGhostTypography(ctx, palette, cx, cy, I);
    this.drawFraming(ctx, palette, I);
    this.drawForeground(ctx, palette, elapsed, I);

    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,255,255,${this.flash})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  };

  private updateTransition(now: number): void {
    if (!this.transitioning) return;

    const raw = Math.min(1, (now - this.transitionStart) / TRANSITION_DURATION_MS);
    const eased = easeInOutCubic(raw);
    this.paletteT = lerp(this.transitionFromT, this.targetPaletteT, eased);

    const punch = Math.sin(raw * Math.PI);
    this.flash = punch * TRANSITION_FLASH_PEAK * this.intensity * (raw < 0.4 ? 1 : 0);
    this.rayPulse = 1 + punch * TRANSITION_RAY_PULSE * this.intensity;
    this.centerGlowBoost = punch * TRANSITION_GLOW_BOOST * this.intensity;

    if (raw >= 1) {
      this.transitioning = false;
      this.paletteT = this.targetPaletteT;
      this.flash = 0;
      this.rayPulse = 1;
      this.centerGlowBoost = 0;
    }
  }

  private getCurrentPalette(): Palette {
    return lerpPalette(PALETTE_A, PALETTE_B, this.paletteT);
  }

  private updateParticles(): void {
    const speed = ANIM.particleDrift * this.intensity;
    for (const p of this.particles) {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      if (p.y < -5) {
        p.y = this.height + 5;
        p.x = this.rng() * this.width;
      }
      if (p.x < -5) p.x = this.width + 5;
      if (p.x > this.width + 5) p.x = -5;
    }
  }

  private updateSpeedLines(): void {
    const diag = Math.PI / 4;
    for (const line of this.speedLines) {
      line.x += Math.cos(diag) * line.speed * ANIM.speedLineSpeed * this.intensity;
      line.y += Math.sin(diag) * line.speed * ANIM.speedLineSpeed * this.intensity;
      if (line.x > this.width + 200 || line.y > this.height + 200) {
        line.x = -100 - this.rng() * this.width * 0.5;
        line.y = -100 - this.rng() * this.height * 0.5;
      }
    }
  }

  // ─── Layer 1: Base atmospheric gradient + vignette ──────────────────────────

  private drawBaseGradient(
    ctx: CanvasRenderingContext2D,
    p: Palette,
    cx: number,
    cy: number,
    I: number,
  ): void {
    const { width: w, height: h } = this;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, rgb(p.shadow));
    bg.addColorStop(0.35, rgb(p.base));
    bg.addColorStop(0.55, rgb(p.mid));
    bg.addColorStop(1, rgb(p.shadow));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.65);
    radial.addColorStop(0, rgb(p.mid, 0.55 * I));
    radial.addColorStop(0.35, rgb(p.base, 0.35 * I));
    radial.addColorStop(0.7, rgb(p.shadow, 0.15));
    radial.addColorStop(1, rgb(p.shadow, 0));
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, w, h);

    const accentGlow = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, w * 0.4);
    accentGlow.addColorStop(0, rgb(p.accent, 0.12 * I));
    accentGlow.addColorStop(1, rgb(p.accent, 0));
    ctx.fillStyle = accentGlow;
    ctx.fillRect(0, 0, w, h);

    const accentGlow2 = ctx.createRadialGradient(w * 0.12, h * 0.88, 0, w * 0.12, h * 0.88, w * 0.35);
    accentGlow2.addColorStop(0, rgb(p.accent, 0.08 * I));
    accentGlow2.addColorStop(1, rgb(p.accent, 0));
    ctx.fillStyle = accentGlow2;
    ctx.fillRect(0, 0, w, h);

    const vignette = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.85);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.6, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(0,0,0,${0.55 + 0.2 * I})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  // ─── Layer 2: Poster burst rays ─────────────────────────────────────────────

  private drawBurstRays(
    ctx: CanvasRenderingContext2D,
    p: Palette,
    cx: number,
    cy: number,
    elapsed: number,
    I: number,
  ): void {
    const parallax = elapsed * ANIM.rayParallaxSpeed;
    const radius = Math.max(this.width, this.height) * 1.4 * this.rayPulse;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(parallax);

    for (const ray of this.rays) {
      let color: string;
      switch (ray.kind) {
        case 'shadow':
          color = rgb(p.shadow, ray.opacity * 0.7 * I);
          break;
        case 'mid':
          color = rgb(p.mid, ray.opacity * 0.5 * I);
          break;
        case 'highlight':
          color = rgb(p.highlight, ray.opacity * 0.45 * I);
          break;
        default:
          color = `rgba(0,0,0,${ray.opacity * 0.35 * I})`;
      }

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, ray.angle - ray.halfWidth, ray.angle + ray.halfWidth);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    ctx.restore();
  }

  // ─── Layer 3: Arena / ring lighting ─────────────────────────────────────────

  private drawArenaLighting(
    ctx: CanvasRenderingContext2D,
    p: Palette,
    cx: number,
    cy: number,
    elapsed: number,
    I: number,
  ): void {
    const { width: w, height: h } = this;
    const pulse = 0.85 + 0.15 * Math.sin(elapsed * ANIM.spotlightPulseSpeed);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const spotR = Math.max(w, h) * 0.55;
    const spots = [
      { x: w * 0.12, y: h * 0.08, color: p.flare },
      { x: w * 0.88, y: h * 0.08, color: p.highlight },
      { x: w * 0.5, y: h * 0.05, color: p.mid },
    ];

    for (const spot of spots) {
      const g = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spotR);
      g.addColorStop(0, rgb(spot.color, 0.18 * pulse * I));
      g.addColorStop(0.4, rgb(spot.color, 0.06 * pulse * I));
      g.addColorStop(1, rgb(spot.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    const columnH = h * 0.7;
    const columnBoost = 1 + this.centerGlowBoost;
    const col = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.22 * columnBoost);
    col.addColorStop(0, rgb(p.flare, (0.22 + this.centerGlowBoost * 0.15) * I));
    col.addColorStop(0.5, rgb(p.highlight, 0.08 * I));
    col.addColorStop(1, rgb(p.highlight, 0));
    ctx.fillStyle = col;
    ctx.fillRect(cx - w * 0.25, cy - columnH * 0.5, w * 0.5, columnH);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.07 * I;

    const beams = [
      { x1: 0, y1: 0, x2: w, y2: h },
      { x1: w, y1: 0, x2: 0, y2: h * 0.6 },
    ];
    for (const beam of beams) {
      const g = ctx.createLinearGradient(beam.x1, beam.y1, beam.x2, beam.y2);
      g.addColorStop(0, rgb(p.flare, 0));
      g.addColorStop(0.45, rgb(p.highlight, 0.6));
      g.addColorStop(0.55, rgb(p.highlight, 0.6));
      g.addColorStop(1, rgb(p.flare, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  // ─── Layer 4: Halftone texture ──────────────────────────────────────────────

  private drawHalftone(ctx: CanvasRenderingContext2D, I: number): void {
    if (!this.halftoneCanvas) return;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.35 * I;
    ctx.drawImage(this.halftoneCanvas, 0, 0, this.width, this.height);
    ctx.restore();
  }

  // ─── Layer 5: Speed lines / impact strokes ──────────────────────────────────

  private drawSpeedLines(ctx: CanvasRenderingContext2D, p: Palette, I: number): void {
    ctx.save();
    ctx.strokeStyle = rgb(p.flare, 0.5);
    ctx.lineCap = 'round';

    for (const line of this.speedLines) {
      ctx.globalAlpha = line.opacity * I;
      ctx.lineWidth = line.width;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(
        line.x + Math.cos(line.angle) * line.length,
        line.y + Math.sin(line.angle) * line.length,
      );
      ctx.stroke();
    }

    const impacts = [
      { x: this.width * 0.15, y: this.height * 0.38, len: 50, rot: -0.3 },
      { x: this.width * 0.85, y: this.height * 0.42, len: 45, rot: 0.4 },
      { x: this.width * 0.2, y: this.height * 0.62, len: 35, rot: 0.2 },
      { x: this.width * 0.8, y: this.height * 0.58, len: 40, rot: -0.25 },
    ];

    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.12 * I;
    ctx.strokeStyle = rgb(p.highlight);
    for (const imp of impacts) {
      ctx.save();
      ctx.translate(imp.x, imp.y);
      ctx.rotate(imp.rot);
      ctx.beginPath();
      ctx.moveTo(-imp.len * 0.5, 0);
      ctx.lineTo(imp.len * 0.5, 0);
      ctx.moveTo(-imp.len * 0.15, -8);
      ctx.lineTo(imp.len * 0.15, 8);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // ─── Layer 6: Ghost typography ────────────────────────────────────────────────

  private drawGhostTypography(
    ctx: CanvasRenderingContext2D,
    p: Palette,
    cx: number,
    cy: number,
    I: number,
  ): void {
    const { width: w, height: h } = this;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const vsSize = Math.min(w, h) * 0.55;
    ctx.font = `900 italic ${vsSize}px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif`;
    ctx.globalAlpha = 0.045 * I;
    ctx.fillStyle = rgb(p.flare);
    ctx.fillText('VS', cx, cy);

    const titleSize = Math.min(w * 0.14, 72);
    ctx.font = `900 italic ${titleSize}px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif`;
    ctx.globalAlpha = 0.025 * I;
    ctx.fillStyle = rgb(p.highlight);

    const rows = 5;
    const cols = 3;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tx = (col + 0.5) * (w / cols);
        const ty = (row + 0.5) * (h / rows);
        const rot = (row % 2 === 0 ? 1 : -1) * 0.04;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(rot);
        ctx.fillText('GUESS OFF!', 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // ─── Layer 7: Boxing poster framing ───────────────────────────────────────────

  private drawFraming(ctx: CanvasRenderingContext2D, p: Palette, I: number): void {
    const { width: w, height: h } = this;
    const inset = Math.min(w, h) * 0.025;

    ctx.save();

    const cornerSize = Math.min(w, h) * 0.12;
    ctx.fillStyle = `rgba(0,0,0,${0.35 + 0.15 * I})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cornerSize, 0);
    ctx.lineTo(0, cornerSize);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w - cornerSize, 0);
    ctx.lineTo(w, cornerSize);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(cornerSize, h);
    ctx.lineTo(0, h - cornerSize);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, h);
    ctx.lineTo(w - cornerSize, h);
    ctx.lineTo(w, h - cornerSize);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = rgb(p.shadow, 0.5);
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.25 * I;
    const ropeY = [h * 0.18, h * 0.82];
    for (const y of ropeY) {
      ctx.beginPath();
      ctx.moveTo(w * 0.05, y);
      ctx.bezierCurveTo(w * 0.35, y + 6, w * 0.65, y - 6, w * 0.95, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.35 * I;
    ctx.strokeStyle = rgb(p.highlight, 0.6);
    ctx.lineWidth = 2;
    ctx.shadowColor = rgb(p.flare, 0.5);
    ctx.shadowBlur = 12 * I;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    ctx.shadowBlur = 0;

    const tickLen = 8;
    const brackets = [
      [inset, inset],
      [w - inset, inset],
      [inset, h - inset],
      [w - inset, h - inset],
    ];
    ctx.globalAlpha = 0.4 * I;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgb(p.flare, 0.7);
    for (const [bx, by] of brackets) {
      const sx = bx < w / 2 ? 1 : -1;
      const sy = by < h / 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(bx, by + sy * tickLen);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + sx * tickLen, by);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ─── Layer 8: Dust, grain, light sweep ────────────────────────────────────────

  private drawForeground(
    ctx: CanvasRenderingContext2D,
    p: Palette,
    elapsed: number,
    I: number,
  ): void {
    const { width: w, height: h } = this;

    ctx.save();
    for (const part of this.particles) {
      ctx.globalAlpha = part.alpha * I;
      ctx.fillStyle = rgb(p.flare);
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (this.noiseCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.35 + 0.2 * I;
      const pat = ctx.createPattern(this.noiseCanvas, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }

    const sweepPos = ((elapsed * ANIM.sweepSpeed) % 1.6) - 0.3;
    const sweepX = sweepPos * w;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sweep = ctx.createLinearGradient(sweepX - w * 0.15, 0, sweepX + w * 0.15, 0);
    sweep.addColorStop(0, rgb(p.flare, 0));
    sweep.addColorStop(0.5, rgb(p.flare, 0.06 * I));
    sweep.addColorStop(1, rgb(p.flare, 0));
    ctx.fillStyle = sweep;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
