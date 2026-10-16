import type { GameMode } from "../game/types";

const ARROW = "M-48 15H11V42L57 0 11-42v27h-59Z";

/** Small, static vector illustrations keep the mode picker light to render. */
export default function ModeArtwork({ mode }: { mode: GameMode }) {
  return (
    <svg viewBox="0 0 260 230" className="mode-artwork" fill="none" aria-hidden="true">
      <circle cx="130" cy="115" r="90" stroke="currentColor" opacity=".12" />
      <path d="M130 17v12m0 172v12M32 115h12m172 0h12" stroke="currentColor" opacity=".35" />
      {mode === "arcade" && <g transform="translate(130 115) rotate(-45)"><path d={ARROW} fill="currentColor" opacity=".08" transform="rotate(90) scale(1.2)" /><path d={ARROW} fill="currentColor" /></g>}
      {mode === "coop" && <><path d={ARROW} fill="currentColor" transform="translate(98 122) rotate(-90) scale(.7)" /><path d={ARROW} fill="currentColor" opacity=".55" transform="translate(162 108) rotate(-90) scale(.7)" /><path d="M96 170q34 20 68 0" stroke="currentColor" strokeWidth="2" opacity=".5" /></>}
      {mode === "waves" && <g stroke="currentColor" strokeWidth="5" strokeLinecap="round"><path d="M65 85c27-30 49 30 76 0s42-18 54 0" opacity=".35" /><path d="M65 115c27-30 49 30 76 0s42-18 54 0" opacity=".65" /><path d="M65 145c27-30 49 30 76 0s42-18 54 0" /></g>}
      {mode === "memory" && <><circle cx="130" cy="115" r="54" stroke="currentColor" strokeWidth="2" strokeDasharray="5 9" opacity=".4" /><path d={ARROW} stroke="currentColor" strokeWidth="2" transform="translate(130 115) rotate(-45) scale(.68)" /></>}
      {mode === "rush" && <g stroke="currentColor" strokeWidth="4" strokeLinecap="round"><circle cx="130" cy="124" r="48" /><path d="M130 125V97m-12-42h24m-12 0v18m37 9 10-10" /><path d="M79 73 67 61M66 90H51" opacity=".4" /></g>}
      {mode === "blitz" && <path d="m144 49-53 77h36l-11 55 53-79h-35Z" fill="currentColor" />}
      {mode === "sudden" && <><path d="m130 52 60 63-60 63-60-63Z" stroke="currentColor" strokeWidth="2" opacity=".4" /><path d="m130 78 35 37-35 37-35-37Z" fill="currentColor" /></>}
      {mode === "zen" && <><path d="M153 62a59 59 0 1 0 32 84 57 57 0 0 1-32-84Z" fill="currentColor" opacity=".8" /><path d="m177 64 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="currentColor" /></>}
      {mode === "versus" && <><path d={ARROW} fill="currentColor" transform="translate(116 89) rotate(0) scale(.63)" /><path d={ARROW} fill="currentColor" opacity=".5" transform="translate(144 141) rotate(180) scale(.63)" /></>}
      {mode === "daily" && <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="80" y="72" width="100" height="95" rx="13" /><path d="M105 62v21m50-21v21m-75 13h100" opacity=".5" /><path d="m106 131 16 16 33-34" /></g>}
      {mode === "weekly" && (
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M90 70h80v35a40 40 0 0 1-80 0V70Z" fill="currentColor" fillOpacity=".15" />
          <path d="M90 80H70a16 16 0 0 0 16 16h4m70-16h20a16 16 0 0 1-16 16h-4" opacity=".6" />
          <path d="M130 145v25m-25 0h50" />
          <circle cx="130" cy="98" r="6" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}