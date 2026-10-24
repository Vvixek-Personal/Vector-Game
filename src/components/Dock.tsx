import { motion } from "motion/react";
import { uiTap } from "../game/haptics";
import Icon from "./Icon";

export type DockTab = "home" | "leaderboard" | "store" | "stats" | "settings" | "profile";

const TABS: { id: DockTab; label: string; icon: "home" | "trophy" | "bag" | "chart" | "settings" }[] = [
  { id: "home", label: "Play", icon: "home" },
  { id: "leaderboard", label: "Ranks", icon: "trophy" },
  { id: "store", label: "Store", icon: "bag" },
  { id: "stats", label: "Stats", icon: "chart" },
  { id: "settings", label: "Tune", icon: "settings" },
];

export default function Dock({ active, onChange }: { active: DockTab; onChange: (tab: DockTab) => void }) {
  return (
    <motion.nav
      className="dock-nav"
      aria-label="Main navigation"
      initial={{ y: 28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
    >
      <div className="dock relative shadow-2xl">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <motion.button
              key={tab.id}
              className={`dock-item relative ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                if (!isActive) {
                  uiTap();
                  onChange(tab.id);
                }
              }}
              whileHover={{ y: -2, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 450, damping: 24 }}
            >
              {/* Fluid Sliding Active Background Indicator */}
              {isActive && (
                <motion.div
                  layoutId="dockActivePill"
                  className="dock-active-pill"
                  transition={{ type: "spring", stiffness: 440, damping: 30 }}
                />
              )}

              {/* Tab Icon with Micro-motion Lift */}
              <motion.span
                className="dock-icon-wrap"
                animate={isActive ? { y: -1, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Icon name={tab.icon} size={16} />
              </motion.span>

              {/* Label */}
              <span className="dock-label relative z-10">{tab.label}</span>

              {/* Glowing Active Dot */}
              {isActive && (
                <motion.span
                  layoutId="dockActiveDot"
                  className="dock-active-dot"
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}

