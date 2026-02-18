import { ReactNode } from 'react';
import Header from './Header';

interface AppShellProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  isGuest?: boolean;
}

/**
 * AppShell — 앱 전체의 루트 레이아웃 컨테이너
 *
 * 모바일: 풀스크린에 가까운 가벼운 레이아웃 (그림자 최소, 상단만 약한 라운드)
 * 데스크탑(md+): 중앙 카드 (max-w-[440px], 둥근 모서리, 그림자)
 *
 * 스크롤 컨테이너는 content-area 단 1곳.
 * 각 페이지는 overflow/height 강제 없이 자연스럽게 높이를 가져야 함.
 */
const AppShell = ({ children, className = '', showHeader = true, isGuest = false }: AppShellProps) => {
  return (
    /*
      바깥 배경: 항상 bg-[#EFEFEF]
      데스크탑(md+): 중앙 정렬, 카드형 레이아웃
    */
    <div className="min-h-[100dvh] bg-[#EFEFEF] md:flex md:items-center md:justify-center md:p-6">
      {/*
        카드 컨테이너
        모바일: w-full, 그림자 최소, 상단 모서리만 약하게, 세로로 길게
        데스크탑: 440px 카드, 둥근 모서리, 진한 그림자
      */}
      <div
        className={`
          relative w-full bg-background
          min-h-[100dvh]
          rounded-t-2xl shadow-[0_-2px_12px_rgba(0,0,0,0.06)]
          md:min-h-0 md:max-h-[90vh]
          md:max-w-[440px]
          md:rounded-[28px] md:shadow-[0_12px_48px_rgba(0,0,0,0.12)]
          flex flex-col
          ${className}
        `}
      >
        {showHeader && <Header isGuest={isGuest} />}
        {/*
          ── 단일 스크롤 컨테이너 ──
          overflow-y-auto는 오직 이 div 한 곳에서만.
          페이지 컴포넌트에서 min-h-screen / h-screen / overflow 강제 금지.
          콘텐츠가 짧으면 여백이 남아도 OK (세로형 여유 레이아웃).
        */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </div>
        {/* 검증 마커 (임시) */}
        <div className="text-center py-0.5 text-[8px] text-muted-foreground/30 select-none pointer-events-none">
          LAYOUT: APPSHELL_SPACIOUS_v1
        </div>
      </div>
    </div>
  );
};

export default AppShell;
