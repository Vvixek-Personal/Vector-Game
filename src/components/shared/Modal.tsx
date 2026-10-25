import { useEffect, useRef, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children, className = "" }: {
  title: string; onClose: () => void; children: ReactNode; className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<dialog ref={dialog} className={"v-dialog " + className}
    aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close.current(); }}
    onClick={event => { if (event.target === event.currentTarget) close.current(); }}>
    <div className="v-dialog-content">
      <header><h2 id={titleId}>{title}</h2><button type="button" className="v-icon-button" onClick={onClose} aria-label="Close preview" autoFocus><X size={18}/></button></header>
      {children}
    </div>
  </dialog>, document.body);
}
