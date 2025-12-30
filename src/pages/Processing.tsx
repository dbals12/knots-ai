import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";

const Processing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 이 페이지는 더 이상 사용되지 않습니다.
    // 실수로 진입 시 입력 페이지로 리다이렉트
    console.warn("Processing page is deprecated. Redirecting to input.");
    navigate("/input", { replace: true });
  }, [navigate]);

  return (
    <AppShell showHeader={false}>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">잠시만 기다려주세요...</p>
      </div>
    </AppShell>
  );
};

export default Processing;
