import { useNavigate } from "react-router-dom";
import { Home, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Header = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="relative flex items-center justify-center px-5 py-4 border-b border-border/50">
      {/* Left: Home Button - Absolute positioned */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => navigate("/")} 
        className="absolute left-5 w-9 h-9 rounded-full hover:bg-muted"
      >
        <Home className="w-5 h-5 text-foreground" />
      </Button>

      {/* Center: Logo - Always centered */}
      <button
        onClick={() => navigate("/")}
        className="text-xl font-normal tracking-wide text-foreground font-jost"
      >
        knots
      </button>

      {/* Right: Settings & Logout - Absolute positioned */}
      <div className="absolute right-5 flex flex-row items-center gap-1">
        {user ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="w-9 h-9 rounded-full hover:bg-muted"
            >
              <Settings className="w-5 h-5 text-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="w-9 h-9 rounded-full hover:bg-muted">
              <LogOut className="w-5 h-5 text-foreground" />
            </Button>
          </>
        ) : (
          <div className="w-9 h-9" />
        )}
      </div>
    </header>
  );
};

export default Header;
