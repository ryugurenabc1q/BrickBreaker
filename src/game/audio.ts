/**
 * Tiny Web Audio synth. No samples — ticks, thumps, and chimes.
 * Call unlock() synchronously inside the first pointer / key handler.
 */

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private voices = 0;
  private muted = false;
  private brickStamp = 0;
  private brickCount = 0;
  private steelStamp = 0;

  unlock(): void {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.08);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  resumeIfNeeded(): void {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.32, this.ctx.currentTime, 0.02);
    }
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    freq2?: number,
  ): void {
    if (!this.ctx || !this.master || this.muted || this.voices > 22) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(40, freq), t);
    if (freq2 && freq2 > 0) {
      o.frequency.exponentialRampToValueAtTime(Math.max(40, freq2), t + dur);
    }
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    this.voices++;
    o.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
      o.disconnect();
      g.disconnect();
    };
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, rate = 1): void {
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
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
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
    src.stop(t + dur + 0.02);
  }

  /** Rising tick. Many bricks in one frame collapse into a single crunch. */
  brick(combo: number): void {
    const now = this.ctx?.currentTime ?? 0;
    if (now - this.brickStamp > 0.035) {
      this.brickStamp = now;
      this.brickCount = 0;
    }
    this.brickCount++;
    if (this.brickCount > 3) return;
    const f = Math.min(1760, 480 + combo * 26 + Math.random() * 90);
    this.tone(f, 0.04, "square", 0.055, f * 0.55);
    if (this.brickCount === 1) this.noise(0.025, 0.035, 1.4 + Math.random() * 0.4);
  }

  steel(): void {
    const now = this.ctx?.currentTime ?? 0;
    if (now - this.steelStamp < 0.04) return;
    this.steelStamp = now;
    this.tone(150 + Math.random() * 30, 0.045, "square", 0.04, 90);
  }

  paddle(): void {
    this.tone(210 + Math.random() * 40, 0.06, "triangle", 0.08, 140);
  }

  wall(): void {
    this.tone(320 + Math.random() * 40, 0.03, "square", 0.03);
  }

  launch(): void {
    this.tone(180, 0.09, "square", 0.06, 640);
  }

  power(): void {
    this.tone(880, 0.08, "square", 0.06);
    this.tone(1174, 0.1, "square", 0.05);
    this.tone(1568, 0.12, "triangle", 0.05);
  }

  star(): void {
    this.tone(523, 0.09, "square", 0.07);
    this.tone(659, 0.1, "square", 0.06);
    this.tone(784, 0.11, "square", 0.06);
    this.tone(1046, 0.16, "triangle", 0.07);
    this.noise(0.08, 0.05, 0.6);
  }

  life(): void {
    this.tone(523, 0.08, "triangle", 0.07);
    this.tone(659, 0.1, "triangle", 0.06);
    this.tone(784, 0.14, "triangle", 0.06);
  }

  miss(): void {
    this.tone(240, 0.12, "square", 0.05, 90);
  }

  win(): void {
    this.tone(523, 0.1, "square", 0.06);
    this.tone(659, 0.1, "square", 0.06);
    this.tone(784, 0.1, "square", 0.06);
    this.tone(1046, 0.18, "triangle", 0.07);
  }
}
