import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "بازیابی رمز — Sweet Chess" }] }),
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY after the user lands from the email link
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Fallback: if there's already a session, allow update
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleUpdate = async () => {
    if (password.length < 6) { toast.error("رمز حداقل ۶ کاراکتر"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("رمز عبور به‌روزرسانی شد"); nav({ to: "/" }); }
  };

  return (
    <div dir="rtl" className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <div className="wood-bg absolute inset-0 -z-10" />
      <div className="w-full max-w-sm wood-panel rounded-2xl p-5 space-y-4">
        <h1 className="text-xl font-bold wood-text text-center">بازیابی رمز عبور</h1>
        {!ready ? (
          <p className="text-sm text-amber-100/80 text-center">
            لینک بازیابی رو از ایمیلت باز کن. اگه به این صفحه از طریق ایمیل اومدی، لحظه‌ای صبر کن…
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-amber-100">رمز جدید</Label>
              <Input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••"
                className="bg-amber-50 text-stone-900 placeholder:text-stone-500 border-amber-700/60" />
            </div>
            <Button onClick={handleUpdate} disabled={busy} className="w-full">ذخیره رمز جدید</Button>
          </>
        )}
        <Link to="/auth" className="block text-xs text-amber-200/80 underline text-center">بازگشت به ورود</Link>
      </div>
    </div>
  );
}
