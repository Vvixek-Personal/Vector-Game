import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, Lock, CheckCircle2, ChevronRight, ArrowLeft, ShieldAlert, Zap, Clock, Heart, Award } from "lucide-react";
import {
  SURVIVAL_LEVELS,
  type SurvivalLevel,
} from "../../game/survival";
import type { SurvivalProgress } from "../../game/storage";
import { uiConfirm, uiTap } from "../../game/haptics";

interface Props {
  survivalProgress: SurvivalProgress;
  onSelectLevel: (level: SurvivalLevel) => void;
  onBack: () => void;
}

export default function SurvivalScreen({ survivalProgress, onSelectLevel, onBack }: Props) {
  const [selectedLevelId, setSelectedLevelId] = useState<number>(() => {
    // Default to the highest unlocked level that is not yet completed, or level 1
    const unlocked = survivalProgress.unlockedLevel || 1;
    return Math.min(10, Math.max(1, unlocked));
  });

  const selectedLevel = SURVIVAL_LEVELS.find((l) => l.id === selectedLevelId) || SURVIVAL_LEVELS[0];
  const isSelectedUnlocked = selectedLevel.id <= survivalProgress.unlockedLevel;
  const selectedRecord = survivalProgress.levels[selectedLevel.id];

  const totalPossibleStars = SURVIVAL_LEVELS.length * 3;
  const currentTotalStars = survivalProgress.totalStars || 0;
  const starPercentage = Math.round((currentTotalStars / totalPossibleStars) * 100);

  const handleLevelClick = (level: SurvivalLevel) => {
    uiTap();
    setSelectedLevelId(level.id);
  };

  const handleDeploy = () => {
    if (!isSelectedUnlocked) return;
    uiConfirm();
    onSelectLevel(selectedLevel);
  };

  return (
    <div className="relative min-h-screen w-full px-4 pt-6 pb-28 sm:px-8 sm:pt-8 max-w-5xl mx-auto text-zinc-100">
      {/* Top Navigation & Header */}
      <div className="flex items-center justify-between gap-4">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            uiTap();
            onBack();
          }}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-700/60 bg-zinc-900/70 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Exit Survival</span>
        </motion.button>

        {/* Global Stars Counter */}
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 px-3.5 py-1.5 shadow-inner">
          <div className="flex items-center gap-1.5">
            <Star size={16} className="fill-amber-400 text-amber-400" />
            <span className="num text-xs font-bold text-amber-300">
              {currentTotalStars} / {totalPossibleStars}
            </span>
          </div>
          <div className="h-2 w-20 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${starPercentage}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-zinc-400">{starPercentage}%</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="mt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-bold text-rose-400 uppercase tracking-widest">
          <ShieldAlert size={14} /> Campaign Gauntlet
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
          Survival Mode
        </h1>
        <p className="mt-1 text-sm text-zinc-400 max-w-xl">
          Progress through 10 distinct sectors. Rules shift dynamically between 1-heart sudden death,
          tight time trials, rush clock drain, and flawless precision trials.
        </p>
      </div>

      {/* Main Grid: Level List (Left) + Selected Level Brief (Right on larger screens) */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Level List: 10 Sectors */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1 mb-1">
            <span>SECTOR TIMELINE</span>
            <span>UNLOCKED: {Math.min(10, survivalProgress.unlockedLevel)} / 10</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SURVIVAL_LEVELS.map((level) => {
              const unlocked = level.id <= survivalProgress.unlockedLevel;
              const record = survivalProgress.levels[level.id];
              const isSelected = level.id === selectedLevelId;
              const stars = record?.stars ?? 0;

              return (
                <motion.button
                  key={level.id}
                  whileHover={{ y: unlocked ? -2 : 0 }}
                  whileTap={{ scale: unlocked ? 0.98 : 1 }}
                  onClick={() => handleLevelClick(level)}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-rose-500/80 bg-zinc-900/90 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                      : unlocked
                        ? "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/50"
                        : "border-zinc-900 bg-zinc-950/25 opacity-55 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`num text-xs font-bold rounded-lg px-2 py-0.5 ${
                          unlocked ? "bg-zinc-800 text-zinc-200" : "bg-zinc-900 text-zinc-600"
                        }`}
                      >
                        S{String(level.id).padStart(2, "0")}
                      </span>
                      <span
                        className={`text-[9.5px] font-bold uppercase tracking-wider rounded-md border px-1.5 py-0.5 ${
                          unlocked ? level.badgeColor : "border-zinc-800 text-zinc-600 bg-zinc-900"
                        }`}
                      >
                        {level.badge}
                      </span>
                    </div>

                    {!unlocked ? (
                      <Lock size={15} className="text-zinc-600 shrink-0" />
                    ) : record?.completed ? (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <div className="text-base font-bold text-white tracking-tight">
                      {level.title}
                    </div>
                    <div className="text-xs text-zinc-400 line-clamp-1">{level.subtitle}</div>
                  </div>

                  {/* Star Rating & Best Score */}
                  <div className="mt-3.5 flex items-center justify-between border-t border-zinc-800/60 pt-2.5 text-xs">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          size={13}
                          className={
                            stars >= starIdx
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-700 fill-zinc-900"
                          }
                        />
                      ))}
                    </div>
                    {record?.completed && record.bestScore > 0 ? (
                      <span className="num text-[11px] font-semibold text-zinc-400">
                        {record.bestScore.toLocaleString()} pts
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {unlocked ? "Ready" : "Locked"}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected Sector Brief Panel (Right) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 rounded-3xl border border-zinc-800 bg-zinc-950/85 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                Sector Briefing · S{selectedLevel.id}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider rounded-md border px-2 py-0.5 ${
                  isSelectedUnlocked
                    ? selectedLevel.badgeColor
                    : "border-zinc-800 text-zinc-500 bg-zinc-900"
                }`}
              >
                {selectedLevel.badge}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
              {selectedLevel.title}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">{selectedLevel.taskDescription}</p>

            {/* Constraints & Mechanics Grid */}
            <div className="mt-5 grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3">
                <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                  <Heart size={14} className="text-rose-400" />
                  <span>Lives</span>
                </div>
                <div className="num mt-1 text-base font-bold text-white">
                  {selectedLevel.lives >= 999
                    ? "Clock Lives"
                    : `${selectedLevel.lives} ${selectedLevel.lives === 1 ? "Heart (Sudden)" : "Hearts"}`}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3">
                <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                  <Clock size={14} className="text-amber-400" />
                  <span>Objective Pace</span>
                </div>
                <div className="num mt-1 text-base font-bold text-white">
                  {selectedLevel.duration ? `${selectedLevel.duration}s limit` : `${selectedLevel.roundTime}s / arrow`}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3">
                <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                  <Zap size={14} className="text-yellow-400" />
                  <span>Quota / Target</span>
                </div>
                <div className="num mt-1 text-base font-bold text-white">
                  {selectedLevel.targetHits ? `${selectedLevel.targetHits} Hits` : "Time Survival"}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3">
                <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                  <ShieldAlert size={14} className="text-purple-400" />
                  <span>Error Tolerance</span>
                </div>
                <div className="num mt-1 text-base font-bold text-white">
                  {selectedLevel.noWrong ? "Zero Mistakes" : "Standard Lives"}
                </div>
              </div>
            </div>

            {/* Star Goals */}
            <div className="mt-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3.5 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center justify-between">
                <span>Star Requirements</span>
                <span className="text-amber-400 num">
                  {selectedRecord?.stars ?? 0} / 3 ★
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Star
                  size={13}
                  className={(selectedRecord?.stars ?? 0) >= 1 ? "fill-amber-400 text-amber-400" : "text-zinc-600"}
                />
                <span className={(selectedRecord?.stars ?? 0) >= 1 ? "text-zinc-200 font-medium" : "text-zinc-400"}>
                  1★ {selectedLevel.starGoals.star1}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Star
                  size={13}
                  className={(selectedRecord?.stars ?? 0) >= 2 ? "fill-amber-400 text-amber-400" : "text-zinc-600"}
                />
                <span className={(selectedRecord?.stars ?? 0) >= 2 ? "text-zinc-200 font-medium" : "text-zinc-400"}>
                  2★ {selectedLevel.starGoals.star2}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Star
                  size={13}
                  className={(selectedRecord?.stars ?? 0) >= 3 ? "fill-amber-400 text-amber-400" : "text-zinc-600"}
                />
                <span className={(selectedRecord?.stars ?? 0) >= 3 ? "text-zinc-200 font-medium" : "text-zinc-400"}>
                  3★ {selectedLevel.starGoals.star3}
                </span>
              </div>
            </div>

            {/* Rewards */}
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <Award size={16} />
                <span>Sector Clear Bounty</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="num text-xs font-bold text-amber-400">
                  +{selectedLevel.rewardSparks} Sparks
                </span>
                <span className="num text-xs font-bold text-cyan-400">
                  +{selectedLevel.rewardDiamonds} Dia
                </span>
              </div>
            </div>

            {/* Launch Button */}
            <div className="mt-5">
              {isSelectedUnlocked ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={handleDeploy}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:brightness-110 cursor-pointer"
                >
                  <span>Deploy to Sector {selectedLevel.id}</span>
                  <ChevronRight size={18} />
                </motion.button>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 py-3.5 text-xs font-semibold text-zinc-500">
                  <Lock size={15} />
                  <span>Clear Sector {selectedLevel.id - 1} to unlock</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
