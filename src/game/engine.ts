/**
 * Satisfying Brick Breaker — simulation + canvas render.
 *
 * Physics is a fixed 1/120s step so fast balls don't tunnel through 6px cells.
 * Balls never collide with each other (they stack into the white swarm).
 * Presentation (shake, particles, squash) does not affect the sim.
 */

import { Sfx } from "./audio";
import {
  BALL_R,
  BASE_SPEED,
  BEST_KEY,
  BRICK_ROWS,
  BRICK_TOP,
  CELL,
  COLORS,
  COLS,
  EMPTY,
  EPLUS,
  H,
  HUD,
  LIFE,
  MAX_BALLS,
  MAX_SPEED,
  MUTE_KEY,
  ORANGE,
  PADDLE_H,
  PADDLE_W,
  PADDLE_W_WIDE,
  PADDLE_Y,
  SCALE,
  STAR,
  STEEL,
  W,
  WIDE,
  clamp,
  dropFor,
  isBreakable,
  type DropKind,
} from "./config";
import { LEVELS, buildLevel } from "./levels";

export type Phase = "menu" | "ready" | "play" | "paused" | "clear" | "over" | "victory";

export type Hud = {
  phase: Phase;
  score: number;
  best: number;
  lives: number;
  zen: boolean;
  balls: number;
  level: number;
  levelName: string;
  blurb: string;
  combo: number;
  muted: boolean;
  breakable: number;
};

type Ball = { x: number; y: number; vx: number; vy: number; r: number; alive: boolean };
type Drop = { x: number; y: number; vy: number; kind: DropKind; r: number; alive: boolean; spin: number };
type Part = { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number };
type Flo = { x: number; y: number; text: string; life: number };

const STEP = 1 / 120;
const PARTS = 2000;

