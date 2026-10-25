import { useEffect, useState, type ReactNode } from "react";
import { ARENA_THEMES, AUDIO_PACKS, COLORWAYS, codeLabel, defaultBindCodes, resetTutorial, type BindDir, type Settings } from "../../game/storage";
import { playHaptic, uiTap } from "../../game/haptics";
import { Seg, Toggle } from "../ui";
import Icon, { type IconName } from "../Icon";

type Tab = "look" | "controls" | "feel";
interface Props {
  settings: Settings;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onBack: () => void;
}

const DIRECTIONS: BindDir[] = ["N", "E", "S", "W"];
const LABELS: Record<BindDir, string> = { N: "Up", E: "Right", S: "Down", W: "Left" };
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "look", label: "Appearance", icon: "sun" },
  { id: "controls", label: "Controls", icon: "keyboard" },
  { id: "feel", label: "Feedback", icon: "touch" },
];

function SettingRow({ label, description, children, key }: { label: string; description?: string; children: ReactNode; key?: string | number }) {
  return <div className="setting-row"><div className="setting-label"><div>{label}</div>{description && <p>{description}</p>}</div><div className="setting-control">{children}</div></div>;
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="settings-section"><div className="section-heading"><h3>{title}</h3>{action}</div>{children}</section>;
}

