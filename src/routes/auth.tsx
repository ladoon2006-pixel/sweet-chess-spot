import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("ایمیل و رمز عبور را وارد کنید");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("not confirmed") || error.message.toLowerCase().includes("confirm")) {
        toast.error("ایمیلت رو هنوز تأیید نکردی. به تب «ثبت‌نام» برو و کد رو وارد کن.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("خوش آمدید!");
    }
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
      toast.success("کد تأیید ۶ رقمی به ایمیلت ارسال شد (پوشه اسپم رو هم چک کن)");
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("کد دوباره ارسال شد");
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
    <div dir="rtl" className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="wood-bg absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-amber-500/20 blur-3xl -z-10" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-72 h-72 rounded-full bg-yellow-400/20 blur-3xl -z-10" />

      {/* Chess board backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center opacity-30">
        <div className="grid grid-cols-8 mt-2" style={{ width: "min(96vw, 460px)" }}>
          {Array.from({ length: 64 }).map((_, k) => {
            const r = Math.floor(k / 8), c = k % 8;
            const dark = (r + c) % 2 === 1;
            return <div key={k} className="aspect-square" style={{ backgroundColor: dark ? "#3a1f08" : "#7a5118" }} />;
          })}
        </div>
      </div>

      <Link to="/" className="absolute top-4 right-4 text-sm text-amber-100/80">← خانه</Link>

      {/* Chess graphic */}
      <div className="relative flex flex-col items-center mb-6 mt-2">
        <div className="relative">
          <Crown className="text-amber-300 drop-shadow-[0_0_18px_rgba(255,200,80,0.9)]" size={56} />
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-5xl drop-shadow-[0_0_10px_rgba(255,200,80,0.8)]" style={{ color: "#f5c66b" }}>♞</span>
        </div>
        <div className="mt-12 flex gap-1 text-3xl" style={{ color: "#f5c66b", textShadow: "0 0 8px rgba(255,200,80,0.5)" }}>
          <span>♜</span><span>♝</span><span>♛</span><span>♚</span><span>♝</span><span>♜</span>
        </div>
        <h1 className="text-2xl font-extrabold wood-text mt-3" style={{ fontFamily: "serif" }}>
          Sweet Chess
        </h1>
        <p className="text-xs text-amber-100/70 mt-1">برای ورود به بازی، ایمیلت رو تأیید کن</p>
      </div>

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
                  یک کد ۶ رقمی به ایمیلت ارسال می‌شه. تا وقتی کد رو وارد نکنی، حساب فعال نمی‌شه و وارد بازی نمی‌شی.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-100/80 text-center">
                  کد ۶ رقمی ارسال شده به <b dir="ltr">{email}</b> را وارد کن:
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
                <div className="flex justify-between items-center text-xs">
                  <button onClick={handleResend} disabled={busy} className="text-amber-200/80 underline">
                    ارسال مجدد کد
                  </button>
                  <button
                    onClick={() => { setOtpSent(false); setOtp(""); }}
                    className="text-amber-200/70 underline"
                  >
                    تغییر ایمیل
                  </button>
                </div>
                <p className="text-[11px] text-amber-100/60 text-center">
                  کد رو دریافت نکردی؟ پوشهٔ Spam یا Junk ایمیلت رو هم چک کن.
                </p>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <p className="text-xs text-amber-100/60 mt-4 text-center max-w-sm">
        با ورود، <Link to="/terms" className="underline">شرایط استفاده</Link> و{" "}
        <Link to="/privacy-policy" className="underline">حریم خصوصی</Link> را می‌پذیری.
      </p>
    </div>
  );
}
