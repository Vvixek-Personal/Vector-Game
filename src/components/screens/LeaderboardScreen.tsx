import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Medal, Crown, Flame, RefreshCw, Globe, ShieldCheck, X, Sparkles, Swords, Zap, Timer } from "lucide-react";
import { subscribeToLeaderboard, type LeaderboardRecord } from "../../firebase/leaderboard";
import { useAuth } from "../../firebase/auth";
import GoogleAuthButton from "../GoogleAuthButton";
import { MODES, type GameMode } from "../../game/types";
import { uiTap } from "../../game/haptics";
import Avatar from "../Avatar";
import { DEFAULT_PROFILE, type Profile } from "../../game/profile";
import { backdropVariants, panelVariants, rowVariants } from "../../utils/motion";
import AppHeader from "../AppHeader";
import TiltCard from "../TiltCard";

interface Props {
  initialMode?: string;
  onSelectMode?: (mode: GameMode) => void;
}

const buildMockProfile = (item: LeaderboardRecord): Profile => ({
  ...DEFAULT_PROFILE,
  avatarId: item.avatarId || "spark",
  frameId: item.frameId || "none",
});

interface ModeGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  defaultTab: string;
  modes: { id: string; label: string; color: string }[];
}

const MODE_GROUPS: ModeGroup[] = [
  {
    id: "featured",
    label: "Challenges",
    icon: Sparkles,
    defaultTab: "daily",
    modes: [
      { id: "daily", label: "Daily", color: MODES.daily.color },
      { id: "weekly", label: "Weekly", color: MODES.weekly.color },
      { id: "overall", label: "Overall", color: "#38bdf8" },
    ],
  },
  {
    id: "arcade",
    label: "Arcade",
    icon: Zap,
    defaultTab: "arcade",
    modes: [
      { id: "arcade", label: "Arcade", color: MODES.arcade.color },
      { id: "blitz", label: "Blitz", color: MODES.blitz.color },
      { id: "sudden", label: "Sudden", color: MODES.sudden.color },
      { id: "waves", label: "Waves", color: MODES.waves.color },
    ],
  },
  {
    id: "endurance",
    label: "Focus",
    icon: Timer,
    defaultTab: "rush",
    modes: [
      { id: "rush", label: "Rush", color: MODES.rush.color },
      { id: "zen", label: "Zen", color: MODES.zen.color },
      { id: "memory", label: "Memory", color: MODES.memory.color },
    ],
  },
  {
    id: "multiplayer",
    label: "Dual",
    icon: Swords,
    defaultTab: "coop",
    modes: [
      { id: "coop", label: "Co-op", color: MODES.coop.color },
      { id: "versus", label: "Versus", color: MODES.versus.color },
    ],
  },
];

const RANK_STYLE = [
  { icon: Crown, tint: "#e7c37c", border: "rgba(231,195,124,0.45)", bg: "rgba(231,195,124,0.06)", badge: "#fef08a" },
  { icon: Medal, tint: "#c6ccd6", border: "rgba(198,204,214,0.35)", bg: "rgba(198,204,214,0.05)", badge: "#e2e8f0" },
  { icon: Medal, tint: "#c19a75", border: "rgba(193,154,117,0.35)", bg: "rgba(193,154,117,0.05)", badge: "#fed7aa" },
];

