import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from "react-icons/fc";
import { RiKakaoTalkFill } from "react-icons/ri";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

        // Check if all three onboarding fields are filled
        if (userData && userData.job_role && userData.usage_purpose && userData.preferred_tone) {
          navigate("/input");
          return;
        } else if (userData) {
          // User exists but onboarding incomplete
          navigate("/onboarding");
          return;
        } else {
          // New user: create row and redirect to onboarding
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
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) throw error;

        toast({
          title: "이메일을 확인하세요",
          description: "인증 링크를 보내드렸습니다.",
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { data: userData } = await supabase
            .from("users")
            .select("job_role, usage_purpose, preferred_tone")
            .eq("id", data.user.id)
            .single();

          // Check if all three onboarding fields are filled
          if (userData && userData.job_role && userData.usage_purpose && userData.preferred_tone) {
            navigate("/input");
          } else if (userData) {
            // User exists but onboarding incomplete
            navigate("/onboarding");
          } else {
            // New user: create row and redirect to onboarding
            await supabase.from("users").insert({
              id: data.user.id,
              email: data.user.email,
              created_at: new Date().toISOString(),
            });
            navigate("/onboarding");
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    } finally {
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
          <p className="text-muted-foreground">로그인하고 기록 시작하기</p>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-sm border space-y-6">
          <div className="space-y-3">
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

            {/* Kakao Login */}
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">또는 이메일로 계속하기</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로딩 중..." : isSignUp ? "회원가입" : "로그인"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? "로그인" : "회원가입"}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
