import { ReactNode } from 'react';
import Header from './Header';

interface AppShellProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  isGuest?: boolean;
}

/**
 * AppShell — 2겹 레이아웃
 *
 * [Outer] bg-[#EFEFEF] + 모바일 px-4 pt-4 pb-6 → 카드가 화면 끝에 붙지 않도록 강제 여백
 * [Inner] bg-background + rounded-3xl + shadow → 카드 UI
 *
 * 스크롤은 Inner 내부 content 영역 단 1곳에서만.
 * 페이지 컴포넌트에서 min-h-screen / h-screen / overflow 강제 금지.
 */
const AppShell = ({ children, className = '', showHeader = true, isGuest = false }: AppShellProps) => {
  return (
    <div className="min-h-[100dvh] bg-[#EFEFEF] px-4 pt-4 pb-6 md:px-6 md:py-8 md:flex md:items-center md:justify-center">
      <div
        className={`
          relative w-full bg-background
          rounded-3xl overflow-hidden
          shadow-[0_2px_16px_rgba(0,0,0,0.08)]
          md:max-w-[440px]
          md:rounded-[28px] md:shadow-[0_12px_48px_rgba(0,0,0,0.14)]
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
