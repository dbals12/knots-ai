/**
 * GlassOrb — a decorative, state-reactive glass sphere.
 * NOT clickable. Purely visual: breathing / recording / text states.
 */

interface GlassOrbProps {
  /** "idle" | "recording" | "text" */
  state?: "idle" | "recording" | "text";
  /** CSS size class, e.g. "w-40 h-40" */
  size?: string;
}

const GlassOrb = ({ state = "idle", size = "w-40 h-40" }: GlassOrbProps) => {
  const animClass =
    state === "recording"
      ? "animate-orb-recording"
      : state === "text"
        ? "animate-orb-text"
        : "animate-orb-breathe";

  const glowOpacity = state === "recording" ? "opacity-60" : "opacity-25";

  return (
    <div className={`relative ${size} flex-shrink-0 select-none pointer-events-none`}>
      {/* Outer glow */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(340,50%,85%)] via-[hsl(30,60%,88%)] to-[hsl(38,50%,82%)] blur-2xl ${glowOpacity} animate-orb-glow-pulse`}
      />

      {/* Main sphere */}
      <div
        className={`relative ${size} rounded-full ${animClass} overflow-hidden`}
        style={{
          background: `radial-gradient(
            ellipse at 35% 30%,
            hsla(0, 0%, 100%, 0.9) 0%,
            hsla(340, 40%, 90%, 0.7) 25%,
            hsla(30, 50%, 85%, 0.6) 50%,
            hsla(38, 45%, 78%, 0.5) 75%,
            hsla(340, 30%, 82%, 0.4) 100%
          )`,
          boxShadow: `
            inset 0 -20px 40px hsla(340,30%,80%,0.25),
            inset 0 20px 40px hsla(0,0%,100%,0.5),
            0 10px 40px hsla(340,30%,70%,0.15),
            0 2px 12px hsla(0,0%,0%,0.06)
          `,
        }}
      >
        {/* Inner light flow */}
        <div
          className="absolute w-[60%] h-[60%] top-[20%] left-[20%] rounded-full animate-orb-inner-flow"
          style={{
            background: `radial-gradient(circle, hsla(0,0%,100%,0.45) 0%, transparent 70%)`,
          }}
        />

        {/* Specular highlight */}
        <div
          className="absolute w-[45%] h-[30%] top-[12%] left-[18%] rounded-full"
          style={{
            background: `linear-gradient(180deg, hsla(0,0%,100%,0.7) 0%, transparent 100%)`,
            filter: "blur(6px)",
          }}
        />
      </div>
    </div>
  );
};

export default GlassOrb;
