import { useNavigate } from "react-router-dom";
import { ChevronLeft, User, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface HeaderProps {
  isGuest?: boolean;
}

const Header = ({ isGuest = false }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isLoggedIn = !!user && !isGuest;

  const handleAuthClick = async () => {
    if (isLoggedIn) {
      await signOut();
      toast({ title: "로그아웃되었습니다" });
      navigate("/");
    } else {
      navigate("/login");
    }
  };

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

      {/* Right: Auth + Profile */}
      <div className="absolute right-4 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAuthClick}
          aria-label={isLoggedIn ? "로그아웃" : "로그인"}
          title={isLoggedIn ? "로그아웃" : "로그인"}
          className="w-8 h-8 rounded-full hover:bg-muted/60"
        >
          {isLoggedIn ? (
            <LogOut className="w-4 h-4 text-foreground/50" />
          ) : (
            <LogIn className="w-4 h-4 text-foreground/50" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(isLoggedIn ? "/settings" : "/login")}
          aria-label="프로필"
          className="w-8 h-8 rounded-full hover:bg-muted/60"
        >
          <User className="w-4 h-4 text-foreground/50" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
