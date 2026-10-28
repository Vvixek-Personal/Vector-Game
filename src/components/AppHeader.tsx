import React from "react";
import { Sparkles, Gem, ArrowLeft } from "lucide-react";
import Icon from "./Icon";
import { PWAInstallButton } from "./PWAInstallButton";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  sparks?: number;
  diamonds?: number;
  onBack?: () => void;
  actions?: React.ReactNode;
  showWordmark?: boolean;
}

export default function AppHeader({
  title,
  subtitle,
  eyebrow,
  sparks,
  diamonds,
  onBack,
  actions,
  showWordmark = true,
}: AppHeaderProps) {
  const hasCurrencies = typeof sparks === "number" || typeof diamonds === "number";

  return (
    <header className="home-header">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="icon-button icon-button-sm shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {showWordmark && (
          <div className="wordmark shrink-0">
            <Icon name="arrow" size={28} />
            <h1>Vector<span>.</span></h1>
          </div>
        )}

        {(title || eyebrow) && (
          <div className="min-w-0 pl-1 border-l ml-1" style={{ borderColor: "var(--panel-border)" }}>
            {eyebrow && <p className="t-eyebrow leading-none truncate">{eyebrow}</p>}
            {title && (
              <h2 className="text-[17px] font-bold tracking-tight leading-snug txt truncate">
                {title}
              </h2>
            )}
            {subtitle && <p className="t-caption text-[11px] truncate">{subtitle}</p>}
          </div>
        )}
      </div>

      <div className="home-header-actions">
        {hasCurrencies && (
          <div className="flex items-center gap-1.5 shrink-0" aria-label="Currencies">
            {typeof sparks === "number" && (
              <div
                className="flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[12px] font-semibold num"
                style={{
                  background: "var(--pill)",
                  borderColor: "var(--panel-border)",
                  color: "var(--brand)",
                }}
                title="Sparks"
              >
                <Sparkles size={13} className="shrink-0" />
                <span>{sparks.toLocaleString()}</span>
              </div>
            )}
            {typeof diamonds === "number" && (
              <div
                className="flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[12px] font-semibold num txt"
                style={{
                  background: "var(--pill)",
                  borderColor: "var(--panel-border)",
                }}
                title="Diamonds"
              >
                <Gem size={13} className="shrink-0 text-cyan-400" />
                <span>{diamonds.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        <PWAInstallButton />
        {actions}
      </div>
    </header>
  );
}
