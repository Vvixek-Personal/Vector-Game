import { motion } from "motion/react";
import { uiTap } from "../game/haptics";
import Icon from "./Icon";
export type DockTab = "home" | "leaderboard" | "store" | "stats" | "settings" | "profile";
const tabs = [
  { id: "home", label: "Play", icon: "home" }, { id: "leaderboard", label: "Ranks", icon: "trophy" },
  { id: "store", label: "Store", icon: "bag" }, { id: "stats", label: "Stats", icon: "chart" },
  { id: "settings", label: "Tune", icon: "settings" },
] as const;
export default function Dock({ active, onChange }: { active: DockTab; onChange: (tab: DockTab) => void }) {
  return <nav className="v-dock-nav" aria-label="Main navigation"><div className="v-dock">
    {tabs.map(tab => <button key={tab.id} aria-current={active === tab.id ? "page" : undefined} onClick={() => { if (active !== tab.id) { uiTap(); onChange(tab.id); } }}>
      {active === tab.id && <motion.i className="v-dock-highlight" layoutId="navigation-highlight" transition={{ type: "spring", stiffness: 420, damping: 36 }}/>}
      <Icon name={tab.icon} size={18}/><span>{tab.label}</span>
    </button>)}
  </div></nav>;
}
