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

// Floating blurred chess pieces for the home background
const FLOATERS = [
  { c: "♛", top: "8%",  left: "6%",  size: 110, delay: "0s",   dur: "16s" },
  { c: "♚", top: "14%", left: "78%", size: 130, delay: "-3s",  dur: "18s" },
  { c: "♞", top: "62%", left: "4%",  size: 140, delay: "-5s",  dur: "15s" },
  { c: "♜", top: "70%", left: "82%", size: 120, delay: "-1.5s", dur: "17s" },
  { c: "♝", top: "38%", left: "44%", size: 160, delay: "-7s",  dur: "20s" },
  { c: "♟", top: "88%", left: "30%", size: 90,  delay: "-2.5s", dur: "13s" },
  { c: "♟", top: "26%", left: "20%", size: 80,  delay: "-4s",  dur: "14s" },
];

function Home() {
  const { loading } = useAuth();
  const nav = useNavigate();

  return (
    <div dir="rtl" className="relative min-h-screen w-full flex flex-col items-center overflow-hidden">
      <div className="royal-bg absolute inset-0 -z-10" />
      <div className="royal-rays absolute inset-0 -z-10" />
      <div className="royal-bg-pieces -z-10" aria-hidden="true">
        {FLOATERS.map((f, i) => (
          <span
            key={i}
            className="chess-piece"
            style={{
              top: f.top,
              left: f.left,
              fontSize: f.size,
              animationDelay: f.delay,
              animationDuration: f.dur,
            }}
          >
            {f.c}
          </span>
        ))}
      </div>

      {/* Emblem */}
      <div className="pt-12 sm:pt-16 flex flex-col items-center px-6 text-center">
        <div className="royal-emblem">
          <Crown className="royal-crown" size={48} />
          <span className="knight-glyph chess-piece" style={{ fontSize: 116 }}>♞</span>
          <span className="royal-emblem-ring" />
        </div>
        <div className="mt-6 flex items-center gap-2 tracking-[0.4em] text-amber-300/90 text-xs font-bold">
          <Sparkles size={12} className="text-amber-300" />
          <span>SWEET CHESS</span>
          <Sparkles size={12} className="text-amber-300" />
        </div>
        <h1 className="mt-2 royal-title text-3xl sm:text-4xl font-black leading-tight">
          قلمرو شطرنج آنلاین
        </h1>
        <p className="mt-2 text-amber-100/70 text-sm">
          بازی، چت زنده و رقابت با حال‌و‌هوای طلایی
        </p>
      </div>

      {/* Menu */}
      <div className="mt-8 w-full max-w-sm px-6 flex flex-col gap-4">
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
