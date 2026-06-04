import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bot, Globe, LogIn, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { playMenuClick } from "@/lib/chessSound";
import logoAsset from "@/assets/sweet-chess-logo.png.asset.json";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Sweet Chess — شطرنج آنلاین" },
      { name: "description", content: "شطرنج آنلاین، با دوست یا هوش مصنوعی." },
    ],
  }),
});

function Home() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();

  const requireAuth = (to: string) => {
    if (!user) {
      toast.error("ابتدا وارد حساب کاربری شو");
      nav({ to: "/auth" });
      return;
    }
    nav({ to });
  };

  return (
    <div dir="rtl" className="relative min-h-screen w-full flex flex-col items-center overflow-hidden">
      <div className="wood-bg absolute inset-0 -z-10" />

      <div className="pt-10 sm:pt-12 flex flex-col items-center px-6 text-center">
        <img
          src={logoAsset.url}
          alt="Sweet Chess"
          className="w-44 h-44 sm:w-52 sm:h-52 object-contain drop-shadow-[0_0_30px_rgba(255,200,80,0.55)]"
          draggable={false}
        />
        <h1 className="mt-3 wood-text text-3xl sm:text-4xl font-black leading-tight">قلمرو شطرنج آنلاین</h1>
      </div>

      <div className="mt-8 w-full max-w-sm px-6 flex flex-col gap-4">
        {!loading && user ? (
          <>
            <MenuButton onClick={() => requireAuth("/play/online")} icon={<Globe size={22} />} label="بازی آنلاین" />
            <MenuButton to="/play/friend" icon={<Users size={22} />} label="بازی با دوست" />
            <MenuButton to="/play/ai" icon={<Bot size={22} />} label="بازی با هوش مصنوعی" />
          </>
        ) : !loading ? (
          <Button onClick={() => { playMenuClick(); nav({ to: "/auth" }); }} size="lg" className="w-full text-lg">
            <LogIn size={18} /> ورود با ایمیل
          </Button>
        ) : null}
      </div>

      {user && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="text-xs text-amber-100/80 flex items-center gap-3">
            <span>{user.user_metadata?.username ?? user.email}</span>
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
