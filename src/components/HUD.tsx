import React from "react";
import DPad from "./DPad";
import type { HudState, GameMode, DirName, Phase } from "../game/types";
import { DIR_GLYPH, MODES } from "../game/types";
import { codeLabel, type Settings } from "../game/storage";

interface Props {
  hud: HudState;
  mode: GameMode;
  phase: Phase;
  best: number;
  held: DirName[];
  settings: Settings;
  muted: boolean;
  musicMuted: boolean;
  onPause: () => void;
  onFinishPractice: () => void;
  onMute: () => void;
  onMusic: () => void;
  onFocus: () => void;
  onDir: (d: DirName) => void;
  onReleaseDir: (d: DirName) => void;
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M12 21s-7-4.6-9.5-8.5C.5 9 2 5.5 5.5 5.5 7.5 5.5 9 7 12 10 15 7 16.5 5.5 18.5 5.5 22 5.5 23.5 9 21.5 12.5 19 16.4 12 21 12 21z"
        fill={filled ? "#d68d9c" : "var(--panel-border)"}
      />
    </svg>
  );
}

function ControlBtn({
  children,
  onClick,
  label,
  danger,
  dim,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
  dim?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`btn glass inline-flex h-9 w-9 items-center justify-center rounded-xl text-[13px] ${danger ? "text-rose-300" : dim ? "dim" : "txt"}`}
    >
      {children}
    </button>
  );
}

