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
    // 바깥: 연한 그레이 배경, 중앙 정렬
    <div className="min-h-[100dvh] bg-[#EFEFEF] md:flex md:items-center md:justify-center md:p-6">
      {/* 카드: 모바일은 화면 꽉 차되 약간의 여백, md는 고정폭 카드 */}
      <div
        className={`
          relative w-full bg-white
          min-h-[100dvh] md:min-h-0 md:max-h-[90vh]
          md:max-w-[420px]
          md:rounded-[28px] md:shadow-[0_12px_48px_rgba(0,0,0,0.12)]
          flex flex-col overflow-hidden
          ${className}
        `}
      >
        {showHeader && <Header isGuest={isGuest} />}
        {/* 내부 콘텐츠는 스크롤 가능 */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
