/**
 * GlassOrb — true 3D glass blob.
 * Light source (highlights/rim/shadow) stays FIXED on the outer shell,
 * while only the inner content rocks in 3D space — so the eye reads
 * volume + spatial rotation instead of a flat spinning disc.
 */

interface GlassOrbProps {
  state?: "idle" | "recording" | "text";
  size?: string;
}

const GlassOrb = ({ state = "idle", size = "w-40 h-40" }: GlassOrbProps) => {
  const tiltSpeed =
    state === "recording" ? "6s" : state === "text" ? "10s" : "14s";
  const innerSpeed =
    state === "recording" ? "7s" : state === "text" ? "11s" : "16s";

  const glowOpacity =
    state === "recording" ? 0.7 : state === "text" ? 0.45 : 0.35;

  return (
    <div
      className={`relative ${size} flex-shrink-0 select-none pointer-events-none`}
      style={{ perspective: "900px", perspectiveOrigin: "50% 40%" }}
    >
      {/* Ambient glow (fixed) */}
      <div
        className="absolute inset-[-18%] rounded-full animate-orb-glow-pulse"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(circle, hsla(220,60%,90%,0.35) 0%, hsla(280,50%,92%,0.18) 50%, transparent 75%)`,
          filter: "blur(22px)",
        }}
      />

      {/* === 3D rocking blob (only the BODY moves; light stays fixed below) === */}
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          animation: `orb-tilt ${tiltSpeed} ease-in-out infinite`,
          willChange: "transform",
        }}
      >
        {/* Blob body — base tint + morphing silhouette */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: "58% 42% 54% 46% / 48% 52% 44% 56%",
            animation: `orb-morph 9s ease-in-out infinite`,
            background: `radial-gradient(
              circle at 50% 50%,
              hsla(0, 0%, 100%, 0.55) 0%,
              hsla(220, 40%, 92%, 0.22) 45%,
              hsla(240, 40%, 70%, 0.28) 100%
            )`,
            backdropFilter: "blur(2px)",
            border: "1px solid hsla(0,0%,100%,0.35)",
          }}
        >
          {/* Inner cloud A — rocks in 3D inside the blob */}
          <div
            className="absolute inset-[6%] rounded-full"
            style={{
              background: `radial-gradient(
                ellipse 70% 40% at 50% 50%,
                hsla(220, 60%, 88%, 0.45) 0%,
                hsla(260, 50%, 88%, 0.20) 50%,
                transparent 75%
              )`,
              animation: `orb-inner-rock ${innerSpeed} ease-in-out infinite`,
              transformStyle: "preserve-3d",
              filter: "blur(3px)",
            }}
          />

          {/* Inner cloud B — opposite axis */}
          <div
            className="absolute inset-[10%] rounded-full"
            style={{
              background: `radial-gradient(
                ellipse 40% 70% at 50% 50%,
                hsla(200, 55%, 92%, 0.35) 0%,
                hsla(180, 45%, 88%, 0.18) 50%,
                transparent 75%
              )`,
              animation: `orb-inner-rock-rev ${innerSpeed} ease-in-out infinite`,
              transformStyle: "preserve-3d",
              filter: "blur(4px)",
            }}
          />
        </div>
      </div>

      {/* === FIXED light source (sits on top, never rotates) === */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Equator/bottom shading — sells curvature */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: "58% 42% 54% 46% / 48% 52% 44% 56%",
            background: `linear-gradient(180deg,
              transparent 0%,
              transparent 58%,
              hsla(240, 30%, 30%, 0.12) 82%,
              hsla(240, 35%, 22%, 0.22) 100%
            )`,
            mixBlendMode: "multiply",
          }}
        />

        {/* Inner rim shadow — gives glass thickness */}
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{
            boxShadow: `
              inset -14px -22px 48px hsla(240, 35%, 50%, 0.22),
              inset 14px 18px 40px hsla(0, 0%, 100%, 0.55)
            `,
          }}
        />

        {/* Specular highlight — top-left */}
        <div
          className="absolute w-[42%] h-[28%] top-[10%] left-[16%] rounded-full"
          style={{
            background: `radial-gradient(ellipse at 40% 40%, hsla(0,0%,100%,0.9) 0%, hsla(0,0%,100%,0.3) 45%, transparent 75%)`,
            filter: "blur(2px)",
          }}
        />

        {/* Sharp highlight dot */}
        <div
          className="absolute w-[8%] h-[8%] top-[16%] left-[24%] rounded-full"
          style={{
            background: `radial-gradient(circle, hsla(0,0%,100%,1) 0%, transparent 70%)`,
          }}
        />

        {/* Bottom subsurface bounce */}
        <div
          className="absolute w-[68%] h-[16%] bottom-[8%] left-[16%] rounded-full"
          style={{
            background: `radial-gradient(ellipse, hsla(220, 70%, 92%, 0.4) 0%, transparent 70%)`,
            filter: "blur(5px)",
          }}
        />

        {/* Right edge rim catch */}
        <div
          className="absolute w-[5%] h-[38%] top-[31%] right-[5%] rounded-full"
          style={{
            background: `linear-gradient(180deg, transparent, hsla(0,0%,100%,0.5), transparent)`,
            filter: "blur(2px)",
          }}
        />
      </div>

      {/* Contact shadow on ground (fixed) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-[6%] w-[65%] h-[8%] rounded-full"
        style={{
          background: `radial-gradient(ellipse, hsla(240, 30%, 30%, 0.22) 0%, transparent 70%)`,
          filter: "blur(7px)",
        }}
      />
    </div>
  );
};

export default GlassOrb;
