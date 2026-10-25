import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Medal, Crown, Flame, Sparkles, RefreshCw, Globe, ShieldCheck, User as UserIcon, X } from "lucide-react";
import { subscribeToLeaderboard, type LeaderboardRecord } from "../../firebase/leaderboard";
import { useAuth, signInWithGoogle } from "../../firebase/auth";
import GoogleAuthButton from "../GoogleAuthButton";
import { MODES, MODE_ORDER, type GameMode } from "../../game/types";
import { uiTap } from "../../game/haptics";
import Avatar from "../Avatar";
import { DEFAULT_PROFILE, type Profile } from "../../game/profile";

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
  { id: "coop", label: "Co-Op", color: MODES.coop.color },
  { id: "versus", label: "Versus", color: MODES.versus.color },
];

export default function LeaderboardScreen({ initialMode = "overall", onSelectMode }: Props) {
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
    const unsubscribe = subscribeToLeaderboard(activeTab, (entries) => {
      setRecords(entries);
      setLoading(false);
    }, () => { setError(true); setLoading(false); });

    return () => unsubscribe();
  }, [activeTab]);

  const topThree = records.slice(0, 3);
  const restRecords = records.slice(3);

  // Check if current user is on this leaderboard
  const userRankIndex = records.findIndex((r) => user && r.userId === user.uid);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;
  const userRecord = userRankIndex >= 0 ? records[userRankIndex] : null;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: "from-amber-400 to-yellow-600", text: "text-amber-300", icon: Crown, label: "1ST" };
    if (rank === 2) return { bg: "from-slate-300 to-slate-500", text: "text-slate-200", icon: Medal, label: "2ND" };
    if (rank === 3) return { bg: "from-amber-600 to-amber-800", text: "text-amber-500", icon: Medal, label: "3RD" };
    return { bg: "from-white/10 to-white/5", text: "text-white/60", icon: null, label: `#${rank}` };
  };

  return (
    <div className="leaderboard-page pb-28 pt-4 px-4 max-w-4xl mx-auto min-h-screen text-white">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy size={20} />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0 flex items-center gap-2">
                Leaderboard
              </h1>
              <p className="text-xs text-white/50 m-0 flex items-center gap-2 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Global Rankings</span>
                <span className="text-white/20">·</span>
                <span>Top 50 Operatives</span>
              </p>
            </div>
          </div>
        </div>

        {/* Google Authentication Control */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <GoogleAuthButton />
        </div>
      </header>

      {error && <p role="status" className="rounded-xl border border-amber-400/30 p-3 text-sm text-amber-200">Rankings are unavailable. Your progress is saved on this device; try again when connected.</p>}
      {/* Google Sign-in Promotion Callout for Guests */}
      {!user && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-sky-950/60 via-indigo-950/50 to-purple-950/50 border border-sky-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
              <Globe size={20} />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-white m-0">Compete on the Global Leaderboard</h4>
              <p className="text-xs text-white/60 m-0 mt-0.5">
                Sign in with your Google account to save your best runs to the live cloud rankings.
              </p>
            </div>
          </div>
          <GoogleAuthButton compact />
        </motion.div>
      )}

      {/* Mode Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {LEADERBOARD_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                uiTap();
                setActiveTab(tab.id);
              }}
              className={`relative px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition shrink-0 cursor-pointer border ${
                isActive
                  ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: tab.color }}
                />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Podium for Top 3 */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          {/* Order: 2nd place (left), 1st place (center), 3rd place (right) on desktop */}
          {[
            { item: topThree[1], rank: 2, order: "order-2 sm:order-1", scale: "sm:scale-95" },
            { item: topThree[0], rank: 1, order: "order-1 sm:order-2", scale: "sm:scale-105 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]" },
            { item: topThree[2], rank: 3, order: "order-3 sm:order-3", scale: "sm:scale-95" },
          ].map(({ item, rank, order, scale }) => {
            if (!item) return null;
            const badge = getRankBadge(rank);
            const IconComp = badge.icon;
            const isSelf = user && item.userId === user.uid;

            return (
              <motion.div
                key={item.id || rank}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rank * 0.1 }}
                className={`relative rounded-3xl border bg-gradient-to-b from-white/10 via-white/[0.04] to-black/80 p-5 text-center flex flex-col items-center justify-between ${order} ${scale} ${
                  isSelf ? "border-cyan-400 ring-2 ring-cyan-400/30" : "border-white/15"
                }`}
              >
                {/* Crown / Trophy icon for top spot */}
                <div className="relative mb-2">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${badge.bg} flex items-center justify-center text-black font-black text-lg shadow-lg`}
                  >
                    {IconComp ? <IconComp size={22} className="text-black" /> : `#${rank}`}
                  </div>
                  <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-black border border-white/20 text-[10px] font-black uppercase tracking-wider text-white">
                    {badge.label}
                  </span>
                </div>

                {/* Player Photo or Avatar */}
                <div 
                  className="my-2 flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => { uiTap(); setViewingPlayer(item); }}
                >
                  {item.useGooglePfp && item.userPhoto ? (
                    <img
                      src={item.userPhoto}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border-2 border-white/25 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex items-center justify-center shrink-0">
                      <Avatar profile={buildMockProfile(item)} name={item.userName} size={40} />
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                      {item.userName}
                    </span>
                    {isSelf && (
                      <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-[9px] font-black text-black">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-0.5 text-[11px] text-white/50">
                    <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] font-bold text-sky-300">
                      LVL {item.level}
                    </span>
                    {item.title && <span>· {item.title}</span>}
                  </div>
                </div>

                {/* Score & Streak */}
                <div className="w-full pt-3 mt-2 border-t border-white/10">
                  <div className="text-2xl font-black text-white tracking-tight font-mono">
                    {item.score.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-amber-300 font-bold flex items-center justify-center gap-1 mt-0.5">
                    <Flame size={12} />
                    <span>{item.streak}x Combo Streak</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ranking List for Position 4+ */}
      <div className="rounded-3xl border border-white/15 bg-black/60 overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/50">
          <div className="flex items-center gap-3">
            <span className="w-8 text-center">Rank</span>
            <span>Operative</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden sm:inline">Streak</span>
            <span className="w-24 text-right">Score</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-white/40 text-sm animate-pulse flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-sky-400" />
            <span>Fetching live cloud records...</span>
          </div>
        ) : restRecords.length === 0 && topThree.length === 0 ? (
          <div className="py-16 text-center text-white/40 text-sm">
            <span>No scores recorded yet for this mode. Play a run to claim #1!</span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {restRecords.map((item, idx) => {
              const rank = idx + 4;
              const isSelf = user && item.userId === user.uid;

              return (
                <motion.div
                  key={item.id || rank}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(0.5, idx * 0.03) }}
                  className={`p-3.5 sm:px-4 flex items-center justify-between hover:bg-white/[0.03] transition ${
                    isSelf ? "bg-cyan-500/10 border-l-4 border-cyan-400" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 text-center font-mono font-bold text-xs text-white/40">
                      #{rank}
                    </span>

                    {item.useGooglePfp && item.userPhoto ? (
                      <img
                        src={item.userPhoto}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                        onClick={() => { uiTap(); setViewingPlayer(item); }}
                      />
                    ) : (
                      <div 
                        className="flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => { uiTap(); setViewingPlayer(item); }}
                      >
                        <Avatar profile={buildMockProfile(item)} name={item.userName} size={32} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-white truncate max-w-[150px] sm:max-w-[220px]">
                          {item.userName}
                        </span>
                        {isSelf && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-[9px] font-black text-black">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/40 flex items-center gap-1.5">
                        <span className="text-sky-300 font-semibold">LVL {item.level}</span>
                        {item.title && <span>· {item.title}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="hidden sm:flex items-center gap-1 text-xs text-amber-300 font-bold">
                      <Flame size={12} />
                      <span>{item.streak}x</span>
                    </div>

                    <div className="w-24 text-right font-mono font-black text-sm sm:text-base text-white">
                      {item.score.toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating User Standing Pill if user is signed in */}
      {user && userRecord && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl flex items-center gap-4 text-xs"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-cyan-400" />
            <span className="text-white/60">Your Standing:</span>
            <span className="font-extrabold text-white">Rank #{userRank}</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="font-mono font-black text-cyan-300">
            {userRecord.score.toLocaleString()} PTS
          </div>
        </motion.div>
      )}

      {/* View Player Modal */}
      <AnimatePresence>
        {viewingPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setViewingPlayer(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 text-white/50 hover:text-white"
                onClick={() => setViewingPlayer(null)}
              >
                <X size={20} />
              </button>

              <div className="mb-4">
                {viewingPlayer.useGooglePfp && viewingPlayer.userPhoto ? (
                  <img
                    src={viewingPlayer.userPhoto}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border-4 border-white/20 shadow-xl"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Avatar profile={buildMockProfile(viewingPlayer)} name={viewingPlayer.userName} size={80} />
                )}
              </div>

              <h2 className="text-2xl font-black text-white m-0">
                {viewingPlayer.userName}
              </h2>
              <div className="text-sm text-sky-300 font-bold mt-1">
                Level {viewingPlayer.level} Operative
              </div>
              <div className="text-xs text-white/60 mt-1 uppercase tracking-widest font-bold">
                «{viewingPlayer.title || "Operative"}»
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-6">
                <div className="bg-black/40 rounded-xl p-3 border border-white/10">
                  <div className="text-xs text-white/50 mb-1">Score</div>
                  <div className="text-lg font-mono font-black text-white">
                    {viewingPlayer.score.toLocaleString()}
                  </div>
                </div>
                <div className="bg-black/40 rounded-xl p-3 border border-white/10">
                  <div className="text-xs text-white/50 mb-1">Streak</div>
                  <div className="text-lg font-mono font-black text-amber-300 flex items-center justify-center gap-1">
                    <Flame size={14} /> {viewingPlayer.streak}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
