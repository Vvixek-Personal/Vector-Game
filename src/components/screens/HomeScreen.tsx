import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowUpRight, ArrowRight, Play, Heart, Search, Trophy, Flame, Zap, Target, HelpCircle, Maximize2, Sparkles, CalendarDays, Check, Layers } from "lucide-react";
import { MODES, MODE_ORDER, type GameMode } from "../../game/types";
import { bestScore, type ScoreEntry, type Stats, type Settings } from "../../game/storage";
import { loadProfile, saveProfile, type Profile } from "../../game/profile";
import { getPlayerLevelProgress } from "../../game/levels";
import { uiConfirm, uiTap, uiSlide } from "../../game/haptics";
import type { GameModifiers } from "../../game/modifiers";
import Avatar from "../Avatar";
import HeroAvatar from "../HeroAvatar";
import ModeArtwork from "../ModeArtwork";
import AppHeader from "../AppHeader";
import SegmentedTabs from "../shared/SegmentedTabs";
import "../../collection.css";
import "../../playroom.css";

interface Props {
  keyboardEnabled?: boolean; mode: GameMode; onMode: (mode: GameMode) => void; name: string;
  scores: ScoreEntry[]; stats: Stats; onUpdateStats: (stats: Stats) => void; profile: Profile;
  reducedMotion: boolean; showHints: boolean; onPlay: (mode: GameMode) => void; onHowToPlay: () => void;
  onFullscreen: () => void; onProfile: () => void; onLeaderboard?: () => void; onMissions?: () => void;
  onStore?: () => void; onStatsOpen?: () => void; onUpdateProfile: (profile: Profile) => void; settings?: Settings;
  modifiers?: GameModifiers; modifierMultiplier?: number; onOpenModifiers?: () => void;
}
type ModeCollection = "all" | "quick" | "focus" | "together" | "challenges" | "favorites";
const collections: Record<Exclude<ModeCollection, "all" | "favorites">, GameMode[]> = {
  quick: ["arcade", "waves", "rush", "blitz", "sudden"], focus: ["practice", "memory", "zen"],
  together: ["coop", "versus"], challenges: ["daily", "weekly"],
};

