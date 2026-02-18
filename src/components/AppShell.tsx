import { ReactNode } from 'react';
import Header from './Header';

interface AppShellProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  isGuest?: boolean;
}

const AppShell = ({ children, className = '', showHeader = true, isGuest = false }: AppShellProps) => {
  return (
    <div className="min-h-[100dvh] bg-[#F5F5F5] md:flex md:items-center md:justify-center md:p-4">
      <div className={`w-full md:max-w-[420px] bg-white md:rounded-[32px] md:shadow-[0_8px_40px_rgba(0,0,0,0.08)] min-h-[100dvh] md:min-h-[600px] flex flex-col ${className}`}>
        {showHeader && <Header isGuest={isGuest} />}
        {children}
      </div>
    </div>
  );
};

export default AppShell;
