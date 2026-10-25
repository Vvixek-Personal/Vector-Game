import { motion } from "motion/react";
import type { Stats } from "../game/storage";
import type { Profile } from "../game/profile";
import { getPlayerLevelProgress, LEVEL_REWARDS, getStoreItemForReward } from "../game/levels";
import { Sparkles, Gem, ArrowRight } from "lucide-react";
import { EASE } from "../utils/motion";

interface Props {
  stats: Stats;
  profile: Profile;
  onOpenRail?: () => void;
}

const RANK_TIERS: Array<{ min: number; title: string }> = [
  { min: 50, title: "Grandmaster" },
  { min: 40, title: "Sovereign" },
  { min: 30, title: "Elite" },
  { min: 20, title: "Specialist" },
  { min: 10, title: "Vanguard" },
  { min: 0, title: "Operative" },
];

/** Compact XP summary with a single, calm progress bar. */
export default function LevelProgressBar({ stats, profile, onOpenRail }: Props) {
  const levelInfo = getPlayerLevelProgress(stats, profile);
  const { currentLevel, currentXp, levelBaseXp, nextLevelXp, progress, maxLevel } = levelInfo;

  const xpInto = Math.max(0, currentXp - levelBaseXp);
  const xpNeededForLevel = Math.max(1, nextLevelXp - levelBaseXp);
  const xpRemaining = Math.max(0, nextLevelXp - currentXp);
  const percentNumber = Math.min(100, Math.round(progress * 100));
  const atMax = currentLevel >= maxLevel;

  const nextLevelRewardDef = LEVEL_REWARDS.find((r) => r.level > currentLevel);
  const nextItem = nextLevelRewardDef ? getStoreItemForReward(nextLevelRewardDef) : undefined;
  const rank = RANK_TIERS.find((tier) => currentLevel >= tier.min)?.title ?? "Operative";

  return (
    <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--panel-border)", background: "var(--surface)" }}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
            style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
          >
            <span className="num text-[16px] font-semibold">{currentLevel}</span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="t-heading">
                Level {currentLevel}
                {!atMax && <span className="faint"> → {Math.min(maxLevel, currentLevel + 1)}</span>}
              </h3>
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.1em]"
                style={{ borderColor: "var(--panel-border)", color: "var(--text-faint)" }}
              >
                {rank}
              </span>
            </div>

            <p className="t-caption num mt-0.5">
              {currentXp.toLocaleString()} XP total
              <span className="px-1.5">·</span>
              {atMax ? "Max level reached" : `${xpRemaining.toLocaleString()} XP to next level`}
            </p>
          </div>
        </div>

        <div className="num shrink-0 text-left sm:text-right">
          <div className="text-[12px]" style={{ color: "var(--text-dim)" }}>
            <span style={{ color: "var(--text)" }}>{xpInto.toLocaleString()}</span>
            <span style={{ color: "var(--text-faint)" }}> / {xpNeededForLevel.toLocaleString()} XP</span>
          </div>
          <div className="text-[11px] font-semibold" style={{ color: "var(--brand)" }}>
            {percentNumber}% complete
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-raised)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--brand)" }}
            initial={{ width: 0 }}
            animate={{ width: `${atMax ? 100 : Math.max(percentNumber, 1.5)}%` }}
            transition={{ duration: 0.7, ease: EASE.out }}
          />
        </div>

        <div className="num mt-1.5 flex justify-between text-[10px]" style={{ color: "var(--text-faint)" }}>
          <span>0 XP</span>
          <span>{atMax ? "Max" : `${nextLevelXp.toLocaleString()} XP`}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-col justify-between gap-2 border-t pt-3 sm:flex-row sm:items-center" style={{ borderColor: "var(--panel-border)" }}>
        {nextItem && nextLevelRewardDef ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
            <span style={{ color: "var(--text-faint)" }}>Next unlock at level {nextLevelRewardDef.level}:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5" style={{ borderColor: "var(--panel-border)", background: "var(--pill)" }}>
              <Sparkles size={11} style={{ color: "var(--brand)" }} />
              <span className="font-medium" style={{ color: "var(--text)" }}>{nextItem.name}</span>
              {nextLevelRewardDef.diamonds ? (
                <span className="num inline-flex items-center gap-0.5" style={{ color: "var(--brand)" }}>
                  <Gem size={10} /> +{nextLevelRewardDef.diamonds}
                </span>
              ) : null}
            </span>
          </div>
        ) : (
          <p className="t-caption">All level rewards unlocked.</p>
        )}

        {onOpenRail && (
          <button
            onClick={onOpenRail}
            className="inline-flex items-center gap-1.5 self-start text-[11.5px] font-medium transition-colors sm:self-auto"
            style={{ color: "var(--brand)" }}
          >
            <span>Open level rail</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
