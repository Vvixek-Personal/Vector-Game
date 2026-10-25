import { useId, useRef, type ReactNode } from "react";

export interface TabChoice<T extends string> { id: T; label: string; icon?: ReactNode; count?: number }
export default function SegmentedTabs<T extends string>({ label, options, value, onChange, panelId, className = "" }: {
  label: string; options: TabChoice<T>[]; value: T; onChange: (value: T) => void; panelId: string; className?: string;
}) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className={"v-tabs " + className} role="tablist" aria-label={label}>
    {options.map((option, index) => <button key={option.id} id={id + "-" + option.id} type="button"
      ref={el => { buttons.current[index] = el; }} role="tab" aria-selected={value === option.id}
      aria-controls={panelId} tabIndex={value === option.id ? 0 : -1}
      onClick={() => onChange(option.id)} onKeyDown={event => {
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % options.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + options.length) % options.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = options.length - 1;
        else return;
        event.preventDefault(); onChange(options[next].id); buttons.current[next]?.focus();
        buttons.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
      }}>
      {option.icon}<span>{option.label}</span>{option.count !== undefined && <small>{option.count}</small>}
    </button>)}
  </div>;
}
