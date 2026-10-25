import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Medal, Crown, Flame, RefreshCw, Globe, ShieldCheck, X } from "lucide-react";
import { subscribeToLeaderboard, type LeaderboardRecord } from "../../firebase/leaderboard";
import { useAuth } from "../../firebase/auth";
import GoogleAuthButton from "../GoogleAuthButton";
import { MODES, type GameMode } from "../../game/types";
import { uiTap } from "../../game/haptics";
import Avatar from "../Avatar";
import { DEFAULT_PROFILE, type Profile } from "../../game/profile";
import { backdropVariants, panelVariants, rowVariants } from "../../utils/motion";

interface Props {
  initialMode?: string;
  onSelectMode?: (mode: GameMode) => void;
}

const buildMockProfile = (item: LeaderboardRecord): Profile => ({
  ...DEFAULT_PROFILE,
  avatarId: item.avatarId || "spark",
  frameId: item.frameId || "none",
});

const LEADERBOARD_TABS: { id: string; label: string; color: string }[] = [
  { id: "daily", label: "Daily", color: MODES.daily.color },
  { id: "weekly", label: "Weekly", color: MODES.weekly.color },
  { id: "overall", label: "Overall", color: "#38bdf8" },
  { id: "arcade", label: "Arcade", color: MODES.arcade.color },
  { id: "rush", label: "Rush", color: MODES.rush.color },
  { id: "zen", label: "Zen", color: MODES.zen.color },
  { id: "waves", label: "Waves", color: MODES.waves.color },
  { id: "blitz", label: "Blitz", color: MODES.blitz.color },
  { id: "sudden", label: "Sudden", color: MODES.sudden.color },
  { id: "memory", label: "Memory", color: MODES.memory.color },
  { id: "coop", label: "Co-op", color: MODES.coop.color },
  { id: "versus", label: "Versus", color: MODES.versus.color },
];

const RANK_STYLE = [
  { icon: Crown, tint: "#e7c37c" },
  { icon: Medal, tint: "#c6ccd6" },
  { icon: Medal, tint: "#c19a75" },
];

