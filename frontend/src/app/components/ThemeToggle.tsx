import { motion, useReducedMotion } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/theme";

const TRACK_W = 52;
const TRACK_H = 26;
const PAD = 3;
const THUMB = TRACK_H - PAD * 2;
const TRAVEL = TRACK_W - THUMB - PAD * 2;

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const reduceMotion = useReducedMotion();

  return (
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative shrink-0"
      style={{
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: 999,
        // A touch lighter/darker than --nav-surface (not equal to it) in
        // each theme, so the pill visibly separates from the header instead
        // of blending into it.
        background: isDark
          ? "linear-gradient(180deg, #232B26 0%, #1A211D 100%)"
          : "linear-gradient(180deg, #FFFFFF 0%, #E9ECE3 100%)",
        border: isDark ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(43,52,34,0.22)",
        boxShadow: isDark
          ? "inset 0 1px 3px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)"
          : "inset 0 1px 2px rgba(43,52,34,0.10), inset 0 0 0 1px rgba(255,255,255,0.6), 0 2px 5px rgba(43,52,34,0.16), 0 1px 2px rgba(43,52,34,0.08)",
        transition: "background 0.35s ease-in-out, box-shadow 0.35s ease-in-out, border-color 0.35s ease-in-out",
      }}
    >
      {/* Sliding thumb — spring position + a brief squash/stretch while it
          travels. Rendered *behind* the icons below so whichever icon it
          parks under stays visible on top of it, instead of being covered. */}
      <motion.span
        className="absolute rounded-full pointer-events-none"
        style={{
          top: PAD,
          left: PAD,
          width: THUMB,
          height: THUMB,
          background: isDark
            ? "linear-gradient(155deg, #333D35 0%, #1A211D 100%)"
            : "linear-gradient(155deg, #FFFFFF 0%, #F1EEE6 100%)",
          boxShadow: isDark
            ? "0 1px 3px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)"
            : "0 1px 3px rgba(43,52,34,0.28), 0 0 0 1px rgba(255,255,255,0.7)",
        }}
        animate={
          reduceMotion
            ? { x: isDark ? TRAVEL : 0 }
            : { x: isDark ? TRAVEL : 0, scaleX: [1, 1.22, 1], scaleY: [1, 0.85, 1] }
        }
        transition={
          reduceMotion
            ? { duration: 0.15 }
            : {
                x: { type: "spring", stiffness: 180, damping: 20, mass: 1 },
                scaleX: { duration: 0.38, ease: "easeInOut" },
                scaleY: { duration: 0.38, ease: "easeInOut" },
              }
        }
      />

      {/* Track icons — always both present; the inactive one just dims.
          Sized ~15-20% larger than before (13→15, 12→14) with a bolder
          stroke so they read clearly at a glance, still centered on the
          thumb's resting position on each side. */}
      <Sun
        size={15}
        strokeWidth={2.5}
        className="absolute top-1/2"
        style={{
          left: PAD + 1,
          transform: "translateY(-50%)",
          color: isDark ? "var(--ink)" : "var(--gold)",
          opacity: isDark ? 0.32 : 1,
          transition: "opacity 0.35s ease-in-out, color 0.35s ease-in-out",
        }}
      />
      <Moon
        size={14}
        strokeWidth={2.5}
        className="absolute top-1/2"
        style={{
          right: PAD + 1,
          transform: "translateY(-50%)",
          color: isDark ? "var(--gold-soft)" : "var(--ink)",
          opacity: isDark ? 1 : 0.32,
          transition: "opacity 0.35s ease-in-out, color 0.35s ease-in-out",
        }}
      />
    </button>
  );
}
