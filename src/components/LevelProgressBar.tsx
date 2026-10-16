import React from "react";
import { motion } from "motion/react";
import type { Stats } from "../game/storage";
import type { Profile } from "../game/profile";
import {
  getPlayerLevelProgress,
  LEVEL_REWARDS,
  getStoreItemForReward,
} from "../game/levels";
import { Zap, Sparkles, Gem, ArrowRight, ShieldAlert, Award } from "lucide-react";

interface Props {
  stats: Stats;
  profile: Profile;
  onOpenRail?: () => void;
}

export default function LevelProgressBar({ stats, profile, onOpenRail }: Props) {
  const levelInfo = getPlayerLevelProgress(stats, profile);
  const { currentLevel, currentXp, levelBaseXp, nextLevelXp, progress, maxLevel } = levelInfo;

  const xpInto = Math.max(0, currentXp - levelBaseXp);
  const xpNeededForLevel = Math.max(1, nextLevelXp - levelBaseXp);
  const xpRemaining = Math.max(0, nextLevelXp - currentXp);
  const percentNumber = Math.min(100, Math.round(progress * 100));

  // Next level reward info
  const nextLevelRewardDef = LEVEL_REWARDS.find((r) => r.level > currentLevel);
  const nextItem = nextLevelRewardDef ? getStoreItemForReward(nextLevelRewardDef) : undefined;

  // Rank title depending on level tier
  const getRankTier = (lvl: number) => {
    if (lvl === 0) return { title: "Trainee", color: "text-white/60", badge: "bg-white/10" };
    if (lvl < 10) return { title: "Operative", color: "text-sky-300", badge: "bg-sky-500/20 border-sky-400/30" };
    if (lvl < 20) return { title: "Vanguard", color: "text-cyan-300", badge: "bg-cyan-500/20 border-cyan-400/30" };
    if (lvl < 30) return { title: "Specialist", color: "text-indigo-300", badge: "bg-indigo-500/20 border-indigo-400/30" };
    if (lvl < 40) return { title: "Elite", color: "text-purple-300", badge: "bg-purple-500/20 border-purple-400/30" };
    if (lvl < 50) return { title: "Sovereign", color: "text-amber-300", badge: "bg-amber-500/20 border-amber-400/30" };
    return { title: "Grandmaster", color: "text-rose-300", badge: "bg-rose-500/20 border-rose-400/30" };
  };

  const rank = getRankTier(currentLevel);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-b from-slate-900/90 via-black/90 to-black/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* Ambient background glow */}
      <div
        className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(56,189,248,0.8) 0%, rgba(99,102,241,0.3) 70%, transparent 100%)",
        }}
      />
      <div
        className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full opacity-15 pointer-events-none blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.7) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 space-y-4">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Level & Rank info */}
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-600 to-cyan-500 flex flex-col items-center justify-center text-white shadow-[0_0_20px_rgba(56,189,248,0.35)] border border-white/25">
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-200 leading-none">
                  LVL
                </span>
                <span className="text-xl sm:text-2xl font-black leading-none mt-0.5">
                  {currentLevel}
                </span>
              </div>
              {currentLevel === 0 && (
                <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-amber-500 text-[9px] font-black text-black">
                  NEW
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight m-0">
                  Level {currentLevel}{" "}
                  <span className="text-white/40 font-normal">→</span> Level{" "}
                  {Math.min(maxLevel, currentLevel + 1)}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${rank.badge} ${rank.color}`}
                >
                  {rank.title}
                </span>
              </div>

              <p className="text-xs text-white/50 m-0 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Total Lifetime XP:</span>
                <span className="font-bold text-white">{currentXp.toLocaleString()}</span>
                <span className="text-white/20">·</span>
                {currentLevel >= maxLevel ? (
                  <span className="text-amber-300 font-bold">Max Progression Master</span>
                ) : (
                  <span>
                    <strong className="text-sky-300">{xpRemaining.toLocaleString()} XP</strong> to
                    next level
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* XP Numbers & Progress Percent badge */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
            <div className="text-sm sm:text-base font-black tracking-tight">
              <span className="text-sky-300 font-extrabold">{xpInto.toLocaleString()}</span>
              <span className="text-white/40 font-medium"> / </span>
              <span className="text-white/80">{xpNeededForLevel.toLocaleString()} XP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-cyan-300 px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 font-mono">
                {percentNumber}%
              </span>
              {currentLevel < maxLevel && (
                <span className="text-[11px] text-white/50 hidden sm:inline">COMPLETE</span>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* THE FLUID HORIZONTAL PROGRESS BAR */}
        {/* ========================================================= */}
        <div className="relative pt-1">
          {/* Main Bar Track */}
          <div className="relative h-8 sm:h-9 w-full rounded-2xl bg-black/80 border border-white/15 p-1 overflow-hidden shadow-inner flex items-center">
            {/* Guide Grid Lines / Ticks at 25%, 50%, 75% */}
            <div className="absolute inset-0 flex justify-between px-3 pointer-events-none z-0">
              <div className="h-full w-px bg-white/5" style={{ left: "25%", position: "absolute" }} />
              <div className="h-full w-px bg-white/10" style={{ left: "50%", position: "absolute" }} />
              <div className="h-full w-px bg-white/5" style={{ left: "75%", position: "absolute" }} />
            </div>

            {/* The Fluid Liquid Fill */}
            <motion.div
              className="h-full rounded-xl relative overflow-hidden fluid-liquid-stream shadow-[0_0_20px_rgba(56,189,248,0.5)]"
              initial={{ width: 0 }}
              animate={{
                width: `${currentLevel >= maxLevel ? 100 : Math.max(percentNumber === 0 ? 1.5 : percentNumber, 1.5)}%`,
              }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Traveling Shimmer Gloss Highlight Wave */}
              <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent liquid-shine-effect pointer-events-none" />

              {/* Surface Wave Pattern overlay */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 6px, transparent 6px, transparent 12px)",
                }}
              />

              {/* Leading Edge Glowing Plasma Node */}
              <div className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_#38bdf8,0_0_20px_#ffffff]" />
                <div className="absolute w-5 h-5 rounded-full bg-cyan-400/50 animate-ping" />
              </div>
            </motion.div>

            {/* In-bar Percent text on desktop for high contrast */}
            <div className="absolute right-4 text-[11px] font-black tracking-wider text-white/80 pointer-events-none z-10 hidden sm:block">
              {percentNumber}%
            </div>
          </div>

          {/* Sub-bar tick labels */}
          <div className="flex justify-between items-center text-[10px] font-bold text-white/40 px-1 mt-1 font-mono">
            <span>LVL {currentLevel} (0 XP)</span>
            <span className="hidden sm:inline">25%</span>
            <span className="hidden sm:inline">50% MIDPOINT</span>
            <span className="hidden sm:inline">75%</span>
            <span className="text-sky-300">
              {currentLevel >= maxLevel ? "MAX LEVEL" : `LVL ${currentLevel + 1} (${xpNeededForLevel} XP)`}
            </span>
          </div>
        </div>

        {/* Bottom Context & Next Reward Preview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-white/10 text-xs">
          {nextItem && nextLevelRewardDef ? (
            <div className="flex items-center gap-2 text-white/70">
              <span className="text-white/40 font-semibold">Next Unlock at Level {nextLevelRewardDef.level}:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 border border-white/15 text-white font-bold">
                <Sparkles size={12} className="text-amber-400" />
                <span>{nextItem.name}</span>
                <span className="text-[10px] text-sky-300 uppercase font-semibold">
                  ({nextItem.tab.slice(0, -1)})
                </span>
                {nextLevelRewardDef.diamonds && nextLevelRewardDef.diamonds > 0 && (
                  <span className="text-[10px] text-cyan-300 font-extrabold flex items-center gap-0.5 ml-1">
                    <Gem size={10} /> +{nextLevelRewardDef.diamonds}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="text-white/60">All 50 level rewards mastered!</div>
          )}

          {onOpenRail && (
            <button
              onClick={onOpenRail}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-300 hover:text-sky-200 transition cursor-pointer self-start sm:self-auto"
            >
              <span>Explore Rail Progression</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
