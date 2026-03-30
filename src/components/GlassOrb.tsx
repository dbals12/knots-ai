/**
 * GlassOrb — transparent glass sphere with subtle purple/blue center glow.
 * NOT clickable. Purely visual.
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

  const glowIntensity =
    state === "recording" ? "opacity-50" : state === "text" ? "opacity-25" : "opacity-20";

  return (
    <div className={`relative ${size} flex-shrink-0 select-none pointer-events-none`}>
      {/* Outer subtle glow */}
      <div
        className={`absolute inset-[-8%] rounded-full ${glowIntensity} animate-orb-glow-pulse`}
        style={{
          background: `radial-gradient(circle, hsla(260,40%,75%,0.3) 0%, hsla(260,30%,80%,0.1) 50%, transparent 70%)`,
          filter: "blur(12px)",
        }}
      />

      {/* Main sphere — transparent glass */}
      <div
        className={`relative w-full h-full rounded-full ${animClass} overflow-hidden`}
        style={{
          background: `radial-gradient(
            ellipse at 35% 30%,
            hsla(0, 0%, 100%, 0.85) 0%,
            hsla(0, 0%, 100%, 0.5) 20%,
            hsla(260, 20%, 95%, 0.3) 40%,
            hsla(260, 15%, 90%, 0.15) 60%,
            hsla(0, 0%, 100%, 0.08) 80%,
            transparent 100%
          )`,
          boxShadow: `
            inset 0 -15px 30px hsla(260,20%,85%,0.15),
            inset 0 15px 30px hsla(0,0%,100%,0.4),
            0 8px 32px hsla(0,0%,0%,0.04),
            0 1px 8px hsla(0,0%,0%,0.03)
          `,
          border: "1px solid hsla(0,0%,100%,0.5)",
        }}
      >
        {/* Center purple/blue glow */}
        <div
          className="absolute inset-0 rounded-full animate-orb-inner-flow"
          style={{
            background: `radial-gradient(circle at 50% 50%, hsla(260,50%,70%,0.25) 0%, hsla(260,40%,75%,0.1) 30%, transparent 55%)`,
          }}
        />

        {/* Specular highlight — top left */}
        <div
          className="absolute w-[40%] h-[28%] top-[10%] left-[15%] rounded-full"
          style={{
            background: `linear-gradient(180deg, hsla(0,0%,100%,0.6) 0%, transparent 100%)`,
            filter: "blur(5px)",
          }}
        />

        {/* Secondary subtle rim highlight */}
        <div
          className="absolute w-[20%] h-[15%] bottom-[15%] right-[20%] rounded-full"
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
