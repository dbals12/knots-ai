import { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

const AppShell = ({ children, className = '' }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className={`w-full max-w-[420px] bg-white rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden min-h-[600px] flex flex-col ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default AppShell;
