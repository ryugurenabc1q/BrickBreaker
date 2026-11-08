import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Pause, i as Play, n as Volume2, o as Heart, t as VolumeX } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-AWuRhRYn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var BALL_R = 2.2;
var BEST_KEY = "satisfying-breaker-best";
var MUTE_KEY = "satisfying-breaker-mute";
var COLORS = {
	bg: "#000000",
	orange: [
		"#FF6B00",
		"#FF7800",
		"#FF8C00",
		"#FF5E00",
		"#FF8410"
	],
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
	life: "#FF6A45"
};
function isBreakable(t) {
	return t === 1 || t === 3 || t === 4 || t === 5 || t === 6;
}
function dropFor(t) {
	if (t === 3) return "star";
	if (t === 4) return "eplus";
	if (t === 5) return "wide";
	if (t === 6) return "life";
	return null;
}
function clamp(v, a, b) {
	return v < a ? a : v > b ? b : v;
}
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
function idx(x, y) {
	return y * 40 + x;
}
function inb(x, y) {
	return x >= 0 && y >= 0 && x < 40 && y < 56;
}
function hash(x, y, salt) {
	let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(salt, 1442695041);
	n = Math.imul(n ^ n >>> 13, 1274126177);
	return (n ^ n >>> 16) >>> 0;
}
function fillOrange(g, x0, y0, x1, y1) {
	for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) g[idx(x, y)] = 1;
}
function carve(g, x, y, w, h) {
	for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (inb(xx, yy)) g[idx(xx, yy)] = 0;
}
/** Orange cells within `thickness` (Chebyshev) of an empty cell become steel. */
function steelSkin(g, thickness) {
	const copy = Uint8Array.from(g);
	for (let y = 0; y < 56; y++) for (let x = 0; x < 40; x++) {
		if (copy[idx(x, y)] !== 1) continue;
		let near = false;
		for (let dy = -thickness; dy <= thickness && !near; dy++) for (let dx = -thickness; dx <= thickness; dx++) {
			if (Math.max(Math.abs(dx), Math.abs(dy)) > thickness) continue;
			const xx = x + dx;
			const yy = y + dy;
			if (inb(xx, yy) && copy[idx(xx, yy)] === 0) {
				near = true;
				break;
			}
		}
		if (near) g[idx(x, y)] = 2;
	}
}
function punch(g, x, y, w, h) {
	carve(g, x, y, w, h);
}
/**
* A solid orange slab with an empty mouth. Overwrites steel so the entrance
* is breakable instead of a dead metal gate.
*/
function orangeLip(g, x, y, w, h, mouthX, mouthW) {
	fillOrange(g, x, y, x + w - 1, y + h - 1);
	carve(g, mouthX, y, mouthW, h);
}
/** Nubs sticking into an empty hall so the ball pops bricks on the way through. */
function studs(g, x, y, w, h, salt) {
	if (w < 3) return;
	for (let yy = y; yy < y + h; yy += 3) {
		const sx = (yy + salt) % 6 < 3 ? x : x + w - 1;
		if (!inb(sx, yy)) continue;
		const roll = hash(sx, yy, salt) % 7;
		g[idx(sx, yy)] = roll === 0 ? 4 : roll === 1 ? 5 : 1;
	}
}
function sprinkle(g, salt, every) {
	for (let y = 0; y < 56; y++) for (let x = 0; x < 40; x++) {
		const i = idx(x, y);
		if (g[i] !== 1) continue;
		if (hash(x, y, salt) % every !== 0) continue;
		const k = hash(x, y, salt + 97) % 20;
		g[i] = k < 9 ? 4 : k < 14 ? 5 : k < 18 ? 3 : 6;
	}
}
function placeNearest(g, x, y, type) {
	for (let r = 0; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
		if (Math.max(Math.abs(dx), Math.abs(dy)) !== r && r !== 0) continue;
		const xx = x + dx;
		const yy = y + dy;
		if (!inb(xx, yy)) continue;
		const i = idx(xx, yy);
		if (g[i] === 1 || g[i] === 4 || g[i] === 5) {
			g[i] = type;
			return;
		}
	}
}
/** Hollow steel rectangle. Interior is left alone. Gate cells are emptied. */
function steelFrame(g, x, y, w, h, thick, gate) {
	for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
		if (!inb(xx, yy)) continue;
		if (!(xx < x + thick || xx >= x + w - thick || yy < y + thick || yy >= y + h - thick)) continue;
		let open = false;
		if (gate.side === "b" && yy >= y + h - thick && xx >= gate.at && xx < gate.at + gate.len) open = true;
		if (gate.side === "t" && yy < y + thick && xx >= gate.at && xx < gate.at + gate.len) open = true;
		if (gate.side === "l" && xx < x + thick && yy >= gate.at && yy < gate.at + gate.len) open = true;
		if (gate.side === "r" && xx >= x + w - thick && yy >= gate.at && yy < gate.at + gate.len) open = true;
		g[idx(xx, yy)] = open ? 0 : 2;
	}
}
function orangeBend(g) {
	fillOrange(g, 0, 2, 39, 54);
	carve(g, 18, 40, 5, 16);
	carve(g, 18, 34, 16, 10);
	carve(g, 28, 16, 5, 22);
	carve(g, 8, 8, 25, 12);
	steelSkin(g, 2);
	punch(g, 16, 4, 6, 6);
	punch(g, 4, 12, 6, 4);
	punch(g, 31, 22, 6, 4);
	punch(g, 22, 32, 4, 5);
	studs(g, 19, 42, 3, 12, 1);
	studs(g, 29, 20, 3, 14, 2);
	orangeLip(g, 8, 49, 24, 7, 19, 3);
	sprinkle(g, 11, 72);
	placeNearest(g, 20, 51, 4);
	placeNearest(g, 14, 12, 3);
	placeNearest(g, 20, 47, 4);
}
function steelCross(g) {
	fillOrange(g, 0, 2, 39, 54);
	carve(g, 16, 8, 8, 48);
	carve(g, 3, 24, 34, 8);
	steelSkin(g, 2);
	punch(g, 17, 4, 6, 6);
	punch(g, 0, 26, 5, 4);
	punch(g, 35, 26, 5, 4);
	punch(g, 10, 20, 4, 4);
	punch(g, 26, 34, 4, 4);
	studs(g, 17, 36, 6, 16, 3);
	orangeLip(g, 6, 50, 28, 6, 17, 6);
	sprinkle(g, 21, 68);
	placeNearest(g, 20, 52, 4);
	placeNearest(g, 8, 10, 3);
	placeNearest(g, 30, 12, 3);
}
function twinTunnels(g) {
	fillOrange(g, 0, 2, 39, 54);
	carve(g, 5, 12, 5, 44);
	carve(g, 30, 12, 5, 44);
	carve(g, 5, 12, 30, 6);
	steelSkin(g, 2);
	punch(g, 9, 20, 5, 4);
	punch(g, 26, 28, 5, 4);
	punch(g, 9, 36, 5, 4);
	punch(g, 26, 42, 5, 3);
	punch(g, 16, 8, 8, 6);
	studs(g, 6, 20, 3, 24, 4);
	studs(g, 31, 20, 3, 24, 5);
	orangeLip(g, 0, 50, 40, 6, 6, 4);
	carve(g, 31, 50, 4, 6);
	sprinkle(g, 31, 70);
	placeNearest(g, 8, 52, 4);
	placeNearest(g, 32, 52, 4);
	placeNearest(g, 20, 30, 3);
}
function spiralLock(g) {
	fillOrange(g, 0, 2, 39, 54);
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
	placeNearest(g, 20, 52, 4);
	placeNearest(g, 18, 28, 3);
}
function theCore(g) {
	fillOrange(g, 0, 2, 39, 54);
	steelFrame(g, 0, 2, 40, 53, 2, {
		side: "b",
		at: 17,
		len: 6
	});
	steelFrame(g, 6, 8, 28, 40, 2, {
		side: "r",
		at: 22,
		len: 6
	});
	steelFrame(g, 12, 16, 16, 24, 2, {
		side: "l",
		at: 26,
		len: 5
	});
	orangeLip(g, 12, 50, 16, 6, 17, 6);
	carve(g, 17, 51, 6, 5);
	sprinkle(g, 51, 60);
	placeNearest(g, 20, 48, 4);
	placeNearest(g, 26, 24, 4);
	placeNearest(g, 19, 26, 3);
	placeNearest(g, 19, 30, 3);
}
var LEVELS = [
	{
		id: "orange-bend",
		name: "Orange Bend",
		blurb: "A steel bend through the wall. Slip in, then spill out the far side.",
		build: orangeBend
	},
	{
		id: "steel-cross",
		name: "Steel Cross",
		blurb: "The cross is hollow. Clear each quadrant from the inside.",
		build: steelCross
	},
	{
		id: "twin-tunnels",
		name: "Twin Tunnels",
		blurb: "Two chimneys and a bridge. The orange between them is the feast.",
		build: twinTunnels
	},
	{
		id: "spiral-lock",
		name: "Spiral Lock",
		blurb: "Follow the spiral. Pockets of orange sit between the arms.",
		build: spiralLock
	},
	{
		id: "the-core",
		name: "The Core",
		blurb: "Three steel shells. The gates do not line up. The star is in the middle.",
		build: theCore
	}
];
function buildLevel(index) {
	const g = /* @__PURE__ */ new Uint8Array(2240);
	(LEVELS[index] ?? LEVELS[0]).build(g);
	return g;
}
/**
* Tiny Web Audio synth. No samples — ticks, thumps, and chimes.
* Call unlock() synchronously inside the first pointer / key handler.
*/
var Sfx = class {
	ctx = null;
	master = null;
	noiseBuf = null;
	voices = 0;
	muted = false;
	brickStamp = 0;
	brickCount = 0;
	steelStamp = 0;
	unlock() {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return;
		if (!this.ctx) {
			this.ctx = new AC({ latencyHint: "interactive" });
			this.master = this.ctx.createGain();
			this.master.gain.value = .32;
			this.master.connect(this.ctx.destination);
			const len = Math.floor(this.ctx.sampleRate * .08);
			const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
			const data = buf.getChannelData(0);
			for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
			this.noiseBuf = buf;
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
	}
	resumeIfNeeded() {
		if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
	}
	setMuted(muted) {
		this.muted = muted;
		if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : .32, this.ctx.currentTime, .02);
	}
	tone(freq, dur, type, gain, freq2) {
		if (!this.ctx || !this.master || this.muted || this.voices > 22) return;
		const t = this.ctx.currentTime;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(40, freq), t);
		if (freq2 && freq2 > 0) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq2), t + dur);
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		o.connect(g);
		g.connect(this.master);
		this.voices++;
		o.onended = () => {
			this.voices = Math.max(0, this.voices - 1);
			o.disconnect();
			g.disconnect();
		};
		o.start(t);
		o.stop(t + dur + .02);
	}
	noise(dur, gain, rate = 1) {
		if (!this.ctx || !this.master || !this.noiseBuf || this.muted || this.voices > 22) return;
		const t = this.ctx.currentTime;
		const src = this.ctx.createBufferSource();
		src.buffer = this.noiseBuf;
		src.playbackRate.value = rate;
		const filter = this.ctx.createBiquadFilter();
		filter.type = "highpass";
		filter.frequency.value = 900;
		const g = this.ctx.createGain();
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		src.connect(filter);
		filter.connect(g);
		g.connect(this.master);
		this.voices++;
		src.onended = () => {
			this.voices = Math.max(0, this.voices - 1);
			src.disconnect();
			filter.disconnect();
			g.disconnect();
		};
		src.start(t);
		src.stop(t + dur + .02);
	}
	/** Rising tick. Many bricks in one frame collapse into a single crunch. */
	brick(combo) {
		const now = this.ctx?.currentTime ?? 0;
		if (now - this.brickStamp > .035) {
			this.brickStamp = now;
			this.brickCount = 0;
		}
		this.brickCount++;
		if (this.brickCount > 3) return;
		const f = Math.min(1760, 480 + combo * 26 + Math.random() * 90);
		this.tone(f, .04, "square", .055, f * .55);
		if (this.brickCount === 1) this.noise(.025, .035, 1.4 + Math.random() * .4);
	}
	steel() {
		const now = this.ctx?.currentTime ?? 0;
		if (now - this.steelStamp < .04) return;
		this.steelStamp = now;
		this.tone(150 + Math.random() * 30, .045, "square", .04, 90);
	}
	paddle() {
		this.tone(210 + Math.random() * 40, .06, "triangle", .08, 140);
	}
	wall() {
		this.tone(320 + Math.random() * 40, .03, "square", .03);
	}
	launch() {
		this.tone(180, .09, "square", .06, 640);
	}
	power() {
		this.tone(880, .08, "square", .06);
		this.tone(1174, .1, "square", .05);
		this.tone(1568, .12, "triangle", .05);
	}
	star() {
		this.tone(523, .09, "square", .07);
		this.tone(659, .1, "square", .06);
		this.tone(784, .11, "square", .06);
		this.tone(1046, .16, "triangle", .07);
		this.noise(.08, .05, .6);
	}
	life() {
		this.tone(523, .08, "triangle", .07);
		this.tone(659, .1, "triangle", .06);
		this.tone(784, .14, "triangle", .06);
	}
	miss() {
		this.tone(240, .12, "square", .05, 90);
	}
	win() {
		this.tone(523, .1, "square", .06);
		this.tone(659, .1, "square", .06);
		this.tone(784, .1, "square", .06);
		this.tone(1046, .18, "triangle", .07);
	}
};
/**
* Satisfying Brick Breaker — simulation + canvas render.
*
* Physics is a fixed 1/120s step so fast balls don't tunnel through 6px cells.
* Balls never collide with each other (they stack into the white swarm).
* Presentation (shake, particles, squash) does not affect the sim.
*/
var STEP = 1 / 120;
var PARTS = 2e3;
function readNum(key) {
	try {
		const n = Number(localStorage.getItem(key) || 0);
		return Number.isFinite(n) ? n : 0;
	} catch {
		return 0;
	}
}
var BreakerGame = class {
	canvas;
	onHud;
	ctx;
	sfx = new Sfx();
	raf = 0;
	dead = false;
	last = 0;
	acc = 0;
	hudAcc = 0;
	time = 0;
	phase = "menu";
	pausedFrom = "play";
	levelIndex = 0;
	zen = false;
	muted = false;
	score = 0;
	best = 0;
	lives = 3;
	combo = 0;
	comboTimer = 0;
	breakable = 0;
	grid = /* @__PURE__ */ new Uint8Array(2240);
	balls = [];
	drops = [];
	parts = Array.from({ length: PARTS }, () => ({
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		life: 0,
		max: 1,
		s: 1
	}));
	pCursor = 0;
	floats = [];
	paddleX = 120;
	paddleVx = 0;
	aimX = null;
	keySteer = false;
	tracking = false;
	keys = /* @__PURE__ */ new Set();
	wideT = 0;
	paddleSquash = 1;
	trauma = 0;
	flash = 0;
	hitstop = 0;
	clearLeft = 0;
	wallTick = 0;
	reduceMotion;
	onPointerDown;
	onPointerMove;
	onPointerUp;
	onKeyDown;
	onKeyUp;
	onVis;
	constructor(canvas, onHud) {
		this.canvas = canvas;
		this.onHud = onHud;
		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx) throw new Error("Canvas 2D is not available.");
		this.ctx = ctx;
		canvas.width = 480;
		canvas.height = 852;
		ctx.imageSmoothingEnabled = false;
		this.reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
		this.best = readNum(BEST_KEY);
		this.muted = false;
		try {
			this.muted = localStorage.getItem(MUTE_KEY) === "1";
		} catch {}
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
			if (code === "Space" || code === "ArrowLeft" || code === "ArrowRight" || code === "ArrowUp" || code === "ArrowDown") e.preventDefault();
			this.sfx.unlock();
			if (e.repeat && code !== "ArrowLeft" && code !== "ArrowRight" && code !== "KeyA" && code !== "KeyD") return;
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
	destroy() {
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
	preview(index) {
		if (this.phase !== "menu" && this.phase !== "over" && this.phase !== "victory") return;
		this.levelIndex = clamp(index, 0, LEVELS.length - 1);
		this.phase = "menu";
		this.load(this.levelIndex);
		this.spawnGlued();
		this.emit();
	}
	setZen(zen) {
		this.zen = zen;
		this.emit();
	}
	setMuted(muted) {
		this.muted = muted;
		this.sfx.setMuted(muted);
		try {
			localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
		} catch {}
		this.emit();
	}
	togglePause() {
		if (this.phase === "play" || this.phase === "ready") {
			this.pausedFrom = this.phase;
			this.phase = "paused";
			this.emit();
		} else if (this.phase === "paused") {
			this.phase = this.pausedFrom;
			this.emit();
		}
	}
	backToMenu() {
		this.phase = "menu";
		this.wideT = 0;
		this.drops = [];
		this.load(this.levelIndex);
		this.spawnGlued();
		this.combo = 0;
		this.emit();
	}
	/** Fresh run from a level. Score and lives reset. */
	start(index, zen = this.zen) {
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
	launch() {
		if (this.phase !== "ready" || this.balls.length === 0) return;
		const b = this.balls[0];
		const off = clamp(this.paddleVx / 700, -.55, .55) + (Math.random() * 2 - 1) * .07;
		const sp = 228;
		b.vx = Math.sin(off) * sp;
		b.vy = -Math.cos(off) * sp;
		b.alive = true;
		this.phase = "play";
		this.sfx.launch();
		this.emit();
	}
	/** QA / debug helpers. */
	debugState() {
		return {
			...this.snapshot(),
			paddleX: this.paddleX
		};
	}
	debugGrant(kind) {
		this.applyPower(kind);
	}
	debugFastForward(seconds) {
		const steps = Math.min(3600, Math.floor(seconds * 120));
		for (let i = 0; i < steps; i++) {
			if (this.phase === "ready") this.launch();
			if (this.phase !== "play") break;
			this.simulate(STEP);
			this.updateFx(STEP);
		}
		this.draw();
		this.emit();
	}
	frame = (now) => {
		if (this.dead) return;
		const dt = Math.min(.05, this.last ? (now - this.last) / 1e3 : 0);
		this.last = now;
		if (this.hitstop > 0) this.hitstop -= dt;
		else if (this.phase === "play" || this.phase === "ready" || this.phase === "menu") {
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
		if (!(this.hitstop > 0 || this.phase === "paused") && (this.phase === "play" || this.phase === "clear")) this.updateFx(dt);
		if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.7);
		this.draw();
		this.hudAcc += dt;
		if (this.hudAcc >= .12) {
			this.hudAcc = 0;
			this.emit();
		}
		this.raf = requestAnimationFrame(this.frame);
	};
	simulate(dt) {
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
	updatePaddle(dt) {
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
	clampPaddle() {
		const half = this.paddleWidth() / 2;
		this.paddleX = clamp(this.paddleX, half, 240 - half);
	}
	paddleWidth() {
		return this.wideT > 0 ? 82 : 48;
	}
	stickBall() {
		if (this.balls.length === 0) this.spawnGlued();
		const b = this.balls[0];
		b.x = this.paddleX;
		b.y = 402 - BALL_R - 1;
		b.vx = 0;
		b.vy = 0;
		b.alive = true;
		this.balls.length = 1;
	}
	spawnGlued() {
		this.balls = [{
			x: this.paddleX,
			y: 402 - BALL_R - 1,
			vx: 0,
			vy: 0,
			r: BALL_R,
			alive: true
		}];
		this.drops = [];
	}
	stepBall(ball, dt) {
		if (!ball.alive) return;
		const sp = Math.hypot(ball.vx, ball.vy) || 1;
		const steps = Math.max(1, Math.ceil(sp * dt / 2));
		const h = dt / steps;
		for (let s = 0; s < steps; s++) {
			ball.x += ball.vx * h;
			ball.y += ball.vy * h;
			if (this.hitPaddle(ball)) {
				this.sfx.paddle();
				this.paddleSquash = .45;
				this.addTrauma(.07);
			}
			this.hitBricks(ball);
			this.hitWalls(ball);
			if (!Number.isFinite(ball.x) || !Number.isFinite(ball.vx)) {
				ball.alive = false;
				return;
			}
			if (ball.y > 432) {
				ball.alive = false;
				return;
			}
		}
	}
	hitPaddle(ball) {
		if (ball.vy <= 0) return false;
		const half = this.paddleWidth() / 2 + ball.r;
		if (Math.abs(ball.x - this.paddleX) > half) return false;
		if (ball.y + ball.r < 402) return false;
		if (ball.y - ball.r > 411) return false;
		const rel = clamp((ball.x - this.paddleX) / (this.paddleWidth() / 2), -1, 1);
		let speed = Math.hypot(ball.vx, ball.vy);
		speed = clamp(speed * 1.015, 228, 490);
		const off = rel * 1.12;
		ball.vx = Math.sin(off) * speed;
		ball.vy = -Math.cos(off) * speed;
		ball.y = 402 - ball.r - .15;
		this.keepAngle(ball);
		return true;
	}
	hitWalls(ball) {
		let hit = false;
		if (ball.x < ball.r) {
			ball.x = ball.r;
			ball.vx = Math.abs(ball.vx);
			hit = true;
		} else if (ball.x > 240 - ball.r) {
			ball.x = 240 - ball.r;
			ball.vx = -Math.abs(ball.vx);
			hit = true;
		}
		if (ball.y < 28 + ball.r) {
			ball.y = 28 + ball.r;
			ball.vy = Math.abs(ball.vy);
			hit = true;
		}
		if (hit) {
			this.wallTick++;
			if (this.wallTick % 3 === 0) this.sfx.wall();
			this.keepAngle(ball);
		}
	}
	hitBricks(ball) {
		for (let iter = 0; iter < 3; iter++) {
			const minC = clamp(Math.floor((ball.x - ball.r) / 6), 0, 39);
			const maxC = clamp(Math.floor((ball.x + ball.r) / 6), 0, 39);
			const minR = clamp(Math.floor((ball.y - ball.r - 28) / 6), 0, 55);
			const maxR = clamp(Math.floor((ball.y + ball.r - 28) / 6), 0, 55);
			let bestI = -1;
			let bestPen = 0;
			let nx = 0;
			let ny = 0;
			let t = 0;
			for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
				const i = r * 40 + c;
				const cell = this.grid[i];
				if (cell === 0) continue;
				const hit = overlap(ball, c * 6, 28 + r * 6, 6, 6);
				if (hit && hit.pen > bestPen) {
					bestPen = hit.pen;
					bestI = i;
					nx = hit.nx;
					ny = hit.ny;
					t = cell;
				}
			}
			if (bestI < 0) return;
			resolve(ball, nx, ny, bestPen);
			if (t === 2) {
				this.sfx.steel();
				this.spark(ball.x, ball.y, nx, ny);
				this.addTrauma(.018);
			} else this.breakCell(bestI, t, ball);
			this.keepAngle(ball);
		}
	}
	breakCell(i, t, ball) {
		this.grid[i] = 0;
		if (isBreakable(t)) this.breakable = Math.max(0, this.breakable - 1);
		this.combo++;
		this.comboTimer = .85;
		const mult = 1 + Math.floor(this.combo / 6);
		this.score += 10 * mult;
		const bx = i % 40;
		const by = i / 40 | 0;
		this.burst((bx + .5) * 6, 28 + (by + .5) * 6);
		this.sfx.brick(this.combo);
		this.addTrauma(.028);
		const kind = dropFor(t);
		if (kind) this.spawnDrop((bx + .5) * 6, 28 + (by + .5) * 6, kind);
		if (this.combo >= 10 && this.combo % 10 === 0) this.flo(120, 64, `x${this.combo}`);
		const sp = Math.hypot(ball.vx, ball.vy);
		const nsp = Math.min(490, sp * 1.01);
		if (sp > 1) {
			ball.vx *= nsp / sp;
			ball.vy *= nsp / sp;
		}
	}
	/** Keep a little diagonal so balls zigzag through channels instead of orbiting one axis. */
	keepAngle(ball) {
		let sp = Math.hypot(ball.vx, ball.vy);
		if (sp < 40) {
			ball.vx = 60;
			ball.vy = -228;
			sp = Math.hypot(ball.vx, ball.vy);
		}
		if (sp > 490) {
			ball.vx *= 490 / sp;
			ball.vy *= 490 / sp;
			sp = 490;
		} else if (sp < 228 * .82) {
			const k = 228 * .82 / sp;
			ball.vx *= k;
			ball.vy *= k;
			sp *= k;
		}
		const minC = sp * .2;
		if (Math.abs(ball.vx) < minC) ball.vx = ball.vx < 0 ? -minC : minC;
		if (Math.abs(ball.vy) < minC) ball.vy = ball.vy < 0 ? -minC : minC;
		const sp2 = Math.hypot(ball.vx, ball.vy) || 1;
		ball.vx *= sp / sp2;
		ball.vy *= sp / sp2;
	}
	cullBalls() {
		let w = 0;
		for (let i = 0; i < this.balls.length; i++) if (this.balls[i].alive) this.balls[w++] = this.balls[i];
		this.balls.length = w;
	}
	updateDrops(dt) {
		const half = this.paddleWidth() / 2;
		for (const d of this.drops) {
			if (!d.alive) continue;
			d.y += d.vy * dt;
			d.vy = Math.min(150, d.vy + 24 * dt);
			d.spin += dt * 2.4;
			if (d.y + d.r >= 402 && d.y - d.r <= 410) {
				if (Math.abs(d.x - this.paddleX) <= half + d.r) {
					d.alive = false;
					this.applyPower(d.kind);
					continue;
				}
			}
			if (d.y > 442) d.alive = false;
		}
		if (this.drops.some((d) => !d.alive)) this.drops = this.drops.filter((d) => d.alive);
	}
	spawnDrop(x, y, kind) {
		if (this.drops.length >= 14) this.drops.shift();
		this.drops.push({
			x,
			y,
			vy: 62,
			kind,
			r: 7,
			alive: true,
			spin: Math.random() * 3
		});
	}
	applyPower(kind) {
		if (kind === "star") {
			this.splitBalls();
			this.score += 250;
			if (!this.reduceMotion) this.flash = .2;
			this.addTrauma(.75);
			this.hitstop = this.reduceMotion ? 0 : .045;
			this.sfx.star();
			this.flo(this.paddleX, 384, "MULTI");
		} else if (kind === "eplus") {
			this.extraBalls(6);
			this.score += 80;
			this.sfx.power();
			this.addTrauma(.22);
			this.flo(this.paddleX, 384, "E+");
		} else if (kind === "wide") {
			this.wideT = 16;
			this.clampPaddle();
			this.score += 40;
			this.sfx.power();
			this.flo(this.paddleX, 384, "WIDE");
		} else {
			this.lives = Math.min(6, this.lives + 1);
			this.score += 100;
			this.sfx.life();
			this.flo(this.paddleX, 384, "+1");
		}
		this.persistBest();
	}
	splitBalls() {
		const current = this.balls.filter((b) => b.alive);
		for (const b of current) {
			if (this.balls.length >= 220) break;
			this.cloneAngled(b, .42);
			if (this.balls.length >= 220) break;
			this.cloneAngled(b, -.42);
		}
	}
	cloneAngled(b, delta) {
		const ang = Math.atan2(b.vy, b.vx) + delta;
		const sp = Math.min(490, Math.hypot(b.vx, b.vy) * (.92 + Math.random() * .1));
		this.balls.push({
			x: b.x + Math.cos(ang) * 1.5,
			y: b.y + Math.sin(ang) * 1.5,
			vx: Math.cos(ang) * sp,
			vy: Math.sin(ang) * sp,
			r: BALL_R,
			alive: true
		});
	}
	extraBalls(n) {
		const count = Math.min(n, 220 - this.balls.length);
		for (let i = 0; i < count; i++) {
			const t = count === 1 ? 0 : i / (count - 1) * 2 - 1;
			const off = t * 1.05;
			const sp = 228 * (.92 + Math.random() * .16);
			this.balls.push({
				x: clamp(this.paddleX + t * 10, BALL_R, 240 - BALL_R),
				y: 390,
				vx: Math.sin(off) * sp,
				vy: -Math.cos(off) * sp,
				r: BALL_R,
				alive: true
			});
		}
	}
	loseLife() {
		this.sfx.miss();
		this.addTrauma(.45);
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
	onCleared() {
		if (this.phase !== "play") return;
		this.score += 1e3 + this.lives * 250;
		this.persistBest();
		this.phase = "clear";
		this.clearLeft = 1.35;
		this.sfx.win();
		this.addTrauma(.5);
		for (let i = 0; i < 48; i++) {
			const a = Math.random() * Math.PI * 2;
			const sp = 60 + Math.random() * 180;
			this.spawnPart(this.paddleX, 394, Math.cos(a) * sp, Math.sin(a) * sp - 40, .6, 2);
		}
		this.flo(120, 178.92, "CLEARED");
		this.emit();
	}
	advance() {
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
	load(index) {
		this.grid = buildLevel(index);
		let n = 0;
		for (let i = 0; i < this.grid.length; i++) if (isBreakable(this.grid[i])) n++;
		if (n <= 0) {
			this.grid[idxSafe(2, 4)] = 1;
			n = 1;
		}
		this.breakable = n;
		this.drops = [];
		for (const p of this.parts) p.life = 0;
		this.floats = [];
		this.flash = 0;
		this.hitstop = 0;
	}
	burst(x, y) {
		const n = 8;
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2;
			const sp = 35 + Math.random() * 150;
			this.spawnPart(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 20, .32 + Math.random() * .4, Math.random() < .22 ? 2 : 1);
		}
	}
	spark(x, y, nx, ny) {
		for (let i = 0; i < 3; i++) {
			const sp = 40 + Math.random() * 70;
			this.spawnPart(x, y, nx * sp + (Math.random() - .5) * 40, ny * sp + (Math.random() - .5) * 40, .18, 1);
		}
	}
	spawnPart(x, y, vx, vy, life, s) {
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
	flo(x, y, text) {
		if (this.floats.length > 10) this.floats.shift();
		this.floats.push({
			x,
			y,
			text,
			life: .75
		});
	}
	updateFx(dt) {
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
	addTrauma(amount) {
		if (this.reduceMotion) return;
		this.trauma = Math.min(.9, this.trauma + amount);
	}
	persistBest() {
		if (this.score > this.best) {
			this.best = this.score;
			try {
				localStorage.setItem(BEST_KEY, String(this.best));
			} catch {}
		}
	}
	snapshot() {
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
			breakable: this.breakable
		};
	}
	emit() {
		this.onHud(this.snapshot());
	}
	point(e, kind) {
		if (this.phase === "paused" || this.phase === "over" || this.phase === "victory" || this.phase === "clear") return;
		const r = this.canvas.getBoundingClientRect();
		const x = (e.clientX - r.left) / Math.max(1, r.width) * 240;
		if (e.pointerType === "mouse" || kind !== "move" || this.tracking) {
			this.aimX = x;
			this.keySteer = false;
		}
		if (kind === "up" && this.phase === "ready") this.launch();
	}
	draw() {
		const ctx = this.ctx;
		ctx.setTransform(2, 0, 0, 2, 0, 0);
		ctx.fillStyle = COLORS.bg;
		ctx.fillRect(0, 0, 240, 426);
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
			ctx.fillRect(0, 28, 240, 398);
		}
	}
	drawBricks(ctx) {
		ctx.fillStyle = COLORS.steel;
		ctx.beginPath();
		for (let i = 0; i < this.grid.length; i++) {
			if (this.grid[i] !== 2) continue;
			const x = i % 40 * 6;
			const y = 28 + (i / 40 | 0) * 6;
			ctx.rect(x, y, 6, 6);
		}
		ctx.fill();
		ctx.fillStyle = COLORS.steelHi;
		ctx.beginPath();
		for (let i = 0; i < this.grid.length; i++) {
			if (this.grid[i] !== 2) continue;
			ctx.rect(i % 40 * 6, 28 + (i / 40 | 0) * 6, 6, 1);
		}
		ctx.fill();
		ctx.fillStyle = COLORS.steelLo;
		ctx.beginPath();
		for (let i = 0; i < this.grid.length; i++) {
			if (this.grid[i] !== 2) continue;
			ctx.rect(i % 40 * 6, 28 + (i / 40 | 0) * 6 + 6 - 1, 6, 1);
		}
		ctx.fill();
		for (let shade = 0; shade < COLORS.orange.length; shade++) {
			ctx.fillStyle = COLORS.orange[shade];
			ctx.beginPath();
			let any = false;
			for (let i = 0; i < this.grid.length; i++) {
				const t = this.grid[i];
				if (t === 0 || t === 2) continue;
				const c = i % 40;
				const r = i / 40 | 0;
				if ((c * 3 + r * 5) % COLORS.orange.length !== shade) continue;
				ctx.rect(c * 6, 28 + r * 6, 5, 5);
				any = true;
			}
			if (any) ctx.fill();
		}
		for (let i = 0; i < this.grid.length; i++) {
			const t = this.grid[i];
			if (t !== 3 && t !== 5 && t !== 6 && t !== 4) continue;
			const x = i % 40 * 6;
			const y = 28 + (i / 40 | 0) * 6;
			if (t === 3) ctx.fillStyle = COLORS.star;
			else if (t === 4) ctx.fillStyle = COLORS.cyan;
			else if (t === 6) ctx.fillStyle = COLORS.paddle;
			else if (t === 5) ctx.fillStyle = COLORS.text;
			else continue;
			ctx.fillRect(x + 2, y + 2, 2, 2);
		}
	}
	drawDrops(ctx) {
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
				ctx.fillText("E+", d.x, y + .5);
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
	drawParts(ctx) {
		ctx.fillStyle = COLORS.ball;
		ctx.beginPath();
		let any = false;
		for (const p of this.parts) {
			if (p.life <= 0) continue;
			ctx.rect(p.x | 0, p.y | 0, p.s, p.s);
			any = true;
		}
		if (!any) return;
		ctx.globalAlpha = .95;
		ctx.fill();
		ctx.globalAlpha = 1;
	}
	drawPaddle(ctx) {
		const w = this.paddleWidth() * (1 + (1 - this.paddleSquash) * .35);
		const h = 6 * this.paddleSquash;
		const x = this.paddleX - w / 2;
		const y = 402 + (6 - h);
		ctx.fillStyle = COLORS.paddle;
		ctx.fillRect(x, y, w, h);
		ctx.fillStyle = COLORS.paddleHi;
		ctx.fillRect(x, y, w, 1);
	}
	drawBalls(ctx) {
		ctx.fillStyle = COLORS.ball;
		ctx.beginPath();
		for (const b of this.balls) {
			if (!b.alive) continue;
			ctx.moveTo(b.x + b.r, b.y);
			ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
		}
		ctx.fill();
	}
	drawAim(ctx) {
		ctx.fillStyle = COLORS.text;
		const x = this.paddleX;
		for (let i = 0; i < 4; i++) ctx.fillRect(x, 386 - i * 6, 1, 2);
	}
	drawFloats(ctx) {
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
};
function idxSafe(x, y) {
	return y * 40 + x;
}
function overlap(ball, rx, ry, rw, rh) {
	const rr = rx + rw;
	const rb = ry + rh;
	if (ball.x > rx && ball.x < rr && ball.y > ry && ball.y < rb) {
		const left = ball.x - rx;
		const right = rr - ball.x;
		const top = ball.y - ry;
		const bot = rb - ball.y;
		const m = Math.min(left, right, top, bot);
		if (m === left) return {
			nx: -1,
			ny: 0,
			pen: left + ball.r
		};
		if (m === right) return {
			nx: 1,
			ny: 0,
			pen: right + ball.r
		};
		if (m === top) return {
			nx: 0,
			ny: -1,
			pen: top + ball.r
		};
		return {
			nx: 0,
			ny: 1,
			pen: bot + ball.r
		};
	}
	const cx = clamp(ball.x, rx, rr);
	const cy = clamp(ball.y, ry, rb);
	const dx = ball.x - cx;
	const dy = ball.y - cy;
	const d2 = dx * dx + dy * dy;
	if (d2 > ball.r * ball.r || d2 === 0) return null;
	const d = Math.sqrt(d2);
	return {
		nx: dx / d,
		ny: dy / d,
		pen: ball.r - d
	};
}
function resolve(ball, nx, ny, pen) {
	const dot = ball.vx * nx + ball.vy * ny;
	if (dot < 0) {
		ball.vx -= 2 * dot * nx;
		ball.vy -= 2 * dot * ny;
	}
	ball.x += nx * (pen + .02);
	ball.y += ny * (pen + .02);
}
function drawStar(ctx, x, y, r, rot) {
	ctx.beginPath();
	for (let i = 0; i < 10; i++) {
		const a = rot + i * Math.PI / 5 - Math.PI / 2;
		const rad = i % 2 === 0 ? r : r * .42;
		const px = x + Math.cos(a) * rad;
		const py = y + Math.sin(a) * rad;
		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	ctx.closePath();
	ctx.fill();
}
var INITIAL = {
	phase: "menu",
	score: 0,
	best: 0,
	lives: 3,
	zen: false,
	balls: 0,
	level: 0,
	levelName: LEVELS[0].name,
	blurb: LEVELS[0].blurb,
	combo: 0,
	muted: false,
	breakable: 0
};
function pad(n) {
	return String(Math.max(0, n)).padStart(6, "0");
}
function BreakerScreen() {
	const canvasRef = (0, import_react.useRef)(null);
	const gameRef = (0, import_react.useRef)(null);
	const [hud, setHud] = (0, import_react.useState)(INITIAL);
	const [booted, setBooted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const game = new BreakerGame(canvas, setHud);
		gameRef.current = game;
		window.__breaker = game;
		setBooted(true);
		return () => {
			game.destroy();
			gameRef.current = null;
			setBooted(false);
		};
	}, []);
	const game = gameRef.current;
	const showMenu = hud.phase === "menu";
	const showOver = hud.phase === "over";
	const showWin = hud.phase === "victory";
	const showPause = hud.phase === "paused";
	const playing = hud.phase === "play" || hud.phase === "ready" || hud.phase === "clear" || hud.phase === "paused";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "stage",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "sideword",
				children: "ORANGE / STEEL / WHITE"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "sr-only",
				children: "Satisfying brick breaker. Drag or use the arrow keys to move the paddle. Release or press space to launch. Steel never breaks. Catch the yellow star to multiply the ball and the cyan E+ for extra balls."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "frame",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: canvasRef,
						className: "playfield",
						"aria-label": "Brick breaker playfield"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hud",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: playing ? pad(hud.score) : `BEST ${pad(hud.best)}` }),
							playing && hud.combo >= 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "combo",
								children: ["x", hud.combo]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "muted",
								children: String(hud.level + 1).padStart(2, "0")
							}),
							playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "lives",
								children: [hud.zen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ZEN" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, {
									size: 12,
									"aria-hidden": "true",
									fill: "currentColor"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: hud.lives })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: hud.balls >= 80 ? "hot" : hud.balls >= 20 ? "warm" : "",
									children: hud.balls > 0 ? hud.balls : 1
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "muted",
								children: hud.levelName
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "tools",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "icon-btn",
							"aria-label": hud.muted ? "Unmute" : "Mute",
							"aria-pressed": hud.muted,
							disabled: !booted,
							onClick: () => gameRef.current?.setMuted(!hud.muted),
							children: hud.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { size: 18 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { size: 18 })
						}), playing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "icon-btn",
							"aria-label": showPause ? "Resume" : "Pause",
							disabled: !booted,
							onClick: () => gameRef.current?.togglePause(),
							children: showPause ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { size: 18 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { size: 18 })
						})]
					}),
					hud.phase === "ready" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hint",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "RELEASE TO LAUNCH" })
					}),
					hud.phase === "clear" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "banner",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "CLEARED" })
					}),
					showMenu && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sheet",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "kicker",
								children: "PIXEL CLEAR"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
								"SATISFYING",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								"BRICK BREAKER"
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "blurb",
								children: hud.blurb
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "level-row",
								role: "listbox",
								"aria-label": "Level",
								children: LEVELS.map((level, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: i === hud.level ? "level-btn is-on" : "level-btn",
									"aria-pressed": i === hud.level,
									"aria-label": level.name,
									disabled: !booted,
									onClick: () => gameRef.current?.preview(i),
									children: String(i + 1).padStart(2, "0")
								}, level.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-primary",
								disabled: !booted,
								onClick: () => gameRef.current?.start(hud.level, hud.zen),
								children: "PLAY"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "btn-ghost",
								"aria-pressed": hud.zen,
								disabled: !booted,
								onClick: () => gameRef.current?.setZen(!hud.zen),
								children: ["Zen lives ", hud.zen ? "on" : "off"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
								className: "legend",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "swatch swatch-orange" }), " Orange breaks"] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "swatch swatch-steel" }), " Steel stays"] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "swatch swatch-star" }), " Star multiplies"] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "swatch swatch-cyan" }), " E+ extra balls"] })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "fine",
								children: "Drag or arrows to move. Release or space to launch. Find the gap."
							})
						]
					}),
					showPause && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sheet",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "kicker",
								children: hud.levelName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "PAUSED" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "scoreline",
								children: ["SCORE ", pad(hud.score)]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-primary",
								onClick: () => game?.togglePause(),
								children: "Resume"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-ghost",
								onClick: () => gameRef.current?.backToMenu(),
								children: "Quit"
							})
						]
					}),
					showOver && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sheet",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "kicker",
								children: hud.levelName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "GAME OVER" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "scoreline",
								children: ["SCORE ", pad(hud.score)]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "fine",
								children: ["BEST ", pad(hud.best)]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-primary",
								onClick: () => gameRef.current?.start(hud.level, hud.zen),
								children: "Retry"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "btn-ghost",
								"aria-pressed": hud.zen,
								onClick: () => gameRef.current?.setZen(!hud.zen),
								children: ["Zen lives ", hud.zen ? "on" : "off"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-ghost",
								onClick: () => gameRef.current?.backToMenu(),
								children: "Levels"
							})
						]
					}),
					showWin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sheet",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "kicker",
								children: "ALL FIVE"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "CORE CLEARED" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "scoreline",
								children: ["SCORE ", pad(hud.score)]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "fine",
								children: ["BEST ", pad(hud.best)]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-primary",
								onClick: () => gameRef.current?.start(0, hud.zen),
								children: "Play again"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn-ghost",
								onClick: () => gameRef.current?.backToMenu(),
								children: "Levels"
							})
						]
					})
				]
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreakerScreen, {});
}
//#endregion
export { Home as component };
