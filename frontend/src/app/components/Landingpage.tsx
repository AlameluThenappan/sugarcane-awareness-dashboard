import { motion } from "motion/react";
import { Leaf, MapPin, TrendingUp, FlaskConical, CloudSun, ArrowRight } from "lucide-react";

const FEATURES = [
  { icon: MapPin, label: "GPS Farmer Mapping" },
  { icon: TrendingUp, label: "Yield & Ratoon Analytics" },
  { icon: FlaskConical, label: "Fertilizer Tracking" },
  { icon: CloudSun, label: "Climate Impact Insights" },
];

export function LandingPage({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen w-full relative overflow-hidden flex flex-col"
    >
      {/* Ambient branded background — served from /public, no bundler import */}
      <img
        src="/data/overview-img.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        onError={() => console.error("overview-img.png failed to load — check it's actually at frontend/public/data/overview-img.png")}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#DBC593" }}
          >
            <Leaf size={16} style={{ color: "#1A2013" }} strokeWidth={2.5} />
          </div>
          <span className="text-white font-semibold text-sm tracking-wide" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>EDF Sugarcane</span>
        </div>
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 -mt-16">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3"
          style={{ color: "#DBC593", textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}
        >
          Environmental Defense Fund
        </span>
        <h1
          className="text-white text-4xl md:text-6xl font-bold font-outfit tracking-tight leading-[1.1] max-w-3xl mb-5"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}
        >
          Sugarcane Analytics Platform
        </h1>
        <p
          className="text-white/90 text-base md:text-lg max-w-xl mb-10"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
        >
          Real-time farmer surveys, yield tracking, and climate impact across
          the Erode district — from field data to actionable insight.
        </p>

        <button
          type="button"
          onClick={onLoginClick}
          className="relative z-20 flex items-center gap-2 font-semibold text-sm rounded-full px-8 py-3.5 mb-14 transition-opacity hover:opacity-90 cursor-pointer"
          style={{ background: "#DBC593", color: "#1A2013" }}
        >
          View Dashboard <ArrowRight size={15} />
        </button>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl w-full">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-2xl px-4 py-5"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
              }}
            >
              <Icon size={20} style={{ color: "#DBC593" }} strokeWidth={2} />
              <span className="text-white/80 text-xs font-medium leading-snug">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-2 pb-8">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white/40 text-[11px] font-medium tracking-wide">
          System Status: Live
        </span>
      </div>
    </motion.div>
  );
}