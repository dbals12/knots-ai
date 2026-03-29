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
    <div className="min-h-[100dvh] warm-gradient-bg px-4 pt-4 pb-6 md:px-6 md:py-8 md:flex md:items-center md:justify-center">
      <div
        className={`
          relative w-full
          bg-background/70 backdrop-blur-xl
          rounded-3xl overflow-hidden
          border border-border/30
          shadow-[0_8px_40px_hsla(0,0%,0%,0.08)]
          md:max-w-[440px]
          md:rounded-[28px] md:shadow-[0_12px_48px_hsla(0,0%,0%,0.12)]
          flex flex-col
          min-h-[calc(100dvh-2.5rem)]
          md:min-h-0 md:max-h-[88vh]
          ${className}
        `}
      >
        {showHeader && <Header isGuest={isGuest} />}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
