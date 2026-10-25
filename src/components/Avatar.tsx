import { FRAMES, avatarFor, type Profile } from "../game/profile";
import CartoonAvatar from "./CartoonAvatar";
import AnimeAvatar from "./AnimeAvatar";
import HeroAvatar from "./HeroAvatar";

interface Props {
  profile: Profile;
  name: string;
  size?: number;
  showFrame?: boolean;
  className?: string;
}

export default function Avatar({ profile, name, size = 40, showFrame = true, className = "" }: Props) {
  const a = avatarFor(profile);
  const frame = FRAMES.find((f) => f.id === profile.frameId);
  const frameCss = showFrame && frame && frame.id !== "none" ? frame.css : "none";
  const shadow = frameCss === "none" ? "0 6px 18px #00000030" : `${frameCss}, 0 6px 18px #00000030`;
  if (a.hero) return <span className={`human-avatar ${className}`} style={{ width: size, height: size, boxShadow: shadow }} title={`${a.name} · ${name || "Ace"}`}><HeroAvatar id={a.hero} size={size}/></span>;
  if (a.anime) {
    return (
      <span className={`human-avatar ${className}`} style={{ width: size, height: size, boxShadow: shadow }} title={`${a.name} · ${name || "Ace"}`}>
        <AnimeAvatar id={a.anime} size={size} />
      </span>
    );
  }
  if (a.cartoon) {
    return (
      <span className={`human-avatar ${className}`} style={{ width: size, height: size, boxShadow: shadow }} title={`${a.name} · ${name || "Ace"}`}>
        <CartoonAvatar id={a.cartoon} size={size} />
      </span>
    );
  }
  return (
    <span
      className={`profile-avatar-face ${className}`}
      aria-hidden="true"
      title={`${a.name} avatar for ${name || "Ace"}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `linear-gradient(135deg, ${a.from}, ${a.to})`,
        boxShadow: shadow,
      }}
    >
      {a.glyph}
    </span>
  );
}
