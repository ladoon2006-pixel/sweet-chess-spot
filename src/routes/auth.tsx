import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Crown, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "ورود — Chess Master" }] }),
});

function AuthPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/" });
  }, [user, nav]);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      toast.success("ورود موفق");
    } catch (e: any) {
      toast.error(e?.message || "خطا در ورود با گوگل");
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("ایمیل و رمز عبور را وارد کنید");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("خوش آمدید!");
  };

  const handleSendOtp = async () => {
    if (!email || !password || !username) {
      toast.error("همه فیلدها را پر کنید");
      return;
    }
    if (password.length < 6) {
      toast.error("رمز عبور حداقل ۶ کاراکتر");
      return;
    }
    setBusy(true);
    // Sign up with password — Supabase sends OTP code by default
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      setOtpSent(true);
      toast.success("کد تأیید ۶ رقمی به ایمیلت ارسال شد");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      toast.error("کد ۶ رقمی را وارد کن");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("حساب فعال شد!");
  };

  return (
    <div dir="rtl" className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <div className="wood-bg absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-fuchsia-500/30 blur-3xl -z-10" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-72 h-72 rounded-full bg-cyan-400/25 blur-3xl -z-10" />

      <Link to="/" className="absolute top-4 right-4 text-sm text-amber-100/80">← خانه</Link>

      <Crown className="text-fuchsia-200 mb-2" size={48} />
      <h1 className="text-3xl font-extrabold wood-text mb-6" style={{ fontFamily: "serif" }}>
        Chess Master
      </h1>

      <div className="w-full max-w-sm wood-panel rounded-2xl p-5 space-y-4">
        <Tabs value={mode} onValueChange={(v) => { setMode(v as any); setOtpSent(false); }}>
          <TabsList className="grid grid-cols-2 w-full bg-black/40">
            <TabsTrigger value="signin">ورود</TabsTrigger>
            <TabsTrigger value="signup">ثبت‌نام</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-3 mt-4">
            <div className="space-y-1">
              <Label className="text-amber-100">ایمیل</Label>
              <Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com"
                className="bg-amber-50 text-stone-900 placeholder:text-stone-500 border-amber-700/60" />
            </div>
            <div className="space-y-1">
              <Label className="text-amber-100">رمز عبور</Label>
              <Input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••"
                className="bg-amber-50 text-stone-900 placeholder:text-stone-500 border-amber-700/60" />
            </div>
            <Button onClick={handleSignIn} disabled={busy} className="w-full">
              <Mail size={16} /> ورود با ایمیل
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-3 mt-4">
            {!otpSent ? (
              <>
                <div className="space-y-1">
                  <Label className="text-amber-100">نام کاربری</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="نام نمایشی"
                    className="bg-amber-50 text-stone-900 placeholder:text-stone-500 border-amber-700/60" />
                </div>
                <div className="space-y-1">
                  <Label className="text-amber-100">ایمیل</Label>
                  <Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com"
                    className="bg-amber-50 text-stone-900 placeholder:text-stone-500 border-amber-700/60" />
                </div>
                <div className="space-y-1">
                  <Label className="text-amber-100">رمز عبور (حداقل ۶ کاراکتر)</Label>
                  <Input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••"
                    className="bg-amber-50 text-stone-900 placeholder:text-stone-500 border-amber-700/60" />
                </div>
                <Button onClick={handleSendOtp} disabled={busy} className="w-full">
                  ارسال کد تأیید
                </Button>
                <p className="text-[11px] text-amber-100/70 text-center">
                  بعد از ثبت‌نام، یک کد ۶ رقمی به ایمیلت ارسال می‌شه. بدون وارد کردن کد، حساب فعال نمی‌شه.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-100/80 text-center">
                  کد ۶ رقمی ارسال شده به <b>{email}</b> را وارد کن:
                </p>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="bg-amber-50 text-stone-900 placeholder:text-stone-500 border-amber-700/60 text-center text-2xl tracking-widest"
                />
                <Button onClick={handleVerifyOtp} disabled={busy} className="w-full">
                  تأیید و ورود
                </Button>
                <button
                  onClick={() => { setOtpSent(false); setOtp(""); }}
                  className="text-xs text-amber-200/70 underline w-full text-center"
                >
                  تغییر ایمیل
                </button>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="relative py-2">
          <div className="absolute inset-x-0 top-1/2 border-t border-amber-900/40" />
          <div className="relative bg-transparent text-center text-xs text-amber-100/60">
            <span className="px-2 bg-stone-900">یا</span>
          </div>
        </div>

        <Button onClick={handleGoogle} disabled={busy} variant="secondary" className="w-full">
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          ورود / ثبت‌نام با گوگل
        </Button>
      </div>

      <p className="text-xs text-amber-100/60 mt-4 text-center max-w-sm">
        با ورود، <Link to="/terms" className="underline">شرایط استفاده</Link> و{" "}
        <Link to="/privacy-policy" className="underline">حریم خصوصی</Link> را می‌پذیری.
      </p>
    </div>
  );
}
