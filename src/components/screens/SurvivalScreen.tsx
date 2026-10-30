import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, ChevronLeft, ChevronRight, ArrowLeft, ShieldAlert, Zap, Clock, Heart, Award, CheckCircle2 } from "lucide-react";
import {
  SURVIVAL_LEVELS,
  type SurvivalLevel,
  getSurvivalLevel,
} from "../../game/survival";
import type { SurvivalProgress } from "../../game/storage";
import { uiConfirm, uiTap } from "../../game/haptics";

interface Props {
  survivalProgress: SurvivalProgress;
  onSelectLevel: (level: SurvivalLevel) => void;
  onBack: () => void;
}

export default function SurvivalScreen({ survivalProgress, onSelectLevel, onBack }: Props) {
  // Always default to current unlocked level
  const currentUnlocked = Math.min(10, Math.max(1, survivalProgress.unlockedLevel || 1));
  const [activeLevelId, setActiveLevelId] = useState<number>(currentUnlocked);

  const level = getSurvivalLevel(activeLevelId);
  const record = survivalProgress.levels[level.id];
  const isUnlocked = level.id <= currentUnlocked;
  const isCompleted = Boolean(record?.completed);
  const starsEarned = record?.stars ?? 0;

  const totalPossibleStars = SURVIVAL_LEVELS.length * 3;
  const currentTotalStars = survivalProgress.totalStars || 0;

  const handlePrev = () => {
    if (activeLevelId > 1) {
      uiTap();
      setActiveLevelId((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (activeLevelId < currentUnlocked) {
      uiTap();
      setActiveLevelId((prev) => prev + 1);
    }
  };

  const handleDeploy = () => {
    if (!isUnlocked) return;
    uiConfirm();
    onSelectLevel(level);
  };

  return (
    <div className="relative min-h-[85vh] w-full px-4 pt-4 pb-20 sm:px-6 sm:pt-6 max-w-2xl mx-auto text-zinc-100 flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              uiTap();
              onBack();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </motion.button>

          {/* Stepper info */}
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <span>Sector {level.id} of 10</span>
            <span className="text-zinc-600">·</span>
            <div className="flex items-center gap-1 text-amber-400">
              <Star size={13} className="fill-amber-400" />
              <span className="num text-xs font-bold">{currentTotalStars}/{totalPossibleStars}</span>
            </div>
          </div>
        </div>

        {/* Level Stepper Dots */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {SURVIVAL_LEVELS.map((lvl) => {
            const isDotUnlocked = lvl.id <= currentUnlocked;
            const isDotCurrent = lvl.id === activeLevelId;
            const isDotCompleted = Boolean(survivalProgress.levels[lvl.id]?.completed);

            return (
              <button
                key={lvl.id}
                type="button"
                disabled={!isDotUnlocked}
                onClick={() => {
                  if (isDotUnlocked) {
                    uiTap();
                    setActiveLevelId(lvl.id);
                  }
                }}
                title={`Sector ${lvl.id}: ${lvl.title}`}
                className={`transition-all ${
                  isDotCurrent
                    ? "h-2 w-7 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                    : isDotCompleted
                      ? "h-2 w-2 rounded-full bg-emerald-400 hover:scale-125"
                      : isDotUnlocked
                        ? "h-2 w-2 rounded-full bg-zinc-500 hover:scale-125"
                        : "h-2 w-2 rounded-full bg-zinc-800 opacity-40 cursor-not-allowed"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Main Single Level Preview Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={level.id}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="my-5 rounded-3xl border border-zinc-800 bg-zinc-950/85 p-6 sm:p-7 backdrop-blur-md shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Sector Watermark */}
          <div className="pointer-events-none absolute -right-6 -bottom-8 text-[110px] font-black text-white/[0.03] select-none leading-none">
            {String(level.id).padStart(2, "0")}
          </div>

          {/* Level Header Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="num text-xs font-bold rounded-lg bg-zinc-800 text-zinc-200 px-2.5 py-1">
                SECTOR {String(level.id).padStart(2, "0")}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider rounded-md border px-2 py-0.5 ${level.badgeColor}`}
              >
                {level.badge}
              </span>
            </div>

            {isCompleted ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-0.5">
                <CheckCircle2 size={13} /> Cleared
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-full px-2.5 py-0.5">
                Current Objective
              </span>
            )}
          </div>

          {/* Title & Description */}
          <div className="mt-4">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {level.title}
            </h2>
            <p className="mt-1 text-sm font-semibold text-zinc-300">{level.subtitle}</p>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl">
              {level.taskDescription}
            </p>
          </div>

          {/* Level Rules Grid */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                <Heart size={14} className="text-rose-400" />
                <span>Lives</span>
              </div>
              <div className="num mt-1 text-sm sm:text-base font-bold text-white">
                {level.lives >= 999
                  ? "Clock Lives"
                  : `${level.lives} ${level.lives === 1 ? "Heart (Sudden)" : "Hearts"}`}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                <Clock size={14} className="text-amber-400" />
                <span>Timer / Pace</span>
              </div>
              <div className="num mt-1 text-sm sm:text-base font-bold text-white">
                {level.duration ? `${level.duration}s limit` : `${level.roundTime}s / arrow`}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                <Zap size={14} className="text-yellow-400" />
                <span>Target / Quota</span>
              </div>
              <div className="num mt-1 text-sm sm:text-base font-bold text-white">
                {level.targetHits ? `${level.targetHits} Hits` : "Time Survival"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                <ShieldAlert size={14} className="text-purple-400" />
                <span>Precision</span>
              </div>
              <div className="num mt-1 text-sm sm:text-base font-bold text-white">
                {level.noWrong ? "Zero Mistakes (No Wrong)" : "Standard Tolerance"}
              </div>
            </div>
          </div>

          {/* Star Goals */}
          <div className="mt-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center justify-between">
              <span>Star Mastery Goals</span>
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    size={13}
                    className={starsEarned >= s ? "fill-amber-400" : "text-zinc-700 fill-zinc-900"}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Star
                size={13}
                className={starsEarned >= 1 ? "fill-amber-400 text-amber-400 shrink-0" : "text-zinc-600 shrink-0"}
              />
              <span className={starsEarned >= 1 ? "text-zinc-200 font-medium" : "text-zinc-400"}>
                1★ {level.starGoals.star1}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Star
                size={13}
                className={starsEarned >= 2 ? "fill-amber-400 text-amber-400 shrink-0" : "text-zinc-600 shrink-0"}
              />
              <span className={starsEarned >= 2 ? "text-zinc-200 font-medium" : "text-zinc-400"}>
                2★ {level.starGoals.star2}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Star
                size={13}
                className={starsEarned >= 3 ? "fill-amber-400 text-amber-400 shrink-0" : "text-zinc-600 shrink-0"}
              />
              <span className={starsEarned >= 3 ? "text-zinc-200 font-medium" : "text-zinc-400"}>
                3★ {level.starGoals.star3}
              </span>
            </div>
          </div>

          {/* Bounty Rewards & Record */}
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Award size={16} />
              <span>Sector Bounty</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="num text-xs font-bold text-amber-400">+{level.rewardSparks} Sparks</span>
              <span className="num text-xs font-bold text-cyan-400">+{level.rewardDiamonds} Dia</span>
            </div>
          </div>

          {isCompleted && record?.bestScore > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>Personal Best</span>
              <span className="num font-bold text-zinc-200">{record.bestScore.toLocaleString()} pts</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Actions: Previous/Next Navigation + Deploy Button */}
      <div className="space-y-3">
        {/* Navigation Bar if player has multiple unlocked sectors */}
        {currentUnlocked > 1 && (
          <div className="flex items-center justify-between gap-2 px-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={activeLevelId <= 1}
              onClick={handlePrev}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                activeLevelId > 1
                  ? "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                  : "border-transparent text-zinc-700 opacity-40 cursor-not-allowed"
              }`}
            >
              <ChevronLeft size={16} />
              <span>Prev Sector</span>
            </motion.button>

            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              {activeLevelId === currentUnlocked ? "Current Mission" : `Sector ${activeLevelId} (Unlocked)`}
            </span>

            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={activeLevelId >= currentUnlocked}
              onClick={handleNext}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                activeLevelId < currentUnlocked
                  ? "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                  : "border-transparent text-zinc-700 opacity-40 cursor-not-allowed"
              }`}
            >
              <span>Next Sector</span>
              <ChevronRight size={16} />
            </motion.button>
          </div>
        )}

        {/* Primary Deploy Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
          onClick={handleDeploy}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:brightness-110 cursor-pointer"
        >
          <span>Deploy to Sector {level.id}</span>
          <ChevronRight size={18} />
        </motion.button>
      </div>
    </div>
  );
}
