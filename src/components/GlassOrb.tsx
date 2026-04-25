/**
 * GlassOrb — monochrome glass sphere with stronger contrast and visible motion.
 * NOT clickable. Purely visual state indicator.
 */

interface GlassOrbProps {
  state?: "idle" | "recording" | "text";
  size?: string;
}

const GlassOrb = ({ state = "idle", size = "w-40 h-40" }: GlassOrbProps) => {
  const animClass =
    state === "recording"
      ? "animate-orb-recording"
      : state === "text"
        ? "animate-orb-text"
        : "animate-orb-breathe";

  // Stronger glow contrast in monochrome (gray) tones
  const glowOpacity =
    state === "recording" ? 0.95 : state === "text" ? 0.55 : 0.45;

  return (
    <div className={`relative ${size} flex-shrink-0 select-none pointer-events-none`}>
      {/* Outer pulse ring — clearly visible */}
      <div
        className="absolute inset-[-18%] rounded-full animate-orb-glow-pulse"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(circle, hsla(0,0%,30%,0.28) 0%, hsla(0,0%,40%,0.12) 45%, transparent 72%)`,
          filter: "blur(18px)",
        }}
      />

      {/* Secondary breathing ring (only when recording) for clear motion */}
      {state === "recording" && (
        <div
          className="absolute inset-[-10%] rounded-full animate-orb-glow-pulse"
          style={{
            background: `radial-gradient(circle, hsla(0,0%,15%,0.25) 0%, transparent 65%)`,
            filter: "blur(10px)",
            animationDuration: "1.6s",
          }}
        />
      )}

      {/* Main sphere */}
      <div
        className={`relative w-full h-full rounded-full ${animClass} overflow-hidden`}
        style={{
          background: `radial-gradient(
            ellipse at 38% 32%,
            hsla(0, 0%, 100%, 0.95) 0%,
            hsla(0, 0%, 96%, 0.75) 18%,
            hsla(0, 0%, 78%, 0.55) 40%,
            hsla(0, 0%, 55%, 0.42) 65%,
            hsla(0, 0%, 30%, 0.35) 88%,
            hsla(0, 0%, 18%, 0.30) 100%
          )`,
          boxShadow: `
            inset 0 -24px 48px hsla(0,0%,10%,0.28),
            inset 0 22px 44px hsla(0,0%,100%,0.65),
            0 14px 40px hsla(0,0%,0%,0.18),
            0 4px 12px hsla(0,0%,0%,0.12)
          `,
          border: "1px solid hsla(0,0%,100%,0.7)",
          backdropFilter: "blur(14px)",
        }}
      >
        {/* Inner moving swirl — clearly visible monochrome */}
        <div
          className="absolute inset-0 rounded-full animate-orb-inner-flow"
          style={{
            background: `radial-gradient(
              circle at 50% 55%,
              hsla(0, 0%, 25%, 0.35) 0%,
              hsla(0, 0%, 40%, 0.22) 25%,
              hsla(0, 0%, 60%, 0.10) 50%,
              transparent 65%
            )`,
          }}
        />

        {/* Counter-rotating layer for depth */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(
              ellipse at 62% 42%,
              hsla(0, 0%, 15%, 0.20) 0%,
              hsla(0, 0%, 35%, 0.10) 35%,
              transparent 60%
            )`,
            animation: "orb-inner-flow 14s linear infinite reverse",
          }}
        />

        {/* Specular highlight — top left */}
        <div
          className="absolute w-[48%] h-[32%] top-[8%] left-[12%] rounded-full"
          style={{
            background: `linear-gradient(180deg, hsla(0,0%,100%,0.92) 0%, transparent 100%)`,
            filter: "blur(5px)",
          }}
        />

        {/* Bottom rim shadow for depth */}
        <div
          className="absolute w-[60%] h-[20%] bottom-[6%] left-[20%] rounded-full"
          style={{
            background: `radial-gradient(ellipse, hsla(0,0%,0%,0.18) 0%, transparent 70%)`,
            filter: "blur(6px)",
          }}
        />

        {/* Small bottom-right rim light */}
        <div
          className="absolute w-[18%] h-[12%] bottom-[20%] right-[16%] rounded-full"
          style={{
            background: `radial-gradient(circle, hsla(0,0%,100%,0.45) 0%, transparent 70%)`,
            filter: "blur(3px)",
          }}
        />
      </div>
    </div>
  );
};

export default GlassOrb;
