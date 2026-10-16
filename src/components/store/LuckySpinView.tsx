import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  SPIN_SLICES,
  getRemainingFreeSpinMs,
  recordFreeSpinUsed,
  pickSpinRewardIndex,
  applySpinReward,
  getDailySpinInfo,
  type SpinReward,
  type SpinRarity,
} from "../../game/spin";
import { type Stats, spendSparks, spendDiamonds } from "../../game/storage";
import { type Profile } from "../../game/profile";
import { uiTap, uiConfirm } from "../../game/haptics";
import { getSharedSound } from "../../game/audio";
import { CanvasSpinWheel } from "./CanvasSpinWheel";
import CartoonAvatar from "../CartoonAvatar";
import AnimeAvatar from "../AnimeAvatar";
import { Sparkles, Disc, Award, Clock, Star, Crown, Zap, Flame, Volume2, VolumeX } from "lucide-react";

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
  const [soundEnabled, setSoundEnabled] = useState(true);
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
  const stopWhirRef = useRef<(() => void) | null>(null);

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

  // Cleanup ongoing animation and audio on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (stopWhirRef.current) {
        stopWhirRef.current();
        stopWhirRef.current = null;
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

  const triggerPointerTick = (speedRatio = 1) => {
    setPointerBounce(true);
    uiTap();
    if (soundEnabled) {
      getSharedSound().spinTick(speedRatio);
    }
    window.setTimeout(() => setPointerBounce(false), 110);
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

    // Angle calculation to land on center of winning slice under top pointer
    const targetSliceAngle = (360 - (winningIndex * sliceAngle + sliceAngle / 2)) % 360;
    const extraFullSpins = (6 + Math.floor(Math.random() * 3)) * 360;
    const startRot = currentRotationRef.current;
    const currentModulo = ((startRot % 360) + 360) % 360;
    const deltaToTarget = ((targetSliceAngle - currentModulo) + 360) % 360;
    const endRot = startRot + extraFullSpins + deltaToTarget;

    const duration = 4400; // 4.4 seconds of cinematic arcade spin
    const startTime = performance.now();

    // Start authentic high-pitched arcade whirring sound effect
    if (soundEnabled) {
      stopWhirRef.current = getSharedSound().startSpinWhir(duration);
    }

    // High-performance 60/120fps physics loop with quartic deceleration
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Quartic ease-out: intense initial burst followed by smooth gradual slow-down
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const curRot = startRot + (endRot - startRot) * easeOut;

      currentRotationRef.current = curRot;
      setRotation(curRot);

      // Compute instantaneous angular velocity for acoustic peg pitch & tactile response
      const speedRatio = Math.max(0.1, 1 - Math.pow(progress, 0.8));

      // Physical ticker calculation: needle hits wedge boundary
      const normalizedAngle = ((curRot % 360) + 360) % 360;
      const currentSliceUnderNeedle = Math.floor(
        ((360 - normalizedAngle + sliceAngle / 2) % 360) / sliceAngle
      );

      if (currentSliceUnderNeedle !== lastTickSliceRef.current) {
        lastTickSliceRef.current = currentSliceUnderNeedle;
        triggerPointerTick(speedRatio);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished smoothly
        animFrameRef.current = null;
        stopWhirRef.current = null;
        setSpinning(false);
        setHighlightedIndex(winningIndex);

        const wonReward = SPIN_SLICES[winningIndex];
        setReward(wonReward);
        setShowCelebration(true);

        // Play level-specific fanfare audio
        if (soundEnabled) {
          getSharedSound().rewardFanfare(wonReward.rarity);
        }

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

  // Helper config for Rarity Tier Animations
  const getRarityTierConfig = (rarity: SpinRarity) => {
    switch (rarity) {
      case "ultra":
        return {
          title: "ULTRA RARE JACKPOT!",
          badgeBg: "bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400 text-black font-black",
          cardBorderClass: "rarity-ultra-card border-2",
          bgGradient: "from-amber-950/80 via-slate-950 to-slate-950",
          particleColors: ["#fbbf24", "#f43f5e", "#fb7185", "#fde047", "#ffffff"],
          icon: <Crown className="text-amber-400 animate-bounce" size={42} />,
          glowAura: "from-amber-500/30 via-rose-500/30 to-amber-500/20",
          levelLabel: "LEVEL 4 ★★★★",
        };
      case "epic":
        return {
          title: "EPIC DROP UNLOCKED!",
          badgeBg: "bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black",
          cardBorderClass: "rarity-epic-card border-2 border-purple-500/80",
          bgGradient: "from-purple-950/80 via-slate-950 to-slate-950",
          particleColors: ["#c084fc", "#ec4899", "#a855f7", "#38bdf8", "#ffffff"],
          icon: <Flame className="text-purple-400 animate-pulse" size={40} />,
          glowAura: "from-purple-500/30 via-pink-500/25 to-indigo-500/20",
          levelLabel: "LEVEL 3 ★★★☆",
        };
      case "rare":
        return {
          title: "RARE DISCOVERY!",
          badgeBg: "bg-gradient-to-r from-sky-400 to-indigo-500 text-black font-black",
          cardBorderClass: "rarity-rare-card border-2 border-sky-400/60",
          bgGradient: "from-sky-950/70 via-slate-950 to-slate-950",
          particleColors: ["#38bdf8", "#818cf8", "#67e8f9", "#ffffff"],
          icon: <Star className="text-sky-400 animate-spin" size={38} />,
          glowAura: "from-sky-500/25 via-indigo-500/20 to-sky-500/10",
          levelLabel: "LEVEL 2 ★★☆☆",
        };
      default:
        return {
          title: "FORTUNE WHEEL REWARD",
          badgeBg: "bg-slate-800 text-slate-200 border border-slate-700",
          cardBorderClass: "border border-amber-500/40",
          bgGradient: "from-slate-900 via-slate-950 to-slate-950",
          particleColors: ["#94a3b8", "#e2e8f0"],
          icon: <Sparkles className="text-amber-400" size={36} />,
          glowAura: "from-amber-500/20 to-transparent",
          levelLabel: "LEVEL 1 ★☆☆☆",
        };
    }
  };

  const rarityConfig = reward ? getRarityTierConfig(reward.rarity) : null;

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-2">
      {/* Header Banner */}
      <div className="text-center mb-6 relative">
        {/* Sound FX Toggle Button */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? "Mute Spin Audio" : "Enable Spin Audio"}
          className="absolute right-2 top-0 px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition"
        >
          {soundEnabled ? (
            <>
              <Volume2 size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Sound ON</span>
            </>
          ) : (
            <>
              <VolumeX size={15} className="text-slate-500" />
              <span className="hidden sm:inline text-slate-500">Muted</span>
            </>
          )}
        </button>

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

        {/* Daily Rotating Wheel Info */}
        {(() => {
          const info = getDailySpinInfo();
          return (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border border-white/10 text-xs font-semibold text-white/80">
              <span className="text-amber-400">✨ Today's Featured Wheel:</span>
              <span className="font-extrabold text-white">{info.featuredName}</span>
              <span className="text-white/40">·</span>
              <span className="text-rose-400 font-bold">+{info.jackpotSparks.toLocaleString()} Sparks Jackpot</span>
              <span className="text-emerald-400 text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                Rotates Daily
              </span>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left / Center: Hardware-Accelerated Wheel */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
          {/* Wheel Frame Glow */}
          <div className="relative w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] flex items-center justify-center">
            {/* Ambient Background Aura */}
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/25 via-purple-500/20 to-cyan-500/25 blur-2xl pointer-events-none transition-all duration-500 ${
                spinning ? "opacity-100 scale-125" : "opacity-60"
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
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 uppercase tracking-wider">
                  Ultra Rare ★★★★
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                <span className="font-bold text-purple-300">🟣 Void Incubator Egg</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/30 text-purple-300 uppercase tracking-wider">
                  Epic ★★★☆
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <span className="font-bold text-emerald-300">💎 +20 Rare Diamonds</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 uppercase tracking-wider">
                  Epic ★★★☆
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
                <span className="font-bold text-indigo-300">👑 Cipher Anime PFP</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 uppercase tracking-wider">
                  Ultra Rare ★★★★
                </span>
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

      {/* Tiered Rarity Celebration Modal */}
      <AnimatePresence>
        {showCelebration && reward && rarityConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with dynamic blur intensity */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 ${
                reward.rarity === "ultra"
                  ? "bg-black/90 backdrop-blur-xl"
                  : reward.rarity === "epic"
                    ? "bg-black/85 backdrop-blur-lg"
                    : "bg-black/80 backdrop-blur-md"
              }`}
              onClick={() => setShowCelebration(false)}
            />

            {/* Rotating Sunburst FX behind card for Epic and Ultra items */}
            {(reward.rarity === "ultra" || reward.rarity === "epic") && (
              <div className="absolute pointer-events-none w-[560px] h-[560px] flex items-center justify-center overflow-hidden opacity-35">
                <div
                  className="w-full h-full rarity-sunburst"
                  style={{
                    background:
                      reward.rarity === "ultra"
                        ? "conic-gradient(from 0deg, transparent 0deg, rgba(251, 191, 36, 0.4) 15deg, transparent 30deg, rgba(244, 63, 94, 0.4) 45deg, transparent 60deg, rgba(251, 191, 36, 0.4) 75deg, transparent 90deg, rgba(244, 63, 94, 0.4) 105deg, transparent 120deg, rgba(251, 191, 36, 0.4) 135deg, transparent 150deg, rgba(244, 63, 94, 0.4) 165deg, transparent 180deg, rgba(251, 191, 36, 0.4) 195deg, transparent 210deg, rgba(244, 63, 94, 0.4) 225deg, transparent 240deg, rgba(251, 191, 36, 0.4) 255deg, transparent 270deg, rgba(244, 63, 94, 0.4) 285deg, transparent 300deg, rgba(251, 191, 36, 0.4) 315deg, transparent 330deg, rgba(244, 63, 94, 0.4) 345deg, transparent 360deg)"
                        : "conic-gradient(from 0deg, transparent 0deg, rgba(168, 85, 247, 0.4) 20deg, transparent 40deg, rgba(236, 72, 153, 0.4) 60deg, transparent 80deg, rgba(168, 85, 247, 0.4) 100deg, transparent 120deg, rgba(236, 72, 153, 0.4) 140deg, transparent 160deg, rgba(168, 85, 247, 0.4) 180deg, transparent 200deg, rgba(236, 72, 153, 0.4) 220deg, transparent 240deg, rgba(168, 85, 247, 0.4) 260deg, transparent 280deg, rgba(236, 72, 153, 0.4) 300deg, transparent 320deg, rgba(168, 85, 247, 0.4) 340deg, transparent 360deg)",
                  }}
                />
              </div>
            )}

            {/* Simulated Confetti / Starlight Burst */}
            {reward.rarity !== "common" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {Array.from({ length: reward.rarity === "ultra" ? 36 : reward.rarity === "epic" ? 22 : 12 }).map(
                  (_, i) => {
                    const angle = (i / 36) * 360;
                    const rad = (angle * Math.PI) / 180;
                    const dist = 90 + (i % 5) * 35;
                    const x = Math.cos(rad) * dist;
                    const y = Math.sin(rad) * dist;
                    const color =
                      rarityConfig.particleColors[
                        i % rarityConfig.particleColors.length
                      ];
                    return (
                      <div
                        key={i}
                        className="absolute w-2.5 h-2.5 rounded-full rarity-confetti-particle"
                        style={{
                          backgroundColor: color,
                          transform: `translate(${x}px, ${y}px)`,
                          animationDelay: `${(i % 6) * 0.08}s`,
                        }}
                      />
                    );
                  }
                )}
              </div>
            )}

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.65, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.75, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 450, damping: 26 }}
              className={`relative w-full max-w-sm rounded-3xl bg-gradient-to-b ${rarityConfig.bgGradient} ${rarityConfig.cardBorderClass} p-6 text-center text-white overflow-hidden shadow-2xl z-10`}
            >
              {/* Internal Ambient Radial Aura */}
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b ${rarityConfig.glowAura} rounded-full blur-3xl pointer-events-none`}
              />

              {/* Top Tier Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black tracking-widest text-slate-400">
                  {rarityConfig.levelLabel}
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-widest ${rarityConfig.badgeBg}`}
                >
                  {reward.rarity}
                </span>
              </div>

              {/* Rarity Icon / Avatar / Egg Preview */}
              <div className="relative my-3 flex justify-center items-center">
                {reward.type === "avatar" && reward.avatarId ? (
                  <div className="relative p-2 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400/50 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                    <AnimeAvatar id={reward.avatarId} size={110} />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-white/20 flex items-center justify-center shadow-inner">
                    {rarityConfig.icon}
                  </div>
                )}
              </div>

              {/* Headline */}
              <div className="text-xs font-black uppercase tracking-[0.25em] text-amber-400 mb-1">
                {rarityConfig.title}
              </div>

              <h3 className="text-3xl font-black text-white tracking-tight">
                {reward.label}
              </h3>

              <p className="text-sm font-semibold text-slate-300 mt-1">
                {reward.sublabel}
              </p>

              {reward.type === "egg" && (
                <div className="mt-4 p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-xs text-purple-200">
                  🐣 Delivered directly into your <strong>Incubator</strong> tab!
                </div>
              )}

              {reward.type === "avatar" && (
                <div className="mt-4 p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-xs text-indigo-200">
                  👑 Equipped to your <strong>Profile</strong> as an active anime PFP!
                </div>
              )}

              {reward.type === "jackpot" && (
                <div className="mt-4 p-3 rounded-2xl bg-rose-500/25 border border-rose-500/50 text-xs text-rose-200 font-bold animate-pulse">
                  ⚡ Massive Sparks Jackpot credited instantly to your balance!
                </div>
              )}

              {/* Claim Action Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowCelebration(false)}
                className={`mt-6 w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition shadow-lg cursor-pointer ${
                  reward.rarity === "ultra"
                    ? "bg-gradient-to-r from-amber-300 via-amber-400 to-rose-500 text-black shadow-amber-500/30 hover:opacity-95"
                    : reward.rarity === "epic"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/30 hover:opacity-95"
                      : "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-amber-500/20 hover:opacity-95"
                }`}
              >
                Claim Reward
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
