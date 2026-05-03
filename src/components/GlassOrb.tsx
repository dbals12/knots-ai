/**
 * GlassOrb — transparent volumetric 3D glass sphere.
 * Shell stays static (fixed light = real 3D feel).
 * Inner pastel layers rotate on multiple axes to suggest spatial spin.
 */

interface GlassOrbProps {
  state?: "idle" | "recording" | "text";
  size?: string;
}

const GlassOrb = ({ state = "idle", size = "w-40 h-40" }: GlassOrbProps) => {
  const spinSpeed =
    state === "recording" ? "8s" : state === "text" ? "14s" : "20s";
  const spinSpeedRev =
    state === "recording" ? "11s" : state === "text" ? "18s" : "26s";
  const tiltSpeed =
    state === "recording" ? "5s" : state === "text" ? "9s" : "13s";

  const glowOpacity =
    state === "recording" ? 0.7 : state === "text" ? 0.45 : 0.35;

  return (
    <div
      className={`relative ${size} flex-shrink-0 select-none pointer-events-none`}
      style={{ perspective: "800px" }}
    >
      {/* Outer ambient glow — soft & subtle */}
      <div
        className="absolute inset-[-18%] rounded-full animate-orb-glow-pulse"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(circle, hsla(220,60%,90%,0.35) 0%, hsla(280,50%,92%,0.18) 50%, transparent 75%)`,
          filter: "blur(22px)",
        }}
      />

      {/* 3D tilt wrapper — gives spatial rotation feel */}
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          animation: `orb-tilt ${tiltSpeed} ease-in-out infinite`,
        }}
      >
        {/* Sphere shell — slightly squished organic blob */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: "58% 42% 54% 46% / 48% 52% 44% 56%",
            animation: `orb-morph 7s ease-in-out infinite`,
            background: `radial-gradient(
              circle at 32% 28%,
              hsla(0, 0%, 100%, 0.85) 0%,
              hsla(0, 0%, 100%, 0.35) 18%,
              hsla(220, 40%, 92%, 0.18) 45%,
              hsla(240, 35%, 80%, 0.20) 75%,
              hsla(240, 40%, 60%, 0.30) 100%
            )`,
            boxShadow: `
              inset -14px -22px 48px hsla(240, 35%, 50%, 0.22),
              inset 14px 18px 40px hsla(0, 0%, 100%, 0.55),
              inset 0 0 0 1px hsla(0, 0%, 100%, 0.3),
              0 16px 40px hsla(240, 30%, 50%, 0.18),
              0 4px 12px hsla(0, 0%, 0%, 0.08)
            `,
            border: "1px solid hsla(0,0%,100%,0.4)",
            backdropFilter: "blur(2px)",
          }}
        >
          {/* Inner spinning band — gives orbital spin illusion */}
          <div
            className="absolute inset-[6%] rounded-full"
            style={{
              background: `radial-gradient(
                ellipse 60% 30% at 50% 50%,
                hsla(220, 60%, 88%, 0.35) 0%,
                hsla(260, 50%, 88%, 0.18) 50%,
                transparent 75%
              )`,
              animation: `orb-spin-3d ${spinSpeed} linear infinite`,
              transformStyle: "preserve-3d",
              filter: "blur(3px)",
            }}
          />

          {/* Counter-spinning band on opposite axis */}
          <div
            className="absolute inset-[8%] rounded-full"
            style={{
              background: `radial-gradient(
                ellipse 30% 60% at 50% 50%,
                hsla(200, 55%, 90%, 0.30) 0%,
                hsla(180, 45%, 88%, 0.15) 50%,
                transparent 75%
              )`,
              animation: `orb-spin-3d-rev ${spinSpeedRev} linear infinite`,
              transformStyle: "preserve-3d",
              filter: "blur(4px)",
            }}
          />

          {/* Equator shadow — sells curvature */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `linear-gradient(180deg,
                transparent 0%,
                transparent 60%,
                hsla(240, 30%, 30%, 0.10) 82%,
                hsla(240, 35%, 22%, 0.20) 100%
              )`,
              mixBlendMode: "multiply",
            }}
          />

          {/* Specular highlight — top-left, fixed (real light source) */}
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

          {/* Bottom rim subsurface light */}
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

        {/* Contact shadow */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-[6%] w-[65%] h-[8%] rounded-full"
          style={{
            background: `radial-gradient(ellipse, hsla(240, 30%, 30%, 0.22) 0%, transparent 70%)`,
            filter: "blur(7px)",
          }}
        />
      </div>
    </div>
  );
};

export default GlassOrb;
