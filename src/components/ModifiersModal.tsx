import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import {
  type GameModifiers,
  MODIFIER_DEFS,
  getModifierMultiplier,
  saveModifiers,
} from "../game/modifiers";
import { uiTap } from "../game/haptics";
import { backdropVariants, panelVariants } from "../utils/motion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  modifiers: GameModifiers;
  onChange: (mods: GameModifiers) => void;
}

export const ModifiersModal: React.FC<Props> = ({ isOpen, onClose, modifiers, onChange }) => {
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
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="surface-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modifiers-title"
        >
          <motion.div
            variants={panelVariants}
            className="surface-card relative flex max-h-[88dvh] w-full max-w-[440px] flex-col p-5"
          >
            <div className="dialog-head">
              <div className="min-w-0">
                <p className="t-eyebrow">Challenge rules</p>
                <h2 id="modifiers-title" className="t-title mt-1">
                  Modifiers
                  {activeCount > 0 && (
                    <span className="num ml-2 align-middle text-[11px] font-semibold" style={{ color: "var(--brand)" }}>
                      {activeCount} on
                    </span>
                  )}
                </h2>
                <p className="dialog-sub">Stack rules to raise the score and XP multiplier.</p>
              </div>
              <button onClick={onClose} className="icon-button icon-button-sm shrink-0" aria-label="Close modifiers">
                ✕
              </button>
            </div>

            <div
              className="mt-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
              style={{ borderColor: "var(--panel-border)", background: "var(--pill)" }}
            >
              <div>
                <div className="t-caption">Score and XP multiplier</div>
                <div className="num mt-0.5 text-[24px] font-semibold leading-none tracking-tight txt">
                  {mult.toFixed(2)}×
                </div>
              </div>
              {activeCount > 0 && (
                <button onClick={clearAll} className="reset-button">
                  Clear all
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2 overflow-y-auto pr-0.5">
              {MODIFIER_DEFS.map((m, i) => {
                const active = Boolean(modifiers[m.id]);
                return (
                  <motion.button
                    key={m.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(m.id)}
                    whileTap={{ scale: 0.99 }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1], delay: 40 * i } }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors"
                    style={{
                      borderColor: active ? "var(--selected-border)" : "var(--panel-border)",
                      background: active ? "var(--selected)" : "var(--pill)",
                    }}
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 text-[18px] leading-none select-none" aria-hidden="true">
                        {m.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[13px] font-semibold txt">{m.name}</span>
                          <span className="num text-[10px] font-semibold uppercase tracking-[.08em] faint">
                            +{m.bonusPercent}%
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug" style={{ color: "var(--text-dim)" }}>
                          {m.desc}
                        </span>
                      </span>
                    </span>

                    <span
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors"
                      style={{
                        borderColor: active ? "transparent" : "var(--panel-border)",
                        background: active ? "var(--brand)" : "transparent",
                        color: "var(--brand-on)",
                      }}
                      aria-hidden="true"
                    >
                      {active && <Check size={12} strokeWidth={3} />}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="dialog-actions mt-4">
              <button onClick={onClose} className="dialog-btn dialog-btn-primary">
                Apply · {mult.toFixed(2)}×
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
