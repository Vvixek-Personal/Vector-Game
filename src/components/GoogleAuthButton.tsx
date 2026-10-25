import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth, signInWithGoogle, signOut, signInAsGuest } from "../firebase/auth";
import { uiTap, uiConfirm } from "../game/haptics";
import { LogOut, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { popoverVariants } from "../utils/motion";

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
      <div className="header-chip" role="status">
        <span>Connecting…</span>
      </div>
    );
  }

  // Already Signed In with Google
  if (user && !isAnonymous) {
    return (
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            uiTap();
            setShowMenu(!showMenu);
          }}
          className="header-chip"
          aria-expanded={showMenu}
          aria-haspopup="menu"
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
            <div
              className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold"
              style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
            >
              {user.displayName?.charAt(0) || "G"}
            </div>
          )}

          <span className="max-w-[110px] truncate">{user.displayName?.split(" ")[0] || "Operative"}</span>
          <ShieldCheck size={13} className="shrink-0" style={{ color: "var(--good)" }} />
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              variants={popoverVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="menu"
              className="surface-card absolute right-0 top-full z-50 mt-2 w-60 p-3 text-left"
            >
              <div className="flex items-center gap-2.5 border-b pb-2.5" style={{ borderColor: "var(--panel-border)" }}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-white/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold"
                    style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                  >
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold txt">
                    {user.displayName || "Google player"}
                  </div>
                  <div className="truncate text-[10.5px] faint">{user.email}</div>
                </div>
              </div>

              <div className="my-3 space-y-1 px-1 text-[11px]">
                <div className="flex items-center gap-1.5 font-medium" style={{ color: "var(--good)" }}>
                  <CheckCircle2 size={13} />
                  <span>Leaderboard sync on</span>
                </div>
                <div className="t-caption">Finished runs submit to the global board.</div>
              </div>

              <button onClick={handleSignOut} className="dialog-btn dialog-btn-sm w-full">
                <LogOut size={13} />
                <span>Sign out</span>
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
        whileTap={{ scale: 0.97 }}
        onClick={handleGoogleSignIn}
        disabled={inProgress}
        className={`header-chip ${compact ? "" : "header-chip-lg"}`}
        style={{ color: "var(--text)" }}
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
            variants={popoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="alert"
            className="surface-card absolute right-0 top-full z-50 mt-2 w-64 p-3"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0" style={{ color: "#e08b9b" }} />
              <div className="text-[11.5px] leading-snug" style={{ color: "var(--text-dim)" }}>
                {errorMsg}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
