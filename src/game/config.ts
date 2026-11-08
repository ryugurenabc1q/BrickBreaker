/**
 * Tweak the feel here. The playfield is a fixed pixel grid; CSS scales it up.
 *
 * COLS × CELL is the width. Brick rows sit under a HUD band, with air under
 * them so the paddle has room to catch.
 */

export const COLS = 40;
export const BRICK_ROWS = 56;
export const CELL = 6;
export const HUD = 28;
export const W = COLS * CELL; // 240
export const H = 426;
export const BRICK_TOP = HUD;

export const PADDLE_H = 6;
export const PADDLE_Y = H - 24;
export const PADDLE_W = 48;
export const PADDLE_W_WIDE = 82;

export const BALL_R = 2.2;
export const BASE_SPEED = 228;
export const MAX_SPEED = 490;
export const MAX_BALLS = 220;

export const SCALE = 2;

export const BEST_KEY = "satisfying-breaker-best";
export const MUTE_KEY = "satisfying-breaker-mute";

/** Cell ids stored in the level grid. */
export const EMPTY = 0;
export const ORANGE = 1;
export const STEEL = 2;
export const STAR = 3;
export const EPLUS = 4;
export const WIDE = 5;
export const LIFE = 6;

export const COLORS = {
  bg: "#000000",
  orange: ["#FF6B00", "#FF7800", "#FF8C00", "#FF5E00", "#FF8410"],
  steel: "#8A9099",
  steelHi: "#D5DAE0",
  steelLo: "#5C646E",
  paddle: "#FF6A45",
  paddleHi: "#FFB199",
  ball: "#FFFFFF",
  star: "#FFE14A",
  cyan: "#3EE0FF",
  ink: "#042028",
  text: "#ECE8DF",
  life: "#FF6A45",
} as const;

export function isBreakable(t: number): boolean {
  return t === ORANGE || t === STAR || t === EPLUS || t === WIDE || t === LIFE;
}

export type DropKind = "star" | "eplus" | "wide" | "life";

export function dropFor(t: number): DropKind | null {
  if (t === STAR) return "star";
  if (t === EPLUS) return "eplus";
  if (t === WIDE) return "wide";
  if (t === LIFE) return "life";
  return null;
}

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
