import { useCallback, useEffect, type CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MODES, MODE_ORDER, type GameMode } from "../../game/types";
import type { ScoreEntry, Stats, Settings } from "../../game/storage";
import type { Profile } from "../../game/profile";
import { uiConfirm, uiTap, uiSlide } from "../../game/haptics";
import DepthCarousel from "../DepthCarousel";
import ModeArtwork from "../ModeArtwork";
import Avatar from "../Avatar";
import Icon from "../Icon";
import GoogleAuthButton from "../GoogleAuthButton";
import { PWAInstallButton } from "../PWAInstallButton";
import { getPlayerLevelProgress } from "../../game/levels";
import type { GameModifiers } from "../../game/modifiers";

interface ModeItem {
  id: GameMode;
  color: string;
  alt: string;
}

const ITEMS: ModeItem[] = MODE_ORDER.map((mode) => ({
  id: mode,
  color: MODES[mode].color,
  alt: MODES[mode].label,
}));

interface Props {
  keyboardEnabled?: boolean;
  mode: GameMode;
  onMode: (mode: GameMode) => void;
  name: string;
  scores: ScoreEntry[];
  stats: Stats;
  onUpdateStats: (s: Stats) => void;
  profile: Profile;
  reducedMotion: boolean;
  showHints: boolean;
  onPlay: (mode: GameMode) => void;
  onHowToPlay: () => void;
  onFullscreen: () => void;
  onProfile: () => void;
  onLeaderboard?: () => void;
  onMissions?: () => void;
  onUpdateProfile: (p: Profile) => void;
  settings?: Settings;
  modifiers?: GameModifiers;
  modifierMultiplier?: number;
  onOpenModifiers?: () => void;
}

