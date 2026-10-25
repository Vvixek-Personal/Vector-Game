import React, { useRef, useEffect } from "react";
import { motion } from "motion/react";
import type { Stats } from "../game/storage";
import type { Profile } from "../game/profile";
import {
  LEVEL_REWARDS,
  getPlayerLevelProgress,
  getStoreItemForReward,
  type LevelRewardDef,
} from "../game/levels";
import { type StoreItem } from "../game/catalog";
import AnimeAvatar from "./AnimeAvatar";
import CartoonAvatar from "./CartoonAvatar";
import { Gem, Check, Lock, ChevronLeft, ChevronRight, Gift, Zap } from "lucide-react";
import { uiTap } from "../game/haptics";
import { DURATION, EASE } from "../utils/motion";

interface Props {
  stats: Stats;
  profile: Profile;
  onClaim: (reward: LevelRewardDef, storeItem: StoreItem) => void;
  onClaimAll: () => void;
}

/**
 * Horizontal level rail. Reads as one continuous track: the beam, the pins and
 * the cards all key off the same brand colour, and nothing loops forever.
 */
export default function LevelRail({ stats, profile, onClaim, onClaimAll }: Props) {
  const railContainerRef = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLDivElement>(null);

  const levelInfo = getPlayerLevelProgress(stats, profile);
  const claimedLevels = profile.claimedLevels ?? [];

  useEffect(() => {
    if (activeNodeRef.current && railContainerRef.current) {
      const timer = setTimeout(() => {
        activeNodeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [levelInfo.currentLevel]);

  const scrollToActive = () => {
    uiTap();
    activeNodeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const scrollBy = (offset: number) => {
    uiTap();
    railContainerRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  const nextDiamondLevel = Math.max(10, Math.ceil((levelInfo.currentLevel + 0.01) / 10) * 10);
  const levelsUntilDiamond = Math.max(0, nextDiamondLevel - levelInfo.currentLevel);

  let activeIdx = -1;
  for (let i = 0; i < LEVEL_REWARDS.length; i++) {
    if (levelInfo.currentLevel >= LEVEL_REWARDS[i].level) activeIdx = i;
  }

  let partialProgress = 0;
  const nextReward = LEVEL_REWARDS[activeIdx + 1];
  if (nextReward) {
    const startXp = activeIdx >= 0 ? LEVEL_REWARDS[activeIdx].xpRequired : 0;
    const endXp = nextReward.xpRequired;
    const xpInto = levelInfo.currentXp - startXp;
    partialProgress = Math.min(1, Math.max(0, xpInto / Math.max(1, endXp - startXp)));
  }

  const fluidProgressPercent =
    LEVEL_REWARDS.length > 1
      ? ((Math.max(0, activeIdx) + partialProgress) / (LEVEL_REWARDS.length - 1)) * 100
      : 0;

  const atMaxLevel = levelInfo.currentLevel >= levelInfo.maxLevel;

  return (
    <div
      className="level-rail-system space-y-5 rounded-2xl border p-5 sm:p-6"
      style={{ borderColor: "var(--panel-border)", background: "var(--surface)" }}
    >
      <div className="flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center" style={{ borderColor: "var(--panel-border)" }}>
        <div className="flex items-center gap-3.5">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[17px] font-semibold"
            style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
          >
            <span className="num">{levelInfo.currentLevel}</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="t-heading">Level rail</h3>
              <span className="num rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.1em]" style={{ borderColor: "var(--panel-border)", color: "var(--text-faint)" }}>
                Level {levelInfo.currentLevel} of {levelInfo.maxLevel}
              </span>
            </div>
            <p className="t-caption mt-0.5">
              Every level unlocks a store item · +10 Diamonds every 10 levels
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {levelsUntilDiamond > 0 ? (
            <span className="num inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: "var(--panel-border)", color: "var(--text-dim)" }}>
              <Gem size={12} />
              Level {nextDiamondLevel} in {levelsUntilDiamond}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: "color-mix(in srgb, var(--good) 34%, transparent)", color: "var(--good)", background: "color-mix(in srgb, var(--good) 10%, transparent)" }}>
              <Gem size={12} /> Diamond milestone reached
            </span>
          )}

          {levelInfo.unclaimedCount > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onClaimAll}
              className="dialog-btn dialog-btn-primary dialog-btn-sm num"
            >
              <Gift size={13} />
              Claim all ({levelInfo.unclaimedCount})
            </motion.button>
          )}

          <button onClick={scrollToActive} className="dialog-btn dialog-btn-sm">
            <Zap size={13} style={{ color: "var(--brand)" }} /> Current level
          </button>
        </div>
      </div>

      {/* Progress summary */}
      <div className="rounded-2xl border px-3.5 py-3" style={{ borderColor: "var(--panel-border)", background: "var(--pill)" }}>
        <div className="flex items-baseline justify-between gap-3 text-[11px]">
          <span style={{ color: "var(--text-dim)" }}>
            Lifetime XP{" "}
            <span className="num font-semibold" style={{ color: "var(--text)" }}>
              {levelInfo.currentXp.toLocaleString()}
            </span>
          </span>
          <span className="num font-semibold" style={{ color: "var(--brand)" }}>
            {atMaxLevel ? "Max level" : `${Math.round(levelInfo.progress * 100)}% to level ${levelInfo.currentLevel + 1}`}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-raised)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--brand)" }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, levelInfo.progress * 100)}%` }}
            transition={{ duration: 0.7, ease: EASE.out }}
          />
        </div>
      </div>

      {/* Track */}
      <div className="relative py-2">
        <button
          onClick={() => scrollBy(-320)}
          aria-label="Scroll rail left"
          className="icon-button icon-button-sm absolute -left-2 top-1/2 z-20 -translate-y-1/2 sm:-left-3"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => scrollBy(320)}
          aria-label="Scroll rail right"
          className="icon-button icon-button-sm absolute -right-2 top-1/2 z-20 -translate-y-1/2 sm:-right-3"
        >
          <ChevronRight size={16} />
        </button>

        <div ref={railContainerRef} className="rail-scroll relative overflow-x-auto pb-5 pt-5">
          <div
            className="pointer-events-none absolute left-0 right-0 top-[172px] z-0 h-1.5 rounded-full"
            style={{ background: "var(--surface-raised)" }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${Math.min(100, Math.max(0, fluidProgressPercent))}%`, background: "var(--brand)" }}
            />
          </div>

          <div className="relative z-10 flex min-w-max items-start gap-4 px-3">
            {LEVEL_REWARDS.map((reward) => {
              const item = getStoreItemForReward(reward);
              const isUnlocked = levelInfo.currentLevel >= reward.level;
              const isClaimed = claimedLevels.includes(reward.level);
              const isClaimable = isUnlocked && !isClaimed;
              const isCurrent = levelInfo.currentLevel === 0 ? reward.level === 1 : levelInfo.currentLevel === reward.level;
              const isDiamondMilestone = Boolean(reward.diamonds && reward.diamonds > 0);

              return (
                <div key={reward.level} ref={isCurrent ? activeNodeRef : null} className="relative flex w-[176px] shrink-0 flex-col items-center">
                  <div
                    className="relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border p-3"
                    style={{
                      borderColor: isClaimable ? "var(--selected-border)" : "var(--panel-border)",
                      background: isClaimable ? "var(--selected)" : "var(--surface)",
                      opacity: isUnlocked ? 1 : 0.72,
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <span
                        className="num rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[.08em]"
                        style={
                          isClaimable
                            ? { background: "var(--brand)", color: "var(--brand-on)" }
                            : { background: "var(--pill)", color: "var(--text-faint)" }
                        }
                      >
                        Lvl {reward.level}
                      </span>
                      {isDiamondMilestone && (
                        <span className="num inline-flex items-center gap-1 text-[10px]" style={{ color: "var(--brand)" }}>
                          <Gem size={10} /> +10
                        </span>
                      )}
                    </div>

                    <div className="mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-xl border" style={{ borderColor: "var(--panel-border)", background: "var(--surface-raised)" }}>
                      {item ? (
                        <>
                          {item.tab === "avatars" && (
                            <>
                              {item.anime ? (
                                <AnimeAvatar id={item.anime} size={60} />
                              ) : item.cartoon ? (
                                <CartoonAvatar id={item.cartoon} size={60} />
                              ) : (
                                <span className="text-[24px] txt">{item.preview || "✦"}</span>
                              )}
                            </>
                          )}

                          {item.tab === "banners" && (
                            <div className="flex h-full w-full items-center justify-center p-2 text-center text-[11px] font-medium text-white" style={{ background: item.preview }}>
                              <span className="truncate drop-shadow">{item.name}</span>
                            </div>
                          )}

                          {item.tab === "frames" && (
                            <div
                              className="grid h-10 w-10 place-items-center rounded-full text-[11px] font-semibold txt"
                              style={{
                                background: "var(--pill)",
                                boxShadow: item.frameCss && item.frameCss !== "none" ? item.frameCss : undefined,
                              }}
                            >
                              V
                            </div>
                          )}

                          {item.tab === "titles" && (
                            <span className="px-2 text-center text-[11px] font-semibold txt">«{item.name}»</span>
                          )}

                          {item.tab === "themes" && (
                            <div className="flex items-center gap-1">
                              {item.themeSwatch?.map((c, i) => (
                                <div key={i} className="h-8 w-3.5 rounded-full" style={{ background: c }} />
                              ))}
                            </div>
                          )}

                          {item.tab === "styles" && (
                            <span className="px-2 text-center text-[10px] font-semibold uppercase tracking-[.1em] faint">
                              {item.name}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] faint">Mystery</span>
                      )}
                    </div>

                    <div className="mb-2 min-h-[34px]">
                      <h4 className="m-0 truncate text-[12px] font-semibold txt">{item ? item.name : `Reward ${reward.level}`}</h4>
                      <p className="m-0 flex items-center justify-between text-[10px] capitalize faint">
                        <span>{item ? item.tab.slice(0, -1) : "Cosmetic"}</span>
                        {item?.rarity && (
                          <span
                            className="text-[9px] font-semibold uppercase tracking-[.06em]"
                            style={{
                              color:
                                item.rarity === "ultra" ? "#e7c37c" : item.rarity === "epic" ? "#c2a8e6" : "var(--text-faint)",
                            }}
                          >
                            {item.rarity}
                          </span>
                        )}
                      </p>
                    </div>

                    {isClaimed ? (
                      <div className="flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[10.5px] font-medium" style={{ background: "var(--pill)", color: "var(--good)" }}>
                        <Check size={11} /> Claimed
                      </div>
                    ) : isClaimable ? (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => item && onClaim(reward, item)}
                        className="dialog-btn dialog-btn-primary dialog-btn-xs w-full"
                      >
                        {isDiamondMilestone ? "Claim +10" : "Claim"}
                      </motion.button>
                    ) : (
                      <div className="num flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[10px] faint" style={{ background: "var(--pill)" }}>
                        <Lock size={10} /> {reward.xpRequired.toLocaleString()} XP
                      </div>
                    )}
                  </div>

                  <div
                    className="my-1 h-6 w-px transition-colors"
                    style={{ background: isUnlocked ? "var(--brand)" : "var(--panel-border)" }}
                  />

                  <div
                    className="grid h-4 w-4 place-items-center rounded-full border-2 transition-transform"
                    style={{
                      borderColor: isCurrent ? "var(--brand)" : "var(--panel-border)",
                      background: isUnlocked ? "var(--brand)" : "var(--surface)",
                      transform: isCurrent ? "scale(1.2)" : "none",
                    }}
                  >
                    <span className="h-1 w-1 rounded-full" style={{ background: isUnlocked ? "var(--brand-on)" : "var(--text-faint)" }} />
                  </div>

                  <span className="num mt-1.5 text-[10px] font-medium faint">{reward.level}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
