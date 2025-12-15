import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FcGoogle } from "react-icons/fc";
import { RiKakaoTalkFill } from "react-icons/ri";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("job_role, usage_purpose, preferred_tone")
          .eq("id", user.id)
          .single();

        if (userData && userData.job_role && userData.usage_purpose && userData.preferred_tone) {
          navigate("/input");
          return;
        } else if (userData) {
          navigate("/onboarding");
          return;
        } else {
          await supabase.from("users").insert({
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
          });
          navigate("/onboarding");
          return;
        }
      }

      setIsCheckingAuth(false);
    };

    checkUserAndRedirect();
  }, [navigate]);

  const handleSocialLogin = async (provider: "google" | "kakao") => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
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
          <p className="text-muted-foreground whitespace-pre-line mt-2">{"로그인하고 기록 시작하기기"}</p>
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
