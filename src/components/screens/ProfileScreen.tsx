import { useMemo, useState } from "react";
import { Package, Check, Lock, Pencil, Trophy, ArrowUpRight, Sparkles, Gem, Target, Award, Search } from "lucide-react";
import { STORE_ITEMS, type StoreItem } from "../../game/catalog";
import { loadProfile, saveProfile, TITLES, bannerFor, type Profile } from "../../game/profile";
import { loadStats, saveStats, saveName, type Stats } from "../../game/storage";
import { LEVEL_REWARDS, getPlayerLevelProgress } from "../../game/levels";
import { loadMissions, saveMissions } from "../../game/missions";
import { ACHIEVEMENTS, getUnlockedAchievements } from "../../game/achievements";
import { ownsStoreItem, isStoreItemEquipped } from "../../game/store";
import { requestStoreAction } from "../../game/economy";
import AppHeader from "../AppHeader";
import Avatar from "../Avatar";
import SegmentedTabs from "../shared/SegmentedTabs";
import Modal from "../shared/Modal";
import { ItemArt, LoadoutPreview } from "../store/ItemPreview";
import Icon from "../Icon";
import "../../collection.css";
import "../../account-ui.css";

type MainTab = "vault" | "levels" | "achievements" | "tasks";

interface Props {
  key?: React.Key;
  profile: Profile;
  onProfile: (profile: Profile) => void;
  stats: Stats;
  onStats?: (stats: Stats) => void;
  name?: string;
  onNameChange?: (name: string) => void;
  onBack: () => void;
  onOpenStore: () => void;
  initialTab?: MainTab;
}

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
  const [tab, setTab] = useState<MainTab>(initialTab);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("owned");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [peek, setPeek] = useState<StoreItem | null>(null);
  const [nameOpen, setNameOpen] = useState(false);
  const [nextName, setNextName] = useState(name);
  const [missionPeriod, setMissionPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [showAll, setShowAll] = useState(false);

  const level = getPlayerLevelProgress(stats, profile);
  const customTitles = profile.customTitles || [];
  const title =
    customTitles.find((t) => t.id === profile.titleId)?.name ||
    TITLES.find((t) => t.id === profile.titleId)?.name ||
    "Rookie";

  const owned = STORE_ITEMS.filter((item) => !item.pack && ownsStoreItem(item, profile, stats));
  const filtered = STORE_ITEMS.filter(
    (item) =>
      !item.pack &&
      (scope === "owned" ? ownsStoreItem(item, profile, stats) : !!profile.inventoryRules?.[item.id]) &&
      (category === "all" || item.tab === category) &&
      item.name.toLowerCase().includes(query.toLowerCase())
  );
  const available = LEVEL_REWARDS.filter(
    (reward) => reward.level <= level.currentLevel && !profile.claimedLevels?.includes(reward.level)
  );
  const nextReward = LEVEL_REWARDS.find((reward) => reward.level > level.currentLevel);

  const localMissions = useMemo(() => loadMissions(), [stats.runs]);
  const missions =
    localMissions?.[missionPeriod]?.map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      target: m.requirement,
      progress: m.progress,
      claimed: m.claimed,
      xp: m.rewardXp,
      diamonds: m.rewardDiamonds,
    })) || [];

  const refresh = () => {
    onProfile(loadProfile());
    onStats?.(loadStats());
  };

  const equip = async (item: StoreItem) => {
    if (busy) return;
    setBusy(true);
    const result = await requestStoreAction(item.id, "equip");
    if (result.ok === false) {
      setNotice(result.reason);
    } else {
      onProfile(result.profile);
      onStats?.(result.stats);
      setNotice(item.name + " equipped.");
      setPeek(null);
    }
    setBusy(false);
  };

  const claim = async (levelNumber?: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const current = loadProfile();
      const latest = loadStats();
      const eligible = LEVEL_REWARDS.filter(
        (r) =>
          r.level <= getPlayerLevelProgress(latest, current).currentLevel &&
          !current.claimedLevels?.includes(r.level) &&
          (!levelNumber || r.level === levelNumber)
      );
      let count = 0;
      for (const reward of eligible) {
        if (current.inventoryRules?.[reward.storeItemId] === "locked") continue;
        current.purchased = [...new Set([...current.purchased, reward.storeItemId])];
        current.claimedLevels = [...(current.claimedLevels || []), reward.level];
        latest.diamonds += reward.diamonds || 0;
        count++;
      }
      saveProfile(current);
      saveStats(latest);
      refresh();
      setNotice(count ? "Milestone rewards added to your collection." : "No rewards are ready.");
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const claimMission = async (mission: any) => {
    if (busy) return;
    setBusy(true);
    try {
      const current = loadMissions();
      const entry = (current as any)[mission.type]?.find((m: any) => m.id === mission.id);
      if (!entry?.completed || entry.claimed) throw new Error("This mission is not ready.");
      entry.claimed = true;
      saveMissions(current);
      const latest = loadStats();
      latest.bonusXp = (latest.bonusXp || 0) + entry.rewardXp;
      latest.diamonds += entry.rewardDiamonds;
      saveStats(latest);
      refresh();
      setNotice("Mission rewards claimed.");
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleNameSave = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nextName.trim() || "Ace";
    saveName(clean);
    onNameChange?.(clean);
    setNameOpen(false);
    setNotice("Player name updated.");
  };

  return (
    <div className="collection-page profile-v3">
      <AppHeader title="Profile" subtitle="Your progress, your collection" onBack={onBack} sparks={stats.sparks} diamonds={stats.diamonds} />
      <section className="profile-identity" style={{ "--profile-banner": bannerFor(profile).css } as React.CSSProperties}>
        <div className="profile-identity-banner" />
        <div className="profile-identity-main">
          <Avatar profile={profile} name={name} size={82} />
          <div className="profile-identity-copy">
            <div className="profile-name-row">
              <h2>{name}</h2>
              <button className="v-icon-button" aria-label="Edit player name" onClick={() => { setNextName(name); setNameOpen(true); }}>
                <Pencil size={14} />
              </button>
            </div>
            <p className="profile-title">{title}</p>
            <p className="form-note">
              {stats.runs.toLocaleString()} runs · {stats.bestStreak}× best streak · {owned.length + customTitles.length} collection items
            </p>
          </div>
          <div className="profile-identity-actions">
            <button className="v-button" onClick={onOpenStore}>
              <Package size={15} />Store
            </button>
          </div>
        </div>
      </section>

      <section className="profile-progress-summary">
        <div className="profile-level-number">
          <span>LEVEL</span>
          <strong>{level.currentLevel}</strong>
        </div>
        <div className="profile-progress-copy">
          <div>
            <strong>{level.currentLevel === 100 ? "You reached the summit." : "A little progress, every run."}</strong>
            <span>{level.currentXp.toLocaleString()} XP total</span>
          </div>
          <div className="profile-xp-track" role="progressbar" aria-label="Level progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level.progress * 100)}>
            <i style={{ width: level.progress * 100 + "%" }} />
          </div>
          <p>
            {level.currentLevel < 100
              ? (level.nextLevelXp - level.currentXp).toLocaleString() + " XP to level " + (level.currentLevel + 1)
              : "Maximum level reached"}
            {nextReward ? " · Next: " + STORE_ITEMS.find((item) => item.id === nextReward.storeItemId)?.name : ""}
          </p>
        </div>
        <button
          className={"v-button " + (available.length ? "v-button-primary" : "")}
          disabled={busy}
          onClick={() => (available.length ? void claim() : setTab("levels"))}
        >
          {available.length ? "Claim " + available.length + " rewards" : "View progress"}
          <ArrowUpRight size={15} />
        </button>
      </section>

      <SegmentedTabs<MainTab>
        label="Profile sections"
        value={tab}
        onChange={setTab}
        panelId="profile-content"
        className="v-primary-tabs"
        options={[
          { id: "vault", label: "Collection", icon: <Package size={15} /> },
          { id: "levels", label: "Progress", icon: <Target size={15} /> },
          { id: "achievements", label: "Records", icon: <Trophy size={15} /> },
          { id: "tasks", label: "Missions", icon: <Award size={15} /> },
        ]}
      />
      <p className="profile-status form-note" role="status">
        {notice}
      </p>

      <section id="profile-content" role="tabpanel" aria-label={tab}>
        {tab === "vault" && (
          <>
            <div className="profile-collection-toolbar">
              <label className="v-search">
                <Search size={16} />
                <input
                  aria-label="Search inventory"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find something in your collection…"
                />
              </label>
              <label className="form-field">
                <span>Category</span>
                <select aria-label="Inventory category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">All categories</option>
                  {["avatars", "banners", "frames", "themes", "styles", "titles", "audio"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Access</span>
                <select value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="owned">Available items</option>
                  <option value="restricted">Removed / locked</option>
                </select>
              </label>
            </div>
            {customTitles.length > 0 && scope === "owned" && (category === "all" || category === "titles") && (
              <section className="private-titles">
                <h3>Custom Titles</h3>
                <div>
                  {customTitles.map((t) => (
                    <button
                      key={t.id}
                      className="v-button"
                      style={{ color: t.color }}
                      disabled={busy || profile.titleId === t.id}
                      onClick={() => {
                        const updated = { ...profile, titleId: t.id };
                        saveProfile(updated);
                        onProfile(updated);
                        setNotice(t.name + " equipped.");
                      }}
                    >
                      {t.name}
                      {profile.titleId === t.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {filtered.length ? (
              <div className="inventory-grid">
                {filtered.map((item) => {
                  const equipped = ownsStoreItem(item, profile, stats) && isStoreItemEquipped(item, profile);
                  const restriction = profile.inventoryRules?.[item.id];
                  return (
                    <article key={item.id} className={"inventory-card " + (equipped ? "equipped" : "")}>
                      <button className="inventory-art" aria-label={"Preview " + item.name} onClick={() => setPeek(item)}>
                        <ItemArt item={item} />
                      </button>
                      <div>
                        <span className="v-rarity">{item.tab}</span>
                        <h3>{item.name}</h3>
                        <span className="inventory-access">
                          {restriction ? (
                            <>
                              <Lock size={12} />
                              {restriction === "locked" ? "Locked" : "Removed · buy again"}
                            </>
                          ) : equipped ? (
                            <>
                              <Check size={12} />
                              Equipped
                            </>
                          ) : (
                            "In your collection"
                          )}
                        </span>
                        <button className="v-button" disabled={busy || equipped || !!restriction} onClick={() => void equip(item)}>
                          {equipped ? "Equipped" : restriction ? "Unavailable" : "Equip"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="v-empty">
                <Package size={28} />
                <h3>{scope === "restricted" ? "No restrictions here." : "Nothing matches yet."}</h3>
                <p>Choose another category or explore the store.</p>
                <button className="v-button" onClick={onOpenStore}>
                  Explore the store
                </button>
              </div>
            )}
          </>
        )}
        {tab === "levels" && (
          <>
            <div className="v-section-heading">
              <div>
                <h2>Every level has something waiting.</h2>
                <p>Earn XP from scored runs and missions. Claim each milestone reward to customize your game.</p>
              </div>
              {available.length > 0 && (
                <button className="v-button v-button-primary" disabled={busy} onClick={() => void claim()}>
                  Claim available
                </button>
              )}
            </div>
            <div className="milestone-grid">
              {(showAll
                ? LEVEL_REWARDS
                : LEVEL_REWARDS.filter(
                    (reward) =>
                      reward.level >= Math.max(1, level.currentLevel - 2) && reward.level <= Math.max(12, level.currentLevel + 6)
                  )
              ).map((reward) => {
                const item = STORE_ITEMS.find((item) => item.id === reward.storeItemId);
                const claimed = profile.claimedLevels?.includes(reward.level);
                const ready = level.currentLevel >= reward.level;
                return (
                  <article key={reward.level} className={ready ? "is-ready" : ""}>
                    <span className="v-eyebrow">LEVEL {reward.level}</span>
                    <div className="milestone-art">{item && <ItemArt item={item} />}</div>
                    <h3>{item?.name || "Store reward"}</h3>
                    <p>
                      {reward.xpRequired.toLocaleString()} XP{reward.diamonds ? " · +" + reward.diamonds + " Diamonds" : ""}
                    </p>
                    <button className="v-button" disabled={busy || claimed || !ready} onClick={() => void claim(reward.level)}>
                      {claimed ? (
                        <>
                          <Check size={13} />
                          Claimed
                        </>
                      ) : ready ? (
                        "Claim reward"
                      ) : (
                        <>
                          <Lock size={13} />
                          Locked
                        </>
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
            <button className="v-text-button" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show nearby milestones" : "Show all 100 milestones"}
            </button>
          </>
        )}
        {tab === "tasks" && (
          <>
            <div className="v-section-heading">
              <div>
                <h2>Small goals. Real progress.</h2>
                <p>Complete challenges in arcade runs to earn bonus XP and Diamonds.</p>
              </div>
            </div>
            <SegmentedTabs<"daily" | "weekly" | "monthly">
              label="Mission periods"
              value={missionPeriod}
              onChange={setMissionPeriod}
              panelId="mission-cards"
              options={[
                { id: "daily", label: "Daily" },
                { id: "weekly", label: "Weekly" },
                { id: "monthly", label: "Monthly" },
              ]}
            />
            <div id="mission-cards" role="tabpanel" aria-label={missionPeriod} className="mission-card-grid">
              {missions.map((m) => (
                <article key={m.id}>
                  <h3>{m.title}</h3>
                  <p>
                    {Math.min(m.progress, m.target).toLocaleString()} / {m.target.toLocaleString()}
                  </p>
                  <progress value={m.progress} max={m.target} />
                  <span>
                    <Sparkles size={13} />
                    {m.xp.toLocaleString()} XP <Gem size={13} />
                    {m.diamonds} Diamonds
                  </span>
                  <button
                    className="v-button"
                    disabled={busy || m.claimed || m.progress < m.target}
                    onClick={() => void claimMission(m)}
                  >
                    {m.claimed ? "Claimed" : m.progress >= m.target ? "Claim rewards" : "In progress"}
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "achievements" && (
          <div className="achievement-grid">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = getUnlockedAchievements(stats).includes(achievement.id);
              return (
                <article key={achievement.id} className={unlocked ? "unlocked" : ""}>
                  <Icon name={achievement.icon as any} size={25} />
                  <div>
                    <h3>{achievement.title}</h3>
                    <p>{achievement.description}</p>
                    <span>{unlocked ? "Achieved" : "Keep playing"}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {peek && (
        <Modal title={peek.name} onClose={() => !busy && setPeek(null)}>
          <div className="v-preview-layout">
            <LoadoutPreview item={peek} profile={profile} name={name} />
            <div className="form-grid">
              <p>{peek.desc}</p>
              <button
                className="v-button v-button-primary"
                disabled={busy || !!profile.inventoryRules?.[peek.id] || isStoreItemEquipped(peek, profile)}
                onClick={() => void equip(peek)}
              >
                {isStoreItemEquipped(peek, profile) ? "Equipped" : busy ? "Saving…" : "Equip item"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {nameOpen && (
        <Modal title="Change player name" onClose={() => !busy && setNameOpen(false)}>
          <form className="form-grid" onSubmit={handleNameSave}>
            <label className="form-field">
              <span>Player name</span>
              <input
                aria-label="Player name"
                value={nextName}
                onChange={(e) => setNextName(e.target.value)}
                minLength={2}
                maxLength={15}
                required
                autoFocus
              />
            </label>
            <p className="form-note">Your player name is stored locally on this device.</p>
            <button className="v-button v-button-primary" disabled={busy || !nextName.trim()}>
              Save name
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
