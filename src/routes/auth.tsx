import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import bgUrl from "@/assets/chess-bg.jpg";

const search = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: search,
  head: () => ({ meta: [{ title: "ورود / ثبت‌نام — Chess Master" }] }),
});

function AuthPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { next } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: (next as any) ?? "/" });
  }, [user, nav, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("حساب ساخته شد! وارد می‌شویم…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("خوش آمدید!");
      }
    } catch (err: any) {
      toast.error(err.message || "خطا در ورود");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-screen flex items-center justify-center p-4"
      style={{ ["--wood-bg-image" as any]: `url(${bgUrl})` }}
    >
      <div className="wood-bg absolute inset-0 -z-10" />
      <div className="absolute inset-0 -z-10 bg-black/55" />

      <div className="wood-panel rounded-2xl p-6 w-full max-w-sm">
        <h1 className="wood-text text-2xl font-bold text-center mb-4">
          {mode === "login" ? "ورود به حساب" : "ساخت حساب جدید"}
        </h1>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <Label className="text-amber-100">نام کاربری</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="مثلاً ali_chess" />
            </div>
          )}
          <div>
            <Label className="text-amber-100">ایمیل</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label className="text-amber-100">رمز عبور</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "…" : mode === "login" ? "ورود" : "ساخت حساب"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-amber-100/80">
          {mode === "login" ? "حساب نداری؟ " : "حساب داری؟ "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="underline">
            {mode === "login" ? "ثبت‌نام کن" : "وارد شو"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-amber-100/70 hover:underline">← بازگشت</Link>
        </div>
      </div>
    </div>
  );
}
