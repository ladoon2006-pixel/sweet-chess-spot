import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

import { Globe, Users, Bot, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.jpeg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Chess Master — شطرنج آنلاین" },
      { name: "description", content: "بازی شطرنج آنلاین، با دوست یا هوش مصنوعی، با چت زنده و سیستم دوستی." },
    ],
  }),
});

function Home() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  const requireAuth = (to: string) => {
    if (!user) {
      toast.error("ابتدا وارد حساب کاربری شو");
      nav({ to: "/auth" });
      return false;
    }
    nav({ to });
    return true;
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-screen w-full flex flex-col items-center overflow-hidden"
    >
      <div className="wood-bg absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-fuchsia-500/30 blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-1/3 -left-20 w-80 h-80 rounded-full bg-cyan-400/25 blur-3xl -z-10" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-violet-500/25 blur-3xl -z-10" />

      <div className="pt-8 sm:pt-12 flex flex-col items-center">
        <img
          src={logo}
          alt="Chess Master logo"
          className="w-44 h-44 sm:w-52 sm:h-52 object-contain neon-pulse rounded-2xl"
          style={{ filter: "drop-shadow(0 0 24px rgba(255,180,40,0.55))" }}
        />
        <div className="text-amber-200/90 tracking-[0.4em] text-xs sm:text-sm mt-3" style={{ textShadow: "0 0 10px rgba(255,200,80,0.7)" }}>ONLINE</div>
      </div>

      <div className="mt-12 w-full max-w-sm px-6 flex flex-col gap-4">
        <MenuButton onClick={() => requireAuth("/play/online")} icon={<Globe size={22} />} label="بازی آنلاین" />
        <MenuButton to="/play/friend" icon={<Users size={22} />} label="بازی با دوست" />
        <MenuButton to="/play/ai" icon={<Bot size={22} />} label="بازی با هوش مصنوعی" />
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        {user ? (
          <div className="text-xs text-amber-100/80 flex items-center gap-3">
            <span>وارد شده: <b>{user.user_metadata?.username ?? user.email}</b></span>
            <button onClick={() => signOut()} className="underline inline-flex items-center gap-1">
              <LogOut size={12} /> خروج
            </button>
          </div>
        ) : (
          <Button onClick={() => nav({ to: "/auth" })} variant="secondary">
            <LogIn size={16} /> ورود / ثبت‌نام
          </Button>
        )}
      </div>

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
  return <button onClick={onClick} className={cls}>{icon}<span>{label}</span></button>;
}
