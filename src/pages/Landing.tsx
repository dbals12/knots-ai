import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassOrb from "@/components/GlassOrb";

const Landing = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => navigate("/input", { replace: true }), 600);
    }, 1000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className={`fixed inset-0 bg-background flex flex-col items-center transition-opacity duration-[600ms] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Orb — positioned at ~28% from top */}
      <div className="mt-[28vh] animate-float-up">
        <GlassOrb state="idle" size="w-[220px] h-[220px]" />
      </div>

      {/* Text below orb */}
      <div className="text-center mt-[60px] animate-float-up" style={{ animationDelay: "0.15s" }}>
        <h1 className="text-[28px] font-medium text-foreground tracking-tight">
          Welcome to <span className="font-jost font-normal">Knots</span> !
        </h1>
        <p className="mt-3 text-sm text-muted-foreground font-normal leading-relaxed">
          당신의 경험을
          <br />
          성장의 기록으로 남기고 싶은가요?
        </p>
      </div>
    </div>
  );
};

export default Landing;
