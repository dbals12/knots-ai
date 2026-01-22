import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FcGoogle } from "react-icons/fc";
import { RiKakaoTalkFill } from "react-icons/ri";
import { getPendingSubmission } from "@/lib/pendingSubmission";
import { getGuestPendingSubmission } from "@/lib/guestPendingSubmission";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  /**
   * 이미 로그인된 상태로 /login에 들어온 경우 처리
   */
  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsCheckingAuth(false);
        return;
      }

      // ✅ 게스트가 보던 결과 draft
      const guestPendingDraftId = getGuestPendingSubmission();

      // users 테이블 보장
      const { data: userData } = await supabase
        .from("users")
        .select("job_role, usage_purpose, preferred_tone")
        .eq("id", user.id)
        .single();

      if (!userData) {
        await supabase.from("users").insert({
          id: user.id,
          email: user.email,
          created_at: new Date().toISOString(),
        });
      }

      // ✅ 최우선: 게스트 결과 복귀
      if (guestPendingDraftId) {
        navigate(`/result/${guestPendingDraftId}`, { replace: true });
        return;
      }

      // 기존 로그인 유저 플로우
      const pending = getPendingSubmission();
      if (pending) {
        navigate("/input", { replace: true });
        return;
      }

      if (userData?.job_role && userData?.usage_purpose && userData?.preferred_tone) {
        navigate("/input", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    };

    checkUserAndRedirect();
  }, [navigate]);

  /**
   * 소셜 로그인 클릭
   */
  const handleSocialLogin = async (provider: "google" | "kakao") => {
    setLoading(true);

    // ✅ 현재 URL에 next가 있으면 그대로 유지
    const searchParams = new URLSearchParams(location.search);
    const next = searchParams.get("next");

    // ✅ 무조건 auth/callback으로 복귀
    const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-normal italic text-foreground tracking-tight font-bodoni">knots</h1>
          <p className="text-muted-foreground whitespace-pre-line mt-2">
            {"3초 만에 시작하고\n나만의 콘텐츠를 만드세요"}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-sm border">
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 flex items-center gap-2"
              onClick={() => handleSocialLogin("google")}
              disabled={loading}
            >
              <FcGoogle className="w-5 h-5" />
              Google로 계속하기
            </Button>

            <Button
              className="w-full h-12 text-black flex items-center gap-2"
              style={{ backgroundColor: "#FEE500" }}
              onClick={() => handleSocialLogin("kakao")}
              disabled={loading}
            >
              <RiKakaoTalkFill className="w-5 h-5 text-black" />
              Kakao로 계속하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
