import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth, signInWithGoogle, signOut, signInAsGuest } from "../firebase/auth";
import { uiTap, uiConfirm } from "../game/haptics";
import { LogIn, LogOut, CheckCircle2, User, AlertCircle, ShieldCheck } from "lucide-react";

interface Props {
  compact?: boolean;
  onSuccess?: (user: any) => void;
}

export default function GoogleAuthButton({ compact = false, onSuccess }: Props) {
  const { user, loading, isAnonymous } = useAuth();
  const [inProgress, setInProgress] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const handleGoogleSignIn = async () => {
    uiConfirm();
    setErrorMsg("");
    setInProgress(true);
    try {
      const loggedUser = await signInWithGoogle();
      if (onSuccess) onSuccess(loggedUser);
    } catch (err: any) {
      console.warn("Google sign-in attempt:", err);
      setErrorMsg(err.message || "Failed to sign in with Google.");
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setInProgress(false);
    }
  };

  const handleSignOut = async () => {
    uiTap();
    setShowMenu(false);
    try {
      await signOut();
    } catch (err) {
      console.warn("Sign out error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/50 animate-pulse">
        <span>Connecting Auth...</span>
      </div>
    );
  }

  // Already Signed In with Google
  if (user && !isAnonymous) {
    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            uiTap();
            setShowMenu(!showMenu);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-sky-500/10 hover:bg-white/15 border border-emerald-500/30 text-xs font-bold text-white transition cursor-pointer shadow-sm"
          title={`Signed in as ${user.displayName || user.email}`}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="w-5 h-5 rounded-full object-cover border border-white/30"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-[10px] font-black">
              {user.displayName?.charAt(0) || "G"}
            </div>
          )}

          <span className="max-w-[110px] truncate">{user.displayName?.split(" ")[0] || "Operative"}</span>
          <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-slate-900 border border-white/15 p-3 shadow-2xl z-50 text-left"
            >
              <div className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-white/10">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-white/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-sm">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {user.displayName || "Google Runner"}
                  </div>
                  <div className="text-[10px] text-white/50 truncate">{user.email}</div>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-white/70 mb-3 px-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 size={13} />
                  <span>Real Data Leaderboard active</span>
                </div>
                <div className="text-white/40 text-[10px]">
                  Scores auto-submit to Global Leaderboard.
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Not Signed In
  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleGoogleSignIn}
        disabled={inProgress}
        className={`flex items-center gap-2 rounded-xl bg-white text-black hover:bg-white/95 font-bold transition cursor-pointer shadow-lg disabled:opacity-50 ${
          compact ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-xs sm:text-sm"
        }`}
      >
        {/* Official Google SVG Logo */}
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>

        <span>{inProgress ? "Signing in..." : "Google Sign-In"}</span>
      </motion.button>

      {/* Error Popup */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute right-0 top-full mt-2 w-64 p-3 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs shadow-2xl z-50 flex items-start gap-2"
          >
            <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMsg}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
