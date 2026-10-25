import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { backdropVariants, panelVariants } from "../../utils/motion";
import type { Profile } from "../../game/profile";
import { TITLES } from "../../game/profile";
import { STORE_ITEMS, type StoreItem } from "../../game/catalog";
import type { Stats } from "../../game/storage";
import { saveStats, loadStats } from "../../game/storage";
import { saveProfile } from "../../game/profile";
import { uiTap, uiConfirm, uiUnlock } from "../../game/haptics";
import Icon from "../Icon";
import Avatar from "../Avatar";
import AppHeader from "../AppHeader";
import SegmentedTabs from "../shared/SegmentedTabs";
import AnimeAvatar from "../AnimeAvatar";
import CartoonAvatar from "../CartoonAvatar";
import HeroAvatar from "../HeroAvatar";
import { ownsStoreItem, isStoreItemEquipped, transactStoreItem } from "../../game/store";
import LevelRail from "../LevelRail";
import LevelProgressBar from "../LevelProgressBar";
import GoogleAuthButton from "../GoogleAuthButton";
import { useAuth } from "../../firebase/auth";
import { LEVEL_REWARDS, type LevelRewardDef, getPlayerLevelProgress } from "../../game/levels";
import { ACHIEVEMENTS, getUnlockedAchievements } from "../../game/achievements";
import { loadMissions, type Mission, type MissionsState, saveMissions } from "../../game/missions";
import {
  Sparkles,
  Gem,
  Check,
  Package,
  ShoppingBag,
  Zap,
  Image as ImageIcon,
  Award,
  PartyPopper,
  Pencil,
} from "lucide-react";

interface Props {
  key?: React.Key;
  profile: Profile;
  onProfile: (p: Profile) => void;
  stats: Stats;
  onStats?: (s: Stats) => void;
  name?: string;
  onNameChange?: (n: string) => void;
  onBack: () => void;
  onOpenStore: () => void;
  initialTab?: MainTab;
}

type VaultTab = "all" | "avatars" | "banners" | "frames" | "titles" | "themes" | "styles" | "audio";
type MainTab = "vault" | "levels" | "achievements" | "tasks";

