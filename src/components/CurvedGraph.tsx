import { useState, useRef, useMemo, type MouseEvent, type TouchEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Trophy, Target, Zap, Activity } from "lucide-react";

export interface GraphPoint {
  value: number;
  label: string;
  sublabel?: string;
  mode?: string;
  date?: string;
  sparks?: number;
  extra?: string;
}

interface CurvedGraphProps {
  data: GraphPoint[];
  metricName?: string;
  unit?: string;
  color?: string;
  fillColor?: string;
  height?: number;
  showGrid?: boolean;
  showPeakPin?: boolean;
  peakLabel?: string;
}

/**
 * Calculates smooth cubic Bézier curves (Catmull-Rom to Cubic Bézier spline)
 * with curvature tension control to create organic, silky-smooth wave curves.
 */
function computeCubicSpline(pts: [number, number][], tension = 0.3): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  if (pts.length === 2) {
    const [p0, p1] = pts;
    const midX = (p0[0] + p1[0]) / 2;
    return `M ${p0[0]} ${p0[1]} C ${midX} ${p0[1]}, ${midX} ${p1[1]}, ${p1[0]} ${p1[1]}`;
  }

  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const pPrev = pts[Math.max(0, i - 1)];
    const pCurr = pts[i];
    const pNext = pts[i + 1];
    const pAfter = pts[Math.min(pts.length - 1, i + 2)];

    // Tangent vectors scaled by tension
    const cp1x = pCurr[0] + (pNext[0] - pPrev[0]) * tension;
    const cp1y = pCurr[1] + (pNext[1] - pPrev[1]) * tension;

    const cp2x = pNext[0] - (pAfter[0] - pCurr[0]) * tension;
    const cp2y = pNext[1] - (pAfter[1] - pCurr[1]) * tension;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${pNext[0].toFixed(2)} ${pNext[1].toFixed(2)}`;
  }

  return d;
}

export default function CurvedGraph({
  data,
  metricName = "Score",
  unit = "",
  color = "var(--brand, #38bdf8)",
  fillColor,
  height = 180,
  showGrid = true,
  showPeakPin = true,
  peakLabel = "Personal Best",
}: CurvedGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // If fewer than 2 points, pad gracefully to show a beautiful curve
  const displayPoints = useMemo(() => {
    if (data.length === 0) {
      return [
        { value: 0, label: "Start", date: "No data" },
        { value: 0, label: "Now", date: "No data" },
      ];
    }
    if (data.length === 1) {
      const p = data[0];
      return [
        { ...p, value: Math.round(p.value * 0.7), label: "Previous" },
        { ...p, label: "Current" },
      ];
    }
    return data;
  }, [data]);

  const width = 600;
  const padX = 32;
  const padTop = 26;
  const padBottom = 26;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;

  const rawValues = displayPoints.map((d) => d.value);
  const minVal = 0;
  const maxVal = Math.max(1, ...rawValues);

  // Map to SVG coordinates
  const coords = useMemo(() => {
    return displayPoints.map((pt, i) => {
      const x = padX + (displayPoints.length > 1 ? (i / (displayPoints.length - 1)) * plotWidth : plotWidth / 2);
      const ratio = maxVal > 0 ? pt.value / maxVal : 0;
      const y = padTop + plotHeight * (1 - ratio);
      return [x, y] as [number, number];
    });
  }, [displayPoints, maxVal, plotWidth, plotHeight]);

  // Generate smooth curve and filled area path
  const curvePath = useMemo(() => computeCubicSpline(coords, 0.28), [coords]);
  const areaPath = useMemo(() => {
    if (coords.length === 0) return "";
    const first = coords[0];
    const last = coords[coords.length - 1];
    const baselineY = height - padBottom;
    return `${curvePath} L ${last[0].toFixed(2)} ${baselineY} L ${first[0].toFixed(2)} ${baselineY} Z`;
  }, [curvePath, coords, height, padBottom]);

  // Find peak point for the badge
  const peakIndex = useMemo(() => {
    if (displayPoints.length === 0) return 0;
    let best = 0;
    for (let i = 1; i < displayPoints.length; i++) {
      if (displayPoints[i].value > displayPoints[best].value) best = i;
    }
    return best;
  }, [displayPoints]);

  const activeIdx = hoverIndex ?? (coords.length - 1);
  const activePt = displayPoints[activeIdx];
  const activeCoord = coords[activeIdx];

  const handlePointer = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const svgX = (relX / rect.width) * width;

    // Find nearest point
    let closest = 0;
    let minDist = Infinity;
    coords.forEach(([x], i) => {
      const dist = Math.abs(x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  };

  const onMouseMove = (e: MouseEvent) => handlePointer(e.clientX);
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches[0]) handlePointer(e.touches[0].clientX);
  };

  const gradId = useMemo(() => `curver-grad-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div className="relative w-full select-none" ref={containerRef} onMouseMove={onMouseMove} onMouseLeave={() => setHoverIndex(null)} onTouchMove={onTouchMove} onTouchEnd={() => setHoverIndex(null)}>
      {/* Dynamic Header with Live Tracker Value */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">{metricName} Curve</span>
          {displayPoints.length > 2 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[var(--text-dim)] font-medium">
              {displayPoints.length} runs tracked
            </span>
          )}
        </div>

        {activePt && (
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs font-mono"
          >
            <span className="text-[var(--text-faint)]">{activePt.date || `Run #${activeIdx + 1}`}</span>
            <strong className="text-[var(--text)] text-sm font-bold">
              {Math.round(activePt.value).toLocaleString()}{unit}
            </strong>
          </motion.div>
        )}
      </div>

      {/* SVG Canvas with Curved Spline and Ambient Fill */}
      <div className="curved-graph-canvas backdrop-blur-xl shadow-inner">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor || color} stopOpacity="0.4" />
              <stop offset="50%" stopColor={fillColor || color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={fillColor || color} stopOpacity="0.0" />
            </linearGradient>

            <filter id="glow-curve" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Grid Lines */}
          {showGrid && (
            <g className="opacity-40">
              {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                const y = padTop + plotHeight * (1 - ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={width - padX}
                      y2={y}
                      stroke="currentColor"
                      className="text-[var(--panel-border)]"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                    />
                    <text
                      x={padX - 8}
                      y={y + 3}
                      fill="currentColor"
                      className="text-[var(--text-faint)]"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {Math.round(maxVal * ratio).toLocaleString()}
                    </text>
                  </g>
                );
              })}
              {/* Baseline */}
              <line
                x1={padX}
                y1={height - padBottom}
                x2={width - padX}
                y2={height - padBottom}
                stroke="currentColor"
                className="text-[var(--panel-border)]"
                strokeWidth="1.2"
              />
            </g>
          )}

          {/* Smooth Curved Area Fill */}
          <motion.path
            d={areaPath}
            fill={`url(#${gradId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />

          {/* Smooth Curved Stroke Path */}
          <motion.path
            d={curvePath}
            fill="none"
            stroke={color}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow-curve)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Secondary thin gloss highlight line along curve */}
          <path
            d={curvePath}
            fill="none"
            stroke="white"
            strokeWidth="1"
            strokeOpacity="0.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Hairline Guide */}
          {activeCoord && hoverIndex !== null && (
            <g>
              <line
                x1={activeCoord[0]}
                y1={padTop - 4}
                x2={activeCoord[0]}
                y2={height - padBottom}
                stroke={color}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.85"
              />
            </g>
          )}

          {/* Data Points on Curve */}
          {coords.map(([x, y], i) => {
            const isPeak = i === peakIndex && displayPoints[i].value > 0;
            const isActive = i === activeIdx;

            return (
              <g key={i}>
                {/* Outer animated radar ring on active or peak point */}
                {(isActive || isPeak) && (
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={isActive ? 12 : 9}
                    fill="none"
                    stroke={isPeak ? "#fbbf24" : color}
                    strokeWidth="1.5"
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: [0.9, 1.4, 0.9], opacity: [0.9, 0.2, 0.9] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                  />
                )}

                {/* Core Point Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 5.5 : isPeak ? 4.5 : 3.5}
                  fill={isPeak ? "#f59e0b" : isActive ? "var(--text)" : color}
                  stroke="var(--surface)"
                  strokeWidth={isActive ? "2.5" : "1.5"}
                  className="cursor-pointer transition-all duration-150 hover:r-6"
                />
              </g>
            );
          })}

          {/* Peak High Score Pin Badge */}
          {showPeakPin && coords[peakIndex] && displayPoints[peakIndex].value > 0 && (
            <g transform={`translate(${coords[peakIndex][0]}, ${coords[peakIndex][1] - 14})`}>
              <rect
                x="-36"
                y="-16"
                width="72"
                height="16"
                rx="8"
                fill="#f59e0b"
                fillOpacity="0.95"
                stroke="#fef3c7"
                strokeWidth="1"
              />
              <text
                x="0"
                y="-4.5"
                fill="#000000"
                fontSize="8.5"
                fontWeight="800"
                textAnchor="middle"
                letterSpacing="0.05em"
              >
                ★ {peakLabel.toUpperCase()}
              </text>
            </g>
          )}
        </svg>

        {/* Floating Tooltip Card on Hover */}
        <AnimatePresence>
          {hoverIndex !== null && activeCoord && activePt && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--panel-border)] text-[var(--text)] shadow-2xl backdrop-blur-md whitespace-nowrap text-left"
              style={{
                left: `${(activeCoord[0] / width) * 100}%`,
                top: `${Math.max(34, (activeCoord[1] / height) * 100 - 8)}%`,
              }}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-faint)] font-bold uppercase tracking-wider">
                <Activity size={10} className="text-cyan-600 dark:text-cyan-400" />
                <span>{activePt.mode ? `${activePt.mode} Mode` : `Run #${activeIdx + 1}`}</span>
                {activePt.date && <span>· {activePt.date}</span>}
              </div>

              <div className="text-sm font-extrabold flex items-center gap-1 mt-0.5">
                <span style={{ color }}>{Math.round(activePt.value).toLocaleString()}{unit}</span>
                {activeIdx === peakIndex && <span className="text-[10px] text-amber-500 font-bold">★ Best</span>}
              </div>

              {activePt.sparks !== undefined && (
                <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-300 font-semibold mt-0.5">
                  <Sparkles size={10} />
                  <span>+{activePt.sparks} Sparks</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--text-faint)] mt-2 px-1">
        <span>Oldest recorded</span>
        <span className="text-[var(--text-dim)] font-medium">Interactive curve — hover or drag to inspect</span>
        <span>Latest run</span>
      </div>
    </div>
  );
}
