import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  type MissionsState,
  type Mission,
  loadMissions,
  claimMissionReward,
} from "../../game/missions";
import type { Profile } from "../../game/profile";
import type { Stats } from "../../game/storage";
import { getPlayerLevelProgress } from "../../game/levels";
import { uiTap, uiConfirm, uiUnlock } from "../../game/haptics";
import Icon from "../Icon";

interface MissionsScreenProps {
  profile: Profile;
  onUpdateProfile: (p: Profile) => void;
  stats: Stats;
  onUpdateStats: (s: Stats) => void;
  onPlay: () => void;
}

export default function MissionsScreen({
  profile,
  onUpdateProfile,
  stats,
  onUpdateStats,
  onPlay,
}: MissionsScreenProps) {
  const [missionsState, setMissionsState] = useState<MissionsState>(() => loadMissions());
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [claimCelebration, setClaimCelebration] = useState<{
    title: string;
    xp: number;
    sparks: number;
    diamonds: number;
  } | null>(null);

  const levelProgress = getPlayerLevelProgress(profile.xp || 0);
  const missions = missionsState[activeTab];

  const handleClaim = (missionId: string) => {
    uiConfirm();
    const res = claimMissionReward(missionId, missionsState, profile, stats);
    if (res) {
      setMissionsState(res.nextState);
      onUpdateProfile(res.nextProfile);
      onUpdateStats(res.nextStats);
      uiUnlock();
      setClaimCelebration({
        title: res.mission.title,
        xp: res.mission.rewardXp,
        sparks: res.mission.rewardSparks,
        diamonds: res.mission.rewardDiamonds,
      });
      setTimeout(() => setClaimCelebration(null), 3200);
    }
  };

  const dailyReadyCount = missionsState.daily.filter((m) => m.completed && !m.claimed).length;
  const weeklyReadyCount = missionsState.weekly.filter((m) => m.completed && !m.claimed).length;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 pb-24 text-white">
      {/* Top Level Bar */}
      <div className="mb-6 p-4 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/30">
            {levelProgress.level}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wide text-white uppercase">
                {levelProgress.tierName} Operative
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Rank {levelProgress.level}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {levelProgress.xpIntoLevel.toLocaleString()} / {levelProgress.xpNeededForNext.toLocaleString()} XP to Level {levelProgress.level + 1}
            </div>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="w-full sm:w-60 flex flex-col gap-1.5">
          <div className="w-full h-3 rounded-full bg-slate-800 border border-white/5 overflow-hidden p-0.5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 shadow-sm"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress.progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>Progress</span>
            <span className="text-white font-bold">{Math.round(levelProgress.progressPct)}%</span>
          </div>
        </div>
      </div>

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-xs uppercase tracking-wider mb-1.5">
            <span>🎯</span> HQ Mission Command
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Daily Bounties & Ops
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Execute tactical objectives to harvest bonus XP, Sparks, and Diamond crystals.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => {
              uiTap();
              setActiveTab("daily");
            }}
            className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "daily" ? "text-white bg-indigo-600 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Daily Ops
            {dailyReadyCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px]">
                {dailyReadyCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              uiTap();
              setActiveTab("weekly");
            }}
            className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "weekly" ? "text-white bg-indigo-600 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Weekly Raids
            {weeklyReadyCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px]">
                {weeklyReadyCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              uiTap();
              setActiveTab("monthly");
            }}
            className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "monthly" ? "text-white bg-indigo-600 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Milestones
          </button>
        </div>
      </div>

      {/* Claim Toast Celebration */}
      <AnimatePresence>
        {claimCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <div className="text-xs uppercase font-black tracking-wider text-emerald-200">
                  Bounty Claimed!
                </div>
                <div className="font-extrabold text-sm">{claimCelebration.title}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-black">
              <span className="px-2 py-1 rounded-lg bg-black/20">+{claimCelebration.xp} XP</span>
              <span className="px-2 py-1 rounded-lg bg-black/20 text-amber-300">+{claimCelebration.sparks} ✦</span>
              <span className="px-2 py-1 rounded-lg bg-black/20 text-emerald-300">+{claimCelebration.diamonds} ◆</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mission Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions.map((mission) => {
          const progressPct = Math.min(100, Math.max(0, (mission.progress / mission.requirement) * 100));
          const isReadyToClaim = mission.completed && !mission.claimed;

          return (
            <motion.div
              key={mission.id}
              whileHover={{ y: -2 }}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between min-h-[170px] ${
                mission.claimed
                  ? "bg-slate-900/40 border-slate-800/60 opacity-60"
                  : isReadyToClaim
                  ? "bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/10"
                  : "bg-slate-900/80 border-white/10"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-black text-white text-base tracking-tight">{mission.title}</h3>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      mission.claimed
                        ? "bg-slate-800 text-slate-400 border-slate-700"
                        : isReadyToClaim
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                        : "bg-white/5 text-slate-300 border-white/10"
                    }`}
                  >
                    {mission.claimed ? "Completed" : isReadyToClaim ? "Ready!" : `${Math.round(progressPct)}%`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{mission.description}</p>
              </div>

              <div>
                {/* Progress bar */}
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mb-1">
                  <span>Progress</span>
                  <span className="text-white">
                    {mission.progress.toLocaleString()} / {mission.requirement.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      mission.completed
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : "bg-gradient-to-r from-indigo-500 to-cyan-400"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Bottom Row: Rewards & Action */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="text-indigo-400">+{mission.rewardXp} XP</span>
                    <span className="text-amber-400">+{mission.rewardSparks} ✦</span>
                    <span className="text-emerald-400">+{mission.rewardDiamonds} ◆</span>
                  </div>

                  {mission.claimed ? (
                    <span className="text-xs text-slate-500 font-bold">Claimed ✓</span>
                  ) : isReadyToClaim ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleClaim(mission.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/30 cursor-pointer"
                    >
                      Claim Reward
                    </motion.button>
                  ) : (
                    <button
                      onClick={onPlay}
                      className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition cursor-pointer"
                    >
                      Deploy →
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
