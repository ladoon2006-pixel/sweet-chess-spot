import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import PiAuth, { usePiSession } from "@/components/PiAuth";
import bgUrl from "@/assets/chess-bg.jpg";
import { Crown, Globe, Users, Bot } from "lucide-react";
import { toast } from "sonner";

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
  const session = usePiSession();
  const nav = useNavigate();

  const handleOnline = () => {
    if (!session) {
      toast.error("ابتدا با Pi Network وارد شوید");
      return;
    }
    nav({ to: "/play/online" });
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-screen w-full flex flex-col items-center"
      style={{ ["--wood-bg-image" as any]: `url(${bgUrl})` }}
    >
      <div className="wood-bg absolute inset-0 -z-10" />
      <div className="absolute inset-0 -z-10 bg-black/35" />

      <div className="pt-12 sm:pt-16 flex flex-col items-center">
        <Crown className="text-amber-200 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" size={56} />
        <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-wide wood-text" style={{ fontFamily: "serif" }}>
          CHESS MASTER
        </h1>
        <div className="text-amber-100/80 tracking-[0.4em] text-xs sm:text-sm mt-1">ONLINE</div>
      </div>

      <div className="mt-12 w-full max-w-sm px-6 flex flex-col gap-4">
        <MenuButton onClick={handleOnline} icon={<Globe size={22} />} label="بازی آنلاین" />
        <MenuButton to="/play/friend" icon={<Users size={22} />} label="بازی با دوست" />
        <MenuButton to="/play/ai" icon={<Bot size={22} />} label="بازی با هوش مصنوعی" />
      </div>

      <div className="mt-6 flex flex-col items-center">
        <PiAuth />
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
