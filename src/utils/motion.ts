import type { Transition, Variants } from "motion/react";

/**
 * Single source of truth for JS-driven motion.
 *
 * These numbers mirror the CSS custom properties in index.css:
 *   --dur-1 110ms  --dur-2 160ms  --dur-3 200ms  --dur-4 280ms
 * Keeping one table means dialogs, popovers and toasts all feel like the
 * same interface instead of a collection of unrelated animations.
 */
export const DURATION = {
  instant: 0.11,
  fast: 0.16,
  base: 0.2,
  slow: 0.28,
} as const;

/** Entrances settle quickly; exits accelerate away. */
export const EASE = {
  out: [0.22, 1, 0.36, 1],
  standard: [0.2, 0.8, 0.2, 1],
  inOut: [0.4, 0, 0.2, 1],
} as const;

export const SPRING = {
  /** Buttons, chips, dock items. */
  press: { type: "spring", stiffness: 520, damping: 32, mass: 0.7 },
  /** Panels and cards that resize or slide. */
  settle: { type: "spring", stiffness: 380, damping: 32, mass: 0.9 },
} satisfies Record<string, Transition>;

/** Full-screen scrim: fades in, fades out slightly faster. */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE.standard } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE.out } },
};

/**
 * Dialog card: a short 12px rise with a whisper of scale. Never a bounce —
 * a reactive game should not make the player wait for the menu to stop moving.
 */
export const panelVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, y: 6, scale: 0.99, transition: { duration: DURATION.fast, ease: EASE.out } },
};

/** Anchored popovers (account menu, errors) grow from their trigger edge. */
export const popoverVariants: Variants = {
  hidden: { opacity: 0, y: -4, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION.fast, ease: EASE.out } },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: DURATION.instant, ease: EASE.out } },
};

/** Staggered rows inside a dialog: pass the index as `custom`. */
export const rowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE.out, delay: 40 * index },
  }),
};

/** Shared whileHover/whileTap gestures. */
export const GESTURE = {
  tap: { scale: 0.985 },
  hover: { y: -1 },
  hoverScale: { scale: 1.02 },
} as const;
