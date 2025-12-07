import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, LogOut, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  showProfile?: boolean;
  showLogout?: boolean;
}

const Header = ({ showProfile = true, showLogout = true }: HeaderProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="px-6 py-5 flex items-center justify-between border-b border-border">
      <button 
        onClick={() => navigate('/')}
        className="text-lg font-bold text-foreground hover:opacity-80 transition-opacity"
      >
        Switch Manager
      </button>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground"
        >
          <Home className="w-4 h-4" />
        </Button>
        {showProfile && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/settings')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-4 h-4 mr-1" />
            프로필
          </Button>
        )}
        {showLogout && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-1" />
            로그아웃
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