export default function LeaderboardScreen({ initialMode = "overall" }: Props) {
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
      },
    );

    return () => unsubscribe();
  }, [activeTab]);

  const topThree = records.slice(0, 3);
  const restRecords = records.slice(3);
  const userRankIndex = records.findIndex((r) => user && r.userId === user.uid);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;
  const userRecord = userRankIndex >= 0 ? records[userRankIndex] : null;

  const openPlayer = (item: LeaderboardRecord) => {
    uiTap();
    setViewingPlayer(item);
  };

  return (
    <div className="leaderboard-page mx-auto min-h-[calc(100dvh-92px)] w-full max-w-[1080px] px-5 pb-28 sm:px-8">
      <header className="mt-6 flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center" style={{ borderColor: "var(--panel-border)" }}>
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-2xl"
            style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
          >
            <Trophy size={19} />
          </span>
          <div>
            <p className="t-eyebrow">Global rankings</p>
            <h1 className="t-display is-compact mt-0.5">Leaderboard</h1>
          </div>
        </div>
        <GoogleAuthButton />
      </header>

      <p className="t-caption mt-3">
        Top 50 runs per board. Scores sync when you are signed in.
      </p>

      {error && (
        <p role="status" className="t-caption mt-4 rounded-xl border px-3 py-2" style={{ borderColor: "var(--panel-border)", color: "var(--text-dim)" }}>
          Rankings are unavailable right now. Your progress is still saved on this device.
        </p>
      )}

      {!user && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 flex flex-col items-start justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
          style={{ borderColor: "var(--panel-border)", background: "var(--pill)" }}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
              <Globe size={17} />
            </span>
            <div>
              <h2 className="t-heading">Join the global board</h2>
              <p className="t-caption mt-0.5">Sign in to publish your best runs to the live rankings.</p>
            </div>
          </div>
          <GoogleAuthButton compact />
        </motion.div>
      )}

      {/* Board selector */}
      <div
        className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Leaderboard boards"
      >
        {LEADERBOARD_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                uiTap();
                setActiveTab(tab.id);
              }}
              className="relative shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors"
              style={{
                borderColor: isActive ? "var(--selected-border)" : "var(--panel-border)",
                background: isActive ? "var(--selected)" : "var(--surface)",
                color: isActive ? "var(--text)" : "var(--text-dim)",
              }}
            >
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: tab.color }} aria-hidden="true" />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Podium */}
      {topThree.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              <motion.div
                key={item.id || rank}
                custom={rank === 1 ? 0 : 1}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                className={`${order} flex flex-col items-center justify-between rounded-2xl border p-5 text-center`}
                style={{
                  borderColor: isSelf ? "var(--selected-border)" : "var(--panel-border)",
                  background: rank === 1 ? "var(--surface-raised)" : "var(--surface)",
                }}
              >
                <div className="relative mb-3">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-xl"
                    style={{ background: "var(--pill)", border: "1px solid var(--panel-border)", color: style.tint }}
                  >
                    {IconComp ? <IconComp size={20} /> : <span className="num text-[13px] font-semibold">#{rank}</span>}
                  </div>
                  <span
                    className="num absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.1em]"
                    style={{ background: "var(--surface)", border: "1px solid var(--panel-border)", color: "var(--text-faint)" }}
                  >
                    #{rank}
                  </span>
                </div>

                <button className="my-1 flex flex-col items-center" onClick={() => openPlayer(item)}>
                  {item.useGooglePfp && item.userPhoto ? (
                    <img
                      src={item.userPhoto}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                      style={{ border: "1px solid var(--panel-border)" }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Avatar profile={buildMockProfile(item)} name={item.userName} size={40} />
                  )}
                  <span className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                    <span className="max-w-[16ch] truncate text-[13px] font-semibold txt">{item.userName}</span>
                    {isSelf && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.08em]"
                        style={{ background: "var(--brand)", color: "var(--brand-on)" }}
                      >
                        You
                      </span>
                    )}
                  </span>
                  <span className="t-caption num mt-0.5">
                    Level {item.level}
                    {item.title ? ` · ${item.title}` : ""}
                  </span>
                </button>

                <div className="mt-3 w-full border-t pt-3" style={{ borderColor: "var(--panel-border)" }}>
                  <div className="num text-[22px] font-semibold leading-none tracking-tight txt">
                    {item.score.toLocaleString()}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1 text-[11px]" style={{ color: "var(--text-faint)" }}>
                    <Flame size={11} />
                    <span className="num">{item.streak}× streak</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ranks 4+ */}
      <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--panel-border)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between border-b px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[.12em]" style={{ borderColor: "var(--panel-border)", color: "var(--text-faint)" }}>
          <span className="flex items-center gap-3">
            <span className="w-8 text-center">Rank</span>
            <span>Player</span>
          </span>
          <span className="flex items-center gap-6">
            <span className="hidden sm:inline">Streak</span>
            <span className="w-24 text-right">Score</span>
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center" role="status">
            <RefreshCw size={20} className="animate-spin" style={{ color: "var(--text-faint)" }} />
            <span className="t-caption">Fetching live records…</span>
          </div>
        ) : records.length === 0 ? (
          <p className="t-caption px-4 py-14 text-center">No scores on this board yet. Play a run to claim first place.</p>
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
                  transition={{ duration: 0.2, delay: Math.min(0.3, idx * 0.02) }}
                  className="flex items-center justify-between px-4 py-3"
                  style={
                    isSelf
                      ? { background: "var(--selected)", boxShadow: "inset 2px 0 0 var(--brand)" }
                      : { borderTop: idx === 0 ? "none" : "1px solid var(--panel-border)" }
                  }
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="num w-8 text-center text-[11px] font-medium faint">#{rank}</span>
                    <button className="shrink-0" onClick={() => openPlayer(item)} aria-label={`View ${item.userName}`}>
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
                      <div className="t-caption num mt-0.5">
                        Level {item.level}
                        {item.title ? ` · ${item.title}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-6">
                    <div className="hidden items-center gap-1 text-[11px] sm:flex" style={{ color: "var(--text-faint)" }}>
                      <Flame size={11} />
                      <span className="num">{item.streak}×</span>
                    </div>
                    <div className="num w-24 text-right text-[13px] font-semibold txt">
                      {item.score.toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Your standing */}
      {user && userRecord && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2 text-[11px]"
          style={{ borderColor: "var(--panel-border)", background: "var(--glass-bg)", backdropFilter: "blur(14px)" }}
        >
          <ShieldCheck size={14} style={{ color: "var(--brand)" }} />
          <span style={{ color: "var(--text-dim)" }}>Your rank</span>
          <span className="num font-semibold txt">#{userRank}</span>
          <span style={{ color: "var(--panel-border)" }}>·</span>
          <span className="num font-semibold txt">{userRecord.score.toLocaleString()} pts</span>
        </motion.div>
      )}

      {/* Player card */}
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

              <div className="mb-3">
                {viewingPlayer.useGooglePfp && viewingPlayer.userPhoto ? (
                  <img
                    src={viewingPlayer.userPhoto}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover"
                    style={{ border: "1px solid var(--panel-border)" }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Avatar profile={buildMockProfile(viewingPlayer)} name={viewingPlayer.userName} size={80} />
                )}
              </div>

              <h2 className="t-title">{viewingPlayer.userName}</h2>
              <p className="t-caption num mt-1">Level {viewingPlayer.level}</p>
              <p className="t-caption mt-0.5">{viewingPlayer.title || "Operative"}</p>

              <div className="dialog-stats cols-2 mt-5 w-full">
                <div className="dialog-stat">
                  <span>Score</span>
                  <strong>{viewingPlayer.score.toLocaleString()}</strong>
                </div>
                <div className="dialog-stat">
                  <span>Streak</span>
                  <strong>{viewingPlayer.streak}×</strong>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
