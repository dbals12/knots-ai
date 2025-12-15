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
    <header className="flex items-center justify-between px-5 py-4 border-b border-border/50">
      {/* Left: Home Button */}
      <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="w-9 h-9 rounded-full hover:bg-muted">
        <Home className="w-5 h-5 text-foreground" />
      </Button>

      {/* Center: Logo */}
      <button
        onClick={() => navigate("/")}
        className="text-xl font-medium tracking-wide text-foreground font-jost"
      >
        knots
      </button>

      {/* Right: Settings & Logout */}
      <div className="flex flex-row items-center gap-1 flex-shrink-0">
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