export default function HomeScreen({
  mode,
  keyboardEnabled = true,
  onMode,
  name,
  scores,
  stats,
  onUpdateStats,
  profile,
  reducedMotion,
  showHints,
  onPlay,
  onHowToPlay,
  onFullscreen,
  onProfile,
  onLeaderboard,
  onMissions,
  onUpdateProfile,
  settings,
  modifiers,
  modifierMultiplier = 1.0,
  onOpenModifiers,
}: Props) {
  const def = MODES[mode];
  const activeIndex = Math.max(0, MODE_ORDER.indexOf(mode));
  const selectMode = useCallback((index: number) => onMode(ITEMS[index].id), [onMode]);
  const levelInfo = getPlayerLevelProgress(stats, profile);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !keyboardEnabled || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.repeat) return;

      const code = e.code;
      const key = e.key.toLowerCase();

      const isLeft =
        key === "a" ||
        code === "KeyA" ||
        code === "ArrowLeft" ||
        Boolean(settings?.binds?.W?.includes(code));

      const isRight =
        key === "d" ||
        code === "KeyD" ||
        code === "ArrowRight" ||
        Boolean(settings?.binds?.E?.includes(code));

      if (isLeft) {
        e.preventDefault();
        uiSlide();
        const nextIndex = (activeIndex - 1 + ITEMS.length) % ITEMS.length;
        selectMode(nextIndex);
      } else if (isRight) {
        e.preventDefault();
        uiSlide();
        const nextIndex = (activeIndex + 1) % ITEMS.length;
        selectMode(nextIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, selectMode, settings, keyboardEnabled]);
  
  const startMode = useCallback((_index: number, item: ModeItem) => {
    uiConfirm();
    onPlay(item.id);
  }, [onPlay]);

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="wordmark">
          <Icon name="arrow" size={28} />
          <h1>Vector<span>.</span></h1>
        </div>
        <div className="home-header-actions">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Google Sign-in / Account Status */}
          <GoogleAuthButton compact />

          {onMissions && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="text-button header-chip"
              onClick={() => { uiTap(); onMissions(); }}
              title="Open daily missions"
            >
              <Icon name="award" size={15} />
              <span className="hidden sm:inline">Missions</span>
            </motion.button>
          )}

          {onLeaderboard && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="text-button header-chip"
              onClick={() => { uiTap(); onLeaderboard(); }}
              title="Open the global leaderboard"
            >
              <Icon name="trophy" size={15} />
              <span className="hidden sm:inline">Leaderboard</span>
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            className="text-button how-button"
            onClick={() => { uiTap(); onHowToPlay(); }}
          >
            <Icon name="help" size={18} />How to play
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="icon-button fullscreen-button"
            onClick={onFullscreen}
            title="Toggle fullscreen"
            aria-label="Toggle fullscreen"
          >
            <Icon name="expand" size={19} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="player-chip relative"
            onClick={() => { uiTap(); onProfile(); }}
            aria-label="Open your profile and level progression"
          >
            <Avatar profile={profile} name={name} size={34} />
            <div className="flex flex-col text-left leading-tight">
              <span className="player-chip-name">{name.trim() || "Ace"}</span>
              <span className="num text-[10px] font-semibold" style={{ color: "var(--brand)" }}>
                Level {levelInfo.currentLevel}
              </span>
            </div>
            {levelInfo.unclaimedCount > 0 && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--brand)" }}
                aria-label="Unclaimed level rewards"
              />
            )}
            <Icon name="right" size={14} />
          </motion.button>
        </div>
      </header>

      <main className="home-main">
        <section className="mode-intro" aria-labelledby="selected-mode-heading">
          <AnimatePresence mode="wait">
            <motion.div
              className="mode-copy"
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 id="selected-mode-heading">{def.label}</h2>
              <p className="mode-description">{def.desc}</p>
              <p className="mode-rule">{def.tag}</p>
            </motion.div>
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.985 }}
            className="primary-action cursor-pointer"
            onClick={() => { uiConfirm(); onPlay(mode); }}
          >
            <Icon name="play" size={19} />Play {def.label}<Icon name="right" size={17} />
          </motion.button>

          {onOpenModifiers && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onOpenModifiers}
              className={`header-chip pressable mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] font-medium ${
                modifierMultiplier > 1 ? "is-active" : ""
              }`}
            >
              <span aria-hidden="true">⚡</span>
              <span className="num">
                {modifierMultiplier > 1
                  ? `Modifiers on · ${modifierMultiplier.toFixed(2)}×`
                  : "Modifiers off · 1.00×"}
              </span>
            </motion.button>
          )}

          {showHints && <p className="input-note"><Icon name={mode === "coop" ? "keyboard" : "touch"} size={17} />{mode === "coop" ? "Player 1: WASD. Player 2: arrow keys." : "Swipe, tap, or use your arrow keys."}</p>}
          <div className="personal-best">
            <span>{mode === "practice" ? "Training mode" : "Personal best"}</span>
            <strong>{mode === "practice" ? "No timer" : (scores[0]?.score ?? 0).toLocaleString()}{mode !== "practice" && <small> pts</small>}</strong>
          </div>
        </section>

        <section className="mode-showcase" aria-label="Choose your game mode">
          <div className="showcase-caption"><span>Choose your pace</span><span className="mode-count">{String(activeIndex + 1).padStart(2, "0")} <span>/ {String(ITEMS.length).padStart(2, "0")}</span></span></div>
          <DepthCarousel<ModeItem>
            items={ITEMS}
            active={activeIndex}
            onActiveChange={selectMode}
            onSelect={startMode}
            depth={100}
            spread={250}
            tilt={7}
            perspective={1600}
            visibleCards={2}
            falloff={0.25}
            blur={0}
            autoplay={false}
            cardWidth={320}
            cardHeight={392}
            radius={20}
            tint=""
            duration={560}
            ease="expo.out"
            reducedMotion={reducedMotion}
            loop
            showControls
            showIndicators
            renderCard={(item, _index, isActive) => (
              <div className="mode-tile" style={{ "--mode-color": item.color } as CSSProperties}>
                <span className="mode-tile-top"><span>Vector / {MODES[item.id].label}</span><Icon name="arrow" size={16} /></span>
                <ModeArtwork mode={item.id} />
                <span className="mode-tile-bottom"><span><strong>{MODES[item.id].label}</strong><small>{MODES[item.id].tag}</small></span><span className={`tile-play ${isActive ? "is-active" : ""}`}><Icon name="play" size={18} /></span></span>
              </div>
            )}
          />
          {showHints && <p className="carousel-hint">Browse at your own pace. Tap the middle tile to play.</p>}
        </section>
      </main>

      <footer className="home-footer">
        <span>Less rush. More play.</span>
        <span className="home-local-note">{stats.runs > 0 ? `${stats.runs.toLocaleString()} runs played. ` : ""}Your scores stay on this device.</span>
        <details className="local-records">
          <summary>Your scores <Icon name="right" size={15} /></summary>
          <div className="records-popover">
            <h3>{def.label} best runs</h3>
            {scores.length === 0 ? <p>Your first run starts here.</p> : <ol>{scores.slice(0, 5).map((score, i) => <li key={`${score.date}-${i}`}><span>{i + 1}. {score.name}</span><strong>{score.score.toLocaleString()}</strong></li>)}</ol>}
          </div>
        </details>
      </footer>
    </div>
  );
}