export default function LeaderboardScreen({ initialMode = "overall" }: Props) {
  const [activeGroup, setActiveGroup] = useState<string>(() => {
    const parent = MODE_GROUPS.find((g) => g.modes.some((m) => m.id === initialMode));
    return parent ? parent.id : "featured";
  });
  const [activeTab, setActiveTab] = useState(initialMode);
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingPlayer, setViewingPlayer] = useState<LeaderboardRecord | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    setError(false);
    setRecords([]);
    const unsubscribe = subscribeToLeaderboard(
      activeTab,
      (entries) => {
        setRecords(entries);
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeTab]);

  const topThree = records.slice(0, 3);
  const restRecords = records.slice(3);
  const userRankIndex = records.findIndex((r) => user && r.userId === user.uid);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;
  const userRecord = userRankIndex >= 0 ? records[userRankIndex] : null;

  const currentGroupDef = MODE_GROUPS.find((g) => g.id === activeGroup) ?? MODE_GROUPS[0];

  const openPlayer = (item: LeaderboardRecord) => {
    uiTap();
    setViewingPlayer(item);
  };

  return (
    <div className="leaderboard-page mx-auto min-h-[calc(100dvh-92px)] w-full max-w-[1080px] px-4 sm:px-6 pb-28">
      {/* Unified clean header */}
      <AppHeader
        title="Rankings"
        subtitle="Global leaderboards & top operatives"
      />

      <div className="mt-4 flex flex-col gap-4">
        {/* Unauthenticated notice */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center glass"
            style={{ borderColor: "var(--panel-border)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
              >
                <Globe size={17} />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold txt">Join the global board</h2>
                <p className="t-caption text-[12px] mt-0.5">
                  Sign in with Google to sync your personal bests to live rankings.
                </p>
              </div>
            </div>
            <GoogleAuthButton compact />
          </motion.div>
        )}

        {/* Category Segmented Switcher */}
        <div
          className="flex items-center gap-1 p-1 rounded-2xl border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--panel-border)",
          }}
          role="tablist"
          aria-label="Tournament divisions"
        >
          {MODE_GROUPS.map((grp) => {
            const isActive = activeGroup === grp.id;
            const IconComp = grp.icon;
            return (
              <button
                key={grp.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  uiTap();
                  setActiveGroup(grp.id);
                  setActiveTab(grp.defaultTab);
                }}
                className="relative flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[13px] font-semibold transition-colors duration-150"
                style={{
                  color: isActive ? "var(--text)" : "var(--text-dim)",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="leaderboardGroupActive"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: "var(--pill)",
                      border: "1px solid var(--selected-border)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5 truncate">
                  <IconComp size={15} />
                  <span>{grp.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-modes for the active group (clean unboxed inline controls) */}
        <div
          className="flex items-center gap-2 px-1 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Sub-mode boards"
        >
          {currentGroupDef.modes.map((m, i) => {
            const isTabActive = activeTab === m.id;
            return (
              <div key={m.id} className="flex items-center gap-2 shrink-0">
                {i > 0 && (
                  <span className="text-[11px] select-none opacity-30" aria-hidden="true">
                    ·
                  </span>
                )}
                <button
                  role="tab"
                  aria-selected={isTabActive}
                  onClick={() => {
                    uiTap();
                    setActiveTab(m.id);
                  }}
                  className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors py-1 px-3 rounded-lg ${
                    isTabActive
                      ? "font-semibold txt bg-[var(--surface-raised)] border border-[var(--selected-border)]"
                      : "text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: m.color }}
                    aria-hidden="true"
                  />
                  <span>{m.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <p
            role="status"
            className="t-caption mt-2 rounded-xl border px-3 py-2"
            style={{ borderColor: "var(--panel-border)", color: "var(--text-dim)" }}
          >
            Rankings are unavailable right now. Your progress is preserved on this device.
          </p>
        )}

        {/* Top 3 Podium with 3D Tilt Cards */}
        {topThree.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {[
              { item: topThree[1], rank: 2, order: "order-2 sm:order-1" },
              { item: topThree[0], rank: 1, order: "order-1 sm:order-2" },
              { item: topThree[2], rank: 3, order: "order-3" },
            ].map(({ item, rank, order }) => {
              if (!item) return null;
              const style = RANK_STYLE[rank - 1];
              const IconComp = style.icon;
              const isSelf = Boolean(user && item.userId === user.uid);

              return (
                <div key={item.id || rank} className={order}>
                  <TiltCard
                    maxTilt={rank === 1 ? 10 : 8}
                    scale={1.02}
                    className="h-full rounded-2xl border p-5 text-center flex flex-col items-center justify-between transition-shadow duration-200 glass"
                    style={{
                      borderColor: isSelf ? "var(--brand)" : style.border,
                      background: style.bg,
                    }}
                  >
                    <div className="relative mb-3">
                      <div
                        className="grid h-12 w-12 place-items-center rounded-2xl"
                        style={{
                          background: "var(--surface-raised)",
                          border: `1px solid ${style.border}`,
                          color: style.tint,
                        }}
                      >
                        <IconComp size={22} />
                      </div>
                      <span
                        className="num absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em]"
                        style={{
                          background: "var(--surface)",
                          border: `1px solid ${style.border}`,
                          color: style.badge,
                        }}
                      >
                        #{rank}
                      </span>
                    </div>

                    <button
                      className="my-1 flex flex-col items-center group cursor-pointer"
                      onClick={() => openPlayer(item)}
                    >
                      {item.useGooglePfp && item.userPhoto ? (
                        <img
                          src={item.userPhoto}
                          alt=""
                          className="h-11 w-11 rounded-full object-cover"
                          style={{ boxShadow: `0 0 0 2px ${style.border}` }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Avatar profile={buildMockProfile(item)} name={item.userName} size={44} />
                      )}
                      <span className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                        <span className="max-w-[16ch] truncate text-[14px] font-bold txt group-hover:text-[var(--brand)] transition-colors">
                          {item.userName}
                        </span>
                        {isSelf && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.08em]"
                            style={{ background: "var(--brand)", color: "var(--brand-on)" }}
                          >
                            You
                          </span>
                        )}
                      </span>
                      <span className="t-caption num mt-0.5 text-[11px]">
                        Lv.{item.level}
                        {item.title ? ` · ${item.title}` : ""}
                      </span>
                    </button>

                    <div className="mt-3.5 w-full border-t pt-3" style={{ borderColor: "var(--panel-border)" }}>
                      <div className="num text-[24px] font-bold leading-none tracking-tight txt">
                        {item.score.toLocaleString()}
                      </div>
                      <div
                        className="mt-1 flex items-center justify-center gap-1 text-[11px] num font-medium"
                        style={{ color: "var(--text-dim)" }}
                      >
                        <Flame size={12} className="text-amber-400" />
                        <span>{item.streak}× best streak</span>
                      </div>
                    </div>
                  </TiltCard>
                </div>
              );
            })}
          </div>
        )}

        {/* Ranks 4+ Tabular Display */}
        <div
          className="mt-2 overflow-hidden rounded-2xl border glass"
          style={{ borderColor: "var(--panel-border)" }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[.12em]"
            style={{ borderColor: "var(--panel-border)", color: "var(--text-faint)" }}
          >
            <span className="flex items-center gap-3">
              <span className="w-8 text-center">Rank</span>
              <span>Operative</span>
            </span>
            <span className="flex items-center gap-6">
              <span className="hidden sm:inline">Streak</span>
              <span className="w-24 text-right">Score</span>
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center" role="status">
              <RefreshCw size={20} className="animate-spin text-[var(--brand)]" />
              <span className="t-caption">Fetching live scores…</span>
            </div>
          ) : records.length === 0 ? (
            <p className="t-caption px-4 py-14 text-center">
              No scores registered on this board yet. Complete a run to claim first place.
            </p>
          ) : (
            <div>
              {restRecords.map((item, idx) => {
                const rank = idx + 4;
                const isSelf = Boolean(user && item.userId === user.uid);
                return (
                  <motion.div
                    key={item.id || rank}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18, delay: Math.min(0.24, idx * 0.015) }}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--surface-raised)]"
                    style={
                      isSelf
                        ? { background: "var(--selected)", boxShadow: "inset 2px 0 0 var(--brand)" }
                        : { borderTop: idx === 0 ? "none" : "1px solid var(--panel-border)" }
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="num w-8 text-center text-[12px] font-semibold faint">#{rank}</span>
                      <button
                        className="shrink-0 cursor-pointer"
                        onClick={() => openPlayer(item)}
                        aria-label={`View ${item.userName}`}
                      >
                        {item.useGooglePfp && item.userPhoto ? (
                          <img
                            src={item.userPhoto}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                            style={{ border: "1px solid var(--panel-border)" }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Avatar profile={buildMockProfile(item)} name={item.userName} size={32} />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="max-w-[150px] truncate text-[13px] font-semibold txt sm:max-w-[220px]">
                            {item.userName}
                          </span>
                          {isSelf && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.08em]"
                              style={{ background: "var(--brand)", color: "var(--brand-on)" }}
                            >
                              You
                            </span>
                          )}
                        </div>
                        <div className="t-caption num mt-0.5 text-[11px]">
                          Lv.{item.level}
                          {item.title ? ` · ${item.title}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-6">
                      <div
                        className="hidden items-center gap-1 text-[11px] num font-medium sm:flex"
                        style={{ color: "var(--text-faint)" }}
                      >
                        <Flame size={11} className="text-amber-400" />
                        <span>{item.streak}×</span>
                      </div>
                      <div className="num w-24 text-right text-[14px] font-bold txt tabular-nums">
                        {item.score.toLocaleString()}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Current user sticky position pill */}
        {user && userRecord && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2 text-[12px] shadow-lg"
            style={{ borderColor: "var(--brand)", background: "var(--glass-bg)", backdropFilter: "blur(14px)" }}
          >
            <ShieldCheck size={15} style={{ color: "var(--brand)" }} />
            <span style={{ color: "var(--text-dim)" }}>Your Standing</span>
            <span className="num font-bold txt">#{userRank}</span>
            <span style={{ color: "var(--panel-border)" }}>·</span>
            <span className="num font-bold txt">{userRecord.score.toLocaleString()} pts</span>
          </motion.div>
        )}

        {/* Player Profile Preview Modal */}
        <AnimatePresence>
          {viewingPlayer && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="surface-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
              onClick={() => setViewingPlayer(null)}
              role="dialog"
              aria-modal="true"
              aria-label={`${viewingPlayer.userName} profile`}
            >
              <motion.div
                variants={panelVariants}
                className="surface-card relative flex w-full max-w-[340px] flex-col items-center p-6 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="icon-button icon-button-sm absolute right-4 top-4"
                  onClick={() => setViewingPlayer(null)}
                  aria-label="Close profile"
                >
                  <X size={16} />
                </button>

                <TiltCard maxTilt={12} scale={1.05} className="mb-3 rounded-full p-1">
                  {viewingPlayer.useGooglePfp && viewingPlayer.userPhoto ? (
                    <img
                      src={viewingPlayer.userPhoto}
                      alt=""
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-[var(--panel-border)]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Avatar profile={buildMockProfile(viewingPlayer)} name={viewingPlayer.userName} size={80} />
                  )}
                </TiltCard>

                <h2 className="t-title text-[18px] font-bold">{viewingPlayer.userName}</h2>
                <p className="t-caption num mt-1">Level {viewingPlayer.level}</p>
                <p className="t-caption mt-0.5">{viewingPlayer.title || "Operative"}</p>

                <div className="dialog-stats cols-2 mt-5 w-full">
                  <div className="dialog-stat">
                    <span>Score</span>
                    <strong className="num">{viewingPlayer.score.toLocaleString()}</strong>
                  </div>
                  <div className="dialog-stat">
                    <span>Best Streak</span>
                    <strong className="num">{viewingPlayer.streak}×</strong>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
