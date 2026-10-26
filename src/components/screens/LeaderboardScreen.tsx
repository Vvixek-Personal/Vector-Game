import { useEffect, useMemo, useState } from "react";
import { Trophy, Crown, Medal, Globe2, Monitor, RefreshCw, Search, ArrowUpRight, Target, Clock3, ChevronLeft, ChevronRight, WifiOff, X, Flame } from "lucide-react";
import { subscribeToLeaderboard, type LeaderboardRecord } from "../../firebase/leaderboard";
import { useAuth } from "../../firebase/auth";
import { DEFAULT_PROFILE, type Profile } from "../../game/profile";
import { MODES, type GameMode } from "../../game/types";
import { getDailyId, getWeeklyId, loadScores, type Stats } from "../../game/storage";
import { BOARD_MODES, challengeWindow, deviceScoreRows, pointsToNextPlace, rankRecords, recordDate, remainingTime, validBoardMode, type BoardMode } from "../../game/scoreboard";
import { uiTap } from "../../game/haptics";
import Avatar from "../Avatar";
import RoleBadge from "../RoleBadge";
import AppHeader from "../AppHeader";
import GoogleAuthButton from "../GoogleAuthButton";
import SegmentedTabs from "../shared/SegmentedTabs";
import Modal from "../shared/Modal";
import "../../collection.css";

interface Props { initialMode?: string; stats: Stats; onSelectMode?: (mode: GameMode) => void }
function visibleRole(record:LeaderboardRecord){return record.role==="developer"&&!record.ownerAccount&&!(Number(record.developerUntil)>Date.now())?"player":record.role||"player";}
function PlayerAvatar({ record, size = 36 }: { record: LeaderboardRecord; size?: number }) {
  const [failed, setFailed] = useState(false);
  const profile: Profile = { ...DEFAULT_PROFILE, avatarId: record.avatarId || "spark", frameId: record.frameId || "none" };
  if (visibleRole(record)==="developer" && record.useGooglePfp && record.userPhoto && !failed) return <img className="v-player-photo" src={record.userPhoto} width={size} height={size} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>;
  return <Avatar profile={profile} name={record.userName} size={size}/>;
}