export default function HomeScreen({ mode, keyboardEnabled = true, onMode, name, scores, stats, profile,
  showHints, onPlay, onHowToPlay, onFullscreen, onProfile, onLeaderboard, onMissions, onStore, onStatsOpen,
  onUpdateProfile, settings, modifierMultiplier = 1, onOpenModifiers }: Props) {
  const [collection, setCollection] = useState<ModeCollection>("all");
  const [query, setQuery] = useState("");
  const def = MODES[mode];
  const playerName = name.trim() || "Ace";
  const level = getPlayerLevelProgress(stats, profile);
  const favorites = profile.favoriteModes ?? [];
  const visibleModes = useMemo(() => MODE_ORDER.filter(value => {
    const inCollection = collection === "all" || (collection === "favorites" ? favorites.includes(value) : collections[collection].includes(value));
    return inCollection && [MODES[value].label, MODES[value].desc, MODES[value].tag].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }), [collection, favorites, query]);
  const start = (value: GameMode) => { uiConfirm(); onPlay(value); };
  const toggleFavorite = (value: GameMode) => {
    const current = loadProfile();
    const saved = current.favoriteModes ?? [];
    const next = { ...current, favoriteModes: saved.includes(value) ? saved.filter(item => item !== value) : [...saved, value] };
    saveProfile(next); onUpdateProfile(next); uiTap();
  };
  const selectMode = useCallback((value: GameMode) => { uiSlide(); onMode(value); }, [onMode]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !keyboardEnabled || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if ((event.target as HTMLElement | null)?.closest("button, a, input, textarea, select, [contenteditable='true'], dialog")) return;
      const left = ["KeyA", "ArrowLeft", ...(settings?.binds?.W ?? [])].includes(event.code);
      const right = ["KeyD", "ArrowRight", ...(settings?.binds?.E ?? [])].includes(event.code);
      if (!left && !right) return;
      event.preventDefault();
      const index = Math.max(0, MODE_ORDER.indexOf(mode));
      selectMode(MODE_ORDER[(index + (left ? -1 : 1) + MODE_ORDER.length) % MODE_ORDER.length]);
    };
    window.addEventListener("keydown", handle); return () => window.removeEventListener("keydown", handle);
  }, [mode, keyboardEnabled, settings?.binds, selectMode]);
  const last = stats.history[0];
  const lastLabel = last && MODES[last.mode as GameMode]?.label;

  return <div className="collection-page v-play-home">
    <AppHeader actions={<>
      <button className="v-header-help" onClick={onHowToPlay} aria-label="How to play"><HelpCircle size={17}/><span>How to play</span></button>
      <button className="v-icon-button v-home-fullscreen" onClick={onFullscreen} aria-label="Toggle fullscreen"><Maximize2 size={16}/></button>
      <button className="v-home-profile" onClick={onProfile} aria-label="Open your profile and level progression"><Avatar profile={profile} name={playerName} size={34}/>{level.unclaimedCount > 0 && <i aria-label="Unclaimed level rewards"/>}</button>
    </>}/>
    <section className="v-home-welcome">
      <div><p className="v-eyebrow"><Sparkles size={13}/> {stats.runs ? "WELCOME BACK, " : "YOUR NEXT FAVORITE MOMENT, "}{playerName.toUpperCase()}</p><h1>Find your flow<span>.</span></h1><p>A little focus. A quicker reaction. A new personal best.<br className="v-desktop-break"/> Pick your pace and make the next run yours.</p></div>
      <button className="v-level-summary" onClick={onProfile}>
        <div><Avatar profile={profile} name={playerName} size={44}/><span><strong>{playerName}</strong><small>Level {level.currentLevel} · {level.currentXp.toLocaleString()} XP</small></span><ArrowUpRight size={16}/></div>
        <div className="v-level-track" role="progressbar" aria-label="Progress to next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level.progress * 100)}><i style={{ width: level.progress * 100 + "%" }}/></div>
        <small>{level.unclaimedCount ? level.unclaimedCount + " level rewards ready to claim" : level.currentLevel >= level.maxLevel ? "Maximum level reached" : (level.nextLevelXp - level.currentXp).toLocaleString() + " XP to level " + (level.currentLevel + 1)}<ArrowRight size={12}/></small>
      </button>
    </section>

    <section className="v-featured-mode" aria-labelledby="selected-mode-heading" style={{ "--mode-accent": def.color } as CSSProperties}>
      <div className="v-featured-copy">
        <p className="v-eyebrow">{mode === "practice" ? <Target size={13}/> : <Play size={12}/>} {mode === "practice" ? "A LITTLE ROOM TO LEARN" : "READY WHEN YOU ARE"}</p>
        <h2 id="selected-mode-heading">{def.label}</h2><p>{def.desc}</p><span className="v-mode-rule">{def.tag}</span>
        <div className="v-featured-actions"><button className="v-button v-button-primary" onClick={() => start(mode)}><Play size={16} fill="currentColor"/> Play {def.label}<ArrowUpRight size={17}/></button>
          {onOpenModifiers && <button className="v-modifier-button" onClick={onOpenModifiers}><Zap size={14}/>{modifierMultiplier > 1 ? modifierMultiplier.toFixed(2) + "× modifiers" : "Customize rules"}</button>}</div>
        <div className="v-featured-best"><span>{mode === "practice" ? "Unranked · no currency or XP" : "Your personal best"}</span>{mode !== "practice" && <strong>{(scores[0]?.score ?? 0).toLocaleString()} <small>pts</small></strong>}</div>
      </div>
      <div className="v-featured-art" aria-hidden="true"><ModeArtwork mode={mode}/><span className="v-art-caption">VECTOR / {def.label.toUpperCase()}</span></div>
    </section>

    <div className="v-home-metrics">
      <div><Layers size={17}/><span>Runs played<strong>{stats.runs.toLocaleString()}</strong></span></div>
      <div><Flame size={17}/><span>Best streak<strong>{stats.bestStreak.toLocaleString()}<small>×</small></strong></span></div>
      <div><Zap size={17}/><span>Fastest reaction<strong>{stats.fastestMs > 0 && stats.fastestMs < 9999 ? stats.fastestMs.toLocaleString() : "—"}{stats.fastestMs > 0 && stats.fastestMs < 9999 && <small>ms</small>}</strong></span></div>
      {onLeaderboard && <button onClick={onLeaderboard}><Trophy size={17}/><span>Chase your next place<strong>Scoreboard <ArrowUpRight size={14}/></strong></span></button>}
    </div>

    <section className="v-mode-library">
      <div className="v-section-heading"><div><p className="v-eyebrow">SOMETHING FOR EVERY PACE</p><h2>How do you want to play?</h2><p>Twelve ways to find your rhythm. Heart the ones you keep coming back to.</p></div>
        <label className="v-search"><Search size={16}/><input aria-label="Search game modes" placeholder="Find your mode…" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
      <SegmentedTabs<ModeCollection> label="Mode collections" value={collection} onChange={setCollection} panelId="home-mode-results" className="v-category-tabs" options={[
        { id: "all", label: "All modes" }, { id: "quick", label: "Arcade & speed" }, { id: "focus", label: "Learn & focus" },
        { id: "together", label: "Play together" }, { id: "challenges", label: "Challenges" }, { id: "favorites", label: "Favorites", icon: <Heart size={14}/>, count: favorites.length },
      ]}/>
      <div id="home-mode-results" role="tabpanel" aria-label="Available game modes">
        {visibleModes.length ? <div className="v-mode-grid">{visibleModes.map(value => <article className={"v-mode-card " + (mode === value ? "is-selected" : "")} style={{ "--mode-accent": MODES[value].color } as CSSProperties} key={value}>
          <button className="v-mode-select" aria-label={"Select " + MODES[value].label} aria-pressed={mode === value} onClick={() => selectMode(value)}>
            <div className="v-mode-mini-art" aria-hidden="true"><ModeArtwork mode={value}/></div>
            <span className="v-mode-card-copy"><strong>{MODES[value].label}</strong><small>{MODES[value].tag}</small></span>
            <span className="v-mode-selected" aria-hidden="true">{mode === value ? <Check size={15}/> : <ArrowUpRight size={15}/>}</span>
          </button>
          <button className={"v-mode-favorite " + (favorites.includes(value) ? "is-saved" : "")} onClick={() => toggleFavorite(value)} aria-label={(favorites.includes(value) ? "Remove " : "Save ") + MODES[value].label + (favorites.includes(value) ? " from favorites" : " to favorites")} aria-pressed={favorites.includes(value)}><Heart size={15} fill={favorites.includes(value) ? "currentColor" : "none"}/></button>
        </article>)}</div> : <div className="v-empty"><Heart size={28}/><h3>{collection === "favorites" && !favorites.length ? "Your favorites start here." : "No matching modes."}</h3><p>Use a heart to keep a mode close, or explore the full collection.</p><button className="v-button" onClick={() => { setCollection("all"); setQuery(""); }}>See all modes</button></div>}
      </div>
      {showHints && <div className="v-play-hints"><span><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> or WASD · two keys for a diagonal</span><button className="v-text-button" onClick={onHowToPlay}>New here? Learn the basics <ArrowUpRight size={14}/></button></div>}
    </section>

    <section className="v-home-extras" aria-label="More to explore">
      <div className="v-daily-card"><CalendarDays size={23}/><p className="v-eyebrow">SAME ARROWS. FRESH CHALLENGE.</p><h3>A little friendly competition.</h3><p>Daily and Weekly challenges give everyone the same arrows and fixed rules.</p>
        <div>{(["daily","weekly"] as const).map(value => <button key={value} onClick={() => start(value)}><span>{MODES[value].label}<small>Best {bestScore(value).toLocaleString()} pts · {value === "daily" ? "resets 00:00 UTC" : "current challenge · UTC"}</small></span><ArrowUpRight size={17}/></button>)}</div></div>
      <div className="v-explore-stack">
        {onMissions && <button onClick={onMissions}><Target size={22}/><span><strong>Little goals. Real progress.</strong><small>Explore daily, weekly and monthly missions.</small></span><ArrowUpRight size={17}/></button>}
        {onStore && <button className="v-hero-discovery" onClick={onStore}><HeroAvatar id="hero-spider" size={44}/><span><strong>A hero for every side of you.</strong><small>Discover Spider-Man and the new character collection.</small></span><ArrowUpRight size={17}/></button>}
        {onStatsOpen && <button onClick={onStatsOpen}><Zap size={22}/><span><strong>{last && lastLabel ? "Last run · " + lastLabel : "See your progress take shape."}</strong><small>{last && lastLabel ? last.score.toLocaleString() + " points" + (Number.isFinite(last.acc) ? " · " + Math.round(last.acc) + "% accuracy" : "") : "Real score, accuracy and reaction trends."}</small></span><ArrowUpRight size={17}/></button>}
      </div>
    </section>
    <footer className="v-home-footer"><span>Less rush. More play.</span><span>Progress is saved on this browser.</span></footer>
  </div>;
}
