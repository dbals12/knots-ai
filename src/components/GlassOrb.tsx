/**
 * GlassOrb — organic liquid "knot" shape with soft pastel blend.
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

  const glowOpacity =
    state === "recording" ? 0.5 : state === "text" ? 0.25 : 0.2;

  return (
    <div className={`relative ${size} flex-shrink-0 select-none pointer-events-none`}>
      {/* Outer subtle glow */}
      <div
        className="absolute inset-[-12%] rounded-full animate-orb-glow-pulse"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(circle, hsla(260,30%,80%,0.25) 0%, hsla(300,20%,85%,0.1) 50%, transparent 70%)`,
          filter: "blur(16px)",
        }}
      />

      {/* Main sphere — organic glass knot */}
      <div
        className={`relative w-full h-full rounded-full ${animClass} overflow-hidden`}
        style={{
          background: `radial-gradient(
            ellipse at 38% 32%,
            hsla(0, 0%, 100%, 0.9) 0%,
            hsla(0, 0%, 100%, 0.6) 15%,
            hsla(260, 15%, 92%, 0.35) 35%,
            hsla(300, 10%, 90%, 0.2) 55%,
            hsla(260, 10%, 88%, 0.1) 75%,
            transparent 100%
          )`,
          boxShadow: `
            inset 0 -20px 40px hsla(260,15%,88%,0.12),
            inset 0 20px 40px hsla(0,0%,100%,0.5),
            0 8px 32px hsla(0,0%,0%,0.03)
          `,
          border: "1px solid hsla(0,0%,100%,0.6)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Inner pastel blend — subtle purple/pink */}
        <div
          className="absolute inset-0 rounded-full animate-orb-inner-flow"
          style={{
            background: `radial-gradient(
              circle at 48% 52%,
              hsla(260, 40%, 75%, 0.2) 0%,
              hsla(300, 30%, 80%, 0.12) 25%,
              hsla(260, 20%, 85%, 0.06) 45%,
              transparent 60%
            )`,
          }}
        />

        {/* Secondary swirl layer */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(
              ellipse at 60% 40%,
              hsla(280, 25%, 80%, 0.12) 0%,
              hsla(320, 20%, 85%, 0.08) 30%,
              transparent 55%
            )`,
            animation: "orb-inner-flow 18s linear infinite reverse",
          }}
        />

        {/* Specular highlight — top left */}
        <div
          className="absolute w-[45%] h-[30%] top-[8%] left-[12%] rounded-full"
          style={{
            background: `linear-gradient(180deg, hsla(0,0%,100%,0.7) 0%, transparent 100%)`,
            filter: "blur(6px)",
          }}
        />

        {/* Secondary rim light */}
        <div
          className="absolute w-[18%] h-[12%] bottom-[18%] right-[18%] rounded-full"
          style={{
            background: `radial-gradient(circle, hsla(0,0%,100%,0.2) 0%, transparent 70%)`,
            filter: "blur(4px)",
          }}
        />
      </div>
    </div>
  );
};

export default GlassOrb;
