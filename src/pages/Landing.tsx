import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassOrb from "@/components/GlassOrb";
import { ChevronDown } from "lucide-react";

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
      className={`fixed inset-0 warm-gradient-bg flex flex-col items-center justify-center transition-opacity duration-400 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Headline */}
      <div className="text-center mb-8 animate-float-up">
        <h1 className="text-4xl md:text-5xl font-light text-foreground tracking-tight font-jost leading-tight">
          Welcome to
          <br />
          Knots!
        </h1>
        <p className="mt-4 text-sm md:text-base text-muted-foreground">
          당신의 경험을 성장의 기록으로 남기고 싶은가요?
        </p>
      </div>

      {/* Orb */}
      <div className="animate-float-up" style={{ animationDelay: "0.2s" }}>
        <GlassOrb state="idle" size="w-48 h-48 md:w-56 md:h-56" />
      </div>

      {/* Down arrow hint */}
      <button
        onClick={() => navigate("/input", { replace: true })}
        className="absolute bottom-10 text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
      >
        <ChevronDown className="w-6 h-6 animate-bounce" />
      </button>
    </div>
  );
};

export default Landing;
