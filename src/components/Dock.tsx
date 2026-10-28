import { motion } from "motion/react";
import { uiTap } from "../game/haptics";
import Icon, { type IconName } from "./Icon";

export type DockTab = "home" | "store" | "stats" | "settings";

interface TabItem {
  id: DockTab;
  label: string;
  icon: IconName;
}

const tabs: TabItem[] = [
  { id: "home", label: "Play", icon: "home" },
  { id: "store", label: "Store", icon: "bag" },
  { id: "stats", label: "Stats", icon: "chart" },
  { id: "settings", label: "Tune", icon: "settings" },
];

export default function Dock({
  active,
  onChange,
}: {
  active: string;
  onChange: (tab: DockTab) => void;
}) {
  return (
    <nav className="v-dock-nav" aria-label="Main navigation">
      <div className="v-dock" role="tablist">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={`v-dock-item ${isActive ? "active" : ""}`}
              onClick={() => {
                uiTap();
                onChange(tab.id);
              }}
            >
              {isActive && (
                <motion.i
                  className="v-dock-highlight"
                  layoutId="navigation-highlight"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <Icon name={tab.icon} size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
