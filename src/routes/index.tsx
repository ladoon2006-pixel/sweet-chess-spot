import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

import { Bot, Crown, Globe, LogIn, LogOut, Sparkles, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { playMenuClick } from "@/lib/chessSound";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Sweet Chess — شطرنج آنلاین" },
      { name: "description", content: "بازی شطرنج آنلاین، با دوست یا هوش مصنوعی، با چت زنده و سیستم دوستی." },
    ],
  }),
});

function Home() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();

  const requireAuth = (to: string) => {
    if (!user) {
      toast.error("ابتدا وارد حساب کاربری شو و ایمیلت رو تأیید کن");
      nav({ to: "/auth" });
      return;
    }
    nav({ to });
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-screen w-full flex flex-col items-center overflow-hidden"
    >
      <div className="wood-bg absolute inset-0 -z-10" />

      <div className="pt-10 sm:pt-12 flex flex-col items-center px-6 text-center">
        <div className="brand-emblem neon-pulse" aria-hidden="true">
          <Crown size={48} strokeWidth={1.6} />
          <span className="brand-emblem__piece">♞</span>
        </div>
        <div className="mt-5 flex items-center gap-2 text-amber-200/85 text-xs sm:text-sm font-bold tracking-[0.32em]">
          <Sparkles size={14} /> SWEET CHESS
        </div>
        <h1 className="mt-3 wood-text text-3xl sm:text-4xl font-black leading-tight">قلمرو شطرنج آنلاین</h1>
        <p className="mt-2 max-w-xs text-sm leading-7 text-amber-100/70">
          بازی سریع، چت زنده و رقابت دوستانه با حال‌وهوای طلایی لوگو
        </p>
      </div>

      {!loading && !user && (
        <div className="mt-6 mx-6 wood-panel rounded-xl px-4 py-3 flex items-center gap-2 text-amber-100 text-sm max-w-sm">
          <Lock size={18} />
          <span>برای دیدن و شروع بازی‌ها، اول وارد حسابت شو.</span>
        </div>
      )}

      <div className="mt-6 w-full max-w-sm px-6 flex flex-col gap-4">
        {user ? (
          <>
            <MenuButton onClick={() => requireAuth("/play/online")} icon={<Globe size={22} />} label="بازی آنلاین" />
            <MenuButton to="/play/friend" icon={<Users size={22} />} label="بازی با دوست" />
            <MenuButton to="/play/ai" icon={<Bot size={22} />} label="بازی با هوش مصنوعی" />
          </>
        ) : (
          <Button onClick={() => { playMenuClick(); nav({ to: "/auth" }); }} size="lg" className="w-full text-lg">
            <LogIn size={18} /> ورود / ثبت‌نام با ایمیل
          </Button>
        )}
      </div>

      {user && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="text-xs text-amber-100/80 flex items-center gap-3">
            <span>وارد شده: <b>{user.user_metadata?.username ?? user.email}</b></span>
            <button onClick={() => { playMenuClick(); signOut(); }} className="underline inline-flex items-center gap-1">
              <LogOut size={12} /> خروج
            </button>
          </div>
        </div>
      )}

      <div className="h-28" />
      <BottomNav />
    </div>
  );
}

function MenuButton({
  to, onClick, icon, label,
}: { to?: string; onClick?: () => void; icon: React.ReactNode; label: string }) {
  const cls =
    "wood-panel rounded-xl py-4 px-5 flex items-center justify-center gap-3 wood-text text-lg font-bold active:translate-y-0.5 transition-transform";
  if (to) return <Link to={to} className={cls}>{icon}<span>{label}</span></Link>;
  return <button onClick={() => { playMenuClick(); onClick?.(); }} className={cls}>{icon}<span>{label}</span></button>;
}
