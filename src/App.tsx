import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase/config";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Dock from "./components/Dock";
import HUD from "./components/HUD";
import WavyBackground from "./components/WavyBackground";
import HomeScreen from "./components/screens/HomeScreen";
import StoreScreen from "./components/screens/StoreScreen";
import StatsScreen from "./components/screens/StatsScreen";
import SettingsScreen from "./components/screens/SettingsScreen";
import ProfileScreen from "./components/screens/ProfileScreen";
import LeaderboardScreen from "./components/screens/LeaderboardScreen";
import MissionsScreen from "./components/screens/MissionsScreen";
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
import { loadProfile, saveProfile, type Profile } from "./game/profile";
import { submitScore } from "./firebase/leaderboard";
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
  const [prepMode, setPrepMode] = useState<GameMode | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<GameMode>("arcade");
  const [name, setName] = useState(() => loadName());
  const nameRef = useRef(name);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
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

  const { user } = useAuth();
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [tempName, setTempName] = useState("");
  const [dailyReward, setDailyReward] = useState<{ sparks: number; diamonds: number; streak: number } | null>(null);

  const statsRef = useRef(stats);

  useEffect(() => {
    // Check daily login
    const reward = checkDailyLogin(stats);
    if (reward) {
      setStats(reward.nextStats);
      setDailyReward({ sparks: reward.rewardSparks, diamonds: reward.rewardDiamonds, streak: reward.nextStats.loginStreak || 1 });
    }
  }, []);

  useEffect(() => {
    if (user && !localStorage.getItem("vector_name_set")) {
      setTempName(user.displayName?.split(" ")[0] || "Operative");
      setShowNamePopup(true);
    }
    
    // Cloud Save Sync
    if (user) {
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.stats && data.stats.totalScore > (statsRef.current.totalScore || 0)) {
            setStats(data.stats);
            localStorage.setItem("vector_stats_v2", JSON.stringify(data.stats));
          }
          if (data.profile) {
            setProfile(data.profile);
            localStorage.setItem("vector_profile_v5", JSON.stringify(data.profile));
          }
          if (data.settings) {
            setSettings(data.settings);
            localStorage.setItem("vector_settings", JSON.stringify(data.settings));
          }
          if (data.missions) {
            localStorage.setItem("vector_missions_v1", JSON.stringify(data.missions));
          }
          if (data.operativeName) {
            setName(data.operativeName);
            localStorage.setItem("vector_name", data.operativeName);
          }
        }
      }).catch(console.warn);
    }
  }, [user]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    nameRef.current = name;
    saveName(name);
  }, [name]);
  useEffect(() => {
    profileRef.current = profile;
    saveProfile(profile);
  }, [profile]);
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
      onPhase: setPhase,
      onHud: setHud,
      onOver: (sum) => {
        if (sum.score > 0) {
          addScore(sum.mode, {
            score: sum.score,
            name: nameRef.current.trim().toUpperCase() || "ACE",
            date: new Date().toLocaleDateString(),
          });
        }
        recordRun(sum.score, sum.bestStreak, sum.fastestMs, {
          hits: sum.hits, misses: sum.misses, playSeconds: sum.playSeconds,
          avgMs: sum.avgReactionMs, mode: sum.mode, acc: sum.accuracy,
        });
        setScores(loadScores(sum.mode));
        const updatedStats = loadStats();
        setStats(updatedStats);
        
        // Update Missions
        import("./game/missions").then((m) => {
          m.updateMissionsProgress(m.loadMissions(), {
            runs: 1,
            score: sum.score,
            streak: sum.bestStreak,
            perfectHits: sum.hits, // Simplification for perfect hits
          });
        });

        setSummary(sum);
        setHeld([]);

        // Real Data Leaderboard submission
        if (sum.score > 0) {
          const lvl = getPlayerLevelProgress(updatedStats, profileRef.current).currentLevel;
          submitScore(
            {
              mode: sum.mode,
              score: sum.score,
              streak: sum.bestStreak,
              userName: nameRef.current.trim() || "Ace",
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
    saveSettings(settings);
    engineRef.current?.configure(settings);
    document.documentElement.setAttribute("data-theme", settings.uiMode || "dark");
    document.documentElement.setAttribute("data-color", settings.colorway || "cobalt");
    document.documentElement.setAttribute("data-text-size", settings.textSize || "medium");
    if (settings.reducedMotion) {
      document.documentElement.classList.add("reduce-game-motion");
    } else {
      document.documentElement.classList.remove("reduce-game-motion");
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", settings.uiMode === "light" ? "#f6f6f8" : "#121418");
    }
  }, [settings]);

  useEffect(() => {
    profileRef.current = profile;
    saveProfile(profile);
    engineRef.current?.setAudioPack(profile.audioPackId);
  }, [profile]);

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

  const start = useCallback((m?: GameMode) => {
    const engine = engineRef.current;
    if (!engine) return;
    const mode = m ?? modeRef.current;
    modeRef.current = mode;
    setMode(mode);
    engine.sound.ensure();
    engine.sound.click();
    engine.startGame(mode, modifiersRef.current);
    setPhase("playing");
  }, []);

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
    engineRef.current?.toMenu();
    setScores(loadScores(modeRef.current));
    setScreen("home");
    setPhase("menu");
  }, []);

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
      if (showTutorial) return;
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
  }, [start, play, togglePause, onMute, showTutorial, screen]);

  return (
    <div
      data-theme={settings.uiMode}
      data-color={settings.colorway}
      data-text-size={settings.textSize || "medium"}
      className={`app-shell relative h-[100dvh] w-full select-none overflow-hidden ${
        settings.largeUi ? "large-game-ui" : ""
      } ${settings.highContrast ? "high-contrast-game" : ""} ${settings.reducedMotion ? "reduce-game-motion" : ""} ${settings.compactHud ? "compact-hud" : ""} ${settings.colorBlind ? "color-blind" : ""}`}
    >
      <canvas ref={canvasRef} className={`game-canvas ${phase === "menu" ? "is-idle" : ""}`} />

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
                  initial={settings.reducedMotion ? false : { opacity: 0, y: 14, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={settings.reducedMotion ? undefined : { opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full min-h-full"
                >
                  {screen === "home" ? (
                    <HomeScreen
                      mode={mode}
                      onMode={setMode}
                      name={name}
                      scores={scores}
                      stats={stats}
                      onUpdateStats={setStats}
                      profile={profile}
                      onPlay={play}
                      onHowToPlay={howTo}
                      reducedMotion={settings.reducedMotion}
                      showHints={settings.showHints}
                      onFullscreen={toggleFullscreen}
                      onProfile={() => setScreen("profile")}
                      onLeaderboard={() => setScreen("leaderboard")}
                      onMissions={() => setScreen("missions")}
                      onUpdateProfile={updateProfile}
                      settings={settings}
                      modifiers={modifiers}
                      modifierMultiplier={getModifierMultiplier(modifiers)}
                      onOpenModifiers={() => setShowModifiersModal(true)}
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
                    <MissionsScreen
                      profile={profile}
                      onUpdateProfile={updateProfile}
                      stats={stats}
                      onUpdateStats={setStats}
                      onPlay={() => {
                        setScreen("home");
                        play();
                      }}
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
                    <StatsScreen stats={stats} onLeaderboard={() => setScreen("leaderboard")} />
                  ) : (
                    <SettingsScreen settings={settings} onChange={updateSetting} onBack={() => setScreen("home")} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <Dock active={screen} onChange={setScreen} />
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
          onPause={togglePause}
          onMute={onMute}
          onMusic={onMusic}
          onFocus={onFocus}
          onDir={onDir}
          onReleaseDir={onReleaseDir}
        />
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
            modifierMultiplier={getModifierMultiplier(modifiers)}
            onOpenModifiers={() => setShowModifiersModal(true)}
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
            onResume={togglePause}
            onRestart={start}
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
            onAgain={start}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl flex flex-col"
            >
              <h2 className="text-2xl font-black text-white m-0 mb-2">Welcome!</h2>
              <p className="text-sm text-white/70 mb-4">
                Choose a code name for the global leaderboard, or continue with your Google name.
              </p>
              
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Operative Name"
                maxLength={15}
                className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white font-bold mb-6 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />

              <button
                onClick={() => {
                  const finalName = tempName.trim() || "Operative";
                  setName(finalName);
                  localStorage.setItem("vector_name_set", "true");
                  setShowNamePopup(false);
                }}
                className="w-full px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition"
              >
                Save Name & Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- daily reward popup ---------- */}
      <AnimatePresence>
        {dailyReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-slate-900 border border-white/20 rounded-3xl p-8 max-w-sm w-full relative shadow-[0_0_40px_rgba(56,189,248,0.2)] flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 m-0 mb-1">Daily Reward!</h2>
              <p className="text-sm font-semibold text-white/60 mb-6 uppercase tracking-widest">
                Day {dailyReward.streak} Streak
              </p>
              
              <div className="flex gap-4 mb-8">
                {dailyReward.sparks > 0 && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.3)] mb-2">
                      <span className="text-cyan-400 font-black text-2xl">+{dailyReward.sparks}</span>
                    </div>
                    <span className="text-xs font-bold text-cyan-300">Sparks</span>
                  </div>
                )}
                {dailyReward.diamonds > 0 && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] mb-2">
                      <span className="text-amber-400 font-black text-2xl">+{dailyReward.diamonds}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-300">Diamonds</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setDailyReward(null)}
                className="w-full px-4 py-4 rounded-xl bg-white hover:bg-gray-200 text-black font-black text-lg shadow-[0_0_15px_rgba(255,255,255,0.2)] transition"
              >
                Claim
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModifiersModal
        isOpen={showModifiersModal}
        onClose={() => setShowModifiersModal(false)}
        modifiers={modifiers}
        onChange={setModifiers}
      />
    </div>
  );
}
