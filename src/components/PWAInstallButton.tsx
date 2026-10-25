import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowIOSGuide(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/20 p-6 shadow-2xl relative"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => { uiTap(); setShowIOSGuide(false); }}
                  className="absolute top-4 right-4 text-white/50 hover:text-white"
                >
                  <X size={20} />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <Download size={24} />
                </div>
                <h3 className="text-xl font-black text-white">Install Vector on iOS</h3>
                <p className="mt-3 text-sm text-white/70 leading-relaxed">
                  To install Vector as a native app on your iPhone or iPad:
                  <br /><br />
                  1. Tap the <strong>Share</strong> button in Safari toolbar at the bottom.<br />
                  2. Scroll down and tap <strong>Add to Home Screen</strong>.
                </p>
                <button
                  onClick={() => { uiTap(); setShowIOSGuide(false); }}
                  className="mt-6 w-full rounded-xl bg-white/10 hover:bg-white/15 py-3 text-sm font-bold text-white transition cursor-pointer"
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
