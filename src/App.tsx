import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase/config";
import { beginCloudSync, completeCloudSync, queueCloudSave, SAVE_KEYS } from "./firebase/cloudSave";
import { safeStorage as localStorage } from "./game/persistence";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "motion/react";
import { DURATION, EASE, backdropVariants, panelVariants } from "./utils/motion";
import PWAUpdateNotice from "./components/PWAUpdateNotice";
import Dock from "./components/Dock";
import HUD from "./components/HUD";
import WavyBackground from "./components/WavyBackground";
import HomeScreen from "./components/screens/HomeScreen";
const StoreScreen = lazy(() => import("./components/screens/StoreScreen"));
const StatsScreen = lazy(() => import("./components/screens/StatsScreen"));
const SettingsScreen = lazy(() => import("./components/screens/SettingsScreen"));
const ProfileScreen = lazy(() => import("./components/screens/ProfileScreen"));
const LeaderboardScreen = lazy(() => import("./components/screens/LeaderboardScreen"));
import { GameOverOverlay, PauseOverlay, TutorialOverlay, PrepOverlay } from "./components/overlays/Overlays";
import { ModifiersModal } from "./components/ModifiersModal";
import { type GameModifiers, loadModifiers, getModifierMultiplier } from "./game/modifiers";
import { Engine } from "./game/engine";
import { MODES, type DirName, type GameMode, type HudState, type Phase } from "./game/types";
import {
  addScore,
  hasSeenTutorial,
  loadName,
  loadScores,
  loadSettings,
  loadStats,
  markTutorialSeen,
  recordRun,
  saveName,
  saveSettings,
  checkDailyLogin,
  type ScoreEntry,
  type Settings,
  type Stats,
} from "./game/storage";
import type { GameSummary } from "./game/types";
import { TITLES, loadProfile, saveProfile, type Profile } from "./game/profile";
import { submitScore } from "./firebase/leaderboard";
import { loadMissions, updateMissionsProgress } from "./game/missions";
import { STORE_ITEMS } from "./game/catalog";
import { getPlayerLevelProgress } from "./game/levels";
import { useAuth } from "./firebase/auth";

type Screen = "home" | "leaderboard" | "store" | "stats" | "settings" | "profile" | "missions";