export default function ProfileScreen({
  profile,
  onProfile,
  stats,
  onStats,
  name = "Ace",
  onNameChange,
  onBack,
  onOpenStore,
  initialTab = "vault",
}: Props) {
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [vaultTab, setVaultTab] = useState<VaultTab>("all");
  const [feedback, setFeedback] = useState("");
  const { user } = useAuth();
  const [showDpPopup, setShowDpPopup] = useState(false);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(name);
  
  const [missionsState, setMissionsState] = useState<MissionsState | null>(null);
  const [missionsTab, setMissionsTab] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    setMissionsState(loadMissions());
  }, []);

  const handleClaimMission = (mission: Mission) => {
    const current = loadMissions();
    const stored = current[mission.type].find(m => m.id === mission.id);
    if (!stored?.completed || stored.claimed) return;
    const next = { ...current, [mission.type]: current[mission.type].map(m => m.id === stored.id ? { ...m, claimed: true } : m) };
    saveMissions(next);
    setMissionsState(next);
    const latest = loadStats();
    const newStats = { ...latest, bonusXp: (latest.bonusXp ?? 0) + stored.rewardXp, diamonds: latest.diamonds + stored.rewardDiamonds };
    saveStats(newStats);
    onStats?.(newStats);
    uiUnlock();
    setFeedback(`Earned ${stored.rewardXp} XP and ${stored.rewardDiamonds} Diamonds`);
  };

  const sparks = stats.sparks ?? 0;
  const diamonds = stats.diamonds ?? 0;
  const levelInfo = getPlayerLevelProgress(stats, profile);

  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
  const prevLevelRef = React.useRef(levelInfo.currentLevel);

  useEffect(() => {
    if (levelInfo.currentLevel > prevLevelRef.current) {
      setShowLevelUp(levelInfo.currentLevel);
      // Play a nice haptic success pattern when leveling up!
      uiUnlock(); 
    }
    prevLevelRef.current = levelInfo.currentLevel;
  }, [levelInfo.currentLevel]);

  useEffect(() => {
    if (user && levelInfo.currentLevel >= 20 && profile.useGooglePfp === undefined) {
      setShowDpPopup(true);
    }
  }, [user, levelInfo.currentLevel, profile.useGooglePfp]);

  // Unify Vault with Store catalog:
  // ONLY display items from STORE_ITEMS that the player owns via profile.purchased
  // This guarantees 100% consistency: any item in Vault is shown in Store as "Owned"!
  const ownedStoreItems = STORE_ITEMS.filter(
    (item) => ownsStoreItem(item, profile, stats)
  );

  const filteredItems =
    vaultTab === "all"
      ? ownedStoreItems
      : ownedStoreItems.filter((item) => item.tab === vaultTab);

  const isItemEquipped = (item: StoreItem) => ownsStoreItem(item, profile, stats) && isStoreItemEquipped(item, profile);

  const handleEquip = (item: StoreItem) => {
    const result = transactStoreItem(item.id, "equip");
    if (result.ok === false) { setFeedback(result.reason); return; }
    uiConfirm(); onProfile(result.profile); onStats?.(result.stats);
    setFeedback("Equipped " + item.name);
  };

  // Claim single level reward
  const handleClaimReward = (reward: LevelRewardDef, item: StoreItem) => {
    uiUnlock();
    const currentClaimed = profile.claimedLevels ?? [];
    if (currentClaimed.includes(reward.level)) return;

    const nextClaimed = [...currentClaimed, reward.level];
    const nextPurchased = profile.purchased.includes(item.id)
      ? profile.purchased
      : [...profile.purchased, item.id];

    const nextProfile: Profile = {
      ...profile,
      purchased: nextPurchased,
      claimedLevels: nextClaimed,
    };

    saveProfile(nextProfile);
    onProfile(nextProfile);

    let diamondNotice = "";
    if (reward.diamonds && reward.diamonds > 0) {
      const nextStats: Stats = {
        ...stats,
        diamonds: (stats.diamonds ?? 0) + reward.diamonds,
      };
      saveStats(nextStats);
      if (onStats) onStats(nextStats);
      diamondNotice = ` & +${reward.diamonds} Diamonds`;
    }

    setFeedback(
      `Level ${reward.level} Unlocked: ${item.name}${diamondNotice}! Added to Vault & marked Owned in Store.`
    );
    setTimeout(() => setFeedback(""), 4000);
  };

  // Claim all eligible level rewards at once
  const handleClaimAll = () => {
    uiUnlock();
    const currentLevel = levelInfo.currentLevel;
    const currentClaimed = profile.claimedLevels ?? [];
    const newPurchased = [...profile.purchased];
    const newClaimed = [...currentClaimed];
    let totalDiamonds = 0;
    let count = 0;

    for (const reward of LEVEL_REWARDS) {
      if (reward.level <= currentLevel && !newClaimed.includes(reward.level)) {
        newClaimed.push(reward.level);
        if (!newPurchased.includes(reward.storeItemId)) {
          newPurchased.push(reward.storeItemId);
        }
        if (reward.diamonds) {
          totalDiamonds += reward.diamonds;
        }
        count++;
      }
    }

    if (count === 0) return;

    const nextProfile: Profile = {
      ...profile,
      purchased: newPurchased,
      claimedLevels: newClaimed,
    };
    saveProfile(nextProfile);
    onProfile(nextProfile);

    if (totalDiamonds > 0) {
      const nextStats: Stats = {
        ...stats,
        diamonds: (stats.diamonds ?? 0) + totalDiamonds,
      };
      saveStats(nextStats);
      if (onStats) onStats(nextStats);
    }

    setFeedback(
      `Claimed ${count} rewards${
        totalDiamonds > 0 ? ` & +${totalDiamonds} Diamonds` : ""
      }! Added to Vault & marked Owned in Store.`
    );
    setTimeout(() => setFeedback(""), 4000);
  };

  const equippedTitle =
    TITLES.find((t) => t.id === profile.titleId)?.name ?? "Rookie";

  return (
    <div className="profile-page collection-page v-profile-page min-h-[calc(100dvh-92px)] pb-28 txt">
      {/* Header with Wordmark and Currency Balances */}
      <AppHeader title="Profile" subtitle="Your collection and progress" sparks={sparks} diamonds={diamonds} onBack={onBack}/>


      <div className="v-profile-content space-y-7">
        {/* Minimal Hero Dossier Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8"
          style={{
            background:
              STORE_ITEMS.find((s) => s.id === profile.bannerId || s.apply?.bannerId === profile.bannerId)?.preview ||
              "#0a0a0c",
          }}
        >
          {/* Subtle Ambient Vignette */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply"
            style={{ background: "linear-gradient(to top, #000, transparent)" }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Profile Avatar with active frame */}
              <div className="relative shrink-0">
                <Avatar profile={profile} name={name} size={84} />
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  {isEditingName ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editNameValue.trim() && onNameChange) {
                          onNameChange(editNameValue.trim());
                        }
                        setIsEditingName(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <input 
                        type="text" 
                        aria-label="Player name" value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)} 
                        className="w-48 rounded-lg border border-white/30 bg-black/40 px-2 py-1 text-[24px] font-semibold tracking-tight text-white outline-none focus:border-white/70"
                        autoFocus
                        onBlur={() => {
                          if (editNameValue.trim() && onNameChange) {
                            onNameChange(editNameValue.trim());
                          }
                          setIsEditingName(false);
                        }}
                        maxLength={15}
                      />
                    </form>
                  ) : (
                    <h2 className="m-0 flex items-center gap-2 text-[26px] font-semibold leading-tight tracking-[-.03em] text-white group">
                      {name.trim() || "Ace"}
                      {onNameChange && (
                        <button 
                          onClick={() => {
                            setEditNameValue(name);
                            setIsEditingName(true);
                          }}
                          aria-label="Edit player name" className="cursor-pointer rounded-md p-1 text-white/60 transition-opacity hover:text-white focus-visible:opacity-100"
                        >
                          <Pencil size={18} />
                        </button>
                      )}
                    </h2>
                  )}
                  <span className="rounded-full border border-white/20 bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.14em] text-white/70">
                    {equippedTitle}
                  </span>
                </div>

                <p className="num mb-0 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-medium text-white/65">
                  <span className="text-white">Level {levelInfo.currentLevel}</span>
                  <span className="text-white/25">·</span>
                  <span>{stats.runs.toLocaleString()} runs</span>
                  <span className="text-white/25">·</span>
                  <span>Best streak {stats.bestStreak}</span>
                  <span className="text-white/25">·</span>
                  <span>{ownedStoreItems.length} items</span>
                </p>

                {/* Level progress bar summary */}
                <div className="mt-4 max-w-xs w-full">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${levelInfo.progress * 100}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Google Auth & Store Button */}
            <div className="flex items-center gap-4 sm:self-start flex-wrap">
              <GoogleAuthButton />
              <button
                onClick={() => {
                  uiTap();
                  onOpenStore();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[12px] font-medium text-white/80 transition-colors hover:bg-black/50 hover:text-white"
              >
                <ShoppingBag size={16} />
                <span>Store</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Visual Progress Bar to Next Level with Fluid Horizontal Animation */}
        <LevelProgressBar
          stats={stats}
          profile={profile}
          onOpenRail={() => {
            setMainTab("levels");
          }}
        />

        {/* Feedback status banner */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-[13px] font-medium"
              style={{ borderColor: "color-mix(in srgb, var(--good) 34%, transparent)", background: "color-mix(in srgb, var(--good) 10%, transparent)", color: "var(--good)" }}
            >
              <Check size={17} className="shrink-0" />
              <span>{feedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Tabs Navigation */}
        <SegmentedTabs<MainTab> label="Profile sections" value={mainTab} onChange={setMainTab} panelId="profile-panel" className="v-primary-tabs" options={[{id:"vault",label:"Collection"},{id:"levels",label:"Milestones"},{id:"achievements",label:"Achievements"},{id:"tasks",label:"Missions"}]}/>


        {/* ========================================================= */}
        {/* HORIZONTAL RAIL LEVEL PROGRESSION SYSTEM */}
        {/* ========================================================= */}
        {mainTab === "levels" && (
        <section id="profile-panel" role="tabpanel" aria-label="level-progression" className="level-progression-section pt-8">
          <LevelRail
            stats={stats}
            profile={profile}
            onClaim={handleClaimReward}
            onClaimAll={handleClaimAll}
          />
        </section>
        )}

        {/* ========================================================= */}
        {/* SERVICE RECORD (ACHIEVEMENTS) */}
        {/* ========================================================= */}
        {mainTab === "achievements" && (
        <section id="profile-panel" role="tabpanel" aria-label="achievements" className="achievements-section pt-8">
          <div className="mb-6">
            <h3 className="t-heading flex items-center gap-2">
              <Award size={17} className="faint" />
              <span>Service record</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {ACHIEVEMENTS.map(ach => {
              const isUnlocked = getUnlockedAchievements(stats).includes(ach.id);
              return (
                <div key={ach.id} className={`flex gap-4 ${isUnlocked ? "opacity-100" : "opacity-30 grayscale"}`}>
                  <div className={`shrink-0 ${isUnlocked ? "accent" : "faint"}`}>
                    <Icon name={ach.icon as any} size={22} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold txt">{ach.title}</div>
                    <div className="t-caption mt-1">{ach.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* ========================================================= */}
        {/* THE VAULT SECTION (100% UNIFIED WITH STORE CATALOG) */}
        {/* ========================================================= */}
        {mainTab === "vault" && (
        <section id="profile-panel" role="tabpanel" aria-label="vault" className="vault-section pt-8">
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="t-heading flex items-center gap-2">
                <Package size={17} className="faint" />
                <span>The vault</span>
              </h3>
              <p className="t-caption mt-1">Everything you own, ready to equip.</p>
            </div>

            {/* Vault Filter Tabs */}
            <div className="tab-strip" role="tablist" aria-label="Vault categories">
              {(
                [
                  { id: "all", label: "All", count: ownedStoreItems.length },
                  {
                    id: "avatars",
                    label: "Avatars",
                    count: ownedStoreItems.filter((i) => i.tab === "avatars").length,
                  },
                  {
                    id: "banners",
                    label: "Banners",
                    count: ownedStoreItems.filter((i) => i.tab === "banners").length,
                  },
                  {
                    id: "frames",
                    label: "Frames",
                    count: ownedStoreItems.filter((i) => i.tab === "frames").length,
                  },
                  {
                    id: "titles",
                    label: "Titles",
                    count: ownedStoreItems.filter((i) => i.tab === "titles").length,
                  },
                  {
                    id: "themes",
                    label: "Themes",
                    count: ownedStoreItems.filter((i) => i.tab === "themes").length,
                  },
                  {
                    id: "styles",
                    label: "Styles",
                    count: ownedStoreItems.filter((i) => i.tab === "styles").length,
                  },
                  {
                    id: "audio",
                    label: "Audio",
                    count: ownedStoreItems.filter((i) => i.tab === "audio").length,
                  },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={vaultTab === t.id}
                  onClick={() => {
                    uiTap();
                    setVaultTab(t.id);
                  }}
                  className="tab-strip-btn"
                >
                  {t.label} <span className="tab-strip-count num">{t.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Vault Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const equipped = isItemEquipped(item);
              return (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleEquip(item)}
                  className="pressable group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4"
                  style={
                    equipped
                      ? { background: "var(--selected)", borderColor: "var(--selected-border)" }
                      : { background: "var(--surface)", borderColor: "var(--panel-border)" }
                  }
                >
                  {/* Equipped Ribbon */}
                  {equipped && (
                    <div className="absolute right-3 top-3 z-10 h-1.5 w-1.5 rounded-full" style={{ background: "var(--brand)" }} />
                  )}

                  {/* Preview Element */}
                  <div
                    className="relative mb-4 flex h-24 w-full items-center justify-center overflow-hidden rounded-xl"
                    style={{ background: "var(--surface-raised)" }}
                  >
                    {item.tab === "avatars" && (
                      <>
                        {item.hero ? (
                          <HeroAvatar id={item.hero} size={72} />
                        ) : item.anime ? (
                          <AnimeAvatar id={item.anime} size={72} />
                        ) : item.cartoon ? (
                          <CartoonAvatar id={item.cartoon} size={72} />
                        ) : (
                          <span className="text-[28px] font-normal txt">{item.preview || "✦"}</span>
                        )}
                      </>
                    )}

                    {item.tab === "banners" && (
                      <div
                        className="w-full h-full rounded-xl flex items-center justify-center text-xs font-semibold text-white/90 p-2 text-center"
                        style={{ background: item.preview }}
                      >
                        <span className="drop-shadow-md truncate">{item.name}</span>
                      </div>
                    )}

                    {item.tab === "frames" && (
                      <div className="flex items-center justify-center">
                        <div
                          className="grid h-12 w-12 place-items-center rounded-full text-[13px] font-semibold txt"
                          style={{
                            background: "var(--panel-border)",
                            boxShadow: item.frameCss && item.frameCss !== "none" ? item.frameCss : undefined,
                          }}
                        >
                          V
                        </div>
                      </div>
                    )}

                    {item.tab === "titles" && (
                      <div className="text-center px-2">
                          <span className="text-[13px] font-semibold txt">«{item.name}»</span>
                      </div>
                    )}

                    {item.tab === "themes" && (
                      <div className="flex items-center gap-1.5">
                        {item.themeSwatch?.map((c, i) => (
                          <div
                            key={i}
                            className="w-4 h-10 rounded-full border border-white/10"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    )}

                    {item.tab === "styles" && (
                      <div className="text-center text-[10px] font-semibold uppercase tracking-[.14em] faint">
                        {item.name} style
                      </div>
                    )}

                    {item.tab === "audio" && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="faint transition-colors group-hover:txt">
                          <Icon name="music" size={22} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Information & Action */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-medium capitalize faint">
                      <span>{item.tab.slice(0, -1)}</span>
                      <span>{item.rarity ?? "Store"}</span>
                    </div>

                    <div className="truncate text-[13px] font-semibold txt">{item.name}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div
              className="rounded-2xl border px-4 py-14 text-center"
              style={{ borderColor: "var(--panel-border)", background: "var(--pill)" }}
            >
              <Package size={32} className="mx-auto mb-2 faint" />
              <h4 className="t-heading">Nothing here yet</h4>
              <p className="t-caption mx-auto mt-1 max-w-sm">
                Claim level rewards along the rail, or visit the store to unlock more looks.
              </p>
              <button
                onClick={() => {
                  uiTap();
                  onOpenStore();
                }}
                className="dialog-btn dialog-btn-primary dialog-btn-sm mt-4"
              >
                Visit store
              </button>
            </div>
          )}
        </section>
        )}

        {/* ========================================================= */}
        {/* DAILY TASKS (MISSIONS) */}
        {/* ========================================================= */}
        {mainTab === "tasks" && (
        <section id="profile-panel" role="tabpanel" aria-label="tasks" className="tasks-section pt-8">
          <div className="mb-5">
            <h3 className="t-heading flex items-center gap-2">
              <Zap size={17} className="faint" />
              <span>Missions</span>
            </h3>
            <p className="t-caption mt-1">Finish these to earn extra Sparks and Diamonds.</p>
          </div>

          <div className="mb-5 flex gap-1 rounded-xl p-1" style={{ background: "var(--pill)" }} role="tablist" aria-label="Mission periods">
            {(["daily", "weekly", "monthly"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={missionsTab === t}
                onClick={() => { uiTap(); setMissionsTab(t); }}
                className="flex-1 rounded-lg py-1.5 text-[12px] capitalize transition-colors"
                style={
                  missionsTab === t
                    ? { background: "var(--surface)", color: "var(--text)", fontWeight: 600, boxShadow: "0 1px 3px #0001" }
                    : { color: "var(--text-faint)", fontWeight: 500 }
                }
              >
                {t}
              </button>
            ))}
          </div>

          {missionsState && (
            <div className="stagger flex flex-col gap-2.5">
              {missionsState[missionsTab].map((m) => {
                const isClaimed = m.claimed;
                const isComplete = m.completed;
                const pct = Math.min(100, Math.round((m.progress / m.requirement) * 100));

                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border p-4"
                    style={{ borderColor: "var(--panel-border)", background: "var(--surface)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold txt">{m.title}</h3>
                        <div className="num mt-1 flex gap-3 text-[11px]" style={{ color: "var(--text-faint)" }}>
                          <span className="flex items-center gap-1"><Sparkles size={11} /> {m.rewardXp} XP</span>
                          <span className="flex items-center gap-1"><Gem size={11} /> {m.rewardDiamonds}</span>
                        </div>
                      </div>
                      {isClaimed ? (
                        <span className="rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-[.1em]" style={{ background: "var(--pill)", color: "var(--text-faint)" }}>
                          Claimed
                        </span>
                      ) : isComplete ? (
                        <button onClick={() => handleClaimMission(m)} className="dialog-btn dialog-btn-primary dialog-btn-sm">
                          Claim
                        </button>
                      ) : (
                        <div className="num text-[12px]" style={{ color: "var(--text-dim)" }}>
                          {m.progress} <span style={{ color: "var(--text-faint)" }}>/ {m.requirement}</span>
                        </div>
                      )}
                    </div>

                    {!isClaimed && (
                      <div className="mt-3 h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-raised)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: isComplete ? "var(--brand)" : "var(--text-faint)" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        )}
      </div>

      {/* Google picture choice */}
      <AnimatePresence>
        {showDpPopup && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="surface-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dp-popup-title"
          >
            <motion.div variants={panelVariants} className="surface-card flex w-full max-w-[380px] flex-col items-center p-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                <ImageIcon size={26} />
              </span>
              <h2 id="dp-popup-title" className="t-title mt-4">Level 20 unlocked</h2>
              <p className="t-body mt-2">
                You can now use your Google profile picture on the leaderboard instead of your in-game avatar.
              </p>
              <div className="dialog-actions mt-5 w-full">
                <button
                  onClick={() => {
                    uiConfirm();
                    const next = { ...profile, useGooglePfp: true };
                    saveProfile(next);
                    onProfile(next);
                    setShowDpPopup(false);
                  }}
                  className="dialog-btn dialog-btn-primary"
                >
                  Use Google picture
                </button>
                <button
                  onClick={() => {
                    uiTap();
                    const next = { ...profile, useGooglePfp: false };
                    saveProfile(next);
                    onProfile(next);
                    setShowDpPopup(false);
                  }}
                  className="dialog-btn dialog-btn-quiet"
                >
                  Keep my game avatar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level up celebration: one short reveal, no infinite spin. */}
      <AnimatePresence>
        {showLevelUp !== null && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="surface-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowLevelUp(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Level up"
          >
            <motion.div
              variants={panelVariants}
              className="surface-card relative w-full max-w-[340px] overflow-hidden p-7 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                className="mx-auto grid h-16 w-16 place-items-center rounded-full"
                style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
              >
                <PartyPopper size={28} />
              </motion.span>

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              >
                <p className="t-eyebrow mt-4">Level up</p>
                <h2 className="t-display is-compact mt-1">Level {showLevelUp}</h2>
                <p className="t-body mt-1.5">New rewards are waiting on the rail.</p>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => {
                  uiTap();
                  setShowLevelUp(null);
                }}
                className="dialog-btn dialog-btn-primary mt-6 w-full"
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