export default function HUD({
  hud,
  mode,
  phase,
  best,
  held,
  settings,
  muted,
  musicMuted,
  onPause,
  onFinishPractice,
  onMute,
  onMusic,
  onFocus,
  onDir,
  onReleaseDir,
}: Props) {
  const def = MODES[mode];
  const padLayout = settings.dpad === "center" && settings.leftHanded ? "left" : settings.dpad;

  return (
    <div className="hud-scope pointer-events-none fixed inset-0 z-20 flex justify-center">
      {/* Overdrive Aura Screen Vignette */}
      {hud.overdrive && (
        <div className="pointer-events-none fixed inset-0 z-10 animate-pulse border-[3px] sm:border-4 border-amber-400/40 shadow-[inset_0_0_80px_rgba(251,191,36,0.2)] transition-all duration-300" />
      )}

      <div className="relative w-full max-w-5xl h-full pointer-events-none">
        <div className="glass rounded-2xl absolute left-3 top-3 z-20 px-3.5 py-2 sm:left-5 sm:top-5 pointer-events-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[9px] font-bold tracking-[0.25em] text-white/35">{mode === "practice" ? "TRAINING" : "SCORE"}</div>
            {best > 0 && hud.score > 0 && (
              <div
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                  hud.score >= best
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {hud.score >= best
                  ? `▲ NEW PB (+${(hud.score - best).toLocaleString()})`
                  : `▼ -${(best - hud.score).toLocaleString()}`}
              </div>
            )}
          </div>
          <div className="text-2xl font-extrabold leading-none tabular-nums text-white sm:text-4xl mt-0.5">
            {hud.score.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-white/35">
            {mode !== "practice" && <span>BEST {best.toLocaleString()}</span>}
            {hud.modifierMultiplier && hud.modifierMultiplier > 1 && (
              <span className="text-amber-400 font-bold bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                {hud.modifierMultiplier}× MULT
              </span>
            )}
          </div>
        </div>

      {/* center: mode-specific status */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-col items-center gap-1 sm:top-5">
        {mode === "practice" ? (
          <div className="glass rounded-xl px-3 py-2 text-center text-white"><p className="text-[10px] font-bold tracking-wider">PRACTICE · UNTIMED</p><p className="mt-1 text-xs" data-practice-direction={hud.need.join(",")}>Try {hud.need.map(d => DIR_GLYPH[d]).join(" + ")}</p>{phase === "playing" && <button className="pointer-events-auto mt-1 text-xs underline underline-offset-4" onClick={onFinishPractice}>Finish practice</button>}</div>
        ) : mode === "versus" && hud.versus ? (
          <>
            <div className="glass rounded-xl px-3 py-1.5 text-center">
              <div className="flex items-center gap-3 text-[12px] font-extrabold">
                <span className={hud.versus.turn === 0 ? "text-white" : "text-white/35"}>
                  P1 {hud.versus.scores[0]}
                </span>
                <span className="text-white/25">·</span>
                <span className={hud.versus.turn === 1 ? "text-white" : "text-white/35"}>
                  P2 {hud.versus.scores[1]}
                </span>
              </div>
              <div className="mt-0.5 text-[9px] font-bold tracking-widest text-white/40">
                PLAYER {hud.versus.turn + 1} · ARROW {hud.versus.round}/{hud.versus.total}
              </div>
            </div>
          </>
        ) : mode === "rush" || mode === "blitz" ? (
          <div
            className={`glass rounded-xl px-3.5 py-1.5 text-xl font-extrabold tabular-nums ${
              hud.total !== null && hud.total < 10 ? "anim-urgent text-white" : "text-white"
            }`}
          >
            {hud.total !== null ? hud.total.toFixed(1) : "0"}s
          </div>
        ) : mode === "waves" ? (
          <div className="glass rounded-xl px-3 py-1.5 text-[12px] font-extrabold tracking-widest text-white">
            WAVE {hud.waveStep}/{hud.waveSize}
          </div>
        ) : mode === "memory" ? (
          <div className="glass rounded-xl px-3 py-1.5 text-[12px] font-extrabold tracking-widest text-white">
            {hud.memory === "recall" ? "RECALL!" : "MEMORIZE…"}
          </div>
        ) : mode === "coop" ? (
          <div className="glass rounded-xl px-3 py-1.5 text-center text-[11px] font-extrabold tracking-widest text-white">
            P1{"♥".repeat(Math.max(0, hud.coopLives[0]))} {hud.coopReady[0] ? "✓" : "…"}
            <span className="mx-1.5 text-white/25">·</span>
            P2{"♥".repeat(Math.max(0, hud.coopLives[1]))} {hud.coopReady[1] ? "✓" : "…"}
          </div>
        ) : hud.combo > 1 || hud.overdrive ? (
          <div
            key={hud.combo}
            className={`anim-pop glass rounded-xl px-3 py-1 text-lg font-extrabold transition-all ${
              hud.overdrive
                ? "text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)] border-amber-400/40"
                : "text-white"
            }`}
          >
            {hud.overdrive ? "⚡ OVERDRIVE" : "COMBO"} ×{hud.combo}
          </div>
        ) : (
          <div className="h-8" />
        )}

        {/* Live Active Modifiers Chips */}
        {hud.modifiers && Object.values(hud.modifiers).some(Boolean) && (
          <div className="flex items-center gap-1 flex-wrap justify-center">
            {hud.modifiers.hyperSpeed && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ⚡ Hyper
              </span>
            )}
            {hud.modifiers.vortexSpin && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                🌀 Vortex
              </span>
            )}
            {hud.modifiers.phantomMirage && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                🔮 Mirage
              </span>
            )}
            {hud.modifiers.mirrorRealm && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                🪞 Mirror
              </span>
            )}
            {hud.modifiers.suddenRisk && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                💀 1-Life
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          {mode !== "coop" &&
            def.lives < 999 &&
            Array.from({ length: def.lives }).map((_, i) => (
              <span
                key={i}
                className="inline-block"
                style={{
                  transition: "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                  transform: i < hud.lives ? "scale(1.06)" : "scale(1)",
                }}
              >
                <Heart filled={i < hud.lives} />
              </span>
            ))}
        </div>
      </div>

      {/* right: controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-1.5 sm:right-5 sm:top-5 pointer-events-auto">
        <div className="flex gap-1.5">
          <ControlBtn onClick={onMusic} label="Toggle music">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: musicMuted ? 0.4 : 1 }}>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </ControlBtn>
          <ControlBtn onClick={onMute} label="Toggle sound">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M19 5a9 9 0 0 1 0 14" />
              {muted && <path d="M3 3l18 18" />}
            </svg>
          </ControlBtn>
          <ControlBtn
            onClick={onPause}
            label={phase === "paused" ? "Resume" : "Pause"}
          >
            {phase === "paused" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            )}
          </ControlBtn>
        </div>
        {phase === "playing" && hud.focusAvailable && (
          <button
            onClick={onFocus}
            disabled={hud.focusActive || hud.focusCharges <= 0}
            className="press glass relative ml-auto flex h-12 w-12 items-center justify-center rounded-full text-lg accent disabled:opacity-40"
            aria-label="Focus slow motion"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 4v2M12 18v2M5 12H3M21 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
            </svg>
            {!hud.focusActive && (
              <span
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
                style={{
                  background: "var(--brand)",
                  color: "var(--brand-on)",
                }}
              >
                {hud.focusCharges}
              </span>
            )}
            {hud.focusActive && (
              <span
                className="absolute bottom-0.5 left-1/2 h-1 -translate-x-1/2 rounded-full"
                style={{
                  width: `${hud.focusFrac * 80}%`,
                  background: "var(--brand)",
                  transition: "width 100ms linear",
                }}
              />
            )}
          </button>
        )}
      </div>

      <div className="hit-feedback" role="status" aria-live="polite" aria-atomic="true">
        {hud.feedback && <div key={hud.feedback.id} className={`hit-feedback-card feedback-${hud.feedback.kind}`}>
          <strong>{hud.feedback.kind === "hit" ? "✓ " : "↻ "}{hud.feedback.label}</strong>
          <span>{hud.feedback.kind === "hit" ? `+${hud.feedback.points ?? 0} pts · ${Math.round(hud.feedback.reactionMs ?? 0)} ms` : mode === "practice" ? "Follow the bright arrow; white swap means opposite." : "Watch the arrow and its badge."}</span>
        </div>}
      </div>
      {/* d-pad (solo + versus hot seat; co-op uses split keyboard) */}
      {mode !== "coop" && (
        <DPad
          held={held}
          hint={settings.showHints && mode !== "memory" && !hud.modifiers?.phantomMirage && (hud.need.length === 2 || mode === "practice") ? hud.need : []}
          accent="var(--brand)"
          mark={mode === "memory" && hud.memory === "recall" ? "none" : hud.mark}
          layout={padLayout}
          scale={settings.dpadScale}
          onPress={onDir}
          onRelease={onReleaseDir}
        />
      )}
      </div>
    </div>
  );
}
