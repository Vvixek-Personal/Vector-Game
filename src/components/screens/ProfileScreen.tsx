import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Profile } from "../../game/profile";
import { TITLES } from "../../game/profile";
import { STORE_ITEMS, type StoreItem } from "../../game/catalog";
import type { Stats } from "../../game/storage";
import { saveStats, loadStats } from "../../game/storage";
import { saveProfile } from "../../game/profile";
import { uiTap, uiConfirm, uiUnlock } from "../../game/haptics";
import Icon from "../Icon";
import Avatar from "../Avatar";
import AnimeAvatar from "../AnimeAvatar";
import CartoonAvatar from "../CartoonAvatar";
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
    (item) => !item.pack && profile.purchased.includes(item.id)
  );

  const filteredItems =
    vaultTab === "all"
      ? ownedStoreItems
      : ownedStoreItems.filter((item) => item.tab === vaultTab);

  const isItemEquipped = (item: StoreItem): boolean => {
    if (item.tab === "avatars") {
      return profile.avatarId === (item.apply?.avatarId || item.id);
    }
    if (item.tab === "banners") {
      return profile.bannerId === (item.apply?.bannerId || item.id);
    }
    if (item.tab === "frames") {
      const targetFrame = item.apply?.frameId || item.id.replace("frm-", "");
      return profile.frameId === targetFrame;
    }
    if (item.tab === "titles") {
      const targetTitle = item.apply?.titleId || item.id.replace("ttl-", "");
      return profile.titleId === targetTitle;
    }
    if (item.tab === "styles") {
      const targetStyle = item.apply?.bannerStyle || item.id.replace("sty-", "");
      return profile.bannerStyle === targetStyle;
    }
    if (item.tab === "themes") return profile.arenaThemeId === item.id;
    if (item.tab === "audio") {
      return profile.audioPackId === item.apply?.audioPackId;
    }
    return false;
  };

  const handleEquip = (item: StoreItem) => {
    uiConfirm();
    if (!item.apply) return;

    const next = { ...profile };
    if (item.apply.avatarId) next.avatarId = item.apply.avatarId;
    if (item.apply.bannerId) next.bannerId = item.apply.bannerId;
    if (item.apply.frameId) next.frameId = item.apply.frameId;
    if (item.apply.titleId) next.titleId = item.apply.titleId;
    if (item.apply.bannerStyle) next.bannerStyle = item.apply.bannerStyle;
    if (item.apply.audioPackId) next.audioPackId = item.apply.audioPackId;
    if (item.apply.arenaThemeId) next.arenaThemeId = item.apply.arenaThemeId;

    saveProfile(next);
    onProfile(next);
    setFeedback(`Equipped ${item.name} (${item.tab.slice(0, -1)})`);
    setTimeout(() => setFeedback(""), 2800);
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
    <div className="profile-page min-h-screen pb-28 text-white">
      {/* Header with Wordmark and Currency Balances */}
      <header className="home-header">
        <div className="wordmark cursor-pointer" onClick={onBack}>
          <Icon name="arrow" size={28} />
          <h1>
            Vector<span>.</span>
          </h1>
        </div>

        <div className="currency-row">
          <div className="spark-chip">
            <Sparkles size={14} className="inline-icon" /> {sparks.toLocaleString()}
          </div>
          <div className="diamond-chip">
            <Gem size={14} className="inline-icon" /> {diamonds.toLocaleString()}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-7">
        {/* Minimal Hero Dossier Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl border-b border-white/10 p-6 sm:p-8"
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
                        value={editNameValue} 
                        onChange={(e) => setEditNameValue(e.target.value)} 
                        className="bg-black/40 border border-white/20 text-white text-3xl font-light tracking-tight rounded-lg px-2 py-1 w-48 focus:outline-none focus:border-white/50"
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
                    <h2 className="text-3xl font-light tracking-tight text-white m-0 flex items-center gap-2 group">
                      {name.trim() || "Ace"}
                      {onNameChange && (
                        <button 
                          onClick={() => {
                            setEditNameValue(name);
                            setIsEditingName(true);
                          }}
                          className="text-white/30 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white cursor-pointer p-1 rounded-md"
                        >
                          <Pencil size={18} />
                        </button>
                      )}
                    </h2>
                  )}
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
                    {equippedTitle}
                  </span>
                </div>

                <p className="text-sm font-medium text-white/60 mb-0 flex items-center gap-3 flex-wrap">
                  <span className="text-white">Level {levelInfo.currentLevel}</span>
                  <span className="text-white/20">|</span>
                  <span>{stats.runs} Runs</span>
                  <span className="text-white/20">|</span>
                  <span>Max Combo: {stats.bestStreak}</span>
                  <span className="text-white/20">|</span>
                  <span>{ownedStoreItems.length} Items</span>
                </p>

                {/* Level progress bar summary */}
                <div className="mt-4 max-w-xs w-full">
                  <div className="h-1 w-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${levelInfo.progress * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
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
                className="text-sm font-medium text-white/60 hover:text-white transition flex items-center gap-2 cursor-pointer"
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
              className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-sky-500/20 border border-emerald-500/40 text-emerald-200 text-sm font-bold flex items-center gap-2.5 shadow-lg"
            >
              <Check size={18} className="text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Tabs Navigation */}
        <div className="flex items-center gap-6 border-b border-white/10 mt-8 overflow-x-auto scrollbar-hide">
          {(
            [
              { id: "vault", label: "Vault" },
              { id: "levels", label: "Milestones" },
              { id: "achievements", label: "Achievements" },
              { id: "tasks", label: "Daily Tasks" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                uiTap();
                setMainTab(t.id);
              }}
              className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                mainTab === t.id
                  ? "border-white text-white"
                  : "border-transparent text-white/40 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* HORIZONTAL RAIL LEVEL PROGRESSION SYSTEM */}
        {/* ========================================================= */}
        {mainTab === "levels" && (
        <section className="level-progression-section pt-8">
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
        <section className="achievements-section pt-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
              <Award size={18} className="text-white/60" />
              <span>Service Record</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {ACHIEVEMENTS.map(ach => {
              const isUnlocked = getUnlockedAchievements(stats).includes(ach.id);
              return (
                <div key={ach.id} className={`flex gap-4 ${isUnlocked ? "opacity-100" : "opacity-30 grayscale"}`}>
                  <div className={`shrink-0 ${isUnlocked ? "text-white" : "text-white/30"}`}>
                    <Icon name={ach.icon as any} size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-wide text-white">{ach.title}</div>
                    <div className="text-xs text-white/50 mt-1 leading-relaxed">{ach.description}</div>
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
        <section className="vault-section pt-8">
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                <Package size={18} className="text-white/60" />
                <span>The Vault</span>
              </h3>
              <p className="text-sm text-white/50 mt-1">
                Your acquired items and customizations.
              </p>
            </div>

            {/* Vault Filter Tabs */}
            <div className="flex gap-6 overflow-x-auto scrollbar-hide border-b border-white/10">
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
                  onClick={() => {
                    uiTap();
                    setVaultTab(t.id);
                  }}
                  className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                    vaultTab === t.id
                      ? "border-white text-white"
                      : "border-transparent text-white/40 hover:text-white"
                  }`}
                >
                  {t.label} <span className="opacity-40 text-xs ml-1">{t.count}</span>
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
                  className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition cursor-pointer ${
                    equipped
                      ? "bg-white/10 border-white/20"
                      : "bg-transparent border-white/5 hover:border-white/15"
                  }`}
                >
                  {/* Equipped Ribbon */}
                  {equipped && (
                    <div className="absolute top-3 right-3 z-10 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}

                  {/* Preview Element */}
                  <div className={`h-24 w-full flex items-center justify-center rounded-xl overflow-hidden mb-4 relative ${
                    equipped ? "bg-black/40" : "bg-black/20 group-hover:bg-black/40 transition-colors"
                  }`}>
                    {item.tab === "avatars" && (
                      <>
                        {item.anime ? (
                          <AnimeAvatar id={item.anime} size={72} />
                        ) : item.cartoon ? (
                          <CartoonAvatar id={item.cartoon} size={72} />
                        ) : (
                          <span className="text-3xl font-light text-white">
                            {item.preview || "✦"}
                          </span>
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
                          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white bg-white/5"
                          style={{
                            boxShadow: item.frameCss && item.frameCss !== "none" ? item.frameCss : undefined,
                          }}
                        >
                          V
                        </div>
                      </div>
                    )}

                    {item.tab === "titles" && (
                      <div className="text-center px-2">
                        <span className="text-sm font-semibold tracking-wide text-white">
                          «{item.name}»
                        </span>
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
                      <div className="text-xs font-semibold text-white/60 uppercase tracking-widest text-center">
                        {item.name} Style
                      </div>
                    )}

                    {item.tab === "audio" && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-white/40 group-hover:text-white/80 transition-colors">
                          <Icon name="music" size={24} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Information & Action */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-white/40 font-medium capitalize tracking-wide">
                      <span>{item.tab.slice(0, -1)}</span>
                      <span>{item.rarity ?? "Store"}</span>
                    </div>

                    <div className="font-semibold text-sm text-white truncate">{item.name}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16 px-4 rounded-2xl border border-white/10 bg-white/5">
              <Package size={36} className="mx-auto text-white/30 mb-2" />
              <h4 className="text-base font-bold text-white m-0">No owned items in this tab</h4>
              <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
                Level up along the Horizontal Rail or visit the Store to unlock more cosmetics.
              </p>
              <button
                onClick={() => {
                  uiTap();
                  onOpenStore();
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-white/90 transition cursor-pointer"
              >
                Visit Store
              </button>
            </div>
          )}
        </section>
        )}

        {/* ========================================================= */}
        {/* DAILY TASKS (MISSIONS) */}
        {/* ========================================================= */}
        {mainTab === "tasks" && (
        <section className="tasks-section pt-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
              <Zap size={18} className="text-white/60" />
              <span>Missions</span>
            </h3>
            <p className="text-sm text-white/50 mt-1">
              Complete these tasks to earn extra Sparks and Diamonds.
            </p>
          </div>

          <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6">
            {(["daily", "weekly", "monthly"] as const).map(t => (
              <button
                key={t}
                onClick={() => { uiTap(); setMissionsTab(t); }}
                className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-lg transition-colors ${missionsTab === t ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/80"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {missionsState && (
            <div className="space-y-4">
              {missionsState[missionsTab].map(m => {
                const isClaimed = m.claimed;
                const isComplete = m.completed;
                const pct = Math.min(100, Math.round((m.progress / m.requirement) * 100));

                return (
                  <div key={m.id} className="relative overflow-hidden bg-white/5 rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-white text-sm">{m.title}</h3>
                        <div className="flex gap-3 text-xs font-semibold text-white/50 mt-1">
                          <span className="flex items-center gap-1"><Sparkles size={12} className="text-white/30"/> {m.rewardXp} XP</span>
                          <span className="flex items-center gap-1"><Gem size={12} className="text-white/30"/> {m.rewardDiamonds}</span>
                        </div>
                      </div>
                      {isClaimed ? (
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider py-1 px-3 rounded-md bg-white/5">Claimed</div>
                      ) : isComplete ? (
                        <button onClick={() => handleClaimMission(m)} className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-1.5 rounded-lg border border-white/10 transition">
                          Claim
                        </button>
                      ) : (
                        <div className="text-xs font-medium text-white/60">
                          {m.progress} <span className="text-white/30">/ {m.requirement}</span>
                        </div>
                      )}
                    </div>
                    
                    {!isClaimed && (
                      <div className="w-full h-1 bg-black/40 overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${isComplete ? "bg-white" : "bg-white/30"}`} style={{ width: `${pct}%` }}></div>
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

      {/* Google DP Choice Modal */}
      <AnimatePresence>
        {showDpPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-md w-full relative shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <ImageIcon size={32} />
              </div>
              <h2 className="text-2xl font-black text-white m-0 mb-2">Level 20 Reached!</h2>
              <p className="text-sm text-white/70 mb-6">
                You've reached Level 20! You now have the option to use your Google Account profile picture across the leaderboard instead of the in-game avatar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => {
                    uiTap();
                    const next = { ...profile, useGooglePfp: false };
                    saveProfile(next);
                    onProfile(next);
                    setShowDpPopup(false);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition"
                >
                  Keep Game Avatar
                </button>
                <button
                  onClick={() => {
                    uiConfirm();
                    const next = { ...profile, useGooglePfp: true };
                    saveProfile(next);
                    onProfile(next);
                    setShowDpPopup(false);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition"
                >
                  Use Google PFP
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Celebration Modal */}
      <AnimatePresence>
        {showLevelUp !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setShowLevelUp(null)}
          >
            {/* Confetti Background Layer */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center">
               <motion.div 
                 initial={{ opacity: 0, scale: 0 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
                 className="absolute top-1/4 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.2)_0%,transparent_50%)]"
               />
            </div>

            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
              className="relative bg-gradient-to-b from-sky-900/40 to-black border border-sky-400/30 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(56,189,248,0.2)] text-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Spinning light effect */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(56,189,248,0.3)_360deg)] pointer-events-none"
              />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", bounce: 0.7 }}
                className="relative z-10 w-24 h-24 mx-auto bg-gradient-to-br from-sky-400 to-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.6)] mb-6 border-4 border-black"
              >
                <PartyPopper size={48} className="text-white drop-shadow-md" />
              </motion.div>

              <div className="relative z-10 space-y-2 mb-8">
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-cyan-300 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                >
                  Level Up!
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-sky-200 font-semibold"
                >
                  You reached <span className="text-white font-black text-xl">Level {showLevelUp}</span>
                </motion.p>
              </div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  uiTap();
                  setShowLevelUp(null);
                }}
                className="relative z-10 w-full py-4 rounded-xl bg-white text-black font-black text-lg tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.4)] transition cursor-pointer"
              >
                Awesome!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
