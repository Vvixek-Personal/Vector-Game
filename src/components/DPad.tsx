import { DIR_GLYPH, type ArrowMark, type DirName } from "../game/types";

export type DPadLayout = "center" | "right" | "left" | "hidden";

interface Props {
  held: DirName[];
  hint: DirName[];
  accent: string;
  mark?: ArrowMark;
  layout?: DPadLayout;
  scale?: number;
  onPress: (d: DirName) => void;
  onRelease: (d: DirName) => void;
}

const CELL: Record<DirName, string> = {
  N: "col-start-2 row-start-1",
  W: "col-start-1 row-start-2",
  E: "col-start-3 row-start-2",
  S: "col-start-2 row-start-3",
};

const DIAG_GLYPH: Record<string, string> = {
  NE: "↗",
  NW: "↖",
  SE: "↘",
  SW: "↙",
};

function centerGlyph(held: DirName[]): string {
  if (held.length === 0) return "+";
  if (held.length === 1) return DIR_GLYPH[held[0]];
  const v = held.includes("N") ? "N" : held.includes("S") ? "S" : "";
  const h = held.includes("E") ? "E" : held.includes("W") ? "W" : "";
  if (!v || !h) return "✕";
  return DIAG_GLYPH[v + h] ?? "✦";
}

/** Minimal swap logo — mirrors the canvas badge. */
function SwapLogo({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8h13" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <path d="M14 4.5 17.5 8 14 11.5" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16H7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <path d="M10 12.5 6.5 16l3.5 3.5" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DPad({
  held,
  hint,
  accent,
  mark = "none",
  layout = "center",
  scale = 100,
  onPress,
  onRelease,
}: Props) {
  if (layout === "hidden") return null;

  const isHeld = (d: DirName) => held.includes(d);
  const isHint = (d: DirName) => hint.includes(d);
  const center = centerGlyph(held);
  const isOpp = mark === "opposite";
  const isBonus = mark === "bonus";

  const posClass =
    layout === "right"
      ? "bottom-3 right-4 sm:bottom-6 sm:right-6"
      : layout === "left"
        ? "bottom-3 left-4 sm:bottom-6 sm:left-6"
        : "bottom-3 left-1/2 -translate-x-1/2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0";

  return (
    <div className={`pointer-events-none absolute z-20 ${posClass}`}>
      {/* Minimal mark chips — white for opposite, gold for bonus. Never red. */}
      {isOpp && (
        <div className="mx-auto mb-2 flex w-max items-center gap-1.5 px-3 py-1 text-center text-[11px] font-medium dim">
          <SwapLogo />
          Opposite
        </div>
      )}
      {isBonus && !isOpp && (
        <div className="mx-auto mb-2 w-max px-3 py-1 text-center text-[11px] font-medium dim">
          Bonus x5
        </div>
      )}
      {hint.length === 2 && mark === "none" && (
        <div
          className="mx-auto mb-2 w-max px-3 py-1 text-center text-[11px] font-medium"
          style={{
            color: accent,
          }}
        >
          Hold {DIR_GLYPH[hint[0]]} + {DIR_GLYPH[hint[1]]}
        </div>
      )}

      <div
        className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1.5 transition-[width,height]"
        style={{
          width: `${152 * (scale / 100)}px`,
          height: `${152 * (scale / 100)}px`,
        }}
      >
        {(["N", "W", "E", "S"] as DirName[]).map((d) => {
          const on = isHeld(d);
          const hinted = isHint(d) && !on;
          return (
            <button
              key={d}
              className={`${CELL[d]} flex touch-none select-none items-center justify-center rounded-xl border text-lg font-medium transition-[transform,background-color] duration-100 ${
                on ? "scale-95" : "active:scale-95"
              }`}
              style={{
                color: on ? "var(--brand-on)" : accent,
                background: on ? accent : "var(--surface)",
                borderColor: on || hinted ? accent : "var(--panel-border)",
              }}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                onPress(d);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onRelease(d);
              }}
              onPointerCancel={() => onRelease(d)}
              onLostPointerCapture={() => onRelease(d)}
              onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); onPress(d); } }}
              onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onRelease(d); } }}
              onBlur={() => onRelease(d)}
              aria-label={d}
            >
              {DIR_GLYPH[d]}
            </button>
          );
        })}

        <div className="col-start-2 row-start-2 flex items-center justify-center">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border text-base font-black transition-all duration-100"
            style={{
              color: held.length ? accent : "var(--text-faint)",
              borderColor: "var(--panel-border)",
              background: "var(--surface)",
            }}
          >
            {center}
          </div>
        </div>
      </div>
    </div>
  );
}
