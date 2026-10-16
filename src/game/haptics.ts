// iOS-style haptic feedback. Stronger default patterns so taps actually register.

import { loadSettings } from "./storage";

export type HapticStyle =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "selection"
  | "slide"
  | "unlock";

const PATTERNS: Record<HapticStyle, number[]> = {
  light: [14],
  selection: [12],
  slide: [10, 18, 16],
  medium: [24, 10, 20],
  heavy: [38, 14, 36],
  success: [14, 40, 28, 40, 36],
  warning: [30, 40, 30],
  error: [50, 40, 70],
  unlock: [16, 30, 22, 30, 40],
};

export function playHaptic(style: HapticStyle, strength01 = 1): void {
  if (strength01 <= 0) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    const pattern = PATTERNS[style].map((ms, i) =>
      i % 2 === 1 ? ms : Math.max(2, Math.round(ms * Math.max(0.35, strength01))),
    );
    navigator.vibrate(pattern.length === 1 ? pattern[0] : pattern);
  } catch {
    /* ignore */
  }
}

function strength(): number {
  try {
    const s = loadSettings();
    if (!s.hapticsKind) return 0;
    return (s.haptics ?? 100) / 100;
  } catch {
    return 1;
  }
}

export function uiTap(): void {
  playHaptic("selection", strength());
}

export function uiConfirm(): void {
  playHaptic("medium", strength());
}

export function uiSlide(): void {
  playHaptic("slide", strength());
}

export function uiUnlock(): void {
  playHaptic("unlock", strength());
}

export function hapticFor(
  kind: "hit" | "miss" | "combo" | "level" | "warning",
  streak = 0,
): void {
  const k = strength();
  if (k <= 0) return;
  if (kind === "hit") playHaptic(streak >= 8 ? "heavy" : "medium", k);
  else if (kind === "miss") playHaptic("error", k);
  else if (kind === "combo") playHaptic("heavy", k);
  else if (kind === "level") playHaptic("success", k);
  else playHaptic("warning", k);
}
