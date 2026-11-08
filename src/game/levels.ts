/**
 * Level maps
 * ----------
 * Grid is COLS × BRICK_ROWS (see config.ts). y = 0 is the top of the brick field.
 *
 *   0 empty    1 orange (breaks)     2 steel (never breaks)
 *   3 star     4 E+                   5 widen                6 life
 *
 * A level is just `build(grid)`. Pipeline that reads well on screen:
 *   1. fillOrange — dense orange mass
 *   2. carve      — empty halls, elbows, and chambers the ball can travel
 *   3. steelSkin  — thicken a permanent gray shell around those halls
 *   4. punch      — cut a window through the shell so the ball spills into orange
 *   5. orangeLip  — breakable bricks over the entrance, so the first hit pops
 *   6. studs      — orange nubs inside the hall the ball shaves on the way in
 *   7. sprinkle + placeNearest — power-ups
 *
 * Punch depth must cross the skin: thickness 2 needs a rect that starts in the
 * empty hall and ends at least 3 cells into the orange.
 *
 * Add a level by pushing another entry onto LEVELS.
 */

import {
  BRICK_ROWS,
  COLS,
  EMPTY,
  EPLUS,
  LIFE,
  ORANGE,
  STAR,
  STEEL,
  WIDE,
} from "./config";

export type LevelDef = {
  id: string;
  name: string;
  blurb: string;
  build: (g: Uint8Array) => void;
};

function idx(x: number, y: number): number {
  return y * COLS + x;
}

function inb(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < COLS && y < BRICK_ROWS;
}

export function hash(x: number, y: number, salt: number): number {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(salt, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

function fillOrange(g: Uint8Array, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (inb(x, y)) g[idx(x, y)] = ORANGE;
    }
  }
}

function carve(g: Uint8Array, x: number, y: number, w: number, h: number): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (inb(xx, yy)) g[idx(xx, yy)] = EMPTY;
    }
  }
}

/** Orange cells within `thickness` (Chebyshev) of an empty cell become steel. */
function steelSkin(g: Uint8Array, thickness: number): void {
  const copy = Uint8Array.from(g);
  for (let y = 0; y < BRICK_ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (copy[idx(x, y)] !== ORANGE) continue;
      let near = false;
      for (let dy = -thickness; dy <= thickness && !near; dy++) {
        for (let dx = -thickness; dx <= thickness; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) > thickness) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (inb(xx, yy) && copy[idx(xx, yy)] === EMPTY) {
            near = true;
            break;
          }
        }
      }
      if (near) g[idx(x, y)] = STEEL;
    }
  }
}

function punch(g: Uint8Array, x: number, y: number, w: number, h: number): void {
  carve(g, x, y, w, h);
}

/**
 * A solid orange slab with an empty mouth. Overwrites steel so the entrance
 * is breakable instead of a dead metal gate.
 */
function orangeLip(
  g: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
  mouthX: number,
  mouthW: number,
): void {
  fillOrange(g, x, y, x + w - 1, y + h - 1);
  carve(g, mouthX, y, mouthW, h);
}

/** Nubs sticking into an empty hall so the ball pops bricks on the way through. */
function studs(g: Uint8Array, x: number, y: number, w: number, h: number, salt: number): void {
  if (w < 3) return;
  for (let yy = y; yy < y + h; yy += 3) {
    const left = (yy + salt) % 6 < 3;
    const sx = left ? x : x + w - 1;
    if (!inb(sx, yy)) continue;
    const roll = hash(sx, yy, salt) % 7;
    g[idx(sx, yy)] = roll === 0 ? EPLUS : roll === 1 ? WIDE : ORANGE;
  }
}

function sprinkle(g: Uint8Array, salt: number, every: number): void {
  for (let y = 0; y < BRICK_ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = idx(x, y);
      if (g[i] !== ORANGE) continue;
      const h = hash(x, y, salt);
      if (h % every !== 0) continue;
      const k = hash(x, y, salt + 97) % 20;
      g[i] = k < 9 ? EPLUS : k < 14 ? WIDE : k < 18 ? STAR : LIFE;
    }
  }
}

