import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  isGuest?: boolean;
}

const Header = ({ isGuest = false }: HeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="relative flex items-center justify-center px-5 py-3.5">
      {/* Left: Back */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="absolute left-4 w-8 h-8 rounded-full hover:bg-muted/60"
      >
        <ChevronLeft className="w-5 h-5 text-foreground/60" />
      </Button>

      {/* Center: Logo */}
      <button
        onClick={() => navigate("/")}
        className="text-base font-normal tracking-wide text-foreground/80 font-jost"
      >
        knots
      </button>

      {/* Right: Theme icon */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 w-8 h-8 rounded-full hover:bg-muted/60"
      >
        <Sun className="w-4 h-4 text-foreground/50" />
      </Button>
    </header>
  );
};

export default Header;
