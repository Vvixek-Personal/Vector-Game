import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { backdropVariants, panelVariants } from '../utils/motion';
import { uiTap, uiConfirm } from '../game/haptics';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={() => { uiConfirm(); void install(); }}
        className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-black shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:bg-cyan-400 transition cursor-pointer"
      >
        <Download size={16} />
        Install App
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => { uiTap(); setShowIOSGuide(true); }}
          className="flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20 transition cursor-pointer"
        >
          <Download size={16} />
          Install on iOS
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="surface-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setShowIOSGuide(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-install-title"
            >
              <motion.div
                variants={panelVariants}
                className="surface-card relative w-full max-w-sm p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { uiTap(); setShowIOSGuide(false); }}
                  className="icon-button icon-button-sm absolute right-4 top-4"
                  aria-label="Close install guide"
                >
                  <X size={16} />
                </button>
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                  <Download size={20} />
                </div>
                <h3 id="ios-install-title" className="t-title">Install on iOS</h3>
                <p className="t-body mt-3">
                  Add Vector to your Home Screen so it opens full screen and works offline.
                </p>
                <ol className="mt-3 space-y-1.5 pl-4 text-[12.5px] leading-relaxed" style={{ color: "var(--text-dim)", listStyle: "decimal" }}>
                  <li>Tap the Share button in the Safari toolbar.</li>
                  <li>Choose Add to Home Screen.</li>
                  <li>Tap Add to confirm.</li>
                </ol>
                <button
                  onClick={() => { uiTap(); setShowIOSGuide(false); }}
                  className="dialog-btn dialog-btn-primary mt-5 w-full"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
};