function placeNearest(g: Uint8Array, x: number, y: number, type: number): void {
  for (let r = 0; r < 14; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r && r !== 0) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (!inb(xx, yy)) continue;
        const i = idx(xx, yy);
        if (g[i] === ORANGE || g[i] === EPLUS || g[i] === WIDE) {
          g[i] = type;
          return;
        }
      }
    }
  }
}

type Gate = { side: "t" | "b" | "l" | "r"; at: number; len: number };

/** Hollow steel rectangle. Interior is left alone. Gate cells are emptied. */
function steelFrame(
  g: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
  thick: number,
  gate: Gate,
): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (!inb(xx, yy)) continue;
      const edge =
        xx < x + thick || xx >= x + w - thick || yy < y + thick || yy >= y + h - thick;
      if (!edge) continue;
      let open = false;
      if (gate.side === "b" && yy >= y + h - thick && xx >= gate.at && xx < gate.at + gate.len) open = true;
      if (gate.side === "t" && yy < y + thick && xx >= gate.at && xx < gate.at + gate.len) open = true;
      if (gate.side === "l" && xx < x + thick && yy >= gate.at && yy < gate.at + gate.len) open = true;
      if (gate.side === "r" && xx >= x + w - thick && yy >= gate.at && yy < gate.at + gate.len) open = true;
      g[idx(xx, yy)] = open ? EMPTY : STEEL;
    }
  }
}

function orangeBend(g: Uint8Array): void {
  fillOrange(g, 0, 2, 39, 54);
  // Vertical drop, elbow to the right, shaft up, chamber at the top.
  carve(g, 18, 40, 5, 16);
  carve(g, 18, 34, 16, 10);
  carve(g, 28, 16, 5, 22);
  carve(g, 8, 8, 25, 12);
  steelSkin(g, 2);
  // Windows into the orange behind the shell.
  punch(g, 16, 4, 6, 6);
  punch(g, 4, 12, 6, 4);
  punch(g, 31, 22, 6, 4);
  punch(g, 22, 32, 4, 5);
  studs(g, 19, 42, 3, 12, 1);
  studs(g, 29, 20, 3, 14, 2);
  orangeLip(g, 8, 49, 24, 7, 19, 3);
  sprinkle(g, 11, 72);
  placeNearest(g, 20, 51, EPLUS);
  placeNearest(g, 14, 12, STAR);
  placeNearest(g, 20, 47, EPLUS);
}

function steelCross(g: Uint8Array): void {
  fillOrange(g, 0, 2, 39, 54);
  carve(g, 16, 8, 8, 48);
  carve(g, 3, 24, 34, 8);
  steelSkin(g, 2);
  // Mouths into each quadrant and out the arm tips.
  punch(g, 17, 4, 6, 6);
  punch(g, 0, 26, 5, 4);
  punch(g, 35, 26, 5, 4);
  punch(g, 10, 20, 4, 4);
  punch(g, 26, 34, 4, 4);
  studs(g, 17, 36, 6, 16, 3);
  orangeLip(g, 6, 50, 28, 6, 17, 6);
  sprinkle(g, 21, 68);
  placeNearest(g, 20, 52, EPLUS);
  placeNearest(g, 8, 10, STAR);
  placeNearest(g, 30, 12, STAR);
}

