import React, { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import type { GameSummary, GameMode } from "../../game/types";
import { MODES } from "../../game/types";
import { sparksForRun, spendSparks, type Stats, codeLabel, type Settings } from "../../game/storage";
import type { Profile } from "../../game/profile";
import { STORE_ITEMS } from "../../game/catalog";
import { uiConfirm, uiTap } from "../../game/haptics";
import Avatar from "../Avatar";
import { getPlayerLevelProgress } from "../../game/levels";

const Shell = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
  >
    <motion.div
      initial={{ scale: 0.92, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: 8 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b0818]/95 p-6 text-center shadow-2xl"
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
    body: "Diagonals need two directions held together — up and right makes north-east.",
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
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b0818]/95 p-6 text-center shadow-2xl"
      >
        <div className="anim-pop text-3xl font-black text-cyan-300">{s.icon}</div>
        <h2 className="mt-2 text-[19px] font-extrabold text-white">{s.title}</h2>
        <p className="mt-2 min-h-[3.5em] text-[14px] leading-relaxed text-white/50">{s.body}</p>
        <div className="mt-3 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-cyan-300" : "w-1.5 bg-white/15"}`} />
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : onDone())}
          className="btn brand-grad mt-5 w-full rounded-2xl py-3 text-[14px] font-black uppercase tracking-widest text-white"
        >
          {step < STEPS.length - 1 ? "Next" : "Let's play"}
        </motion.button>
        {step < STEPS.length - 1 && (
          <button onClick={onDone} className="mt-2 text-[11px] font-bold text-white/30 hover:text-white/60 transition-colors">
            Skip
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------- pause

export function PauseOverlay({
  score,
  mode,
  onResume,
  onRestart,
  onHome,
}: {
  score: number;
  mode: string;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}) {
  return (
    <Shell>
      <h2 className="gradient-title text-[30px] font-black uppercase tracking-tight">Paused</h2>
      <p className="mt-1 text-[11px] font-bold tracking-[0.25em] text-white/30">
        {MODES[mode as keyof typeof MODES].label.toUpperCase()} · {score.toLocaleString()} PTS
      </p>
      <div className="mt-5 space-y-2">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onResume} className="btn brand-grad w-full rounded-2xl py-3 text-[14px] font-black uppercase tracking-widest text-white">
          Resume
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onRestart} className="btn w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-[12px] font-bold uppercase tracking-widest text-white/70">
          Restart
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onHome} className="btn w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-[12px] font-bold uppercase tracking-widest text-white/50">
          Home
        </motion.button>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------- game over

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
  const levelProgress = stats && profile ? getPlayerLevelProgress(stats, profile) : null;

  const averageReaction = stats && stats.reactionCount > 0 
    ? Math.round(stats.reactionTotal / stats.reactionCount) 
    : 0;

  const reactionDiff = summary.avgReactionMs && averageReaction > 0
    ? averageReaction - summary.avgReactionMs
    : 0;
  
  const reactionText = reactionDiff > 5 
    ? `(${reactionDiff}ms faster than avg)`
    : reactionDiff < -5 
      ? `(${Math.abs(reactionDiff)}ms slower than avg)`
      : averageReaction > 0 ? `(Same as your average)` : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="my-auto w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b0818]/95 p-6 text-center shadow-2xl"
      >
        {versus ? (
          <>
            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-white/35">Versus over</div>
            <div className="mt-3 text-4xl font-black text-white">
              {summary.winner === 2 ? "It's a tie!" : `P${(summary.winner ?? 0) + 1} wins!`}
            </div>
            <div className="mt-2 text-[14px] font-extrabold text-white/60">
              P1 {versus[0]} <span className="text-white/25">·</span> P2 {versus[1]}
            </div>
          </>
        ) : (
          <>
            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-white/35">
              {def.label} complete
            </div>
            
            {/* Arcade Grade Stamp */}
            {summary.rank && (
              <motion.div
                initial={{ scale: 2.2, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: -5 }}
                transition={{ type: "spring", stiffness: 450, damping: 18, delay: 0.1 }}
                className="mx-auto my-2 w-fit"
              >
                <div
                  className={`px-3.5 py-0.5 rounded-2xl border-2 font-black text-xl tracking-widest uppercase shadow-xl ${
                    summary.rank === "SSS"
                      ? "bg-gradient-to-r from-amber-400 via-rose-400 to-amber-300 text-black border-white shadow-amber-500/40"
                      : summary.rank === "S"
                      ? "bg-amber-400/20 text-amber-300 border-amber-400/60 shadow-amber-500/20"
                      : summary.rank === "A"
                      ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/60 shadow-emerald-500/20"
                      : summary.rank === "B"
                      ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/60 shadow-cyan-500/20"
                      : "bg-slate-700/40 text-slate-300 border-slate-500/40"
                  }`}
                >
                  GRADE {summary.rank}
                </div>
              </motion.div>
            )}

            <div className="mt-1 text-5xl font-black tabular-nums text-white">{summary.score.toLocaleString()}</div>
            {summary.newBest ? (
              <div className="anim-pop mt-1.5 text-[12px] font-black tracking-[0.2em] text-amber-300">NEW PERSONAL BEST</div>
            ) : (
              <div className="mt-1.5 text-[11px] font-bold tracking-[0.2em] text-white/30">
                BEST {summary.best.toLocaleString()}
              </div>
            )}
            {summary.modifierMultiplier && summary.modifierMultiplier > 1 && (
              <div className="mt-2 flex items-center justify-center">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                  ⚡ {summary.modifierMultiplier}× Modifiers Multiplier
                </span>
              </div>
            )}
          </>
        )}

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {[
            ["ACC", `${summary.accuracy}%`],
            ["AVG", summary.avgReactionMs ? `${summary.avgReactionMs}ms` : "—"],
            ["STREAK", String(summary.bestStreak)],
            [<Sparkles size={12} className="inline-block" key="spark" />, `+${sparksForRun(summary.score, summary.bestStreak)}`],
          ].map(([k, v], i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-white/[0.04] px-1 py-2"
            >
              <div className="text-[8px] font-black tracking-widest text-white/25 flex justify-center">{k}</div>
              <div className="mt-0.5 text-[13px] font-extrabold text-white">{v}</div>
            </motion.div>
          ))}
        </div>

        {/* Level XP Progress Bar */}
        {stats && !versus && (
          <div className="mt-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-left">
            <div className="flex items-center justify-between text-[11px] font-bold text-white/70">
              <span>{levelProgress ? `Operative Level ${levelProgress.currentLevel}` : "Operative Rank"}</span>
              <span className="text-sky-400 font-extrabold">
                +{Math.round((summary.score * (summary.modifierMultiplier || 1)) / 10)} XP Gained
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.round(
                    (levelProgress
                      ? levelProgress.progress
                      : Math.min(1, ((stats.totalScore || 0) % 2000) / 2000)) * 100
                  )}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full"
              />
            </div>
            {levelProgress && (
              <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
                <span>{levelProgress.currentXp.toLocaleString()} XP</span>
                <span>
                  Next: Level {Math.min(100, levelProgress.currentLevel + 1)} ({levelProgress.nextLevelXp.toLocaleString()} XP)
                </span>
              </div>
            )}
          </div>
        )}
        
        {reactionText && !versus && (
          <div className="mt-2 text-[11px] font-medium text-white/40">
            {reactionText}
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAgain}
          className="btn brand-grad mt-5 w-full rounded-2xl py-3 text-[14px] font-black uppercase tracking-widest text-white"
        >
          Play again
        </motion.button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onShare}
            className="btn rounded-2xl border border-white/10 bg-white/5 py-2.5 text-[12px] font-bold uppercase tracking-widest text-white/70"
          >
            {shared ? "Copied ✓" : "Share"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onHome}
            className="btn rounded-2xl border border-white/10 bg-white/5 py-2.5 text-[12px] font-bold uppercase tracking-widest text-white/70"
          >
            Home
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function PrepOverlay({
  mode,
  profile,
  onUpdateProfile,
  stats,
  onUpdateStats,
  onStart,
  onCancel,
  settings,
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
    const ownedAvatars = STORE_ITEMS.filter(i => i.tab === "avatars" && profile.purchased.includes(i.id)).map(i => i.apply?.avatarId).filter(Boolean) as string[];
    const all = ["default", "spark", "prism", "diamond", ...ownedAvatars];
    const currentIndex = all.indexOf(profile.avatarId);
    const next = all[(currentIndex + 1) % all.length];
    onUpdateProfile({ ...profile, avatarId: next });
  };

  return (
    <Shell>
      <div className="relative">
        <button onClick={onCancel} className="absolute -right-2 -top-2 text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 transition">
          <X size={18} />
        </button>
        <h2 className="text-xl font-bold mb-1">Loadout: {def.label}</h2>
        <p className="text-white/50 text-sm mb-6">Choose your look and prepare for the run.</p>
        
        <div className="flex flex-col gap-3 mb-8">
          <div className="flex justify-between items-center rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <div className="flex flex-col text-left">
              <span className="text-xs text-white/40 font-medium">Equipped Identity</span>
              <span className="text-sm font-semibold text-white/90 capitalize">{profile.avatarId || "Default"}</span>
            </div>
            <button className="flex items-center gap-3 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 transition" onClick={cycleAvatar}>
              <Avatar profile={profile} name="" size={32} />
              <span className="text-xs font-bold uppercase tracking-wide text-white/70">Change</span>
            </button>
          </div>

          <div className="flex justify-between items-center rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <div className="flex flex-col text-left">
              <span className="text-xs text-white/40 font-medium">Challenge Modifiers</span>
              <span className="text-sm font-semibold text-amber-300">
                {modifierMultiplier > 1 ? `${modifierMultiplier.toFixed(2)}× Active Multiplier` : "Standard Rules (1.0×)"}
              </span>
            </div>
            {onOpenModifiers && (
              <button
                className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition cursor-pointer"
                onClick={onOpenModifiers}
              >
                ⚡ Tune
              </button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] p-3 border border-white/5 text-xs text-white/60">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles size={13} className="text-amber-300" />
              {(stats.sparks ?? 0).toLocaleString()} Sparks
            </span>
            <span className="font-mono text-[11px] text-white/40">{def.tag}</span>
          </div>
        </div>

        <button
          onClick={() => { uiConfirm(); onStart(); }}
          className="w-full rounded-2xl bg-white py-3.5 text-base font-extrabold text-black hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-white/10"
        >
          Start Run
        </button>
      </div>
    </Shell>
  );
}