export default function LeaderboardScreen({ initialMode = "overall", stats, onSelectMode }: Props) {
  const [scope, setScope] = useState<"global" | "device">("global");
  const [mode, setMode] = useState<BoardMode>(() => validBoardMode(initialMode));
  const [snapshot, setSnapshot] = useState<{ key: string; records: LeaderboardRecord[]; cached: boolean } | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [viewing, setViewing] = useState<LeaderboardRecord | null>(null);
  const [now, setNow] = useState(Date.now());
  const [online, setOnline] = useState(navigator.onLine);
  const { user } = useAuth();
  const bucket = mode === "daily" ? "daily_" + getDailyId() : mode === "weekly" ? "weekly_" + getWeeklyId() : mode;
  const boardLabel = mode === "overall" ? "Overall" : MODES[mode].label;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { clearInterval(timer); window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    if (scope !== "global") return;
    let active = true;
    setLoading(true); setError(false); setSnapshot(null);
    const unsubscribe = subscribeToLeaderboard(bucket, (entries, metadata) => {
      if (!active) return;
      setSnapshot({ key: bucket, records: entries, cached: !!metadata?.fromCache });
      setLoading(false); setError(false);
    }, () => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; unsubscribe(); };
  }, [bucket, retry, scope]);
  useEffect(() => { setPage(0); setQuery(""); }, [mode, scope]);
  useEffect(() => { setViewing(null); }, [bucket, scope]);

  const records = useMemo(() => rankRecords(snapshot?.key === bucket ? snapshot.records : []), [snapshot, bucket]);
  const device = useMemo(() => deviceScoreRows(mode, loadScores), [mode, bucket, stats]);
  const terms = query.trim().toLocaleLowerCase();
  const filtered = records.filter(record => [record.userName, record.title].join(" ").toLocaleLowerCase().includes(terms));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const self = records.find(record => record.userId === user?.uid);
  const nextPlace = pointsToNextPlace(records, user?.uid);
  const windowInfo = challengeWindow(mode, now);
  const cached = snapshot?.key === bucket && snapshot.cached;
  const localBest = mode === "overall" ? device.reduce((sum, row) => sum + row.score, 0) : device[0]?.score ?? 0;
  const chosenMode = mode === "overall" ? "arcade" : mode;
  const status = !online ? "Offline" : error ? "Connection unavailable" : loading ? "Connecting" : cached ? "Cached snapshot" : "Live snapshot";
  const setBoard = (value: string) => { uiTap(); setMode(validBoardMode(value)); };
  const findSelf = () => {
    if (!self) return;
    setQuery(""); setPage(Math.floor(records.indexOf(self) / pageSize));
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-current-player="true"] button')?.focus());
  };

  return <div className="collection-page v-scoreboard">
    <AppHeader title="Scoreboard" subtitle="Small gains. New personal bests."/>
    <section className="v-board-hero">
      <div><p className="v-eyebrow"><Trophy size={13}/> THE NEXT BEST IS YOURS</p><h1>One more run.<br/>One place higher<span>.</span></h1>
        <p>Compare your best, find your next target, and keep the momentum going.</p></div>
      <div className="v-board-summary">
        <div><span>{scope === "device" ? mode === "overall" ? "Combined device bests" : "Your device best" : "Your place in this snapshot"}</span>
          <strong>{scope === "device" ? localBest.toLocaleString() : self ? "#" + self.rank : "—"}</strong>
          <small>{scope === "device" ? "Saved on this browser" : self ? self.score.toLocaleString() + " points" : user ? "No place in the loaded top 50" : "Sign in to publish future bests"}</small></div>
        <Target size={35}/>
        {onSelectMode && <button className="v-text-button" onClick={() => onSelectMode(chosenMode)}>Go to {MODES[chosenMode].label} <ArrowUpRight size={15}/></button>}
      </div>
    </section>

    <div className="v-board-controls">
      <SegmentedTabs<"global" | "device"> label="Scoreboard source" value={scope} onChange={setScope} panelId="scoreboard-panel" className="v-primary-tabs" options={[
        { id: "global", label: "Global rankings", icon: <Globe2 size={16}/> }, { id: "device", label: "On this device", icon: <Monitor size={16}/> },
      ]}/>
      <label className="v-select"><span>Game mode</span><select aria-label="Scoreboard game mode" value={mode} onChange={event => setBoard(event.target.value)}>
        {BOARD_MODES.map(value => <option key={value} value={value}>{value === "overall" ? "Overall · all modes" : MODES[value].label}</option>)}
      </select></label>
    </div>
    <div className="v-board-context">
      <div className="v-quick-modes" aria-label="Quick boards">{["overall", "daily", "weekly", "arcade"].map(value => <button key={value} aria-pressed={mode === value} onClick={() => setBoard(value)}>{value === "overall" ? "Overall" : MODES[value].label}</button>)}</div>
      {windowInfo ? <span className="v-reset"><Clock3 size={14}/><span>{remainingTime(windowInfo.resetsAt, now)} left <small>{windowInfo.label}</small></span></span> : <span className="v-footnote">All-time bests · no scheduled reset</span>}
    </div>
    <section id="scoreboard-panel" role="tabpanel" aria-label={scope === "global" ? "Global rankings" : "Device scores"}>
      {scope === "global" ? <>
        {!user && <div className="v-signin-note"><div><Globe2 size={20}/><p><strong>Your next best can go global.</strong><span>Sign in to publish new personal bests. Device scores are always available.</span></p></div><GoogleAuthButton compact/></div>}
        <div className="v-board-toolbar"><div className={"v-live-status " + (error || !online || cached ? "is-muted" : "")}><i/>{status}<span>· top {records.length || 50}</span></div>
          <button className="v-text-button" onClick={() => { setRetry(value => value + 1); }} disabled={loading || !online}><RefreshCw size={14} className={loading ? "v-spin" : ""}/> Refresh rankings</button></div>
        {(error || !online || cached) && <div className="v-connection-note" role="status"><WifiOff size={18}/><div><strong>{!online ? "You’re offline." : error ? "The global board couldn’t connect." : "Waiting for a fresh online snapshot."}</strong><p>{records.length ? "These are the last received standings. Places may have changed." : "No fresh rankings are available. Your device scores are ready below."}</p></div><button className="v-text-button" onClick={() => setScope("device")}>View device scores <ArrowUpRight size={14}/></button></div>}

        {!query && records.length > 0 && <div className="v-podium" aria-label="Top three players">{records.slice(0,3).map((record, index) => {
          const Icon = record.rank === 1 ? Crown : Medal;
          return <button className={"v-podium-card podium-" + (index + 1)} key={record.id} onClick={() => setViewing(record)}>
            <div className="v-podium-place"><Icon size={17}/><span>#{record.rank}</span>{record.userId === user?.uid && <small>YOU</small>}</div>
            <PlayerAvatar record={record} size={index === 0 ? 64 : 52}/><strong className="v-podium-name">{record.userName || "Operative"}</strong>
            <span className="v-podium-score">{record.score.toLocaleString()}<small>PTS</small></span>
            <span className="v-podium-sub">Lv. {record.level ?? 0} · {record.streak ?? 0}× streak</span>
          </button>;
        })}</div>}

        {self && <div className="v-your-place"><div><Target size={18}/><strong>Your standing · #{self.rank}</strong><span>{nextPlace ? nextPlace.toLocaleString() + " more points to pass the next higher score" : "You share or hold the lead in this snapshot"}</span></div><button className="v-text-button" onClick={findSelf}>Find me <ArrowUpRight size={15}/></button></div>}
        <div className="v-section-heading v-table-heading"><div><h2>{boardLabel} rankings</h2><p>{mode === "overall" ? "Sum of published mode and challenge bests, including past challenges." : "Highest published score per player. Equal scores share a place."}</p></div>
          <label className="v-search"><Search size={16}/><input aria-label="Search players" placeholder="Find a player…" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }}/>{query && <button aria-label="Clear player search" onClick={() => { setQuery(""); setPage(0); }}><X size={14}/></button>}</label></div>
        {loading && !records.length ? <div className="v-board-skeleton" role="status" aria-label="Loading rankings">{[0,1,2,3].map(index=><div key={index}><i/><span/><b/></div>)}</div>
          : !records.length ? <div className="v-empty"><Trophy size={34}/><h3>{error || !online || cached ? "Your next best is still waiting." : "The first place could be yours."}</h3><p>{error || !online || cached ? "Explore your saved scores while the global board reconnects." : "No published scores in this snapshot yet. Finish a run while signed in to join the board."}</p><button className="v-button" onClick={() => setScope("device")}>See device scores</button></div>
          : !filtered.length ? <div className="v-empty"><Search size={30}/><h3>No player found in this snapshot.</h3><p>Search covers the loaded top 50. Try another name or clear the search.</p><button className="v-button" onClick={() => setQuery("")}>Clear search</button></div>
          : <><div className="v-score-table-wrap"><table className="v-score-table"><caption className="sr-only">{boardLabel} global rankings. Equal scores share a place.</caption><thead><tr><th scope="col">Place</th><th scope="col">Player</th><th scope="col" className="v-streak-col">Streak</th><th scope="col">Score</th></tr></thead><tbody>
            {visible.map(record => <tr key={record.id} data-current-player={record.userId === user?.uid ? "true" : undefined}>
              <td className="v-rank">#{record.rank}</td><td><button className="v-player-button" onClick={() => { uiTap(); setViewing(record); }} aria-label={"View " + record.userName + " profile"}><PlayerAvatar record={record}/><span><strong>{record.userName || "Operative"}<RoleBadge role={visibleRole(record)}/>{record.userId === user?.uid && <em>YOU</em>}</strong><small>Lv. {record.level ?? 0}{record.title ? " · " + record.title : ""}</small></span></button></td>
              <td className="v-streak-col">{record.streak ?? 0}×</td><td className="v-score-number">{record.score.toLocaleString()}</td>
            </tr>)}
          </tbody></table></div>
            <div className="v-pagination"><span aria-live="polite">{currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, filtered.length)} of {filtered.length}{query ? " matches · original places shown" : " players"}</span>
              <label><span className="sr-only">Players per page</span><select aria-label="Players per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(0); }}>{[10,25,50].map(size=><option key={size} value={size}>{size} / page</option>)}</select></label>
              <button className="v-icon-button" disabled={currentPage === 0} aria-label="Previous page" onClick={() => setPage(value => value - 1)}><ChevronLeft size={17}/></button><span>{currentPage + 1} / {pages}</span><button className="v-icon-button" disabled={currentPage >= pages - 1} aria-label="Next page" onClick={() => setPage(value => value + 1)}><ChevronRight size={17}/></button></div></>}
        <p className="v-footnote">Only the top 50 published entries are loaded. Global places use score; equal scores share a place. Practice is unranked.</p>
      </> : <>
        <div className="v-section-heading"><div><p className="v-eyebrow"><Monitor size={13}/> SAVED ON THIS BROWSER</p><h2>{mode === "overall" ? "Your personal bests." : boardLabel + " · your top runs."}</h2><p>{mode === "overall" ? "One best per mode. Daily and Weekly show the current challenge." : "Your eight highest saved scores for this mode. Equal scores share a place."}</p></div></div>
        {device.length ? <>
          <div className="v-device-metrics"><div><span>{mode === "overall" ? "Modes with scores" : "Saved top scores"}</span><strong>{device.length}</strong></div><div><span>{mode === "overall" ? "Best single run" : "Personal best"}</span><strong>{device[0].score.toLocaleString()}</strong></div><div><span>{mode === "overall" ? "Lifetime runs" : "Lifetime " + boardLabel + " runs"}</span><strong>{(mode === "overall" ? stats.runs : stats.modeRuns[mode] ?? 0).toLocaleString()}</strong></div></div>
          <div className="v-score-table-wrap"><table className="v-score-table v-device-table"><caption className="sr-only">{boardLabel} device scores</caption><thead><tr><th scope="col">Place</th><th scope="col">{mode === "overall" ? "Mode" : "Player / date"}</th><th scope="col">Score</th></tr></thead><tbody>
            {device.map(row => <tr key={row.id}><td className="v-rank">#{row.rank}</td><td><div className="v-device-name"><span className="v-mode-dot" style={{ background: MODES[row.mode].color }}/><div><strong>{row.name}</strong><small>{mode === "overall" ? row.savedCount + " saved scores" : row.date}</small></div>{mode === "overall" && <button className="v-text-button" aria-label={"View " + MODES[row.mode].label + " device scores"} onClick={() => setBoard(row.mode)}><ArrowUpRight size={15}/></button>}</div></td><td className="v-score-number">{row.score.toLocaleString()}</td></tr>)}
          </tbody></table></div>
        </> : <div className="v-empty"><Target size={34}/><h3>A fresh board. A new goal.</h3><p>{mode === "daily" || mode === "weekly" ? "No score saved for this challenge period yet." : "Finish a scored run and your best will appear here. Practice keeps the pressure off and stays unranked."}</p>{onSelectMode && <button className="v-button v-button-primary" onClick={() => onSelectMode(chosenMode)}>Go to {MODES[chosenMode].label} <ArrowUpRight size={16}/></button>}</div>}
        <p className="v-footnote">Device scores are saved for this browser. Clearing browser data removes them. Older run details may be limited.</p>
      </>}
    </section>
    {viewing && <Modal title={viewing.userName || "Player profile"} onClose={() => setViewing(null)} className="v-player-dialog">
      <div className="v-profile-preview"><PlayerAvatar record={viewing} size={86}/><h3>{viewing.userName} <RoleBadge role={visibleRole(viewing)}/></h3><p>Level {viewing.level ?? 0} · {viewing.title || "Operative"}</p>
        <div className="v-player-stats"><div><Trophy size={17}/><strong>{viewing.score.toLocaleString()}</strong><span>{boardLabel} points</span></div><div><Flame size={17}/><strong>{viewing.streak ?? 0}×</strong><span>Best streak</span></div></div><p className="v-footnote">Best updated · {recordDate(viewing.updatedAt)}</p>
      </div>
    </Modal>}
  </div>;
}