function twinTunnels(g: Uint8Array): void {
  fillOrange(g, 0, 2, 39, 54);
  carve(g, 5, 12, 5, 44);
  carve(g, 30, 12, 5, 44);
  carve(g, 5, 12, 30, 6);
  steelSkin(g, 2);
  // Spill both chimneys into the orange between them.
  punch(g, 9, 20, 5, 4);
  punch(g, 26, 28, 5, 4);
  punch(g, 9, 36, 5, 4);
  punch(g, 26, 42, 5, 3);
  punch(g, 16, 8, 8, 6);
  studs(g, 6, 20, 3, 24, 4);
  studs(g, 31, 20, 3, 24, 5);
  orangeLip(g, 0, 50, 40, 6, 6, 4);
  // Second mouth on the right lip — carve after the lip so it survives.
  carve(g, 31, 50, 4, 6);
  sprinkle(g, 31, 70);
  placeNearest(g, 8, 52, EPLUS);
  placeNearest(g, 32, 52, EPLUS);
  placeNearest(g, 20, 30, STAR);
}

function spiralLock(g: Uint8Array): void {
  fillOrange(g, 0, 2, 39, 54);
  // Orthogonal spiral, halls overlap so the empty space stays one piece.
  carve(g, 18, 46, 5, 10);
  carve(g, 18, 42, 16, 6);
  carve(g, 29, 16, 5, 30);
  carve(g, 5, 16, 29, 6);
  carve(g, 5, 16, 5, 22);
  carve(g, 5, 34, 18, 5);
  carve(g, 16, 24, 5, 14);
  steelSkin(g, 1);
  punch(g, 12, 26, 4, 4);
  punch(g, 22, 36, 4, 4);
  punch(g, 10, 18, 4, 4);
  punch(g, 32, 24, 5, 4);
  punch(g, 18, 12, 6, 5);
  studs(g, 19, 46, 3, 8, 6);
  studs(g, 30, 22, 3, 16, 7);
  orangeLip(g, 10, 50, 20, 6, 19, 3);
  sprinkle(g, 41, 64);
  placeNearest(g, 20, 52, EPLUS);
  placeNearest(g, 18, 28, STAR);
}

function theCore(g: Uint8Array): void {
  fillOrange(g, 0, 2, 39, 54);
  // Three shells. Gates are staggered so the ball has to turn.
  steelFrame(g, 0, 2, 40, 53, 2, { side: "b", at: 17, len: 6 });
  steelFrame(g, 6, 8, 28, 40, 2, { side: "r", at: 22, len: 6 });
  steelFrame(g, 12, 16, 16, 24, 2, { side: "l", at: 26, len: 5 });
  // A short breakable porch under the outer gate.
  orangeLip(g, 12, 50, 16, 6, 17, 6);
  // Keep the outer gate itself open (lip may have repainted the bottom rows).
  carve(g, 17, 51, 6, 5);
  sprinkle(g, 51, 60);
  placeNearest(g, 20, 48, EPLUS);
  placeNearest(g, 26, 24, EPLUS);
  placeNearest(g, 19, 26, STAR);
  placeNearest(g, 19, 30, STAR);
}

export const LEVELS: LevelDef[] = [
  {
    id: "orange-bend",
    name: "Orange Bend",
    blurb: "A steel bend through the wall. Slip in, then spill out the far side.",
    build: orangeBend,
  },
  {
    id: "steel-cross",
    name: "Steel Cross",
    blurb: "The cross is hollow. Clear each quadrant from the inside.",
    build: steelCross,
  },
  {
    id: "twin-tunnels",
    name: "Twin Tunnels",
    blurb: "Two chimneys and a bridge. The orange between them is the feast.",
    build: twinTunnels,
  },
  {
    id: "spiral-lock",
    name: "Spiral Lock",
    blurb: "Follow the spiral. Pockets of orange sit between the arms.",
    build: spiralLock,
  },
  {
    id: "the-core",
    name: "The Core",
    blurb: "Three steel shells. The gates do not line up. The star is in the middle.",
    build: theCore,
  },
];

export function buildLevel(index: number): Uint8Array {
  const g = new Uint8Array(COLS * BRICK_ROWS);
  const level = LEVELS[index] ?? LEVELS[0];
  level.build(g);
  return g;
}
