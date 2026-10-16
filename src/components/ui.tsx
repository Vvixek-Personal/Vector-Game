import type { ReactNode, CSSProperties } from "react";
import { uiConfirm, uiTap } from "../game/haptics";

export function Row({ label, sub, children }: { label: string; sub?: string; children: ReactNode }) {
  return (
    <div className="anim-rise flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold txt">{label}</div>
        {sub && <div className="mt-0.5 text-[12px] leading-snug faint">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function Seg({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="frost-seg" role="group">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => {
            uiTap();
            onChange(o.id);
          }}
          className={`frost-seg-btn ${value === o.id ? "on" : ""}`}
          aria-pressed={value === o.id}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      onClick={() => {
        uiTap();
        onChange();
      }}
      className={`switch ${checked ? "on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span />
    </button>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-0.5">
      <div className="text-[13px] font-medium dim">{children}</div>
      {right}
    </div>
  );
}

export function BackHeader({ title, sub, onBack }: { title: string; sub?: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="btn btn-secondary flex h-9 w-9 items-center justify-center rounded-full text-lg"
        aria-label="Back"
      >
        ‹
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-semibold txt">{title}</div>
        {sub && <div className="truncate text-[12px] faint">{sub}</div>}
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-[18px] border p-3 ${className}`}
      style={{ background: "var(--pill)", borderColor: "var(--panel-border)", ...style }}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => {
        uiConfirm();
        onClick?.();
      }}
      className={`btn btn-charge brand-grad w-full rounded-[18px] py-3.5 text-[15px] font-semibold tracking-tight ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => {
        uiTap();
        onClick?.();
      }}
      className={`btn btn-secondary w-full rounded-[18px] py-3 text-[14px] font-semibold tracking-tight ${className}`}
    >
      {children}
    </button>
  );
}
