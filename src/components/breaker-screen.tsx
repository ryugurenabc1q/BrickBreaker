import { useEffect, useRef, useState } from "react";
import { Heart, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { LEVELS } from "@/game/levels";
import { BreakerGame, type Hud } from "@/game/engine";

const INITIAL: Hud = {
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
  breakable: 0,
};

function pad(n: number): string {
  return String(Math.max(0, n)).padStart(6, "0");
}

export function BreakerScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<BreakerGame | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new BreakerGame(canvas, setHud);
    gameRef.current = game;
    (window as unknown as { __breaker?: BreakerGame }).__breaker = game;
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

  return (
    <div className="stage">
      <p className="sideword">ORANGE / STEEL / WHITE</p>
      <p className="sr-only">
        Satisfying brick breaker. Drag or use the arrow keys to move the paddle. Release or press space to
        launch. Steel never breaks. Catch the yellow star to multiply the ball and the cyan E+ for extra
        balls.
      </p>
      <div className="frame">
        <canvas ref={canvasRef} className="playfield" aria-label="Brick breaker playfield" />
        <div className="hud">
          <b>{playing ? pad(hud.score) : `BEST ${pad(hud.best)}`}</b>
          {playing && hud.combo >= 3 ? <span className="combo">x{hud.combo}</span> : <span className="muted">{String(hud.level + 1).padStart(2, "0")}</span>}
          {playing ? (
            <span className="lives">
              {hud.zen ? (
                <span>ZEN</span>
              ) : (
                <>
                  <Heart size={12} aria-hidden="true" fill="currentColor" />
                  <span>{hud.lives}</span>
                </>
              )}
              <span className={hud.balls >= 80 ? "hot" : hud.balls >= 20 ? "warm" : ""}>
                {hud.balls > 0 ? hud.balls : 1}
              </span>
            </span>
          ) : (
            <span className="muted">{hud.levelName}</span>
          )}
        </div>
        <div className="tools">
          <button
            type="button"
            className="icon-btn"
            aria-label={hud.muted ? "Unmute" : "Mute"}
            aria-pressed={hud.muted}
            disabled={!booted}
            onClick={() => gameRef.current?.setMuted(!hud.muted)}
          >
            {hud.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          {playing && (
            <button
              type="button"
              className="icon-btn"
              aria-label={showPause ? "Resume" : "Pause"}
              disabled={!booted}
              onClick={() => gameRef.current?.togglePause()}
            >
              {showPause ? <Play size={18} /> : <Pause size={18} />}
            </button>
          )}
        </div>

        {hud.phase === "ready" && (
          <p className="hint">
            <span>RELEASE TO LAUNCH</span>
          </p>
        )}
        {hud.phase === "clear" && (
          <p className="banner">
            <span>CLEARED</span>
          </p>
        )}

        {showMenu && (
          <div className="sheet">
            <p className="kicker">PIXEL CLEAR</p>
            <h1>
              SATISFYING
              <br />
              BRICK BREAKER
            </h1>
            <p className="blurb">{hud.blurb}</p>
            <div className="level-row" role="listbox" aria-label="Level">
              {LEVELS.map((level, i) => (
                <button
                  key={level.id}
                  type="button"
                  className={i === hud.level ? "level-btn is-on" : "level-btn"}
                  aria-pressed={i === hud.level}
                  aria-label={level.name}
                  disabled={!booted}
                  onClick={() => gameRef.current?.preview(i)}
                >
                  {String(i + 1).padStart(2, "0")}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!booted}
              onClick={() => gameRef.current?.start(hud.level, hud.zen)}
            >
              PLAY
            </button>
            <button
              type="button"
              className="btn-ghost"
              aria-pressed={hud.zen}
              disabled={!booted}
              onClick={() => gameRef.current?.setZen(!hud.zen)}
            >
              Zen lives {hud.zen ? "on" : "off"}
            </button>
            <ul className="legend">
              <li>
                <i className="swatch swatch-orange" /> Orange breaks
              </li>
              <li>
                <i className="swatch swatch-steel" /> Steel stays
              </li>
              <li>
                <i className="swatch swatch-star" /> Star multiplies
              </li>
              <li>
                <i className="swatch swatch-cyan" /> E+ extra balls
              </li>
            </ul>
            <p className="fine">Drag or arrows to move. Release or space to launch. Find the gap.</p>
          </div>
        )}

        {showPause && (
          <div className="sheet">
            <p className="kicker">{hud.levelName}</p>
            <h2>PAUSED</h2>
            <p className="scoreline">SCORE {pad(hud.score)}</p>
            <button type="button" className="btn-primary" onClick={() => game?.togglePause()}>
              Resume
            </button>
            <button type="button" className="btn-ghost" onClick={() => gameRef.current?.backToMenu()}>
              Quit
            </button>
          </div>
        )}

        {showOver && (
          <div className="sheet">
            <p className="kicker">{hud.levelName}</p>
            <h2>GAME OVER</h2>
            <p className="scoreline">SCORE {pad(hud.score)}</p>
            <p className="fine">BEST {pad(hud.best)}</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => gameRef.current?.start(hud.level, hud.zen)}
            >
              Retry
            </button>
            <button
              type="button"
              className="btn-ghost"
              aria-pressed={hud.zen}
              onClick={() => gameRef.current?.setZen(!hud.zen)}
            >
              Zen lives {hud.zen ? "on" : "off"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => gameRef.current?.backToMenu()}>
              Levels
            </button>
          </div>
        )}

        {showWin && (
          <div className="sheet">
            <p className="kicker">ALL FIVE</p>
            <h2>CORE CLEARED</h2>
            <p className="scoreline">SCORE {pad(hud.score)}</p>
            <p className="fine">BEST {pad(hud.best)}</p>
            <button type="button" className="btn-primary" onClick={() => gameRef.current?.start(0, hud.zen)}>
              Play again
            </button>
            <button type="button" className="btn-ghost" onClick={() => gameRef.current?.backToMenu()}>
              Levels
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