export default function SettingsScreen({ settings, onChange, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("look");
  const [recording, setRecording] = useState<BindDir | null>(null);
  const [message, setMessage] = useState("");
  const defaults = defaultBindCodes(settings.keyPreset);

  useEffect(() => {
    if (!recording) return;
    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      if (event.code === "Escape") { setRecording(null); return; }
      if (/^(Shift|Control|Alt|Meta)/.test(event.code)) return;
      if (["KeyF", "KeyM", "KeyP", "Tab", "Space", "Enter"].includes(event.code)) {
        setMessage("That key is used by a game shortcut. Choose a different key.");
        return;
      }
      const used = DIRECTIONS.find((d) => d !== recording && ([...(settings.binds[d] ?? []), ...defaults[d]]).includes(event.code));
      if (used) { setMessage(`${codeLabel(event.code)} already controls ${LABELS[used].toLowerCase()}. Choose a different key.`); return; }
      const current = settings.binds[recording] ?? [];
      if (!current.includes(event.code) && !defaults[recording].includes(event.code)) onChange("binds", { ...settings.binds, [recording]: [...current, event.code].slice(-2) });
      setMessage(`${LABELS[recording]} is ready to use.`);
      setRecording(null);
    };
    window.addEventListener("keydown", capture, true);
    return () => window.removeEventListener("keydown", capture, true);
  }, [recording, settings.binds, settings.keyPreset, onChange]);

  const changeTab = (next: Tab) => { setRecording(null); setMessage(""); uiTap(); setTab(next); };

  return (
    <div className="settings-page">
      <header className="home-header"><div className="wordmark"><Icon name="arrow" size={28} /><h1>Vector<span>.</span></h1></div><button className="text-button" onClick={onBack}><Icon name="left" size={17} />Back to play</button></header>
      <div className="settings-heading"><h2>Make yourself comfortable.</h2><p>A few small adjustments. Saved automatically on this device.</p></div>
      <div className="settings-layout">
        <nav className="settings-tabs" role="tablist" aria-label="Settings categories">{TABS.map((item) => <button key={item.id} id={`tab-${item.id}`} className={`settings-tab ${tab === item.id ? "active" : ""}`} role="tab" aria-selected={tab === item.id} aria-controls={`pane-${item.id}`} onClick={() => changeTab(item.id)}><Icon name={item.icon} size={19} />{item.label}</button>)}</nav>
        <div key={tab} className="settings-pane" role="tabpanel" id={`pane-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "look" && <>
            <Section title="Appearance">
              <div className="appearance-options">{(["light", "dark"] as const).map((theme) => <button key={theme} className="appearance-option" aria-pressed={settings.uiMode === theme} onClick={() => { uiTap(); onChange("uiMode", theme); }}><span className={`appearance-preview ${theme}`} aria-hidden="true"><i /><b /></span><span>{theme === "light" ? "Light" : "Dark"}{settings.uiMode === theme && <Icon name="check" size={16} />}</span></button>)}</div>
              <p className="settings-note">Both looks keep contrast clear and effects subtle.</p>
              <SettingRow label="Text size" description="Scale typography all over the app for optimal reading.">
                <Seg
                  options={[
                    { id: "normal", label: "Normal" },
                    { id: "medium", label: "Medium" },
                    { id: "large", label: "Large" },
                    { id: "huge", label: "Huge" },
                  ]}
                  value={settings.textSize || "medium"}
                  onChange={(v) => onChange("textSize", v as Settings["textSize"])}
                />
              </SettingRow>
            </Section>
            <Section title="Accent color"><div className="color-options">{COLORWAYS.map((color) => <button key={color.id} className="color-option" onClick={() => { uiTap(); onChange("colorway", color.id); }} aria-pressed={settings.colorway === color.id}><span style={{ background: color.swatch }}>{settings.colorway === color.id && <Icon name="check" size={15} />}</span>{color.name}</button>)}</div><SettingRow label="Arena palette" description="The color of your arrow and playfield."><select className="setting-select" aria-label="Arena palette" value={settings.theme} onChange={(e) => onChange("theme", e.target.value as Settings["theme"])}>{ARENA_THEMES.map((theme) => <option value={theme.id} key={theme.id}>{theme.name}</option>)}</select></SettingRow></Section>
            <Section title="Comfort"><SettingRow label="Reduced motion" description="Instant transitions, no camera shake."><Toggle label="Reduced motion" checked={settings.reducedMotion} onChange={() => onChange("reducedMotion", !settings.reducedMotion)} /></SettingRow><SettingRow label="High contrast" description="Stronger labels and interface text."><Toggle label="High contrast" checked={settings.highContrast} onChange={() => onChange("highContrast", !settings.highContrast)} /></SettingRow><SettingRow label="Larger interface" description="More room for text and touch targets."><Toggle label="Larger interface" checked={settings.largeUi} onChange={() => onChange("largeUi", !settings.largeUi)} /></SettingRow></Section>
            <Section title="Play helpers">
              <SettingRow label="On-screen hints" description="Keep the short how-to lines visible.">
                <Toggle label="On-screen hints" checked={settings.showHints} onChange={() => onChange("showHints", !settings.showHints)} />
              </SettingRow>
              <SettingRow label="Confirm before play" description="Ask once before starting a run.">
                <Toggle label="Confirm before play" checked={settings.confirmPlay} onChange={() => onChange("confirmPlay", !settings.confirmPlay)} />
              </SettingRow>
              <SettingRow label="Pause when you leave" description="Auto-pause if the window blurs.">
                <Toggle label="Pause when you leave" checked={settings.autoPauseBlur !== false} onChange={() => onChange("autoPauseBlur", settings.autoPauseBlur === false)} />
              </SettingRow>
              <SettingRow label="How-to again" description="Show the first-run guide next time you play.">
                <button className="text-button" onClick={() => { resetTutorial(); setMessage("Guide will show on the next run."); }}>Show guide again</button>
              </SettingRow>
            </Section>
            <Section title="HUD & Performance">
              <SettingRow label="Score floats" description="Little +pts pop on hits.">
                <Toggle label="Score floats" checked={settings.scoreFloats !== false} onChange={() => onChange("scoreFloats", settings.scoreFloats === false)} />
              </SettingRow>
              <SettingRow label="Compact HUD" description="Smaller score and hearts.">
                <Toggle label="Compact HUD" checked={!!settings.compactHud} onChange={() => onChange("compactHud", !settings.compactHud)} />
              </SettingRow>

              <SettingRow label="Color-blind assist" description="Stronger shapes, less hue.">
                <Toggle label="Color-blind assist" checked={!!settings.colorBlind} onChange={() => onChange("colorBlind", !settings.colorBlind)} />
              </SettingRow>
              <SettingRow label="Particle density" description="Adjust visual effects intensity.">
                <select className="setting-select" aria-label="Particle density" value={settings.particleDensity || "full"} onChange={(e) => onChange("particleDensity", e.target.value as Settings["particleDensity"])}>
                  <option value="full">Full (100%)</option>
                  <option value="reduced">Reduced (50%)</option>
                  <option value="off">Off (0%)</option>
                </select>
              </SettingRow>
              <SettingRow label="FPS Counter" description="Show real-time frames per second in-game.">
                <Toggle label="FPS Counter" checked={!!settings.showFps} onChange={() => onChange("showFps", !settings.showFps)} />
              </SettingRow>
            </Section>
          </>}
          {tab === "controls" && <>
            <Section title="Touch controls"><SettingRow label="Directional pad" description="Choose where it sits, or hide it."><select className="setting-select" aria-label="Directional pad position" value={settings.dpad} onChange={(e) => onChange("dpad", e.target.value as Settings["dpad"])}><option value="center">Center</option><option value="left">Left</option><option value="right">Right</option><option value="hidden">Hidden</option></select></SettingRow><SettingRow label="Pad size" description={`${settings.dpadScale}%`}><input aria-label="Pad size" type="range" min="80" max="125" step="5" value={settings.dpadScale} onChange={(e) => onChange("dpadScale", Number(e.target.value))} /></SettingRow><SettingRow label="Left-handed layout" description="Move the default pad to the left."><Toggle label="Left-handed layout" checked={settings.leftHanded} onChange={() => onChange("leftHanded", !settings.leftHanded)} /></SettingRow></Section>
            <Section title="Keyboard"><SettingRow label="Default keys"><Seg options={[{ id: "both", label: "Both" }, { id: "arrows", label: "Arrows" }, { id: "wasd", label: "WASD" }]} value={settings.keyPreset} onChange={(value) => { setRecording(null); onChange("keyPreset", value as Settings["keyPreset"]); }} /></SettingRow><p className="settings-note">Use two keys together for a diagonal. Co-op always keeps Player 1 on WASD and Player 2 on arrow keys.</p></Section>
            <Section title="Your extra keys" action={<button className="reset-button" onClick={() => { onChange("binds", {}); onChange("keyPreset", "both"); setRecording(null); setMessage("Arrow keys and WASD restored."); }}>Restore defaults</button>}>
              {DIRECTIONS.map((dir) => <div key={dir} className={`bind-row ${recording === dir ? "recording" : ""}`}><span>{LABELS[dir]}</span><div className="bind-keys">{[...new Set([...defaults[dir], ...(settings.binds[dir] ?? [])])].map((code) => settings.binds[dir]?.includes(code) ? <button key={code} title={`Remove ${codeLabel(code)}`} aria-label={`Remove ${codeLabel(code)} binding`} onClick={() => onChange("binds", { ...settings.binds, [dir]: settings.binds[dir]?.filter((value) => value !== code) })}>{codeLabel(code)}</button> : <kbd key={code}>{codeLabel(code)}</kbd>)}</div><button className="bind-add" aria-label={`Bind a key for ${LABELS[dir]}`} onClick={() => { setRecording(recording === dir ? null : dir); setMessage(""); }}>{recording === dir ? <Icon name="close" size={13} style={{ margin: "auto" }} /> : "+"}</button></div>)}
              <p className="settings-note">{recording ? `Press a key for ${LABELS[recording].toLowerCase()}. Escape cancels.` : "Add up to two extra keys per direction. Click an extra key to remove it."}</p><p className="settings-status" role="status">{message}</p>
            </Section>
          </>}
          {tab === "feel" && <>
            <Section title="Touch feedback"><SettingRow label="Haptic strength" description={`${settings.haptics}%`}><input aria-label="Haptic strength" type="range" min="0" max="100" step="5" value={settings.haptics} onChange={(e) => onChange("haptics", Number(e.target.value))} /></SettingRow><SettingRow label="Interface taps" description="A tick on menus, slides, and selections."><Toggle label="Interface tap feedback" checked={settings.hapticsKind} onChange={() => onChange("hapticsKind", !settings.hapticsKind)} /></SettingRow><SettingRow label="Screen shake" description="A short bump on misses."><Toggle label="Screen shake" checked={settings.screenShake} onChange={() => onChange("screenShake", !settings.screenShake)} /></SettingRow><SettingRow label="Try it" description="Vibration depends on device support."><button className="text-button" onClick={() => { const supported = typeof navigator.vibrate === "function"; playHaptic("selection", settings.haptics / 100); setMessage(supported ? (settings.haptics ? "Test feedback sent." : "Raise the strength to feel feedback.") : "This browser does not support vibration. Visual feedback is still available."); }}>Test feedback</button></SettingRow><p className="settings-status" role="status">{message}</p></Section>
            <Section title="Sound & Audio">
              <SettingRow label="Master sound" description="Turn all game audio on or off.">
                <Toggle label="Master sound" checked={settings.soundEnabled !== false} onChange={() => onChange("soundEnabled", settings.soundEnabled === false)} />
              </SettingRow>
              <SettingRow label="SFX volume" description={`${settings.sfxVolume ?? 100}%`}>
                <input aria-label="SFX volume" type="range" min="0" max="100" step="5" value={settings.sfxVolume ?? 100} onChange={(e) => onChange("sfxVolume", Number(e.target.value))} />
              </SettingRow>
              <SettingRow label="Music volume" description={`${settings.musicVolume ?? 80}%`}>
                <input aria-label="Music volume" type="range" min="0" max="100" step="5" value={settings.musicVolume ?? 80} onChange={(e) => onChange("musicVolume", Number(e.target.value))} />
              </SettingRow>
              <SettingRow label="Audio Pack" description="Synth sound signature for hits and chimes.">
                <select className="setting-select" aria-label="Audio Pack" value={settings.audioPack || "default"} onChange={(e) => onChange("audioPack", e.target.value as Settings["audioPack"])}>
                  {AUDIO_PACKS.map((pack) => <option value={pack.id} key={pack.id}>{pack.name}</option>)}
                </select>
              </SettingRow>
              <SettingRow label="Music mood"><Seg options={[{ id: "drive", label: "Drive" }, { id: "pulse", label: "Pulse" }, { id: "calm", label: "Calm" }]} value={settings.musicStyle} onChange={(value) => onChange("musicStyle", value as Settings["musicStyle"])} /></SettingRow>
              <SettingRow label="Voice call-outs" description="Optional spoken game feedback."><Toggle label="Voice call-outs" checked={settings.announcer} onChange={() => onChange("announcer", !settings.announcer)} /></SettingRow>
              <p className="settings-note">You can switch music and sound off independently while playing.</p>
            </Section>
          </>}
        </div>
      </div>
    </div>
  );
}