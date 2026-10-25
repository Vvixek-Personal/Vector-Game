import { motion } from "motion/react";
import { SPRING } from "../utils/motion";
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
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={SPRING.press}
            >
              {/* Fluid Sliding Active Background Indicator */}
              {isActive && (
                <motion.div
                  layoutId="dockActivePill"
                  className="dock-active-pill"
                  transition={SPRING.settle}
                />
              )}

              {/* Tab Icon with Micro-motion Lift */}
              <motion.span
                className="dock-icon-wrap"
                animate={isActive ? { y: -1 } : { y: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
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
                  transition={SPRING.settle}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}

