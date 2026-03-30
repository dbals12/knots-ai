import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassOrb from "@/components/GlassOrb";

const Landing = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => navigate("/input", { replace: true }), 400);
    }, 1000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className={`fixed inset-0 warm-gradient-bg flex flex-col items-center transition-opacity duration-400 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Orb — positioned at ~30-35% from top */}
      <div className="mt-[28vh] animate-float-up">
        <GlassOrb state="idle" size="w-[55vw] h-[55vw] max-w-[280px] max-h-[280px]" />
      </div>

      {/* Text below orb */}
      <div className="text-center mt-10 animate-float-up" style={{ animationDelay: "0.15s" }}>
        <h1 className="text-3xl md:text-4xl font-light text-foreground tracking-tight font-jost">
          Welcome to Knots !
        </h1>
        <p className="mt-5 text-sm text-muted-foreground font-light leading-relaxed">
          당신의 경험을 성장의 기록으로
          <br />
          남기고 싶은가요?
        </p>
      </div>
    </div>
  );
};

export default Landing;
