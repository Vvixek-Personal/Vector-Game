import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  EGG_DEFS,
  loadIncubatorState,
  startIncubation,
  speedUpPod,
  hatchPod,
  addEggToInventory,
  type EggType,
  type IncubatorState,
  type HatchReward,
} from "../../game/incubator";
import { type Stats, loadStats, spendSparks, spendDiamonds } from "../../game/storage";
import { loadProfile, type Profile } from "../../game/profile";
import { uiTap, uiConfirm, uiUnlock } from "../../game/haptics";
import { Sparkles, Gem, Clock, Zap, Flame, ShieldAlert, Plus, Check } from "lucide-react";

interface Props {
  stats: Stats;
  onStats: (s: Stats) => void;
  profile: Profile;
  onProfile: (p: Profile) => void;
  onMessage: (msg: string) => void;
}

export const IncubatorView: React.FC<Props> = ({
  stats,
  onStats,
  profile,
  onProfile,
  onMessage,
}) => {
  const [incubator, setIncubator] = useState<IncubatorState>(() => loadIncubatorState());
  const [selectedEggId, setSelectedEggId] = useState<string | null>(null);
  const [hatchedReward, setHatchedReward] = useState<HatchReward | null>(null);
  const [crackingIndex, setCrackingIndex] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const sparks = stats.sparks ?? 0;
  const diamonds = stats.diamonds ?? 0;

  // Real-time ticking for pods countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartIncubation = (eggId: string, podIndex: number) => {
    uiConfirm();
    const next = startIncubation(eggId, podIndex);
    if (next) {
      setIncubator(next);
      setSelectedEggId(null);
      onMessage("Egg placed in the incubation pod.");
    }
  };

  const handleSpeedUp = (podIndex: number) => {
    const nextStats = spendSparks(50);
    if (!nextStats) {
      onMessage("Supercharging costs 50 Sparks.");
      return;
    }
    uiUnlock();
    onStats(nextStats);
    const nextInc = speedUpPod(podIndex);
    if (nextInc) setIncubator(nextInc);
    onMessage("Chamber supercharged. Your egg is ready to hatch.");
  };

  const handleHatch = (podIndex: number) => {
    const res = hatchPod(podIndex, loadStats(), loadProfile());
    if (!res) return;
    onStats(res.nextStats);
    onProfile(res.nextProfile);
    setIncubator(res.nextIncubator);
    uiConfirm();
    setCrackingIndex(podIndex);

    setTimeout(() => {
      // Rewards are already persisted; animation is presentation only.
      setCrackingIndex(null);
      if (res) {
        setIncubator(res.nextIncubator);

        setHatchedReward(res.reward);
        uiUnlock();
      }
    }, 800);
  };

  const handleBuyEgg = (eggType: EggType) => {
    const def = EGG_DEFS[eggType];
    let nextStats: Stats | null = null;

    if (def.costDiamonds > 0 && diamonds >= def.costDiamonds) {
      nextStats = spendDiamonds(def.costDiamonds);
    } else if (sparks >= def.costSparks) {
      nextStats = spendSparks(def.costSparks);
    } else {
      onMessage(
        def.costDiamonds > 0
          ? `Need ${def.costDiamonds} Diamonds or ${def.costSparks} Sparks!`
          : `Need ${def.costSparks} Sparks!`
      );
      return;
    }

    if (nextStats) {
      uiUnlock();
      onStats(nextStats);
      const nextInc = addEggToInventory(eggType);
      setIncubator(nextInc);
      onMessage(`Purchased ${def.name}! Added to your incubator inventory.`);
    }
  };

  return (
    <div className="ink-panel mx-auto w-full max-w-4xl space-y-8 px-2 py-4">
      {/* Header */}
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[.14em]" style={{ borderColor: "var(--panel-border)", background: "var(--pill)", color: "var(--text-dim)" }}>
          <span aria-hidden="true">🧬</span> Incubator
        </div>
        <h3 className="t-title">Egg chambers</h3>
        <p className="t-caption mx-auto mt-1 max-w-md">
          Hatch eggs for Sparks, Diamonds, and rare profile pictures.
        </p>
      </div>

      {/* Pod Chambers Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {incubator.pods.map((pod, idx) => {
          const isOccupied = pod !== null;
          const timeLeftMs = isOccupied ? Math.max(0, pod.readyAt - Date.now()) : 0;
          const isReady = isOccupied && timeLeftMs <= 0;
          const eggDef = isOccupied ? EGG_DEFS[pod.eggType] : null;
          const totalMs = isOccupied ? pod.durationMs : 1;
          const progressPct = isOccupied
            ? Math.min(100, Math.max(0, ((totalMs - timeLeftMs) / totalMs) * 100))
            : 0;

          return (
            <motion.div
              key={idx}
              whileHover={{ y: -2 }}
              className={`relative rounded-3xl p-5 border transition-all overflow-hidden flex flex-col justify-between min-h-[260px] ${
                isOccupied
                  ? "bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700/80 shadow-xl"
                  : "bg-slate-900/40 border-dashed border-slate-800"
              }`}
            >
              {/* Header of Pod */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-semibold uppercase tracking-[.1em] text-slate-300">
                    Pod {idx === 0 ? "Alpha" : "Beta"}
                  </span>
                </div>
                {isOccupied && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isReady
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {isReady ? "READY TO HATCH" : `${Math.ceil(timeLeftMs / 1000)}s Left`}
                  </span>
                )}
              </div>

              {/* Chamber Center Visual */}
              <div className="my-auto py-4 flex flex-col items-center justify-center z-10">
                {isOccupied && eggDef ? (
                  <div className="flex flex-col items-center">
                    {/* Glowing Egg Vessel */}
                    <div
                      className={`relative w-20 h-24 rounded-[40%_40%_45%_45%] border-2 shadow-2xl flex items-center justify-center transition-transform ${
                        crackingIndex === idx
                          ? "animate-bounce scale-110"
                          : isReady
                          ? "animate-pulse scale-105"
                          : ""
                      }`}
                      style={{
                        borderColor: eggDef.glowColor,
                        background: `radial-gradient(circle at 50% 35%, ${eggDef.accentColor}33, ${eggDef.glowColor}22)`,
                        boxShadow: `0 0 35px ${eggDef.glowColor}40`,
                      }}
                    >
                      <span className="text-3xl select-none">{eggDef.eggIcon}</span>
                    </div>

                    <h4 className="font-semibold text-sm text-white mt-3">{eggDef.name}</h4>
                    <span className="text-[11px] text-slate-400">{eggDef.tier} Tier</span>

                    {/* Incubation Progress Bar */}
                    <div className="w-full max-w-[180px] h-2 bg-slate-800 rounded-full mt-3 overflow-hidden p-0.5 border border-slate-700/50">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progressPct}%`,
                          backgroundColor: eggDef.glowColor,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-center mx-auto mb-2 text-2xl text-slate-600">
                      +
                    </div>
                    <p className="text-xs font-bold text-slate-400">Pod Chamber Empty</p>
                    <p className="text-[11px] text-slate-500 max-w-[180px] mx-auto mt-0.5">
                      Select an egg from your inventory below to start incubation.
                    </p>
                  </div>
                )}
              </div>

              {/* Chamber Footer Actions */}
              <div className="z-10 pt-2">
                {isOccupied ? (
                  isReady ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleHatch(idx)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold text-xs uppercase tracking-[.1em] hover:opacity-95 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      🐣 Crack & Hatch Egg!
                    </motion.button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSpeedUp(idx)}
                        className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Zap size={14} /> Quick Hatch (50 ✦)
                      </button>
                    </div>
                  )
                ) : selectedEggId ? (
                  <button
                    onClick={() => handleStartIncubation(selectedEggId, idx)}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs uppercase tracking-[.1em] transition cursor-pointer"
                  >
                    Place Selected Egg
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 rounded-xl bg-slate-800/40 text-slate-500 text-xs font-semibold cursor-default"
                  >
                    Select Egg Below
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Held Eggs Inventory */}
      <div className="glass rounded-3xl p-5 border border-slate-700/60 bg-slate-900/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[.1em] text-white">
              Your Unhatched Eggs ({incubator.inventory.length})
            </h4>
            <p className="text-xs text-slate-400">
              Eggs won from Lucky Spin or acquired from the Lab Market.
            </p>
          </div>
        </div>

        {incubator.inventory.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            Your incubator inventory is empty. Win eggs from the Lucky Spin wheel or purchase below!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {incubator.inventory.map((egg) => {
              const def = EGG_DEFS[egg.eggType];
              const isSelected = selectedEggId === egg.id;
              return (
                <motion.div
                  key={egg.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    uiTap();
                    setSelectedEggId(isSelected ? null : egg.id);
                  }}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-800 border-cyan-400 shadow-md shadow-cyan-500/10"
                      : "bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl select-none">{def.eggIcon}</span>
                    <div>
                      <div className="font-bold text-xs text-white">{def.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> {def.durationSeconds}s incubation
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                      isSelected
                        ? "bg-cyan-400 text-black border-cyan-400"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Egg Lab Market */}
      <div className="glass rounded-3xl p-5 border border-slate-700/60 bg-slate-900/60">
        <h4 className="text-sm font-semibold uppercase tracking-[.1em] text-white mb-1">
          Egg Hatchery Market
        </h4>
        <p className="text-xs text-slate-400 mb-4">
          Order specialized bio-mechanical specimens to incubate in your pods.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["neon", "quantum", "solar"] as EggType[]).map((type) => {
            const def = EGG_DEFS[type];
            return (
              <div
                key={type}
                className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{def.eggIcon}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                      {def.tier}
                    </span>
                  </div>
                  <h5 className="font-semibold text-sm text-white">{def.name}</h5>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">{def.tagline}</p>

                  <div className="mt-3 text-[11px] space-y-1">
                    <div className="text-slate-400 font-semibold">Possible Loot:</div>
                    <ul className="text-slate-300 list-disc list-inside space-y-0.5 text-[10px]">
                      {def.possibleLoot.slice(0, 3).map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/40">
                  <button
                    onClick={() => handleBuyEgg(type)}
                    className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {def.costDiamonds > 0 ? (
                      <>
                        <Gem size={13} className="text-emerald-400" />
                        {def.costDiamonds} Diamonds
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="text-amber-400" />
                        {def.costSparks.toLocaleString()} Sparks
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hatching Reveal Modal */}
      <AnimatePresence>
        {hatchedReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setHatchedReward(null)}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 text-center shadow-[0_0_50px_rgba(16,185,129,0.25)] text-white overflow-hidden"
            >
              <span className="text-4xl animate-bounce inline-block mb-1">🐣</span>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400 mb-1">
                Egg Hatched Successfully!
              </div>
              <h3 className="text-2xl font-semibold text-white tracking-tight">
                {hatchedReward.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                {hatchedReward.description}
              </p>

              <button
                onClick={() => setHatchedReward(null)}
                className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold text-sm uppercase tracking-[.1em] hover:opacity-95 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Collect Loot
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