function readNum(key: string): number {
  try {
    const n = Number(localStorage.getItem(key) || 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export class BreakerGame {
  private ctx: CanvasRenderingContext2D;
  private sfx = new Sfx();
  private raf = 0;
  private dead = false;
  private last = 0;
  private acc = 0;
  private hudAcc = 0;
  private time = 0;

  private phase: Phase = "menu";
  private pausedFrom: Phase = "play";
  private levelIndex = 0;
  private zen = false;
  private muted = false;
  private score = 0;
  private best = 0;
  private lives = 3;
  private combo = 0;
  private comboTimer = 0;
  private breakable = 0;
  private grid: Uint8Array<ArrayBufferLike> = new Uint8Array(COLS * BRICK_ROWS);
  private balls: Ball[] = [];
  private drops: Drop[] = [];
  private parts: Part[] = Array.from({ length: PARTS }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    s: 1,
  }));
  private pCursor = 0;
  private floats: Flo[] = [];

  private paddleX = W / 2;
  private paddleVx = 0;
  private aimX: number | null = null;
  private keySteer = false;
  private tracking = false;
  private keys = new Set<string>();
  private wideT = 0;
  private paddleSquash = 1;
  private trauma = 0;
  private flash = 0;
  private hitstop = 0;
  private clearLeft = 0;
  private wallTick = 0;
  private reduceMotion: boolean;

  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onVis: () => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private onHud: (hud: Hud) => void,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D is not available.");
    this.ctx = ctx;
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    ctx.imageSmoothingEnabled = false;

    this.reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.best = readNum(BEST_KEY);
    this.muted = false;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      /* ignore */
    }
    this.sfx.setMuted(this.muted);

    this.onPointerDown = (e) => {
      if (e.cancelable) e.preventDefault();
      this.canvas.setPointerCapture?.(e.pointerId);
      this.tracking = true;
      this.sfx.unlock();
      this.point(e, "down");
    };
    this.onPointerMove = (e) => {
      if (e.cancelable && this.tracking) e.preventDefault();
      this.point(e, "move");
    };
    this.onPointerUp = (e) => {
      this.tracking = false;
      this.point(e, "up");
    };
    this.onKeyDown = (e) => {
      const code = e.code;
      if (
        code === "Space" ||
        code === "ArrowLeft" ||
        code === "ArrowRight" ||
        code === "ArrowUp" ||
        code === "ArrowDown"
      ) {
        e.preventDefault();
      }
      this.sfx.unlock();
      if (e.repeat && code !== "ArrowLeft" && code !== "ArrowRight" && code !== "KeyA" && code !== "KeyD") {
        return;
      }
      if (code === "KeyM") {
        this.setMuted(!this.muted);
        return;
      }
      if (code === "KeyP" || code === "Escape") {
        this.togglePause();
        return;
      }
      if (code === "Space" || code === "Enter") {
        if (this.phase === "menu") this.start(this.levelIndex, this.zen);
        else if (this.phase === "over" || this.phase === "victory") this.start(this.levelIndex, this.zen);
        else if (this.phase === "ready") this.launch();
        else if (this.phase === "paused") this.togglePause();
        else if (this.phase === "clear") this.advance();
        return;
      }
      this.keys.add(code);
    };
    this.onKeyUp = (e) => {
      this.keys.delete(e.code);
    };
    this.onVis = () => {
      if (document.visibilityState === "visible") this.sfx.resumeIfNeeded();
    };

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("visibilitychange", this.onVis);

    this.load(0);
    this.spawnGlued();
    this.emit();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("visibilitychange", this.onVis);
  }

  /** Poster / level select. Does not reset a run in progress. */
  preview(index: number): void {
    if (this.phase !== "menu" && this.phase !== "over" && this.phase !== "victory") return;
    this.levelIndex = clamp(index, 0, LEVELS.length - 1);
    this.phase = "menu";
    this.load(this.levelIndex);
    this.spawnGlued();
    this.emit();
  }

  setZen(zen: boolean): void {
    this.zen = zen;
    this.emit();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.sfx.setMuted(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    this.emit();
  }

  togglePause(): void {
    if (this.phase === "play" || this.phase === "ready") {
      this.pausedFrom = this.phase;
      this.phase = "paused";
      this.emit();
    } else if (this.phase === "paused") {
      this.phase = this.pausedFrom;
      this.emit();
    }
  }

  backToMenu(): void {
    this.phase = "menu";
    this.wideT = 0;
    this.drops = [];
    this.load(this.levelIndex);
    this.spawnGlued();
    this.combo = 0;
    this.emit();
  }

  /** Fresh run from a level. Score and lives reset. */
  start(index: number, zen = this.zen): void {
    this.sfx.unlock();
    this.zen = zen;
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.comboTimer = 0;
    this.wideT = 0;
    this.levelIndex = clamp(index, 0, LEVELS.length - 1);
    this.load(this.levelIndex);
    this.phase = "ready";
    this.spawnGlued();
    this.emit();
  }

  launch(): void {
    if (this.phase !== "ready" || this.balls.length === 0) return;
    const b = this.balls[0];
    const english = clamp(this.paddleVx / 700, -0.55, 0.55);
    const jitter = (Math.random() * 2 - 1) * 0.07;
    const off = english + jitter;
    const sp = BASE_SPEED;
    b.vx = Math.sin(off) * sp;
    b.vy = -Math.cos(off) * sp;
    b.alive = true;
    this.phase = "play";
    this.sfx.launch();
    this.emit();
  }

  /** QA / debug helpers. */
  debugState(): Hud & { paddleX: number } {
    return { ...this.snapshot(), paddleX: this.paddleX };
  }

  debugGrant(kind: DropKind): void {
    this.applyPower(kind);
  }

  debugFastForward(seconds: number): void {
    const steps = Math.min(120 * 30, Math.floor(seconds * 120));
    for (let i = 0; i < steps; i++) {
      if (this.phase === "ready") this.launch();
      if (this.phase !== "play") break;
      this.simulate(STEP);
      this.updateFx(STEP);
    }
    this.draw();
    this.emit();
  }

  private frame = (now: number): void => {
    if (this.dead) return;
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0);
    this.last = now;

    if (this.hitstop > 0) {
      this.hitstop -= dt;
    } else if (this.phase === "play" || this.phase === "ready" || this.phase === "menu") {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n++ < 8) {
        this.simulate(STEP);
        this.acc -= STEP;
      }
      if (n >= 8) this.acc = 0;
    } else if (this.phase === "clear") {
      this.clearLeft -= dt;
      if (this.clearLeft <= 0) this.advance();
    }

    const freezeFx = this.hitstop > 0 || this.phase === "paused";
    if (!freezeFx && (this.phase === "play" || this.phase === "clear")) this.updateFx(dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.7);

    this.draw();
    this.hudAcc += dt;
    if (this.hudAcc >= 0.12) {
      this.hudAcc = 0;
      this.emit();
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private simulate(dt: number): void {
    this.time += dt;
    if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - dt * 1.65);
    this.paddleSquash = Math.min(1, this.paddleSquash + dt * 5.5);
    if (this.wideT > 0) this.wideT = Math.max(0, this.wideT - dt);
    this.updatePaddle(dt);

    if (this.phase === "menu" || this.phase === "ready") {
      this.stickBall();
      return;
    }
    if (this.phase !== "play") return;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    for (let i = 0; i < this.balls.length; i++) this.stepBall(this.balls[i], dt);
    this.cullBalls();
    this.updateDrops(dt);

    if (this.breakable <= 0) this.onCleared();
    else if (this.balls.length === 0) this.loseLife();
  }

  private updatePaddle(dt: number): void {
    const prev = this.paddleX;
    let dir = 0;
    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) dir -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) dir += 1;
    if (dir !== 0) {
      this.keySteer = true;
      this.paddleX += dir * 440 * dt;
    } else {
      this.keySteer = false;
      if (this.aimX !== null) this.paddleX = this.aimX;
    }
    this.clampPaddle();
    this.paddleVx = (this.paddleX - prev) / Math.max(dt, 1 / 240);
  }

  private clampPaddle(): void {
    const half = this.paddleWidth() / 2;
    this.paddleX = clamp(this.paddleX, half, W - half);
  }

  private paddleWidth(): number {
    return this.wideT > 0 ? PADDLE_W_WIDE : PADDLE_W;
  }

  private stickBall(): void {
    if (this.balls.length === 0) this.spawnGlued();
    const b = this.balls[0];
    b.x = this.paddleX;
    b.y = PADDLE_Y - BALL_R - 1;
    b.vx = 0;
    b.vy = 0;
    b.alive = true;
    this.balls.length = 1;
  }

  private spawnGlued(): void {
    this.balls = [
      { x: this.paddleX, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, r: BALL_R, alive: true },
    ];
    this.drops = [];
  }

  private stepBall(ball: Ball, dt: number): void {
    if (!ball.alive) return;
    const sp = Math.hypot(ball.vx, ball.vy) || 1;
    const steps = Math.max(1, Math.ceil((sp * dt) / 2));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      if (this.hitPaddle(ball)) {
        this.sfx.paddle();
        this.paddleSquash = 0.45;
        this.addTrauma(0.07);
      }
      this.hitBricks(ball);
      this.hitWalls(ball);
      if (!Number.isFinite(ball.x) || !Number.isFinite(ball.vx)) {
        ball.alive = false;
        return;
      }
      if (ball.y > H + 6) {
        ball.alive = false;
        return;
      }
    }
  }

  private hitPaddle(ball: Ball): boolean {
    if (ball.vy <= 0) return false;
    const half = this.paddleWidth() / 2 + ball.r;
    if (Math.abs(ball.x - this.paddleX) > half) return false;
    if (ball.y + ball.r < PADDLE_Y) return false;
    if (ball.y - ball.r > PADDLE_Y + PADDLE_H + 3) return false;
    const rel = clamp((ball.x - this.paddleX) / (this.paddleWidth() / 2), -1, 1);
    let speed = Math.hypot(ball.vx, ball.vy);
    speed = clamp(speed * 1.015, BASE_SPEED, MAX_SPEED);
    const off = rel * 1.12;
    ball.vx = Math.sin(off) * speed;
    ball.vy = -Math.cos(off) * speed;
    ball.y = PADDLE_Y - ball.r - 0.15;
    this.keepAngle(ball);
    return true;
  }

  private hitWalls(ball: Ball): void {
    let hit = false;
    if (ball.x < ball.r) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
      hit = true;
    } else if (ball.x > W - ball.r) {
      ball.x = W - ball.r;
      ball.vx = -Math.abs(ball.vx);
      hit = true;
    }
    if (ball.y < HUD + ball.r) {
      ball.y = HUD + ball.r;
      ball.vy = Math.abs(ball.vy);
      hit = true;
    }
    if (hit) {
      this.wallTick++;
      if (this.wallTick % 3 === 0) this.sfx.wall();
      this.keepAngle(ball);
    }
  }

  private hitBricks(ball: Ball): void {
    for (let iter = 0; iter < 3; iter++) {
      const minC = clamp(Math.floor((ball.x - ball.r) / CELL), 0, COLS - 1);
      const maxC = clamp(Math.floor((ball.x + ball.r) / CELL), 0, COLS - 1);
      const minR = clamp(Math.floor((ball.y - ball.r - BRICK_TOP) / CELL), 0, BRICK_ROWS - 1);
      const maxR = clamp(Math.floor((ball.y + ball.r - BRICK_TOP) / CELL), 0, BRICK_ROWS - 1);
      let bestI = -1;
      let bestPen = 0;
      let nx = 0;
      let ny = 0;
      let t = EMPTY;
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const i = r * COLS + c;
          const cell = this.grid[i];
          if (cell === EMPTY) continue;
          const hit = overlap(ball, c * CELL, BRICK_TOP + r * CELL, CELL, CELL);
          if (hit && hit.pen > bestPen) {
            bestPen = hit.pen;
            bestI = i;
            nx = hit.nx;
            ny = hit.ny;
            t = cell;
          }
        }
      }
      if (bestI < 0) return;
      resolve(ball, nx, ny, bestPen);
      if (t === STEEL) {
        this.sfx.steel();
        this.spark(ball.x, ball.y, nx, ny);
        this.addTrauma(0.018);
      } else {
        this.breakCell(bestI, t, ball);
      }
      this.keepAngle(ball);
    }
  }

  private breakCell(i: number, t: number, ball: Ball): void {
    this.grid[i] = EMPTY;
    if (isBreakable(t)) this.breakable = Math.max(0, this.breakable - 1);
    this.combo++;
    this.comboTimer = 0.85;
    const mult = 1 + Math.floor(this.combo / 6);
    this.score += 10 * mult;
    const bx = i % COLS;
    const by = (i / COLS) | 0;
    this.burst((bx + 0.5) * CELL, BRICK_TOP + (by + 0.5) * CELL);
    this.sfx.brick(this.combo);
    this.addTrauma(0.028);
    const kind = dropFor(t);
    if (kind) this.spawnDrop((bx + 0.5) * CELL, BRICK_TOP + (by + 0.5) * CELL, kind);
    if (this.combo >= 10 && this.combo % 10 === 0) {
      this.flo(W / 2, BRICK_TOP + 36, `x${this.combo}`);
    }
    const sp = Math.hypot(ball.vx, ball.vy);
    const nsp = Math.min(MAX_SPEED, sp * 1.01);
    if (sp > 1) {
      ball.vx *= nsp / sp;
      ball.vy *= nsp / sp;
    }
  }

  /** Keep a little diagonal so balls zigzag through channels instead of orbiting one axis. */
  private keepAngle(ball: Ball): void {
    let sp = Math.hypot(ball.vx, ball.vy);
    if (sp < 40) {
      ball.vx = 60;
      ball.vy = -BASE_SPEED;
      sp = Math.hypot(ball.vx, ball.vy);
    }
    if (sp > MAX_SPEED) {
      ball.vx *= MAX_SPEED / sp;
      ball.vy *= MAX_SPEED / sp;
      sp = MAX_SPEED;
    } else if (sp < BASE_SPEED * 0.82) {
      const k = (BASE_SPEED * 0.82) / sp;
      ball.vx *= k;
      ball.vy *= k;
      sp *= k;
    }
    const minC = sp * 0.2;
    if (Math.abs(ball.vx) < minC) ball.vx = ball.vx < 0 ? -minC : minC;
    if (Math.abs(ball.vy) < minC) ball.vy = ball.vy < 0 ? -minC : minC;
    const sp2 = Math.hypot(ball.vx, ball.vy) || 1;
    ball.vx *= sp / sp2;
    ball.vy *= sp / sp2;
  }

  private cullBalls(): void {
    let w = 0;
    for (let i = 0; i < this.balls.length; i++) {
      if (this.balls[i].alive) this.balls[w++] = this.balls[i];
    }
    this.balls.length = w;
  }

  private updateDrops(dt: number): void {
    const half = this.paddleWidth() / 2;
    for (const d of this.drops) {
      if (!d.alive) continue;
      d.y += d.vy * dt;
      d.vy = Math.min(150, d.vy + 24 * dt);
      d.spin += dt * 2.4;
      if (d.y + d.r >= PADDLE_Y && d.y - d.r <= PADDLE_Y + PADDLE_H + 2) {
        if (Math.abs(d.x - this.paddleX) <= half + d.r) {
          d.alive = false;
          this.applyPower(d.kind);
          continue;
        }
      }
      if (d.y > H + 16) d.alive = false;
    }
    if (this.drops.some((d) => !d.alive)) this.drops = this.drops.filter((d) => d.alive);
  }

  private spawnDrop(x: number, y: number, kind: DropKind): void {
    if (this.drops.length >= 14) this.drops.shift();
    this.drops.push({ x, y, vy: 62, kind, r: 7, alive: true, spin: Math.random() * 3 });
  }

  private applyPower(kind: DropKind): void {
    if (kind === "star") {
      this.splitBalls();
      this.score += 250;
      if (!this.reduceMotion) this.flash = 0.2;
      this.addTrauma(0.75);
      this.hitstop = this.reduceMotion ? 0 : 0.045;
      this.sfx.star();
      this.flo(this.paddleX, PADDLE_Y - 18, "MULTI");
    } else if (kind === "eplus") {
      this.extraBalls(6);
      this.score += 80;
      this.sfx.power();
      this.addTrauma(0.22);
      this.flo(this.paddleX, PADDLE_Y - 18, "E+");
    } else if (kind === "wide") {
      this.wideT = 16;
      this.clampPaddle();
      this.score += 40;
      this.sfx.power();
      this.flo(this.paddleX, PADDLE_Y - 18, "WIDE");
    } else {
      this.lives = Math.min(6, this.lives + 1);
      this.score += 100;
      this.sfx.life();
      this.flo(this.paddleX, PADDLE_Y - 18, "+1");
    }
    this.persistBest();
  }

  private splitBalls(): void {
    const current = this.balls.filter((b) => b.alive);
    for (const b of current) {
      if (this.balls.length >= MAX_BALLS) break;
      this.cloneAngled(b, 0.42);
      if (this.balls.length >= MAX_BALLS) break;
      this.cloneAngled(b, -0.42);
    }
  }

  private cloneAngled(b: Ball, delta: number): void {
    const ang = Math.atan2(b.vy, b.vx) + delta;
    const sp = Math.min(MAX_SPEED, Math.hypot(b.vx, b.vy) * (0.92 + Math.random() * 0.1));
    this.balls.push({
      x: b.x + Math.cos(ang) * 1.5,
      y: b.y + Math.sin(ang) * 1.5,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      r: BALL_R,
      alive: true,
    });
  }

  private extraBalls(n: number): void {
    const count = Math.min(n, MAX_BALLS - this.balls.length);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      const off = t * 1.05;
      const sp = BASE_SPEED * (0.92 + Math.random() * 0.16);
      this.balls.push({
        x: clamp(this.paddleX + t * 10, BALL_R, W - BALL_R),
        y: PADDLE_Y - 12,
        vx: Math.sin(off) * sp,
        vy: -Math.cos(off) * sp,
        r: BALL_R,
        alive: true,
      });
    }
  }

  private loseLife(): void {
    this.sfx.miss();
    this.addTrauma(0.45);
    if (!this.zen) this.lives -= 1;
    if (!this.zen && this.lives <= 0) {
      this.phase = "over";
      this.persistBest();
      this.emit();
      return;
    }
    this.phase = "ready";
    this.spawnGlued();
    this.emit();
  }

  private onCleared(): void {
    if (this.phase !== "play") return;
    this.score += 1000 + this.lives * 250;
    this.persistBest();
    this.phase = "clear";
    this.clearLeft = 1.35;
    this.sfx.win();
    this.addTrauma(0.5);
    for (let i = 0; i < 48; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 180;
      this.spawnPart(this.paddleX, PADDLE_Y - 8, Math.cos(a) * sp, Math.sin(a) * sp - 40, 0.6, 2);
    }
    this.flo(W / 2, H * 0.42, "CLEARED");
    this.emit();
  }

  private advance(): void {
    if (this.levelIndex >= LEVELS.length - 1) {
      this.phase = "victory";
      this.persistBest();
      this.emit();
      return;
    }
    this.levelIndex++;
    this.combo = 0;
    this.wideT = 0;
    this.load(this.levelIndex);
    this.phase = "ready";
    this.spawnGlued();
    this.emit();
  }

  private load(index: number): void {
    this.grid = buildLevel(index);
    let n = 0;
    for (let i = 0; i < this.grid.length; i++) if (isBreakable(this.grid[i])) n++;
    if (n <= 0) {
      this.grid[idxSafe(2, 4)] = ORANGE;
      n = 1;
    }
    this.breakable = n;
    this.drops = [];
    for (const p of this.parts) p.life = 0;
    this.floats = [];
    this.flash = 0;
    this.hitstop = 0;
  }

  private burst(x: number, y: number): void {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 35 + Math.random() * 150;
      this.spawnPart(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 20, 0.32 + Math.random() * 0.4, Math.random() < 0.22 ? 2 : 1);
    }
  }

  private spark(x: number, y: number, nx: number, ny: number): void {
    for (let i = 0; i < 3; i++) {
      const sp = 40 + Math.random() * 70;
      this.spawnPart(
        x,
        y,
        nx * sp + (Math.random() - 0.5) * 40,
        ny * sp + (Math.random() - 0.5) * 40,
        0.18,
        1,
      );
    }
  }

  private spawnPart(x: number, y: number, vx: number, vy: number, life: number, s: number): void {
    const p = this.parts[this.pCursor % PARTS];
    this.pCursor++;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.max = life;
    p.s = s;
  }

  private flo(x: number, y: number, text: string): void {
    if (this.floats.length > 10) this.floats.shift();
    this.floats.push({ x, y, text, life: 0.75 });
  }

  private updateFx(dt: number): void {
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy += 460 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const f of this.floats) {
      if (f.life <= 0) continue;
      f.life -= dt;
      f.y -= 18 * dt;
    }
  }

  private addTrauma(amount: number): void {
    if (this.reduceMotion) return;
    this.trauma = Math.min(0.9, this.trauma + amount);
  }

  private persistBest(): void {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        /* ignore */
      }
    }
  }

  private snapshot(): Hud {
    const level = LEVELS[this.levelIndex] ?? LEVELS[0];
    return {
      phase: this.phase,
      score: this.score,
      best: this.best,
      lives: this.lives,
      zen: this.zen,
      balls: this.phase === "menu" ? 0 : this.balls.length,
      level: this.levelIndex,
      levelName: level.name,
      blurb: level.blurb,
      combo: this.combo,
      muted: this.muted,
      breakable: this.breakable,
    };
  }

  private emit(): void {
    this.onHud(this.snapshot());
  }

  private point(e: PointerEvent, kind: "down" | "move" | "up"): void {
    if (this.phase === "paused" || this.phase === "over" || this.phase === "victory" || this.phase === "clear") {
      return;
    }
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / Math.max(1, r.width)) * W;
    const mouse = e.pointerType === "mouse";
    if (mouse || kind !== "move" || this.tracking) {
      this.aimX = x;
      this.keySteer = false;
    }
    if (kind === "up" && this.phase === "ready") this.launch();
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    const mag = this.reduceMotion ? 0 : this.trauma * this.trauma * 5.5;
    const sx = Math.round(Math.sin(this.time * 53) * mag);
    const sy = Math.round(Math.cos(this.time * 41) * mag);
    ctx.save();
    ctx.translate(sx, sy);
    this.drawBricks(ctx);
    this.drawDrops(ctx);
    this.drawParts(ctx);
    this.drawPaddle(ctx);
    this.drawBalls(ctx);
    this.drawFloats(ctx);
    if (this.phase === "ready") this.drawAim(ctx);
    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash})`;
      ctx.fillRect(0, BRICK_TOP, W, H - BRICK_TOP);
    }
  }

  private drawBricks(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.steel;
    ctx.beginPath();
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] !== STEEL) continue;
      const x = (i % COLS) * CELL;
      const y = BRICK_TOP + ((i / COLS) | 0) * CELL;
      ctx.rect(x, y, CELL, CELL);
    }
    ctx.fill();

    ctx.fillStyle = COLORS.steelHi;
    ctx.beginPath();
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] !== STEEL) continue;
      ctx.rect((i % COLS) * CELL, BRICK_TOP + ((i / COLS) | 0) * CELL, CELL, 1);
    }
    ctx.fill();

    ctx.fillStyle = COLORS.steelLo;
    ctx.beginPath();
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] !== STEEL) continue;
      ctx.rect((i % COLS) * CELL, BRICK_TOP + ((i / COLS) | 0) * CELL + CELL - 1, CELL, 1);
    }
    ctx.fill();

    for (let shade = 0; shade < COLORS.orange.length; shade++) {
      ctx.fillStyle = COLORS.orange[shade];
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < this.grid.length; i++) {
        const t = this.grid[i];
        if (t === EMPTY || t === STEEL) continue;
        const c = i % COLS;
        const r = (i / COLS) | 0;
        if (((c * 3 + r * 5) % COLORS.orange.length) !== shade) continue;
        ctx.rect(c * CELL, BRICK_TOP + r * CELL, CELL - 1, CELL - 1);
        any = true;
      }
      if (any) ctx.fill();
    }

    for (let i = 0; i < this.grid.length; i++) {
      const t = this.grid[i];
      if (t !== STAR && t !== WIDE && t !== LIFE && t !== EPLUS) continue;
      const x = (i % COLS) * CELL;
      const y = BRICK_TOP + ((i / COLS) | 0) * CELL;
      if (t === STAR) ctx.fillStyle = COLORS.star;
      else if (t === EPLUS) ctx.fillStyle = COLORS.cyan;
      else if (t === LIFE) ctx.fillStyle = COLORS.paddle;
      else if (t === WIDE) ctx.fillStyle = COLORS.text;
      else continue;
      ctx.fillRect(x + 2, y + 2, 2, 2);
    }
  }

  private drawDrops(ctx: CanvasRenderingContext2D): void {
    for (const d of this.drops) {
      if (!d.alive) continue;
      const bob = Math.sin(this.time * 6 + d.x) * 1.2;
      const y = d.y + bob;
      if (d.kind === "star") {
        ctx.fillStyle = COLORS.star;
        drawStar(ctx, d.x, y, 7, d.spin);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (d.kind === "eplus") {
        ctx.fillStyle = COLORS.cyan;
        ctx.beginPath();
        ctx.arc(d.x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = COLORS.ink;
        ctx.font = "700 7px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("E+", d.x, y + 0.5);
      } else if (d.kind === "wide") {
        ctx.fillStyle = COLORS.paddle;
        ctx.fillRect(d.x - 9, y - 3, 18, 6);
        ctx.fillStyle = COLORS.paddleHi;
        ctx.fillRect(d.x - 9, y - 3, 18, 1);
      } else {
        ctx.fillStyle = COLORS.life;
        ctx.beginPath();
        ctx.arc(d.x, y, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillRect(d.x - 1, y - 4, 2, 8);
        ctx.fillRect(d.x - 4, y - 1, 8, 2);
      }
    }
  }

  private drawParts(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    let any = false;
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      ctx.rect(p.x | 0, p.y | 0, p.s, p.s);
      any = true;
    }
    if (!any) return;
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawPaddle(ctx: CanvasRenderingContext2D): void {
    const w = this.paddleWidth() * (1 + (1 - this.paddleSquash) * 0.35);
    const h = PADDLE_H * this.paddleSquash;
    const x = this.paddleX - w / 2;
    const y = PADDLE_Y + (PADDLE_H - h);
    ctx.fillStyle = COLORS.paddle;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.paddleHi;
    ctx.fillRect(x, y, w, 1);
  }

  private drawBalls(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    for (const b of this.balls) {
      if (!b.alive) continue;
      ctx.moveTo(b.x + b.r, b.y);
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  private drawAim(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.text;
    const x = this.paddleX;
    for (let i = 0; i < 4; i++) ctx.fillRect(x, PADDLE_Y - 16 - i * 6, 1, 2);
  }

  private drawFloats(ctx: CanvasRenderingContext2D): void {
    ctx.font = "700 8px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.text;
    for (const f of this.floats) {
      if (f.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 2));
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}

function idxSafe(x: number, y: number): number {
  return y * COLS + x;
}

function overlap(
  ball: Ball,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): { nx: number; ny: number; pen: number } | null {
  const rr = rx + rw;
  const rb = ry + rh;
  if (ball.x > rx && ball.x < rr && ball.y > ry && ball.y < rb) {
    const left = ball.x - rx;
    const right = rr - ball.x;
    const top = ball.y - ry;
    const bot = rb - ball.y;
    const m = Math.min(left, right, top, bot);
    if (m === left) return { nx: -1, ny: 0, pen: left + ball.r };
    if (m === right) return { nx: 1, ny: 0, pen: right + ball.r };
    if (m === top) return { nx: 0, ny: -1, pen: top + ball.r };
    return { nx: 0, ny: 1, pen: bot + ball.r };
  }
  const cx = clamp(ball.x, rx, rr);
  const cy = clamp(ball.y, ry, rb);
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 > ball.r * ball.r || d2 === 0) return null;
  const d = Math.sqrt(d2);
  return { nx: dx / d, ny: dy / d, pen: ball.r - d };
}

function resolve(ball: Ball, nx: number, ny: number, pen: number): void {
  const dot = ball.vx * nx + ball.vy * ny;
  if (dot < 0) {
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;
  }
  ball.x += nx * (pen + 0.02);
  ball.y += ny * (pen + 0.02);
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
