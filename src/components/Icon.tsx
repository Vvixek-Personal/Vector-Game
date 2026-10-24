import type { CSSProperties, ReactNode } from "react";

export type IconName = "arrow" | "play" | "home" | "user" | "settings" | "keyboard" | "touch" | "left" | "right" | "sun" | "moon" | "expand" | "check" | "help" | "close" | "lock" | "bag" | "chart" | "trophy" | "award" | "music";

interface Props {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export default function Icon({ name, size = 20, strokeWidth = 1.65, className, style }: Props) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M5 19 19 5M5 5h14v14" />,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    home: <><path d="m3 10 9-7 9 7M5 9v12h14V9" /><path d="M9 21v-7h6v7" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><path d="M9 3v6m6 0v6m-5 0v6" /></>,
    keyboard: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" /></>,
    touch: <><path d="M9 12V5a2 2 0 0 1 4 0v7l1-3 5 2a3 3 0 0 1 2 3l-1 7H9l-5-7a2 2 0 0 1 3-2l2 2" /></>,
    left: <path d="m14 6-6 6 6 6" />,
    right: <path d="m10 6 6 6-6 6" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" /></>,
    moon: <path d="M20.8 13.1A9 9 0 0 1 10.9 3.2 9 9 0 1 0 20.8 13.1Z" />,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    check: <path d="m5 12 4 4L19 6" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .8-1.5 1.2-1.5 2M12 17h.01" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5" /></>,
    bag: <><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></>,
    chart: <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />,
    trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H8v4h8v-4h-1c-.55 0-1-.45-1-1v-2.34" /><path d="M18 4H6v7a6 6 0 0 0 12 0V4Z" /></>,
    award: <><circle cx="12" cy="8" r="6" /><path d="m15.48 12.89 1.52 9.11-5-3-5 3 1.52-9.11" /></>,
    music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  };

  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">{paths[name]}</svg>;
}