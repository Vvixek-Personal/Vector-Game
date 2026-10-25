import { useId } from "react";
import { heroFor } from "../game/characters";

export default function HeroAvatar({ id, size = 88 }: { id: string; size?: number }) {
  const hero = heroFor(id) ?? heroFor("hero-spider")!;
  const uid = "hero" + useId().replace(/[^a-z0-9]/gi, "");
  const kind = hero.kind;
  const spider = kind === "spider" || kind === "miles";
  const web = kind === "miles" ? "#ef4560" : "#351524";
  const head = "M48 54 C48 20 112 20 112 54 L109 84 Q106 111 80 120 Q54 111 51 84 Z";
  return <svg className="hero-avatar" width={size} height={size} viewBox="0 0 160 160" aria-hidden="true" data-character={hero.id}>
    <defs>
      <linearGradient id={uid+"bg"} x2="1" y2="1"><stop stopColor={hero.from}/><stop offset="1" stopColor={hero.to}/></linearGradient>
      <linearGradient id={uid+"mask"} x1="0" x2="1" y2=".8"><stop stopColor={hero.suit}/><stop offset=".55" stopColor={hero.suit}/><stop offset="1" stopColor="#0a1027" stopOpacity=".9"/></linearGradient>
      <radialGradient id={uid+"light"}><stop stopColor={hero.accent} stopOpacity=".45"/><stop offset="1" stopColor={hero.accent} stopOpacity="0"/></radialGradient>
      <clipPath id={uid+"circle"}><circle cx="80" cy="80" r="78"/></clipPath>
      <clipPath id={uid+"face"}><path d={head}/></clipPath>
    </defs>
    <g clipPath={"url(#"+uid+"circle)"}>
      <path fill={"url(#"+uid+"bg)"} d="M0 0h160v160H0z"/>
      <circle cx="80" cy="75" r="74" fill={"url(#"+uid+"light)"}/>
      <circle cx="80" cy="79" r="65" stroke="#ffffff" strokeWidth=".7" opacity=".15" fill="none"/>
      <circle cx="80" cy="79" r="53" stroke="#ffffff" strokeWidth=".7" strokeDasharray="2 8" opacity=".18" fill="none"/>
      <path d="M18 160Q20 124 57 119L65 108h30l8 11q37 5 39 41" fill={hero.suit}/>
      <path d="M18 160q8-24 30-30l7 30m87 0q-8-24-30-30l-7 30" fill={hero.accent} opacity={kind==="spider" ? ".9" : ".25"}/>
      <path d="M66 104h28v23l-14 8-14-8z" fill={hero.suit}/>
      <path d="M66 107q14 17 28 0v10q-14 18-28 0" fill="#000" opacity=".25"/>

      {kind === "gwen" ? <>
        <path d="M28 121L34 61Q42 6 80 16q42-10 48 45l4 60-25 10-27-14-27 14z" fill="#edeaf7"/>
        <path d="M40 114L46 61Q52 28 80 30q31-2 35 31l5 53-21 15H62z" fill="#f16da9"/>
        <path d={head} fill="#242236"/>
        <path d="M51 62q15 1 23 18-15 9-21-2zm58 0q-15 1-23 18 15 9 21-2z" fill="#b6eff1" stroke="#e86ca9" strokeWidth="2"/>
        <path d="M46 47q5-24 34-28 26 2 34 28" fill="none" stroke="#ffffff" strokeWidth="6"/>
        <path d="M35 104l14 15m76-15-14 15" stroke="#77d6e0" strokeWidth="4"/>
      </> : kind === "bat" ? <>
        <path d="M44 77L43 12l24 26q13-7 26 0l24-26-1 65-9 30-27 13-27-13z" fill={"url(#"+uid+"mask)"}/>
        <path d="M57 89h46l-4 20-19 13-19-13z" fill="#cf9d80"/>
        <path d="M49 62l25 9-5 7-17-4zm62 0-25 9 5 7 17-4z" fill="#e7f5fc"/>
        <path d="M80 69l-5 24 11 0m-17 13h22" fill="none" stroke="#192239" strokeWidth="3" strokeLinecap="round"/>
        <path d="M60 142l12 3 8-7 8 7 12-3-5 12-15-4-15 4z" fill={hero.accent}/>
      </> : kind === "iron" ? <>
        <path d="M45 51L58 23h44l13 28-5 46-30 24-30-24z" fill="#93283a" stroke="#511d31" strokeWidth="2"/>
        <path d="M57 43l12-10h22l12 10-3 28 8 12-10 22-18 9-18-9-10-22 8-12z" fill={hero.accent}/>
        <path d="M54 57l20 6-1 8-17-5zm52 0-20 6 1 8 17-5z" fill="#b5f6ff"/>
        <path d="M70 36v10h20V36m-18 55h16l8 11M65 85l15 8 15-8" fill="none" stroke="#a56b36" strokeWidth="3"/>
        <path d="M71 110h18" stroke="#432234" strokeWidth="3"/>
        <circle cx="80" cy="145" r="10" fill="#9defff" stroke="#d9faff" strokeWidth="3"/>
        <circle cx="80" cy="145" r="15" stroke="#75e3ff" strokeWidth="1" opacity=".4" fill="none"/>
      </> : kind === "panther" ? <>
        <path d="M44 59l4-31 20 12q12-4 24 0l20-12 4 31-5 35-31 27-31-27z" fill="#202337"/>
        <path d="M48 34l14 14-8 12m58-26-14 14 8 12M54 63l19 8-3 6-15-5m51-9-19 8 3 6 15-5M80 49v43l-16 13m16-13 16 13M53 86l8 12m46-12-8 12" fill="none" stroke={hero.accent} strokeWidth="2"/>
        <path d="M58 66l12 5-2 3-11-3zm44 0-12 5 2 3 11-3z" fill="#efeaff"/>
        <path d="M48 125l11 13 6-13 8 15 7-13 7 13 8-15 6 13 11-13" stroke={hero.accent} strokeWidth="4" strokeLinejoin="round" fill="none"/>
        <path d="M68 106l12 8 12-8" fill="none" stroke="#9c7dd8" strokeWidth="2"/>
      </> : kind === "sentinel" ? <>
        <path d="M45 57l13-24 22-9 22 9 13 24-7 40-28 22-28-22z" fill={hero.suit}/>
        <path d="M53 57l27-11 27 11-4 22-23 10-23-10z" fill="#0b1a30" stroke="#52788d" strokeWidth="2"/>
        <path d="M58 64l22 7 22-7-3 9-19 8-19-8z" fill={hero.accent}/>
        <path d="M65 93l15 9 15-9m-15 9v12M47 58H37v27h13m63-27h10v27h-13" fill="none" stroke="#88b6cb" strokeWidth="3"/>
        <path d="M70 140l10-7 10 7-10 13z" fill={hero.accent}/>
      </> : <>
        <path d={head} fill={"url(#"+uid+"mask)"}/>
        {spider && <g clipPath={"url(#"+uid+"face)"} stroke={web} strokeWidth={kind==="miles" ? "1.4" : "1"} opacity={kind==="miles" ? ".9" : ".75"} fill="none">
          <path d="M80 22v106M80 81L41 35m39 46 39-46M80 81L38 70m42 11 42-11M80 81l-40 30m40-30 40 30M80 81l-20 45m20-45 20 45"/>
          <path d="M52 44q13 9 28 4 14 5 28-4M47 58q15 10 33 8 18 2 33-8M46 81q17 8 34 0 17 8 34 0M51 99q13-2 29-9 16 7 29 9M63 114q6-9 17-14 11 5 17 14"/>
        </g>}
        {kind==="deadpool" && <>
          <path d="M47 52q22-1 29 18l-10 23-16-7zM113 52Q91 51 84 70l10 23 16-7z" fill="#161c2c"/>
          <path d="M80 33v74" stroke="#7d2236" strokeWidth="2"/>
        </>}
        <path d={kind==="deadpool" ? "M53 66l17 7-8 7-10-4z" : "M51 58q18 5 24 22-16 10-23-2z"} fill="#f4f4f6" stroke={kind==="miles" ? "#e64057" : "#18223a"} strokeWidth="3"/>
        <path d={kind==="deadpool" ? "M107 63l-17 10 8 7 10-4z" : "M109 58Q91 63 85 80q16 10 23-2z"} fill="#f4f4f6" stroke={kind==="miles" ? "#e64057" : "#18223a"} strokeWidth="3"/>
        {spider && <g fill={kind==="miles" ? "#ef4560" : "#18223a"} stroke={kind==="miles" ? "#ef4560" : "#18223a"} strokeWidth="1.5">
          <ellipse cx="80" cy="143" rx="3.5" ry="7"/><circle cx="80" cy="135" r="2.5"/>
          <path d="M78 139l-9-5-1-5m10 14-11-2-3-5m14 10-10 2-2 6m16-15 9-5 1-5m-10 14 11-2 3-5m-14 10 10 2 2 6" fill="none"/>
        </g>}
      </>}
      <path d="M43 150q37 15 74 0" fill="none" stroke="#ffffff" strokeWidth="1" opacity=".1"/>
      <path d="M26 43l3-7 3 7-3 7zm101-15 2-4 2 4-2 4z" fill="#ffffff" opacity=".45"/>
    </g>
    <circle cx="80" cy="80" r="78" fill="none" stroke="#ffffff" strokeOpacity=".15" strokeWidth="2"/>
  </svg>;
}
