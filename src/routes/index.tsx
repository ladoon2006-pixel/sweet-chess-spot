import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { Bot, Globe, Users, Crown, Sparkles } from "lucide-react";
import { playMenuClick } from "@/lib/chessSound";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Sweet Chess — قلمرو شطرنج آنلاین" },
      { name: "description", content: "شطرنج آنلاین، با دوست یا هوش مصنوعی." },
    ],
  }),
});

function Home() {
  const { loading } = useAuth();
  const nav = useNavigate();

  return (
    <div dir="rtl" className="relative min-h-screen w-full flex flex-col items-center overflow-hidden">
      <div className="royal-bg absolute inset-0 -z-10" />
      <div className="royal-rays absolute inset-0 -z-10" />

      {/* Emblem */}
      <div className="pt-10 sm:pt-14 flex flex-col items-center px-6 text-center">
        <div className="royal-emblem">
          <Crown className="royal-crown" size={44} />
          <span className="knight-glyph chess-piece">♞</span>
          <span className="royal-emblem-ring" />
        </div>
        <div className="mt-5 flex items-center gap-2 tracking-[0.4em] text-amber-300/90 text-xs font-bold">
          <span>SWEET CHESS</span>
          <Sparkles size={12} className="text-amber-300" />
        </div>
        <h1 className="mt-2 royal-title text-3xl sm:text-4xl font-black leading-tight">
          قلمرو شطرنج آنلاین
        </h1>
        <p className="mt-2 text-amber-100/70 text-sm">
          بازی، چت زنده و رقابت دوستانه با حال‌و‌هوای طلایی
        </p>
      </div>

      {/* Menu */}
      <div className="mt-7 w-full max-w-sm px-6 flex flex-col gap-4">
        <RoyalButton onClick={() => { playMenuClick(); nav({ to: "/play/online" }); }} icon={<Globe size={20} />} label="بازی آنلاین" disabled={loading} />
        <RoyalButton to="/play/friend" icon={<Users size={20} />} label="بازی با دوست" />
        <RoyalButton to="/play/ai" icon={<Bot size={20} />} label="بازی با هوش مصنوعی" />
      </div>

      <div className="h-32" />
      <BottomNav />
    </div>
  );
}

function RoyalButton({
  to, onClick, icon, label, disabled,
}: { to?: string; onClick?: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  const cls = "royal-button w-full";
  const inner = (
    <span className="royal-button-inner">
      <span className="royal-button-icon">{icon}</span>
      <span className="royal-button-label">{label}</span>
    </span>
  );
  if (to) {
    return (
      <Link to={to} onClick={() => playMenuClick()} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}
