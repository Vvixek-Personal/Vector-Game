import { useEffect, useMemo, useState } from "react";
import { Sparkles, Trophy, Target, Zap, Activity, TrendingUp } from "lucide-react";
import { MODE_ORDER, MODES } from "../../game/types";
import { loadScores, type Stats } from "../../game/storage";
import CurvedGraph, { type GraphPoint } from "../CurvedGraph";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  stats: Stats;
  onLeaderboard?: () => void;
}

function useCount(to: number, ms = 700) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      setN(to * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return n;
}

function Bar({ label, value, max, suffix = "", color }: { label: string; value: number; max: number; suffix?: string; color?: string }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="stat-bar">
      <div className="stat-bar-head">
        <span className="text-[var(--text-dim)] font-medium">{label}</span>
        <strong className="text-[var(--text)] font-semibold">{Math.round(value).toLocaleString()}{suffix}</strong>
      </div>
      <div className="stat-bar-track">
        <motion.div
          className="stat-bar-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

export default function StatsScreen({ stats, onLeaderboard }: Props) {
  const [activeCurveTab, setActiveCurveTab] = useState<"score" | "acc" | "sparks" | "streak">("score");

  const runs = useCount(stats.runs);
  const score = useCount(stats.totalScore);
  const sparks = useCount(stats.sparks ?? 0);
  const diamonds = useCount(stats.diamonds ?? 0);
  const hits = stats.hits ?? 0;
  const misses = stats.misses ?? 0;
  const attempts = hits + misses;
  const acc = attempts ? Math.round((hits / attempts) * 100) : 0;
  const avg = stats.reactionCount ? Math.round(stats.reactionTotal / stats.reactionCount) : 0;
  const hours = (stats.playSeconds ?? 0) / 3600;

  const modeRows = MODE_ORDER.map((m) => ({
    id: m,
    label: MODES[m].label,
    color: MODES[m].color,
    runs: stats.modeRuns?.[m] ?? 0,
    best: loadScores(m)[0]?.score ?? 0,
  }));
  const maxMode = Math.max(1, ...modeRows.map((r) => r.runs));
  const hist = stats.history ?? [];

  // Build high-detail graph points for curves
  const scoreData: GraphPoint[] = useMemo(() => {
    if (hist.length > 0) {
      return hist.slice().reverse().map((h, i) => ({
        value: h.score,
        label: `Run #${i + 1}`,
        mode: h.mode,
        date: h.date,
        sparks: h.sparks,
      }));
    }
    // Intuitive sample curve showing baseline progression
    return [
      { value: 1200, label: "Warmup", date: "Practice" },
      { value: 4800, label: "Run #1", date: "Initial" },
      { value: 9200, label: "Run #2", date: "Paced" },
      { value: 16500, label: "Run #3", date: "Flow state" },
      { value: 24800, label: "Run #4", date: "Peak" },
    ];
  }, [hist]);

  const accData: GraphPoint[] = useMemo(() => {
    if (hist.length > 0) {
      return hist.slice().reverse().map((h, i) => ({
        value: Math.min(100, Math.max(0, h.acc)),
        label: `Run #${i + 1}`,
        mode: h.mode,
        date: h.date,
      }));
    }
    return [
      { value: 72, label: "Run #1" },
      { value: 85, label: "Run #2" },
      { value: 91, label: "Run #3" },
      { value: 96, label: "Run #4" },
      { value: 98, label: "Run #5" },
    ];
  }, [hist]);

  const sparksData: GraphPoint[] = useMemo(() => {
    if (hist.length > 0) {
      return hist.slice().reverse().map((h, i) => ({
        value: h.sparks,
        label: `Run #${i + 1}`,
        mode: h.mode,
        date: h.date,
      }));
    }
    return [
      { value: 20, label: "Run #1" },
      { value: 65, label: "Run #2" },
      { value: 140, label: "Run #3" },
      { value: 230, label: "Run #4" },
      { value: 380, label: "Run #5" },
    ];
  }, [hist]);

  const streakData: GraphPoint[] = useMemo(() => {
    if (hist.length > 0) {
      return hist.slice().reverse().map((h, i) => ({
        value: h.streak,
        label: `Run #${i + 1}`,
        mode: h.mode,
        date: h.date,
      }));
    }
    return [
      { value: 6, label: "Run #1" },
      { value: 14, label: "Run #2" },
      { value: 22, label: "Run #3" },
      { value: 35, label: "Run #4" },
      { value: 48, label: "Run #5" },
    ];
  }, [hist]);

  return (
    <div className="stats-page">
      <header className="home-header">
        <div>
          <h2 className="stats-title">Telemetry & Stats</h2>
        </div>
        {onLeaderboard && (
          <div className="home-header-actions">
            <button
              onClick={onLeaderboard}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs transition cursor-pointer"
            >
              <Trophy size={15} />
              <span>Real Data Leaderboard</span>
            </button>
          </div>
        )}
      </header>

      {/* Hero KPIs with Animated Entry and Hover Springs */}
      <div className="stats-hero-grid">
        {[
          { k: "Runs", v: Math.round(runs).toLocaleString(), icon: Activity, color: "var(--brand)" },
          { k: "Lifetime", v: Math.round(score).toLocaleString(), icon: Trophy, color: "#9333ea" },
          { k: "Sparks", v: Math.round(sparks).toLocaleString(), icon: Sparkles, color: "#d97706" },
          { k: "Diamonds", v: Math.round(diamonds).toLocaleString(), icon: Zap, color: "#0284c7" },
        ].map((c, idx) => {
          const IconComp = c.icon;
          return (
            <motion.div
              key={c.k}
              className="stats-kpi glass"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35, ease: "easeOut" }}
              whileHover={{ y: -3, scale: 1.02 }}
            >
              <div className="flex items-center justify-between">
                <span>{c.k}</span>
                <IconComp size={15} style={{ color: c.color }} className="opacity-80" />
              </div>
              <strong>{c.v}</strong>
            </motion.div>
          );
        })}
      </div>

      {/* Main Curved Graph Interactive Telemetry Panel */}
      <section className="stats-panel glass mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-600 dark:text-cyan-400" />
            <h3 className="m-0 font-bold text-[var(--text)]">Performance Curve Telemetry</h3>
          </div>

          {/* Metric Selector Tabs with Animated Sliding Highlight */}
          <div className="curve-tab-bar">
            {[
              { id: "score", label: "Score Trend", color: "var(--brand)" },
              { id: "acc", label: "Accuracy %", color: "#10b981" },
              { id: "sparks", label: "Sparks", color: "#f59e0b" },
              { id: "streak", label: "Best Streak", color: "#ec4899" },
            ].map((t) => {
              const isSelected = activeCurveTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveCurveTab(t.id as any)}
                  className={`curve-tab-btn ${isSelected ? "active" : ""}`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="curveTabIndicator"
                      className="curve-tab-indicator"
                      transition={{ type: "spring", stiffness: 440, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Curved Graph Renderer */}
        <AnimatePresence mode="wait">
          {activeCurveTab === "score" && (
            <motion.div
              key="score-curve"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CurvedGraph
                data={scoreData}
                metricName="Score"
                color="var(--brand)"
                height={200}
                peakLabel="Best Score"
              />
            </motion.div>
          )}

          {activeCurveTab === "acc" && (
            <motion.div
              key="acc-curve"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CurvedGraph
                data={accData}
                metricName="Accuracy"
                unit="%"
                color="#10b981"
                fillColor="#059669"
                height={200}
                peakLabel="Best Acc"
              />
            </motion.div>
          )}

          {activeCurveTab === "sparks" && (
            <motion.div
              key="sparks-curve"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CurvedGraph
                data={sparksData}
                metricName="Sparks"
                color="#f59e0b"
                fillColor="#d97706"
                height={200}
                peakLabel="Max Gain"
              />
            </motion.div>
          )}

          {activeCurveTab === "streak" && (
            <motion.div
              key="streak-curve"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CurvedGraph
                data={streakData}
                metricName="Streak"
                color="#ec4899"
                fillColor="#db2777"
                height={200}
                peakLabel="Top Chain"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Accuracy & Speed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <section className="stats-panel glass m-0">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="m-0 text-[var(--text)]">Precision</h3>
          </div>
          <Bar label="Hits" value={hits} max={attempts || 1} color="#10b981" />
          <Bar label="Misses" value={misses} max={attempts || 1} color="#ef4444" />
          <Bar label="Accuracy" value={acc} max={100} suffix="%" color="var(--brand)" />
          <Bar label="Best streak" value={stats.bestStreak} max={Math.max(20, stats.bestStreak)} color="#ec4899" />
        </section>

        <section className="stats-panel glass m-0">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-amber-600 dark:text-amber-400" />
            <h3 className="m-0 text-[var(--text)]">Speed & Focus</h3>
          </div>
          <Bar label="Average reaction" value={avg} max={800} suffix=" ms" color="#f59e0b" />
          <Bar label="Fastest reaction" value={stats.fastestMs >= 9999 ? 0 : stats.fastestMs} max={500} suffix=" ms" color="#8b5cf6" />
          <Bar label="Hours played" value={hours} max={Math.max(2, hours)} suffix=" h" color="var(--brand)" />
        </section>
      </div>

      {/* Breakdown by Mode with Animated Multi-color Fill */}
      <section className="stats-panel glass">
        <h3 className="mb-3 text-[var(--text)]">Runs by Game Mode</h3>
        {modeRows.map((r) => (
          <div key={r.id} className="stat-bar">
            <div className="stat-bar-head">
              <span className="flex items-center gap-1.5 text-[var(--text-dim)] font-medium">
                <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                {r.label}
              </span>
              <strong className="text-[var(--text)] font-semibold">{r.runs} runs · {r.best.toLocaleString()}</strong>
            </div>
            <div className="stat-bar-track">
              <motion.div
                className="stat-bar-fill"
                style={{ background: r.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(r.runs / maxMode) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Recent History Table with Smooth Staggered Rows */}
      <section className="stats-panel glass">
        <h3 className="mb-3 text-[var(--text)]">Recent Runs</h3>
        {hist.length === 0 ? (
          <p className="dim text-sm">Play a run to record live telemetry and unlock instant replay stats.</p>
        ) : (
          <ol className="hist-list">
            {hist.slice(0, 8).map((h, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <span className="text-[var(--text-dim)]">{h.date} · {h.mode}</span>
                <strong className="inline-flex items-center gap-1 text-[var(--text)] font-semibold">
                  {h.score.toLocaleString()} · +{h.sparks}
                  <Sparkles size={14} className="text-amber-500 dark:text-amber-400" />
                </strong>
              </motion.li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

