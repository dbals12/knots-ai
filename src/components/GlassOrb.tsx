/**
 * GlassOrb — volumetric 3D glass sphere.
 * The shell stays still (fixed light source = real 3D feel),
 * inner pastel cloud layers rotate inside to suggest spin.
 */

interface GlassOrbProps {
  state?: "idle" | "recording" | "text";
  size?: string;
}

const GlassOrb = ({ state = "idle", size = "w-40 h-40" }: GlassOrbProps) => {
  const floatClass =
    state === "recording"
      ? "animate-orb-float-strong"
      : "animate-orb-float";

  const innerSpeed =
    state === "recording" ? "6s" : state === "text" ? "10s" : "16s";
  const innerSpeedRev =
    state === "recording" ? "8s" : state === "text" ? "13s" : "20s";

  const glowOpacity =
    state === "recording" ? 0.95 : state === "text" ? 0.6 : 0.5;

  return (
    <div className={`relative ${size} flex-shrink-0 select-none pointer-events-none`}>
      {/* Outer ambient glow */}
      <div
        className="absolute inset-[-22%] rounded-full animate-orb-glow-pulse"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(circle, hsla(280,70%,85%,0.38) 0%, hsla(200,75%,88%,0.22) 45%, transparent 72%)`,
          filter: "blur(24px)",
        }}
      />

      {state === "recording" && (
        <div
          className="absolute inset-[-12%] rounded-full animate-orb-glow-pulse"
          style={{
            background: `radial-gradient(circle, hsla(330,75%,88%,0.32) 0%, transparent 65%)`,
            filter: "blur(14px)",
            animationDuration: "1.6s",
          }}
        />
      )}

      {/* Floating wrapper — gentle vertical bob, no rotation on shell */}
      <div className={`relative w-full h-full ${floatClass}`}>
        {/* Sphere shell — STATIC shading for true volumetric look */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden"
          style={{
            background: `radial-gradient(
              circle at 32% 28%,
              hsla(0, 0%, 100%, 0.98) 0%,
              hsla(40, 70%, 97%, 0.85) 10%,
              hsla(330, 55%, 92%, 0.65) 28%,
              hsla(280, 50%, 84%, 0.55) 50%,
              hsla(240, 55%, 70%, 0.55) 75%,
              hsla(250, 60%, 45%, 0.65) 100%
            )`,
            boxShadow: `
              inset -18px -28px 60px hsla(260, 50%, 35%, 0.45),
              inset 18px 22px 50px hsla(0, 0%, 100%, 0.75),
              inset 0 0 0 1px hsla(0, 0%, 100%, 0.35),
              0 22px 50px hsla(260, 50%, 40%, 0.28),
              0 6px 16px hsla(0, 0%, 0%, 0.12)
            `,
            border: "1px solid hsla(0,0%,100%,0.5)",
          }}
        >
          {/* Inner rotating cloud — pink/lavender (gives illusion of spin inside glass) */}
          <div
            className="absolute inset-[8%] rounded-full"
            style={{
              background: `radial-gradient(
                ellipse at 30% 60%,
                hsla(330, 75%, 80%, 0.55) 0%,
                hsla(280, 65%, 78%, 0.30) 35%,
                transparent 65%
              )`,
              animation: `orb-inner-spin ${innerSpeed} linear infinite`,
              filter: "blur(4px)",
            }}
          />

          {/* Counter-rotating mint/blue cloud */}
          <div
            className="absolute inset-[10%] rounded-full"
            style={{
              background: `radial-gradient(
                ellipse at 70% 40%,
                hsla(180, 60%, 82%, 0.45) 0%,
                hsla(220, 65%, 80%, 0.25) 38%,
                transparent 64%
              )`,
              animation: `orb-inner-spin ${innerSpeedRev} linear infinite reverse`,
              filter: "blur(5px)",
            }}
          />

          {/* Equator shadow band — sells the sphere curvature */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `linear-gradient(180deg,
                transparent 0%,
                transparent 55%,
                hsla(260, 40%, 25%, 0.18) 78%,
                hsla(260, 50%, 18%, 0.32) 100%
              )`,
              mixBlendMode: "multiply",
            }}
          />

          {/* Specular highlight — top-left, fixed */}
          <div
            className="absolute w-[44%] h-[30%] top-[8%] left-[14%] rounded-full"
            style={{
              background: `radial-gradient(ellipse at 40% 40%, hsla(0,0%,100%,0.95) 0%, hsla(0,0%,100%,0.4) 40%, transparent 75%)`,
              filter: "blur(3px)",
            }}
          />

          {/* Tiny sharp highlight dot */}
          <div
            className="absolute w-[10%] h-[10%] top-[14%] left-[22%] rounded-full"
            style={{
              background: `radial-gradient(circle, hsla(0,0%,100%,1) 0%, transparent 70%)`,
              filter: "blur(1px)",
            }}
          />

          {/* Bottom rim light — back-light bouncing up (subsurface feel) */}
          <div
            className="absolute w-[70%] h-[18%] bottom-[6%] left-[15%] rounded-full"
            style={{
              background: `radial-gradient(ellipse, hsla(320, 80%, 85%, 0.55) 0%, transparent 70%)`,
              filter: "blur(6px)",
            }}
          />

          {/* Right edge rim catch */}
          <div
            className="absolute w-[6%] h-[40%] top-[30%] right-[4%] rounded-full"
            style={{
              background: `linear-gradient(180deg, transparent, hsla(0,0%,100%,0.55), transparent)`,
              filter: "blur(2px)",
            }}
          />
        </div>

        {/* Contact shadow on ground */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-[8%] w-[70%] h-[10%] rounded-full"
          style={{
            background: `radial-gradient(ellipse, hsla(260, 40%, 25%, 0.28) 0%, transparent 70%)`,
            filter: "blur(8px)",
          }}
        />
      </div>
    </div>
  );
};

export default GlassOrb;
