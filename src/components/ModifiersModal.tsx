import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  type GameModifiers,
  MODIFIER_DEFS,
  getModifierMultiplier,
  saveModifiers,
} from "../game/modifiers";
import { uiTap } from "../game/haptics";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  modifiers: GameModifiers;
  onChange: (mods: GameModifiers) => void;
}

export const ModifiersModal: React.FC<Props> = ({
  isOpen,
  onClose,
  modifiers,
  onChange,
}) => {
  const mult = getModifierMultiplier(modifiers);
  const activeCount = Object.values(modifiers).filter(Boolean).length;

  const toggle = (id: keyof GameModifiers) => {
    uiTap();
    const next = { ...modifiers, [id]: !modifiers[id] };
    onChange(next);
    saveModifiers(next);
  };

  const clearAll = () => {
    uiTap();
    onChange({});
    saveModifiers({});
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/60 rounded-3xl p-6 shadow-2xl text-slate-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Game Modifiers
                    {activeCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                        {activeCount} Active
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Stack challenges for massive score & XP multipliers
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                aria-label="Close modifiers"
              >
                ✕
              </button>
            </div>

            {/* Total Multiplier Banner */}
            <div className="my-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border border-slate-700/50 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Total Score Multiplier
                </div>
                <div className="text-2xl font-black text-amber-400 tracking-tight">
                  {mult.toFixed(2)}× <span className="text-xs text-slate-300 font-normal">Score & XP</span>
                </div>
              </div>
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-slate-400 hover:text-rose-400 font-medium px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-rose-500/10 transition"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* Modifiers List */}
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {MODIFIER_DEFS.map((m) => {
                const active = Boolean(modifiers[m.id]);
                return (
                  <motion.div
                    key={m.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggle(m.id)}
                    className={`cursor-pointer rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 ${
                      active
                        ? "bg-slate-800/90 border-amber-500/60 shadow-lg shadow-amber-500/5"
                        : "bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl select-none">{m.icon}</span>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {m.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${m.badgeColor}`}
                          >
                            +{m.bonusPercent}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                          {m.desc}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        active
                          ? "bg-amber-400 border-amber-400 text-black font-black text-xs"
                          : "border-slate-600 bg-slate-800"
                      }`}
                    >
                      {active ? "✓" : ""}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 text-black font-black text-sm hover:opacity-95 transition shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                Apply & Confirm ({mult.toFixed(2)}×)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
