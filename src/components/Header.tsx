import { useNavigate } from "react-router-dom";
import { ChevronLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  isGuest?: boolean;
}

const Header = ({ isGuest = false }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="relative flex items-center justify-center h-14 px-5">
      {/* Left: Back */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="absolute left-4 w-8 h-8 rounded-full hover:bg-muted/60"
      >
        <ChevronLeft className="w-5 h-5 text-foreground/50" />
      </Button>

      {/* Center: Logo */}
      <button
        onClick={() => navigate("/")}
        className="text-base font-medium tracking-wide text-foreground"
      >
        knots
      </button>

      {/* Right: Profile icon */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(isGuest ? "/login" : "/settings")}
        className="absolute right-4 w-8 h-8 rounded-full hover:bg-muted/60"
      >
        <User className="w-4 h-4 text-foreground/50" />
      </Button>
    </header>
  );
};

export default Header;