const INITIAL_HUD: HudState = {
  score: 0,
  streak: 0,
  combo: 1,
  overdrive: false,
  mark: "none",
  need: [],
  lives: 3,
  coopLives: [2, 2],
  coopReady: [false, false],
  total: null,
  waveStep: 0,
  waveSize: 0,
  versus: null,
  memory: "",
  focusCharges: 3,
  focusActive: false,
  focusFrac: 0,
  focusAvailable: true,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const [phase, setPhase] = useState<Phase>("menu");
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimer = useRef<number | null>(null);
  const [prepMode, setPrepMode] = useState<GameMode | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<GameMode>("arcade");
  const [name, setName] = useState(() => loadName());
  const nameRef = useRef(name);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = settings.reducedMotion || !!systemReducedMotion;
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const profileRef = useRef(profile);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [held, setHeld] = useState<DirName[]>([]);
  const [muted, setMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores("arcade"));
  const [stats, setStats] = useState<Stats>(() => loadStats());
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modifiers, setModifiers] = useState<GameModifiers>(() => loadModifiers());
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const modifiersRef = useRef(modifiers);
  useEffect(() => {
    modifiersRef.current = modifiers;
  }, [modifiers]);

  const { user, loading: authLoading } = useAuth();
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [tempName, setTempName] = useState("");
  const [dailyReward, setDailyReward] = useState<{ sparks: number; diamonds: number; streak: number } | null>(null);

  const statsRef = useRef(stats);

  useEffect(() => {
    if (!cloudLoaded) return;
    const reward = checkDailyLogin(loadStats());
    if (reward) {
      statsRef.current = reward.nextStats; setStats(reward.nextStats);
      setDailyReward({ sparks: reward.rewardSparks, diamonds: reward.rewardDiamonds, streak: reward.nextStats.loginStreak || 1 });
    }
  }, [cloudLoaded]);

  useEffect(() => {
    if (authLoading) return;
    beginCloudSync();
    if (!user) { setCloudLoaded(true); return; }
    setCloudLoaded(false);
    let cancelled = false;
    const baseline = Object.fromEntries(Object.entries(SAVE_KEYS).map(([field, key]) => [field, localStorage.getItem(key)]));
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Cloud restore timed out')), 6000); });
    Promise.race([getDoc(doc(db, 'users', user.uid)), timeout]).then(snap => {
      if (cancelled) return;
      const data = snap.exists() ? snap.data() : {};
      for (const [field, key] of Object.entries(SAVE_KEYS)) {
        if (data[field] == null || baseline[field] !== localStorage.getItem(key) || phaseRef.current !== 'menu') continue;
        const remoteTime = Number(data[field + 'UpdatedAt']) || 0;
        const localTime = Number(localStorage.getItem(key + '_updatedAt')) || 0;
        const legacyIsNewer = !remoteTime && (field !== 'stats' || (data.stats.totalScore ?? 0) >= loadStats().totalScore);
        if (remoteTime < localTime && !legacyIsNewer) continue;
        if (baseline[field]) localStorage.setItem(key + '_before_cloud_restore', baseline[field]);
        localStorage.setItem(key, field === 'operativeName' ? String(data[field]) : JSON.stringify(data[field]));
        localStorage.setItem(key + '_updatedAt', String(remoteTime));
      }
      statsRef.current = loadStats(); profileRef.current = loadProfile(); nameRef.current = loadName();
      setStats(statsRef.current); setProfile(profileRef.current); setSettings(loadSettings()); setName(nameRef.current);
      if (!user.isAnonymous && !data.operativeName && !localStorage.getItem('vector_name_set')) {
        setTempName(user.displayName?.split(' ')[0] || 'Operative'); setShowNamePopup(true);
      }
      completeCloudSync(user.uid);
      const patch: Record<string, unknown> = {};
      for (const [field, key] of Object.entries(SAVE_KEYS)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try { patch[field] = field === 'operativeName' ? raw : JSON.parse(raw); patch[field + 'UpdatedAt'] = Number(localStorage.getItem(key + '_updatedAt')) || Date.now(); } catch {}
        }
      }
      queueCloudSave(patch);
    }).catch(err => {
      if (!cancelled) console.warn('Cloud restore unavailable; local progress is available.', err);
    }).finally(() => { clearTimeout(timer); if (!cancelled) setCloudLoaded(true); });
    return () => { cancelled = true; clearTimeout(timer); beginCloudSync(); };
  }, [user, authLoading]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    nameRef.current = name;
    if (cloudLoaded) saveName(name);
  }, [name, cloudLoaded]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile, cloudLoaded]);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);
  useEffect(() => {
    setScores(loadScores(mode));
  }, [mode]);

  // engine lifecycle (created once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, loadSettings(), {
      onPhase: (next) => { phaseRef.current = next; setPhase(next); if (next !== "playing") setHeld([]); },
      onHud: setHud,
      onOver: (sum) => {
        if (sum.mode === "practice") {
          sum.xpGained = 0; setSummary(sum); setHeld([]); return;
        }
        if (sum.score > 0) {
          addScore(sum.mode, {
            score: sum.score,
            name: nameRef.current.trim().toUpperCase() || "ACE",
            date: new Date().toLocaleDateString(),
          }, sum.challengeId);
        }
        sum.xpGained = sum.score + 50 + Math.max(0, sum.bestStreak - loadStats().bestStreak) * 10;
        recordRun(sum.score, sum.bestStreak, sum.fastestMs, {
          hits: sum.hits, misses: sum.misses, perfectHits: sum.perfectHits, modifierMultiplier: sum.modifierMultiplier, playSeconds: sum.playSeconds,
          avgMs: sum.avgReactionMs, mode: sum.mode, acc: sum.accuracy,
        });
        setScores(loadScores(sum.mode));
        const updatedStats = loadStats();
        setStats(updatedStats);
        
        // Update Missions
        updateMissionsProgress(loadMissions(), { runs: 1, score: sum.score, streak: sum.bestStreak, perfectHits: sum.perfectHits });

        setSummary(sum);
        setHeld([]);

        // Real Data Leaderboard submission
        if (sum.score > 0) {
          const lvl = getPlayerLevelProgress(updatedStats, profileRef.current).currentLevel;
          submitScore(
            {
              mode: sum.mode,
              challengeId: sum.challengeId,
              score: sum.score,
              streak: sum.bestStreak,
              userName: nameRef.current.trim() || "Ace",
              title: TITLES.find(t => t.id === profileRef.current.titleId)?.name ?? "Operative",
              avatarId: profileRef.current.avatarId,
              frameId: profileRef.current.frameId,
              useGooglePfp: profileRef.current.useGooglePfp,
              level: lvl,
            },
            undefined,
            undefined,
            undefined,
            profileRef.current
          ).catch((err) => {
            console.warn("Could not submit score to cloud leaderboard:", err);
          });
        }
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // settings persistence + live engine config
  useEffect(() => {
    if (cloudLoaded) saveSettings(settings);
    engineRef.current?.configure({ ...settings, reducedMotion: reduceMotion });
    document.documentElement.setAttribute("data-theme", settings.uiMode || "dark");
    document.documentElement.setAttribute("data-color", settings.colorway || "cobalt");
    document.documentElement.setAttribute("data-text-size", settings.textSize || "medium");
    if (reduceMotion) {
      document.documentElement.classList.add("reduce-game-motion");
    } else {
      document.documentElement.classList.remove("reduce-game-motion");
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", settings.uiMode === "light" ? "#f6f6f8" : "#121418");
    }
  }, [settings, cloudLoaded, reduceMotion]);

  useEffect(() => {
    profileRef.current = profile;
    if (cloudLoaded) saveProfile(profile);
    engineRef.current?.setAudioPack(profile.audioPackId);
    engineRef.current?.setArenaTheme(STORE_ITEMS.find(item => item.id === profile.arenaThemeId && profile.purchased.includes(item.id))?.themeSwatch);
  }, [profile, cloudLoaded]);

  const updateProfile = useCallback((p: Profile) => setProfile(p), []);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const best = scores[0]?.score ?? 0;

  const toggleFullscreen = useCallback(async () => {
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;

      const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
      const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

      if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        if (requestFullScreen) await requestFullScreen.call(docEl);
      } else {
        if (cancelFullScreen) await cancelFullScreen.call(doc);
      }
    } catch (err) {
      console.warn("Fullscreen request failed", err);
    }
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownTimer.current !== null) window.clearInterval(countdownTimer.current);
    countdownTimer.current = null; setCountdown(null);
  }, []);
  useEffect(() => () => {
    if (countdownTimer.current !== null) window.clearInterval(countdownTimer.current);
  }, []);
  const start = useCallback((m?: unknown) => {
    const engine = engineRef.current;
    if (!engine) return;
    stopCountdown();
    const isGameMode = (v: unknown): v is GameMode => typeof v === "string" && v in MODES;
    const nextMode: GameMode = isGameMode(m) ? m : (isGameMode(modeRef.current) ? modeRef.current : "arcade");
    modeRef.current = nextMode;
    setMode(nextMode);
    setSummary(null);
    const nextModifiers = { ...modifiersRef.current };
    engine.toMenu();
    engine.sound.ensure();
    engine.sound.click();
    phaseRef.current = 'countdown';
    setPhase('countdown');
    setCountdown(3);
    let remaining = 3;
    countdownTimer.current = window.setInterval(() => {
      remaining--;
      if (remaining > 0) {
        setCountdown(remaining);
        engine.sound.click();
      } else {
        stopCountdown();
        engine.startGame(nextMode, nextModifiers);
      }
    }, 1000);
  }, [stopCountdown]);

  const modeRef = useRef(mode);
  const tutorialMode = useRef<GameMode | null>(null);
  const tutorialStarts = useRef(false);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const play = useCallback(
    (m?: GameMode) => {
      const mode = m ?? modeRef.current;
      modeRef.current = mode;
      setPrepMode(mode);
    },
    []
  );

  const confirmPlay = useCallback(
    (m?: GameMode) => {
      const mode = m ?? prepMode ?? modeRef.current;
      setPrepMode(null);
      if (!hasSeenTutorial()) {
        tutorialMode.current = mode;
        tutorialStarts.current = true;
        setShowTutorial(true);
        return;
      }
      if (settings.confirmPlay && !window.confirm(`Start ${MODES[mode].label}?`)) return;
      start(mode);
    },
    [prepMode, start, settings.confirmPlay]
  );

  const finishTutorial = useCallback(() => {
    markTutorialSeen();
    setShowTutorial(false);
    if (tutorialStarts.current && tutorialMode.current) {
      start(tutorialMode.current);
      tutorialMode.current = null;
      tutorialStarts.current = false;
    }
  }, [start]);

  const howTo = useCallback(() => {
    tutorialMode.current = null;
    tutorialStarts.current = false;
    setShowTutorial(true);
  }, []);

  const goHome = useCallback(() => {
    stopCountdown();
    engineRef.current?.toMenu();
    setScores(loadScores(modeRef.current));
    setSummary(null);
    setScreen("home");
    setPhase("menu");
  }, [stopCountdown]);

  useEffect(() => {
    const cancelIfHidden = () => { if (phaseRef.current === "countdown") goHome(); };
    const onVisibility = () => { if (document.hidden) cancelIfHidden(); };
    window.addEventListener("blur", cancelIfHidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("blur", cancelIfHidden); document.removeEventListener("visibilitychange", onVisibility); };
  }, [goHome]);

  const togglePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.sound.click();
    if (phaseRef.current === "playing") {
      engine.pause();
      setPhase("paused");
    } else if (phaseRef.current === "paused") {
      engine.resume();
      setPhase("playing");
    }
  }, []);

  const onMute = useCallback(() => {
    setMuted((v) => {
      engineRef.current?.sound.setMuted(!v);
      return !v;
    });
  }, []);

  const onMusic = useCallback(() => {
    setMusicMuted((v) => {
      engineRef.current?.sound.setMusicMuted(!v);
      return !v;
    });
  }, []);

  const onFocus = useCallback(() => {
    engineRef.current?.triggerFocus();
  }, []);

  const onDir = useCallback((d: DirName) => {
    engineRef.current?.pressDir(d);
    setHeld((h) => (h.includes(d) ? h : [...h, d]));
  }, []);

  const onReleaseDir = useCallback((d: DirName) => {
    engineRef.current?.releaseDir(d);
    setHeld((h) => h.filter((x) => x !== d));
  }, []);

  const share = useCallback(async () => {
    if (!summary) return;
    const text = `I scored ${summary.score.toLocaleString()} in VECTOR (${MODES[summary.mode].label}) — ${summary.accuracy}% accuracy, ${summary.bestStreak} best streak. Can you beat it?`;
    try {
      if (navigator.share) await navigator.share({ title: "VECTOR", text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* dismissed */
    }
  }, [summary]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (phaseRef.current === "countdown" && e.key === "Escape") { e.preventDefault(); goHome(); return; }
      if (showTutorial || prepMode || dailyReward || showNamePopup || showModifiersModal) return;
      const k = e.key;
      if ((k === "p" || k === "P" || k === "Escape") && (phaseRef.current === "playing" || phaseRef.current === "paused")) {
        togglePause();
      } else if (k === "m" || k === "M") {
        onMute();
      } else if ((k === "Enter" || k === " ") && phaseRef.current === "menu" && screen === "home" && !target?.closest("button, summary, a")) {
        e.preventDefault();
        play();
      } else if ((k === "Enter" || k === " ") && phaseRef.current === "over" && !target?.closest("button")) {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start, play, togglePause, onMute, showTutorial, screen, prepMode, dailyReward, showNamePopup, showModifiersModal, goHome]);

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "never"} transition={{ duration: .2, ease: [.22, 1, .36, 1] }}>
    <div
      data-theme={settings.uiMode}
      data-color={settings.colorway}
      data-text-size={settings.textSize || "medium"}
      className={`app-shell relative h-[100dvh] w-full select-none overflow-hidden ${
        settings.largeUi ? "large-game-ui" : ""
      } ${settings.highContrast ? "high-contrast-game" : ""} ${reduceMotion ? "reduce-game-motion" : ""} ${settings.compactHud ? "compact-hud" : ""} ${settings.colorBlind ? "color-blind" : ""}`}
    >
      <canvas ref={canvasRef} className={`game-canvas ${phase === "menu" ? "is-idle" : ""}`} />

      {phase === "menu" && <PWAUpdateNotice />}
      {/* ---------- menu ---------- */}
      {phase === "menu" && (
        <>
          <div className="absolute inset-0 z-[1] overflow-hidden">
            <WavyBackground />
          </div>
          <div className="menu-shell">
            <div className="menu-content">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={screen}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: DURATION.base, ease: EASE.out }}
                  className="w-full min-h-full"
                >
                  <Suspense fallback={<p className="t-caption p-8" role="status">Opening…</p>}>
                  {screen === "home" ? (
                    <HomeScreen
                      keyboardEnabled={!prepMode && !showTutorial && !dailyReward && !showNamePopup && !showModifiersModal}
                      mode={mode}
                      onMode={setMode}
                      name={name}
                      scores={scores}
                      stats={stats}
                      onUpdateStats={setStats}
                      profile={profile}
                      onPlay={play}
                      onHowToPlay={howTo}
                      reducedMotion={reduceMotion}
                      showHints={settings.showHints}
                      onFullscreen={toggleFullscreen}
                      onProfile={() => setScreen("profile")}
                      onLeaderboard={() => setScreen("leaderboard")}
                      onMissions={() => setScreen("missions")}
                      onUpdateProfile={updateProfile}
                      settings={settings}
                      modifiers={modifiers}
                      modifierMultiplier={mode === "practice" || mode === "daily" || mode === "weekly" ? 1 : getModifierMultiplier(modifiers)}
                      onOpenModifiers={mode === "practice" || mode === "daily" || mode === "weekly" ? undefined : () => setShowModifiersModal(true)}
                    />
                  ) : screen === "leaderboard" ? (
                    <LeaderboardScreen
                      initialMode={mode}
                      onSelectMode={(m) => {
                        setMode(m);
                        setScreen("home");
                      }}
                    />
                  ) : screen === "missions" ? (
                    <ProfileScreen
                      key="missions"
                      initialTab="tasks"
                      profile={profile}
                      onProfile={updateProfile}
                      stats={stats}
                      onStats={setStats}
                      name={name}
                      onNameChange={setName}
                      onBack={() => setScreen("home")}
                      onOpenStore={() => setScreen("store")}
                    />
                  ) : screen === "profile" ? (
                    <ProfileScreen
                      key="profile"
                      initialTab="vault"
                      profile={profile}
                      onProfile={updateProfile}
                      stats={stats}
                      onStats={setStats}
                      name={name}
                      onNameChange={setName}
                      onBack={() => setScreen("home")}
                      onOpenStore={() => setScreen("store")}
                    />
                  ) : screen === "store" ? (
                    <StoreScreen stats={stats} onStats={setStats} profile={profile} onProfile={updateProfile} />
                  ) : screen === "stats" ? (
                    <StatsScreen reducedMotion={reduceMotion} stats={stats} onLeaderboard={() => setScreen("leaderboard")} />
                  ) : (
                    <SettingsScreen settings={settings} onChange={updateSetting} onBack={() => setScreen("home")} />
                  )}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <Dock active={screen === "missions" ? "profile" : screen} onChange={setScreen} />
        </>
      )}

      {/* ---------- in-game HUD ---------- */}
      {(phase === "playing" || phase === "paused") && (
        <HUD
          hud={hud}
          mode={mode}
          phase={phase}
          best={best}
          held={held}
          settings={settings}
          muted={muted}
          musicMuted={musicMuted}
          onFinishPractice={() => engineRef.current?.finishPractice()}
          onPause={togglePause}
          onMute={onMute}
          onMusic={onMusic}
          onFocus={onFocus}
          onDir={onDir}
          onReleaseDir={onReleaseDir}
        />
      )}

      {phase === "countdown" && countdown !== null && (
        <div className="start-countdown fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-slate-950 text-white" role="dialog" aria-modal="true" aria-label="Get ready">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-white/55">
            Get ready · {MODES[mode]?.label ?? "Arcade"}
          </p>
          <div key={countdown} className="countdown-number" role="status" aria-live="assertive" aria-atomic="true">{countdown}</div>
          <p className="max-w-[34ch] text-center text-[13px] leading-relaxed text-white/60">
            {mode === "coop"
              ? "Player 1 uses WASD. Player 2 uses the arrow keys."
              : mode === "practice"
                ? "No timer here. Learn the patterns at your own pace."
                : "Arrow keys, WASD, tap or swipe."}
          </p>
          <button className="text-button text-white/70" onClick={goHome}>Cancel</button>
        </div>
      )}
      {/* prep menu */}
      <AnimatePresence>
        {prepMode && phase === "menu" && (
          <PrepOverlay
            mode={prepMode}
            profile={profile}
            onUpdateProfile={updateProfile}
            stats={stats}
            onUpdateStats={setStats}
            onStart={() => confirmPlay()}
            onCancel={() => setPrepMode(null)}
            settings={settings}
            modifierMultiplier={mode === "practice" || mode === "daily" || mode === "weekly" ? 1 : getModifierMultiplier(modifiers)}
            onOpenModifiers={mode === "practice" || mode === "daily" || mode === "weekly" ? undefined : () => setShowModifiersModal(true)}
          />
        )}
      </AnimatePresence>

      {/* first-run tutorial */}
      <AnimatePresence>
        {showTutorial && <TutorialOverlay onDone={finishTutorial} />}
      </AnimatePresence>

      {/* ---------- pause ---------- */}
      <AnimatePresence>
        {phase === "paused" && (
          <PauseOverlay
            score={hud.score}
            mode={mode}
            onFinishPractice={() => engineRef.current?.finishPractice()}
            onResume={togglePause}
            onRestart={() => start(mode)}
            onHome={goHome}
          />
        )}
      </AnimatePresence>

      {/* ---------- game over ---------- */}
      <AnimatePresence>
        {phase === "over" && summary && (
          <GameOverOverlay
            summary={summary}
            stats={stats}
            profile={profile}
            onAgain={() => start(summary.mode)}
            onHome={goHome}
            onShare={share}
            shared={copied}
          />
        )}
      </AnimatePresence>

      {/* ---------- name popup ---------- */}
      <AnimatePresence>
        {showNamePopup && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="surface-backdrop fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-popup-title"
          >
            <motion.div variants={panelVariants} className="surface-card w-full max-w-[380px] p-6">
              <p className="t-eyebrow">Global leaderboard</p>
              <h2 id="name-popup-title" className="t-title mt-1">Choose a code name</h2>
              <p className="t-body mt-2">
                This is what appears on global rankings. You can change it later from your profile.
              </p>

              <label className="mt-5 block">
                <span className="t-caption">Code name</span>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Operative"
                  maxLength={15}
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-[14px] font-medium txt outline-none transition-colors focus:border-[var(--brand)]"
                  style={{ background: "var(--pill)", borderColor: "var(--panel-border)" }}
                />
              </label>

              <div className="dialog-actions mt-5">
                <button
                  className="dialog-btn dialog-btn-primary"
                  onClick={() => {
                    const finalName = tempName.trim() || "Operative";
                    setName(finalName);
                    localStorage.setItem("vector_name_set", "true");
                    setShowNamePopup(false);
                  }}
                >
                  Save name
                </button>
                <button
                  className="dialog-btn dialog-btn-quiet"
                  onClick={() => {
                    localStorage.setItem("vector_name_set", "true");
                    setShowNamePopup(false);
                  }}
                >
                  Keep my Google name
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- daily reward popup ---------- */}
      <AnimatePresence>
        {dailyReward && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="surface-backdrop fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-reward-title"
          >
            <motion.div variants={panelVariants} className="surface-card w-full max-w-[360px] p-6 text-center">
              <p className="t-eyebrow">Daily check-in</p>
              <h2 id="daily-reward-title" className="t-title mt-1">Day {dailyReward.streak} reward</h2>
              <p className="t-body mt-1.5">Keep the streak going for bigger drops.</p>

              <div className="mt-5 flex items-center justify-center gap-3">
                {dailyReward.sparks > 0 && (
                  <div className="min-w-[96px] rounded-2xl border px-4 py-3" style={{ borderColor: "var(--panel-border)", background: "var(--pill)" }}>
                    <div className="num text-[22px] font-semibold" style={{ color: "var(--brand)" }}>
                      +{dailyReward.sparks}
                    </div>
                    <div className="t-caption mt-0.5">Sparks</div>
                  </div>
                )}
                {dailyReward.diamonds > 0 && (
                  <div className="min-w-[96px] rounded-2xl border px-4 py-3" style={{ borderColor: "var(--panel-border)", background: "var(--pill)" }}>
                    <div className="num text-[22px] font-semibold txt">+{dailyReward.diamonds}</div>
                    <div className="t-caption mt-0.5">Diamonds</div>
                  </div>
                )}
              </div>

              <div className="dialog-actions mt-6">
                <button className="dialog-btn dialog-btn-primary" onClick={() => setDailyReward(null)}>
                  Claim reward
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {user && !cloudLoaded && phase === "menu" && (
        <div role="status" className="surface-backdrop fixed inset-0 z-[250] grid place-items-center">
          <p className="t-body">Restoring your progress…</p>
        </div>
      )}
      <ModifiersModal
        isOpen={showModifiersModal}
        onClose={() => setShowModifiersModal(false)}
        modifiers={modifiers}
        onChange={setModifiers}
      />
    </div>
    </MotionConfig>
  );
}
