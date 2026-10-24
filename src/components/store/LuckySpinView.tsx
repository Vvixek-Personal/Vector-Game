import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  SPIN_SLICES,
  getRemainingFreeSpinMs,
  recordFreeSpinUsed,
  pickSpinRewardIndex,
  applySpinReward,
  type SpinReward,
} from "../../game/spin";
import { type Stats, spendSparks, spendDiamonds } from "../../game/storage";
import { type Profile } from "../../game/profile";
import { uiTap, uiConfirm, uiUnlock } from "../../game/haptics";
import { CanvasSpinWheel } from "./CanvasSpinWheel";
import { Sparkles, Disc, Award, Clock } from "lucide-react";

interface Props {
  stats: Stats;
  onStats: (s: Stats) => void;
  profile: Profile;
  onProfile: (p: Profile) => void;
  onMessage: (msg: string) => void;
}

export const LuckySpinView: React.FC<Props> = ({
  stats,
  onStats,
  profile,
  onProfile,
  onMessage,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reward, setReward] = useState<SpinReward | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [pointerBounce, setPointerBounce] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(getRemainingFreeSpinMs());
  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("vector_spin_history") || "[]");
    } catch {
      return [];
    }
  });

  const animFrameRef = useRef<number | null>(null);
  const currentRotationRef = useRef(0);
  const lastTickSliceRef = useRef<number>(-1);

  const sparks = stats.sparks ?? 0;
  const diamonds = stats.diamonds ?? 0;
  const freeAvailable = cooldownRemaining <= 0;

  // Countdown timer for free spin
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldownRemaining(getRemainingFreeSpinMs());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup any ongoing animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return "Ready Now!";
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const triggerPointerTick = () => {
    setPointerBounce(true);
    uiTap();
    window.setTimeout(() => setPointerBounce(false), 120);
  };

  const handleSpin = (costType: "free" | "sparks" | "diamonds") => {
    if (spinning) return;

    if (costType === "free") {
      if (!freeAvailable) return;
      recordFreeSpinUsed();
      setCooldownRemaining(getRemainingFreeSpinMs());
    } else if (costType === "sparks") {
      const next = spendSparks(150);
      if (!next) {
        onMessage("Need 150 Sparks for an extra spin!");
        return;
      }
      onStats(next);
    } else if (costType === "diamonds") {
      const next = spendDiamonds(5);
      if (!next) {
        onMessage("Need 5 Diamonds for a premium spin!");
        return;
      }
      onStats(next);
    }

    uiConfirm();
    setSpinning(true);
    setReward(null);
    setHighlightedIndex(null);

    const winningIndex = pickSpinRewardIndex();
    const sliceCount = SPIN_SLICES.length;
    const sliceAngle = 360 / sliceCount;

    // The top indicator points at 0 degrees (top).
    // In standard canvas rotation with slice 0 starting at top (-90deg),
    // to align winningIndex under the top needle:
    // angle offset = 360 - (winningIndex * sliceAngle + sliceAngle / 2)
    const targetSliceAngle = (360 - (winningIndex * sliceAngle + sliceAngle / 2)) % 360;
    const extraFullSpins = (6 + Math.floor(Math.random() * 3)) * 360;
    const startRot = currentRotationRef.current;
    const currentModulo = ((startRot % 360) + 360) % 360;
    const deltaToTarget = ((targetSliceAngle - currentModulo) + 360) % 360;
    const endRot = startRot + extraFullSpins + deltaToTarget;

    const duration = 4400; // 4.4 seconds of cinematic spin
    const startTime = performance.now();

    // High-performance 60/120fps physics loop with cubic-bezier deceleration
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Quartic ease-out: ultra fast start, long silky-smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const curRot = startRot + (endRot - startRot) * easeOut;

      currentRotationRef.current = curRot;
      setRotation(curRot);

      // Physical ticker calculation: trigger audio/haptic tick every time needle passes a wedge boundary
      const normalizedAngle = ((curRot % 360) + 360) % 360;
      const currentSliceUnderNeedle = Math.floor(
        ((360 - normalizedAngle + sliceAngle / 2) % 360) / sliceAngle
      );

      if (currentSliceUnderNeedle !== lastTickSliceRef.current) {
        lastTickSliceRef.current = currentSliceUnderNeedle;
        triggerPointerTick();
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished smoothly
        animFrameRef.current = null;
        setSpinning(false);
        setHighlightedIndex(winningIndex);

        const wonReward = SPIN_SLICES[winningIndex];
        setReward(wonReward);
        setShowCelebration(true);
        uiUnlock();

        const { nextStats, nextProfile, message } = applySpinReward(
          wonReward,
          stats,
          profile
        );
        onStats(nextStats);
        onProfile(nextProfile);
        onMessage(message);

        const nextHistory = [
          wonReward.label + " " + wonReward.sublabel,
          ...history.slice(0, 9),
        ];
        setHistory(nextHistory);
        try {
          localStorage.setItem("vector_spin_history", JSON.stringify(nextHistory));
        } catch {
          /* ignore */
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-2">
      {/* Header Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
          <Disc size={14} className={spinning ? "animate-spin text-amber-400" : "text-amber-400"} />
          Quantum Fortune Wheel
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Lucky Vector Spin
        </h3>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mt-1">
          Spin the wheel for high-yield Sparks, rare Incubator Eggs, and exclusive Operative PFPs!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left / Center: Hardware-Accelerated Wheel */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
          {/* Wheel Frame Glow */}
          <div className="relative w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] flex items-center justify-center">
            {/* Ambient Background Aura */}
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/25 via-purple-500/20 to-cyan-500/25 blur-2xl pointer-events-none transition-opacity duration-500 ${
                spinning ? "opacity-100 scale-110" : "opacity-60"
              }`}
            />

            {/* Top Indicator Arrow / Needle with bounce animation */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
              <div
                className={`w-7 h-8 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 rounded-b-lg shadow-xl shadow-amber-500/50 flex items-center justify-center border-2 border-white/90 ${
                  pointerBounce ? "spin-pointer-bounce" : ""
                }`}
                style={{
                  clipPath: "polygon(0% 0%, 100% 0%, 100% 65%, 50% 100%, 0% 65%)",
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950/80 mb-2" />
              </div>
            </div>

            {/* Outer Bezel Rim */}
            <div
              className={`relative rounded-full p-2.5 bg-slate-900/90 border-4 border-slate-700/80 shadow-2xl flex items-center justify-center transition-all ${
                spinning ? "spin-bezel-active" : ""
              }`}
            >
              {/* Canvas 60fps Wheel */}
              <CanvasSpinWheel
                rotation={rotation}
                highlightedIndex={highlightedIndex}
                size={330}
              />
            </div>
          </div>

          {/* Spin Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-3 justify-center w-full max-w-md">
            {/* Free Spin Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={spinning || !freeAvailable}
              onClick={() => handleSpin("free")}
              className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl font-black text-sm flex flex-col items-center justify-center transition shadow-lg ${
                freeAvailable
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-amber-500/20 cursor-pointer"
                  : "bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles size={16} /> Free Daily Spin
              </span>
              <span className="text-[11px] font-semibold opacity-80 mt-0.5">
                {freeAvailable ? "Ready Now!" : formatCountdown(cooldownRemaining)}
              </span>
            </motion.button>

            {/* 150 Sparks Spin */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={spinning || sparks < 150}
              onClick={() => handleSpin("sparks")}
              className={`flex-1 min-w-[130px] py-3 px-4 rounded-2xl font-black text-sm flex flex-col items-center justify-center border transition cursor-pointer ${
                sparks >= 150
                  ? "bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/40 shadow-sky-500/10"
                  : "bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed"
              }`}
            >
              <span>Spin for Sparks</span>
              <span className="text-[11px] font-semibold text-sky-400 flex items-center gap-1 mt-0.5">
                ✦ 150 Sparks
              </span>
            </motion.button>

            {/* 5 Diamonds Spin */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={spinning || diamonds < 5}
              onClick={() => handleSpin("diamonds")}
              className={`flex-1 min-w-[130px] py-3 px-4 rounded-2xl font-black text-sm flex flex-col items-center justify-center border transition cursor-pointer ${
                diamonds >= 5
                  ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10"
                  : "bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed"
              }`}
            >
              <span>Premium Spin</span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                💎 5 Diamonds
              </span>
            </motion.button>
          </div>
        </div>

        {/* Right: Prize Showcase & Recent Wins */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass rounded-3xl p-5 border border-slate-700/60 bg-slate-900/60 shadow-xl">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <Award size={16} className="text-amber-400" /> Featured Wheel Jackpots
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
                <span className="font-bold text-rose-300">🔥 +1,200 Sparks Jackpot</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">Ultra Rare</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                <span className="font-bold text-purple-300">🟣 Void Incubator Egg</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Rare Loot</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <span className="font-bold text-emerald-300">💎 +20 Rare Diamonds</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Epic</span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
                <span className="font-bold text-indigo-300">👑 Cipher Anime PFP</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">Exclusive</span>
              </div>
            </div>
          </div>

          {/* Recent History */}
          <div className="glass rounded-3xl p-4 border border-slate-700/40 bg-slate-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} /> Your Recent Wins
              </span>
              <span className="text-[10px] text-slate-500">{history.length} logged</span>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No spins recorded yet today. Take your lucky shot!</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {history.map((h, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Celebration Win Modal */}
      <AnimatePresence>
        {showCelebration && reward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setShowCelebration(false)}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 p-6 text-center shadow-[0_0_60px_rgba(245,158,11,0.25)] text-white overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

              <span className="text-4xl animate-bounce inline-block mb-1">🎉</span>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-amber-400 mb-1">
                Fortune Wheel Winner!
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight">
                {reward.label}
              </h3>
              <p className="text-sm font-semibold text-slate-300 mt-1">
                {reward.sublabel}
              </p>

              {reward.type === "egg" && (
                <div className="mt-4 p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-200">
                  🐣 Delivered straight to your <strong>Incubator</strong> tab!
                </div>
              )}

              <button
                onClick={() => setShowCelebration(false)}
                className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-sm uppercase tracking-wider hover:opacity-95 transition shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Claim Prize
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
