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

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      // ✅ 1) URL의 next 최우선 처리 (결과창에서 로그인 눌렀을 때 여기로 돌아옴)
      const searchParams = new URLSearchParams(location.search);
      const next = searchParams.get("next");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // ✅ next가 있으면 무조건 그곳으로 (온보딩/인풋보다 우선)
        if (next) {
          navigate(next, { replace: true });
          return;
        }

        // ✅ 게스트 결과 복귀(백업 플랜)
        const guestPendingDraftId = getGuestPendingSubmission();
        if (guestPendingDraftId) {
          navigate(`/result/${guestPendingDraftId}`, { replace: true });
          return;
        }

        // (기존 로직 유지)
        const pending = getPendingSubmission();

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

        if (pending) {
          navigate("/input", { replace: true });
          return;
        }

        if (userData?.job_role && userData?.usage_purpose && userData?.preferred_tone) {
          navigate("/input", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
        return;
      }

      setIsCheckingAuth(false);
    };

    checkUserAndRedirect();
  }, [navigate, location.search]); // ✅ location.search 변화도 반영

  const handleSocialLogin = async (provider: "google" | "kakao") => {
    setLoading(true);

    // ✅ /login?next=... 에서 next 읽기
    const searchParams = new URLSearchParams(location.search);
    const next = searchParams.get("next");

    // ✅ 로그인 후 어디로 돌아오든 next를 유지시키기
    // (auth/callback으로 가도 되고, /login으로 돌아와도 위 useEffect가 next로 보내줌)
    const redirectTo = `${window.location.origin}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;

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

        <div className="bg-card rounded-2xl p-8 shadow-sm border flex flex-col items-center justify-center">
          <div className="space-y-3 w-full">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-gray-300 flex items-center justify-center gap-2"
              onClick={() => handleSocialLogin("google")}
              disabled={loading}
            >
              <FcGoogle className="w-5 h-5" />
              Google로 계속하기
            </Button>

            <Button
              type="button"
              className="w-full h-12 text-black hover:bg-[#FEE500]/90 font-medium flex items-center justify-center gap-2"
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
