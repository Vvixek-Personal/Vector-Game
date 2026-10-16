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
import {
  Gem,
  Check,
  Lock,
  ChevronLeft,
  ChevronRight,
  Gift,
  Zap,
} from "lucide-react";
import { uiTap } from "../game/haptics";

interface Props {
  stats: Stats;
  profile: Profile;
  onClaim: (reward: LevelRewardDef, storeItem: StoreItem) => void;
  onClaimAll: () => void;
}

export default function LevelRail({ stats, profile, onClaim, onClaimAll }: Props) {
  const railContainerRef = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLDivElement>(null);

  const levelInfo = getPlayerLevelProgress(stats, profile);
  const claimedLevels = profile.claimedLevels ?? [];

  // Smooth scroll to current level on mount
  useEffect(() => {
    if (activeNodeRef.current && railContainerRef.current) {
      setTimeout(() => {
        activeNodeRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }, 350);
    }
  }, [levelInfo.currentLevel]);

  const scrollToActive = () => {
    uiTap();
    activeNodeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const scrollBy = (offset: number) => {
    uiTap();
    if (railContainerRef.current) {
      railContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Find next diamond milestone (every 10 levels)
  const nextDiamondLevel = Math.max(10, Math.ceil((levelInfo.currentLevel + 0.01) / 10) * 10);
  const levelsUntilDiamond = Math.max(0, nextDiamondLevel - levelInfo.currentLevel);

  let activeIdx = -1;
  for (let i = 0; i < LEVEL_REWARDS.length; i++) {
    if (levelInfo.currentLevel >= LEVEL_REWARDS[i].level) {
      activeIdx = i;
    }
  }

  let partialProgress = 0;
  const nextReward = LEVEL_REWARDS[activeIdx + 1];
  if (nextReward) {
    const startXp = activeIdx >= 0 ? LEVEL_REWARDS[activeIdx].xpRequired : 0;
    const endXp = nextReward.xpRequired;
    const totalSpan = endXp - startXp;
    const xpInto = levelInfo.currentXp - startXp;
    partialProgress = Math.min(1, Math.max(0, xpInto / totalSpan));
  } else if (levelInfo.currentLevel >= levelInfo.maxLevel) {
    partialProgress = 0;
  }

  const fluidProgressPercent = LEVEL_REWARDS.length > 1
    ? ((Math.max(0, activeIdx) + partialProgress) / (LEVEL_REWARDS.length - 1)) * 100
    : 0;

  return (
    <div className="level-rail-system rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-5 sm:p-6 shadow-2xl space-y-5">
      {/* Header with Level Badge, XP, and Quick Jump */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-sky-500/25 shrink-0 border border-white/20">
            {levelInfo.currentLevel}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-extrabold text-white m-0 tracking-tight">
                Level Progression Rail
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-500/20 border border-sky-400/30 text-sky-300">
                Level {levelInfo.currentLevel} of {levelInfo.maxLevel}
              </span>
            </div>
            <p className="text-xs text-white/60 m-0 mt-0.5 flex items-center gap-2">
              <span>Earn Store item on every level</span>
              <span className="text-white/25">·</span>
              <span className="text-cyan-300 font-semibold inline-flex items-center gap-1">
                <Gem size={12} /> +10 Diamonds every 10 levels
              </span>
            </p>
          </div>
        </div>

        {/* Milestone info & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:self-center">
          {levelsUntilDiamond > 0 ? (
            <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs font-semibold flex items-center gap-1.5">
              <Gem size={14} className="text-cyan-400" />
              <span>
                Lvl {nextDiamondLevel} in {levelsUntilDiamond} lvl{levelsUntilDiamond > 1 ? "s" : ""} (+10 ◆)
              </span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <Gem size={14} /> Diamond Milestone Unlocked!
            </div>
          )}

          {levelInfo.unclaimedCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onClaimAll}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-400/20 flex items-center gap-1.5 cursor-pointer transition"
            >
              <Gift size={14} />
              <span>Claim All ({levelInfo.unclaimedCount})</span>
            </motion.button>
          )}

          <button
            onClick={scrollToActive}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
          >
            <Zap size={13} className="text-amber-400" /> Current Lvl
          </button>
        </div>
      </div>

      {/* Progress to Next Level Info Bar */}
      <div className="space-y-1.5 bg-white/5 p-3.5 rounded-2xl border border-white/5">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-white/80">
            TOTAL LIFETIME XP: <span className="text-white font-black">{levelInfo.currentXp.toLocaleString()}</span>
          </span>
          <span className="text-sky-300 font-extrabold">
            {levelInfo.currentLevel >= levelInfo.maxLevel
              ? "MAX LEVEL REACHED"
              : `${Math.round(levelInfo.progress * 100)}% to Level ${levelInfo.currentLevel + 1}`}
          </span>
        </div>
        <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 relative">
          <motion.div
            className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-cyan-300 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${levelInfo.progress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* HORIZONTAL RAIL SECTION */}
      <div className="relative pt-2 pb-2">
        {/* Navigation Arrow Left */}
        <button
          onClick={() => scrollBy(-320)}
          className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center shadow-xl cursor-pointer transition backdrop-blur-md"
          title="Scroll Left"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Navigation Arrow Right */}
        <button
          onClick={() => scrollBy(320)}
          className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center shadow-xl cursor-pointer transition backdrop-blur-md"
          title="Scroll Right"
        >
          <ChevronRight size={18} />
        </button>

        {/* The Scrollable Horizontal Track */}
        <div
          ref={railContainerRef}
          className="overflow-x-auto pb-6 pt-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent select-none relative"
          style={{ scrollBehavior: "smooth" }}
        >
          {/* Straight Horizontal Rail Base Conduits */}
          <div className="absolute top-[166px] left-0 right-0 h-3 bg-black/60 border border-white/10 rounded-full pointer-events-none z-0">
            {/* The active glowing fluid beam extending across the rail up to current level */}
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-indigo-500 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.7)] transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(0, fluidProgressPercent))}%`,
              }}
            />
          </div>

          {/* Cards along the straight horizontal rail */}
          <div className="flex items-start gap-5 px-4 min-w-max relative z-10">
            {LEVEL_REWARDS.map((reward) => {
              const item = getStoreItemForReward(reward);
              const isUnlocked = levelInfo.currentLevel >= reward.level;
              const isClaimed = claimedLevels.includes(reward.level);
              const isClaimable = isUnlocked && !isClaimed;
              const isCurrent =
                levelInfo.currentLevel === 0
                  ? reward.level === 1
                  : levelInfo.currentLevel === reward.level;
              const isDiamondMilestone = reward.diamonds && reward.diamonds > 0;

              return (
                <div
                  key={reward.level}
                  ref={isCurrent ? activeNodeRef : null}
                  className="relative flex flex-col items-center w-[188px] shrink-0"
                >
                  {/* Reward Card */}
                  <motion.div
                    whileHover={{ y: -4 }}
                    className={`w-full rounded-2xl p-3.5 flex flex-col justify-between border transition-all duration-200 relative overflow-hidden ${
                      isDiamondMilestone
                        ? isClaimable
                          ? "bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.35)] ring-1 ring-cyan-400/50"
                          : isUnlocked
                          ? "bg-cyan-950/20 border-cyan-500/40 text-white"
                          : "bg-black/40 border-cyan-900/40 text-white/50"
                        : isClaimable
                        ? "bg-sky-500/10 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)] ring-1 ring-sky-400/40"
                        : isUnlocked
                        ? "bg-white/5 border-white/15 text-white"
                        : "bg-black/30 border-white/5 text-white/40 opacity-75"
                    }`}
                  >
                    {/* Shimmer on Diamond Milestone */}
                    {isDiamondMilestone && (
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
                    )}

                    {/* Level Pill + Diamond Badge */}
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      <span
                        className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isDiamondMilestone
                            ? "bg-cyan-400 text-black shadow-sm"
                            : isClaimable
                            ? "bg-sky-400 text-black"
                            : isUnlocked
                            ? "bg-white/15 text-white"
                            : "bg-black/40 text-white/50 border border-white/5"
                        }`}
                      >
                        LVL {reward.level}
                      </span>

                      {isDiamondMilestone && (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 animate-pulse">
                          <Gem size={10} className="text-cyan-400" />
                          <span>+10 ◆</span>
                        </span>
                      )}
                    </div>

                    {/* Store Item Preview Graphic */}
                    <div className="h-20 w-full rounded-xl bg-black/50 border border-white/5 flex items-center justify-center overflow-hidden mb-2.5 relative">
                      {item ? (
                        <>
                          {item.tab === "avatars" && (
                            <>
                              {item.anime ? (
                                <AnimeAvatar id={item.anime} size={64} />
                              ) : item.cartoon ? (
                                <CartoonAvatar id={item.cartoon} size={64} />
                              ) : (
                                <span className="text-2xl font-black text-white">
                                  {item.preview || "✦"}
                                </span>
                              )}
                            </>
                          )}

                          {item.tab === "banners" && (
                            <div
                              className="w-full h-full flex items-center justify-center p-2 text-center text-xs font-extrabold text-white"
                              style={{ background: item.preview }}
                            >
                              <span className="drop-shadow truncate">{item.name}</span>
                            </div>
                          )}

                          {item.tab === "frames" && (
                            <div
                              className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white"
                              style={{
                                boxShadow:
                                  item.frameCss && item.frameCss !== "none"
                                    ? item.frameCss
                                    : undefined,
                              }}
                            >
                              V
                            </div>
                          )}

                          {item.tab === "titles" && (
                            <span className="text-xs font-extrabold text-amber-300 tracking-wide px-2 text-center">
                              «{item.name}»
                            </span>
                          )}

                          {item.tab === "themes" && (
                            <div className="flex items-center gap-1">
                              {item.themeSwatch?.map((c, i) => (
                                <div
                                  key={i}
                                  className="w-4 h-8 rounded-full border border-white/20"
                                  style={{ background: c }}
                                />
                              ))}
                            </div>
                          )}

                          {item.tab === "styles" && (
                            <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
                              {item.name} Style
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-white/40">Mystery</span>
                      )}
                    </div>

                    {/* Reward details */}
                    <div className="min-h-[38px] mb-2.5">
                      <h4 className="text-xs font-bold text-white truncate m-0">
                        {item ? item.name : `Reward ${reward.level}`}
                      </h4>
                      <p className="text-[10px] text-white/50 m-0 capitalize flex items-center justify-between">
                        <span>{item ? item.tab.slice(0, -1) : "Cosmetic"}</span>
                        {item?.rarity && (
                          <span
                            className={`font-semibold text-[9px] uppercase ${
                              item.rarity === "ultra"
                                ? "text-amber-400"
                                : item.rarity === "epic"
                                ? "text-purple-400"
                                : "text-sky-300"
                            }`}
                          >
                            {item.rarity}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div>
                      {isClaimed ? (
                        <div className="w-full py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1">
                          <Check size={12} /> Claimed
                        </div>
                      ) : isClaimable ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (item) onClaim(reward, item);
                          }}
                          className={`w-full py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer shadow-md transition ${
                            isDiamondMilestone
                              ? "bg-cyan-400 hover:bg-cyan-300 text-black shadow-cyan-400/30 animate-pulse"
                              : "bg-sky-400 hover:bg-sky-300 text-black shadow-sky-400/20"
                          }`}
                        >
                          {isDiamondMilestone ? "Claim +10 ◆" : "Claim"}
                        </motion.button>
                      ) : (
                        <div className="w-full py-1 rounded-lg bg-black/40 border border-white/5 text-white/40 text-[10px] font-semibold flex items-center justify-center gap-1">
                          <Lock size={10} /> {reward.xpRequired.toLocaleString()} XP
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Vertical Laser Connector down to straight rail */}
                  <div
                    className={`w-0.5 h-6 my-1 transition-colors duration-300 ${
                      isUnlocked
                        ? "bg-gradient-to-b from-sky-400 to-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                        : "bg-white/10"
                    }`}
                  />

                  {/* Rail Node Pin directly on the straight rail */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      isCurrent
                        ? "bg-sky-400 border-white shadow-[0_0_15px_#38bdf8] scale-125"
                        : isUnlocked
                        ? "bg-indigo-600 border-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                        : "bg-black border-white/20"
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCurrent
                          ? "bg-white animate-ping"
                          : isUnlocked
                          ? "bg-cyan-200"
                          : "bg-white/20"
                      }`}
                    />
                  </div>

                  {/* Node Label underneath rail */}
                  <span className="text-[10px] font-extrabold text-white/50 mt-1.5">
                    {reward.level}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
