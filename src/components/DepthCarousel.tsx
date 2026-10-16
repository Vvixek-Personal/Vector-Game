import { useCallback, useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { uiSlide } from "../game/haptics";
import Icon from "./Icon";

export interface CarouselItem {
  id?: string | number;
  image?: string;
  alt?: string;
  bg?: string;
  color?: string;
}

interface Props<T extends CarouselItem> {
  items: T[];
  depth?: number;
  spread?: number;
  tilt?: number;
  tiltDirection?: "left" | "right" | "alternate";
  perspective?: number;
  visibleCards?: number;
  falloff?: number;
  blur?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  loop?: boolean;
  cardWidth?: number;
  cardHeight?: number;
  radius?: number;
  tint?: string;
  duration?: number;
  ease?: string;
  showControls?: boolean;
  showIndicators?: boolean;
  reducedMotion?: boolean;
  active?: number;
  defaultActive?: number;
  className?: string;
  onActiveChange?: (index: number) => void;
  onSelect?: (index: number, item: T) => void;
  renderCard?: (item: T, index: number, active: boolean) => ReactNode;
}

const EASINGS: Record<string, string> = {
  "power2.out": "cubic-bezier(.22,.68,.22,1)",
  "power3.out": "cubic-bezier(.22,1,.36,1)",
  "expo.out": "cubic-bezier(.19,1,.22,1)",
  spring: "cubic-bezier(.22,.8,.3,1)",
};

export default function DepthCarousel<T extends CarouselItem>({
  items, depth = 100, spread = 250, tilt = 7, tiltDirection = "right", perspective = 1600,
  visibleCards = 2, falloff = 0.25, blur = 0, autoplay = false, autoplayDelay = 6200,
  loop = true, cardWidth = 320, cardHeight = 392, radius = 20, tint = "", duration = 560,
  ease = "power2.out", showControls = true, showIndicators = true, reducedMotion = false,
  active, defaultActive = 0, onActiveChange, onSelect, renderCard, className = "",
}: Props<T>) {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  const [internal, setInternal] = useState(defaultActive);
  const count = items.length;
  const index = count ? ((Math.floor(active ?? internal) % count) + count) % count : 0;
  const currentIndex = useRef(index);
  currentIndex.current = index;
  const interacted = useRef(false);
  const gesture = useRef<{ id: number; x: number; y: number; direction: "pending" | "horizontal" | "vertical" } | null>(null);
  const suppressClickUntil = useRef(0);

  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  const goTo = useCallback((target: number, user = true) => {
    if (!count) return;
    if (user) interacted.current = true;
    const next = loop ? ((target % count) + count) % count : Math.max(0, Math.min(count - 1, target));
    if (next === currentIndex.current) return;
    currentIndex.current = next;
    setInternal(next);
    onActiveChange?.(next);
    if (user) uiSlide();
  }, [count, loop, onActiveChange]);

  useEffect(() => {
    if (!autoplay || reducedMotion || count < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !interacted.current && !gesture.current) goTo(currentIndex.current + 1, false);
    }, Math.max(1600, autoplayDelay));
    return () => window.clearInterval(timer);
  }, [autoplay, autoplayDelay, count, goTo, reducedMotion]);

  if (!count) return <div className="dc-empty">No modes available.</div>;

  const size = Math.min(cardWidth, Math.max(160, width * 0.68));
  const height = cardHeight * size / cardWidth;
  const distance = Math.min(spread, width * 0.29);
  const animationMs = reducedMotion ? 0 : duration;
  const easing = EASINGS[ease] ?? EASINGS["power2.out"];

  return (
    <div ref={root} className={`dc-root ${className}`} role="region" aria-roledescription="carousel" aria-label="Game modes"
      onKeyDown={(e) => {
        const isLeft = e.key === "ArrowLeft" || e.key === "a" || e.key === "A";
        const isRight = e.key === "ArrowRight" || e.key === "d" || e.key === "D";
        if (isLeft || isRight) {
          e.preventDefault();
          e.stopPropagation();
          goTo(index + (isRight ? 1 : -1));
        }
      }}>
      <div className="dc-viewport" style={{ height: height + 40, perspective }}
        onPointerDown={(e) => {
          if (e.button !== 0 || gesture.current || (e.target as HTMLElement).closest(".dc-ctl")) return;
          interacted.current = true;
          gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, direction: "pending" };
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g || g.id !== e.pointerId) return;
          const dx = e.clientX - g.x;
          const dy = e.clientY - g.y;
          if (g.direction === "pending" && Math.hypot(dx, dy) > 10) {
            g.direction = Math.abs(dx) > Math.abs(dy) * 1.2 ? "horizontal" : "vertical";
            if (g.direction === "horizontal") e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (g.direction === "horizontal") e.preventDefault();
        }}
        onPointerUp={(e) => {
          const g = gesture.current;
          if (!g || g.id !== e.pointerId) return;
          gesture.current = null;
          if (g.direction !== "pending") suppressClickUntil.current = performance.now() + 400;
          const dx = e.clientX - g.x;
          if (g.direction === "horizontal" && Math.abs(dx) > 36) goTo(currentIndex.current + (dx < 0 ? 1 : -1));
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => { gesture.current = null; suppressClickUntil.current = performance.now() + 400; }}
        onPointerLeave={(e) => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) gesture.current = null; }}>
        <div className="dc-stage">
          {items.map((item, i) => {
            let offset = i - index;
            if (loop) offset = ((offset + Math.floor(count / 2) + count) % count) - Math.floor(count / 2);
            const abs = Math.abs(offset);
            if (abs > visibleCards) return null;
            const isActive = offset === 0;
            const rotation = tiltDirection === "left" ? offset * tilt : tiltDirection === "alternate" ? (i % 2 ? 1 : -1) * abs * tilt : -offset * tilt;
            const style: CSSProperties = {
              width: size, height, borderRadius: radius, zIndex: 10 - abs,
              opacity: Math.max(0.18, 1 - abs * falloff),
              transform: `translate(-50%, -50%) translate3d(${offset * distance}px, ${abs * 6}px, ${-abs * depth}px) rotateY(${reducedMotion ? 0 : rotation}deg) scale(${1 - abs * 0.045})`,
              transition: `transform ${animationMs}ms ${easing}, opacity ${animationMs}ms ease`,
              ...(blur > 0 ? { filter: `blur(${Math.min(blur, abs * blur / 2)}px)` } : {}),
              ...(item.image ? { background: `url("${item.image}") center / cover` } : item.bg ? { background: item.bg } : {}),
            };
            return (
              <button key={item.id ?? i} className={`dc-card ${isActive ? "is-current" : ""}`} style={style} tabIndex={isActive ? 0 : -1}
                aria-label={`${item.alt ?? `Mode ${i + 1}`}${isActive ? ", play" : ", select"}`} aria-current={isActive ? "true" : undefined}
                onClick={() => {
                  if (performance.now() < suppressClickUntil.current) return;
                  interacted.current = true;
                  if (isActive) onSelect?.(i, item);
                  else goTo(i);
                }}>
                {renderCard ? renderCard(item, i, isActive) : <span className="sr-only">{item.alt}</span>}
                {tint && <span className="dc-tint" style={{ backgroundColor: tint, opacity: 0.12 }} />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="dc-navigation">
        {showControls && <button type="button" className="dc-ctl" onClick={() => goTo(index - 1)} disabled={!loop && index === 0} aria-label="Previous mode"><Icon name="left" size={19} /></button>}
        {showIndicators && <div className="dc-dots" aria-label="Choose a mode">{items.map((item, i) => <button key={item.id ?? i} className={`dc-dot ${i === index ? "on" : ""}`} onClick={() => goTo(i)} aria-label={`Select ${item.alt ?? `mode ${i + 1}`}`} aria-current={i === index ? "true" : undefined}><span /></button>)}</div>}
        {showControls && <button type="button" className="dc-ctl" onClick={() => goTo(index + 1)} disabled={!loop && index === count - 1} aria-label="Next mode"><Icon name="right" size={19} /></button>}
      </div>
    </div>
  );
}