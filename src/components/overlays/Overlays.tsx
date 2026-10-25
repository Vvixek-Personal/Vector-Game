import React, { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import type { GameSummary, GameMode } from "../../game/types";
import { MODES } from "../../game/types";
import { sparksForRun, type Stats, type Settings } from "../../game/storage";
import type { Profile } from "../../game/profile";
import { getPlayerLevelProgress } from "../../game/levels";
import { AVATARS, isUnlocked } from "../../game/profile";
import { STORE_ITEMS } from "../../game/catalog";
import { uiConfirm, uiTap } from "../../game/haptics";
import Avatar from "../Avatar";
import { backdropVariants, panelVariants, rowVariants } from "../../utils/motion";

/** Shared dialog shell: one scrim, one surface, one entrance. */
const Shell = ({
  children,
  labelledBy,
  label,
}: {
  children: React.ReactNode;
  labelledBy?: string;
  label?: string;
}) => (
  <motion.div
    variants={backdropVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    role="dialog"
    aria-modal="true"
    aria-label={label}
    aria-labelledby={labelledBy}
    className="game-dialog surface-backdrop absolute inset-0 z-40 flex items-center justify-center overflow-y-auto p-4"
  >
    <motion.div
      variants={panelVariants}
      className="surface-card my-auto max-h-full w-full max-w-[380px] overflow-y-auto p-6"
    >
      {children}
    </motion.div>
  </motion.div>
);

// ---------------------------------------------------------------- tutorial

const STEPS = [
  {
    icon: "↑",
    title: "Match the glow",
    body: "Swipe, tap, or press a key in the direction of the bright arrow before the ring empties.",
  },
  {
    icon: "↑ + →",
    title: "Two for a diagonal",
    body: "Diagonals need two directions held together. Up and right makes north-east.",
  },
  {
    icon: "⇄",
    title: "Read the badge",
    body: "A white swap badge means go the opposite way (1.8×). A gold star is a 5× bonus.",
  },
  {
    icon: "◎",
    title: "Slow down",
    body: "Press the Focus button or F to slow time for a moment. You get three per run.",
  },
];

export function TutorialOverlay({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <Shell label="How to play">
      <div className="text-center">
        <p className="t-eyebrow">
          Step {step + 1} of {STEPS.length}
        </p>
        <motion.div
          key={s.icon}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="anim-fade mt-4 text-3xl tracking-tight"
          style={{ color: "var(--brand)" }}
        >
          {s.icon}
        </motion.div>
        <h2 className="t-title mt-3">{s.title}</h2>
        <p className="t-body mx-auto mt-2 max-w-[30ch] min-h-[4.5em]">{s.body}</p>

        <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === step ? 22 : 6,
                background: i === step ? "var(--brand)" : "var(--panel-border)",
              }}
            />
          ))}
        </div>

        <div className="dialog-actions mt-6">
          <button className="dialog-btn dialog-btn-primary" onClick={() => (last ? onDone() : setStep(step + 1))}>
            {last ? "Let's play" : "Next"}
          </button>
          {!last && (
            <button className="dialog-btn dialog-btn-quiet" onClick={onDone}>
              Skip tutorial
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------- pause

export function PauseOverlay({
  score,
  mode,
  onResume,
  onFinishPractice,
  onRestart,
  onHome,
}: {
  score: number;
  mode: string;
  onResume: () => void;
  onFinishPractice: () => void;
  onRestart: () => void;
  onHome: () => void;
}) {
  return (
    <Shell label="Paused">
      <div className="text-center">
        <p className="t-eyebrow">{MODES[mode as keyof typeof MODES].label}</p>
        <h2 className="t-display mt-2">Paused</h2>
        <p className="t-caption num mt-1">
          {score.toLocaleString()} pts this run
        </p>
      </div>

      <div className="dialog-actions mt-6">
        {mode === "practice" && (
          <button className="dialog-btn" onClick={onFinishPractice}>
            Finish practice
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={onResume}
          className="dialog-btn dialog-btn-primary"
        >
          Resume
        </motion.button>
        <motion.button whileTap={{ scale: 0.985 }} onClick={onRestart} className="dialog-btn">
          Restart
        </motion.button>
        <motion.button whileTap={{ scale: 0.985 }} onClick={onHome} className="dialog-btn dialog-btn-quiet">
          Home
        </motion.button>
      </div>
      <p className="t-caption mt-4 text-center">
        <kbd className="sf-mono">Esc</kbd> or <kbd className="sf-mono">P</kbd> resumes
      </p>
    </Shell>
  );
}

// ---------------------------------------------------------------- game over

const RANK_TONE: Record<string, { color: string; border: string; background: string }> = {
  SSS: { color: "#1b1200", border: "transparent", background: "linear-gradient(120deg,#f6d68a,#f2b45f)" },
  S: { color: "#f3cf8d", border: "color-mix(in srgb, #f3cf8d 45%, transparent)", background: "color-mix(in srgb, #f3cf8d 14%, transparent)" },
  A: { color: "#9bd7b6", border: "color-mix(in srgb, #9bd7b6 42%, transparent)", background: "color-mix(in srgb, #9bd7b6 12%, transparent)" },
  B: { color: "var(--text-dim)", border: "var(--panel-border)", background: "var(--pill)" },
  C: { color: "var(--text-faint)", border: "var(--panel-border)", background: "var(--pill)" },
  D: { color: "var(--text-faint)", border: "var(--panel-border)", background: "var(--pill)" },
};

export function GameOverOverlay({
  summary,
  stats,
  profile,
  onAgain,
  onHome,
  onShare,
  shared,
}: {
  summary: GameSummary;
  stats?: Stats;
  profile?: Profile;
  onAgain: () => void;
  onHome: () => void;
  onShare: () => void;
  shared: boolean;
}) {
  const def = MODES[summary.mode];
  const versus = summary.versus;
  const level = stats && profile ? getPlayerLevelProgress(stats, profile) : null;
  const xpGain = summary.xpGained ?? summary.score + 50;

  const averageReaction =
    stats && stats.reactionCount > 0 ? Math.round(stats.reactionTotal / stats.reactionCount) : 0;

  const reactionDiff =
    summary.avgReactionMs && averageReaction > 0 ? averageReaction - summary.avgReactionMs : 0;

  const reactionNote =
    Math.abs(reactionDiff) > 5
      ? `${Math.abs(reactionDiff)} ms ${reactionDiff > 0 ? "faster" : "slower"} than your average`
      : averageReaction > 0
        ? "Right on your average reaction"
        : "";

  const rankTone = summary.rank ? RANK_TONE[summary.rank] ?? RANK_TONE.B : null;

  const stats4: Array<[string, React.ReactNode, string]> = [
    ["Acc", `${summary.accuracy}%`, "accuracy"],
    ["Avg", summary.avgReactionMs ? `${summary.avgReactionMs} ms` : "—", "reaction"],
    ["Streak", String(summary.bestStreak), "streak"],
    [
      summary.mode === "practice" ? "Sparks" : "Sparks",
      `+${summary.mode === "practice" ? 0 : sparksForRun(summary.score, summary.bestStreak)}`,
      "sparks",
    ],
  ];

  return (
    <Shell label="Run summary">
      {versus ? (
        <div className="text-center">
          <p className="t-eyebrow">Versus complete</p>
          <div className="t-display mt-2">
            {summary.winner === 2 ? "It's a tie" : `Player ${(summary.winner ?? 0) + 1} wins`}
          </div>
          <p className="t-body num mt-2">
            P1 {versus[0]} <span className="faint">·</span> P2 {versus[1]}
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="t-eyebrow">{def.label} complete</p>

          {summary.mode !== "practice" && summary.rank && rankTone && (
            <motion.div
              initial={{ opacity: 0, scale: 1.12, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: -3 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
              className="mx-auto mt-3 w-fit"
            >
              <span
                className="inline-flex items-center rounded-xl border px-3 py-1 text-base font-bold tracking-[.18em]"
                style={{ color: rankTone.color, borderColor: rankTone.border, background: rankTone.background }}
              >
                {summary.rank}
              </span>
            </motion.div>
          )}

          <div className="num mt-2 text-[46px] font-semibold leading-none tracking-[-.05em] txt">
            {summary.score.toLocaleString()}
          </div>

          {summary.newBest ? (
            <p className="anim-fade mt-2 text-[11px] font-semibold uppercase tracking-[.14em]" style={{ color: "var(--brand)" }}>
              New personal best
            </p>
          ) : (
            <p className="t-caption num mt-2 uppercase tracking-[.12em]">
              {summary.mode === "practice"
                ? "UNRANKED · TRAINING ONLY"
                : `Best ${summary.best.toLocaleString()}`}
            </p>
          )}

          {summary.modifierMultiplier && summary.modifierMultiplier > 1 && (
            <p className="t-caption num mt-2">
              {summary.modifierMultiplier.toFixed(2)}× modifier multiplier applied
            </p>
          )}
        </div>
      )}

      <div className="dialog-stats mt-5">
        {stats4.map(([label, value, key], i) => (
          <motion.div key={key} custom={i} variants={rowVariants} initial="hidden" animate="visible" className="dialog-stat">
            <span>{label}</span>
            <strong>{value}</strong>
          </motion.div>
        ))}
      </div>

      {stats && !versus && summary.mode !== "practice" && (
        <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--pill)" }}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="t-caption">Level {level?.currentLevel ?? 1}</span>
            <span className="num text-[12px] font-semibold" style={{ color: "var(--brand)" }}>
              +{xpGain.toLocaleString()} XP
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-raised)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((level?.progress ?? 0) * 100)}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              className="h-full rounded-full"
              style={{ background: "var(--brand)" }}
            />
          </div>
        </div>
      )}

      {reactionNote && !versus && <p className="t-caption mt-3 text-center">{reactionNote}</p>}

      <div className="dialog-actions mt-5">
        <motion.button whileTap={{ scale: 0.985 }} onClick={onAgain} className="dialog-btn dialog-btn-primary">
          Play again
        </motion.button>
        <div className="grid grid-cols-2 gap-2">
          <motion.button whileTap={{ scale: 0.985 }} onClick={onShare} className="dialog-btn">
            {shared ? "Copied" : "Share"}
          </motion.button>
          <motion.button whileTap={{ scale: 0.985 }} onClick={onHome} className="dialog-btn">
            Home
          </motion.button>
        </div>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------- prep / loadout

export function PrepOverlay({
  mode,
  profile,
  onUpdateProfile,
  stats,
  onUpdateStats: _onUpdateStats,
  onStart,
  onCancel,
  settings: _settings,
  modifierMultiplier = 1.0,
  onOpenModifiers,
}: {
  mode: GameMode;
  profile: Profile;
  onUpdateProfile: (p: Profile) => void;
  stats: Stats;
  onUpdateStats: (s: Stats) => void;
  onStart: () => void;
  onCancel: () => void;
  settings?: Settings;
  modifierMultiplier?: number;
  onOpenModifiers?: () => void;
}) {
  const def = MODES[mode];

  const cycleAvatar = () => {
    uiTap();
    const ownedAvatars = STORE_ITEMS.filter((i) => i.tab === "avatars" && profile.purchased.includes(i.id))
      .map((i) => i.apply?.avatarId)
      .filter(Boolean) as string[];
    const all = [
      ...new Set([...AVATARS.filter((a) => isUnlocked(a.rule, stats)).map((a) => a.id), ...ownedAvatars]),
    ];
    const currentIndex = all.indexOf(profile.avatarId);
    const next = all[(currentIndex + 1) % all.length];
    onUpdateProfile({ ...profile, avatarId: next });
  };

  return (
    <Shell label={`Loadout for ${def.label}`}>
      <div className="dialog-head">
        <div>
          <p className="t-eyebrow">{def.tag}</p>
          <h2 className="t-title mt-1">Loadout: {def.label}</h2>
        </div>
        <button
          aria-label="Close loadout"
          onClick={onCancel}
          className="icon-button icon-button-sm shrink-0"
        >
          <X size={16} />
        </button>
      </div>
      <p className="dialog-sub">Pick a look, check your rules, then start when you are ready.</p>

      <div className="mt-5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--pill)" }}>
          <div className="min-w-0">
            <span className="t-caption">Identity</span>
            <div className="truncate text-[13px] font-semibold capitalize txt">{profile.avatarId || "Default"}</div>
          </div>
          <button className="dialog-btn min-h-[38px] px-3 py-1.5 text-[12px]" onClick={cycleAvatar}>
            <Avatar profile={profile} name="" size={24} />
            Change
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--pill)" }}>
          <div className="min-w-0">
            <span className="t-caption">Modifiers</span>
            <div className="num text-[13px] font-semibold txt">
              {modifierMultiplier > 1
                ? `${modifierMultiplier.toFixed(2)}× score and XP`
                : "Standard rules · 1.00×"}
            </div>
          </div>
          {onOpenModifiers && (
            <button className="dialog-btn min-h-[38px] px-3 py-1.5 text-[12px]" onClick={onOpenModifiers}>
              Tune
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-1 pt-1 text-[12px]" style={{ color: "var(--text-faint)" }}>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={13} style={{ color: "var(--brand)" }} />
            <span className="num">{(stats.sparks ?? 0).toLocaleString()}</span> sparks
          </span>
          <span className="sf-mono text-[11px]">{def.tag}</span>
        </div>
      </div>

      <div className="dialog-actions mt-6">
        <button
          onClick={() => {
            uiConfirm();
            onStart();
          }}
          className="dialog-btn dialog-btn-primary"
        >
          Start Run
        </button>
      </div>
    </Shell>
  );
}
