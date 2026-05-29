import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import PiAuth from "@/components/PiAuth";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const nav = useNavigate();

  const handleOnline = () => {
    if (!user) {
      toast.error("ابتدا با Pi Network وارد شوید");
      return;
    }
    nav({ to: "/play/online" });
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-screen w-full flex flex-col items-center overflow-hidden"
    >
      <div className="wood-bg absolute inset-0 -z-10" />
      {/* floating neon orbs */}
      <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-fuchsia-500/30 blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-1/3 -left-20 w-80 h-80 rounded-full bg-cyan-400/25 blur-3xl -z-10" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-violet-500/25 blur-3xl -z-10" />

      <div className="pt-12 sm:pt-16 flex flex-col items-center">
        <Crown className="text-fuchsia-200 neon-pulse" size={56} />
        <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-wide wood-text" style={{ fontFamily: "serif" }}>
          CHESS MASTER
        </h1>
        <div className="text-cyan-200/90 tracking-[0.4em] text-xs sm:text-sm mt-1" style={{ textShadow: "0 0 10px rgba(34,211,238,0.7)" }}>ONLINE</div>
      </div>

      <div className="mt-12 w-full max-w-sm px-6 flex flex-col gap-4">
        <MenuButton onClick={handleOnline} icon={<Globe size={22} />} label="بازی آنلاین" />
        <MenuButton to="/play/friend" icon={<Users size={22} />} label="بازی با دوست" />
        <MenuButton to="/play/ai" icon={<Bot size={22} />} label="بازی با هوش مصنوعی" />
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <PiAuth />
        <button
          onClick={async () => {
            try {
              const Pi = (window as any).Pi;
              if (!Pi) { toast.error("Pi SDK بارگذاری نشد"); return; }
              await Pi.init({ version: "2.0", sandbox: true });
              await Pi.createPayment(
                { amount: 0.01, memo: "Test payment", metadata: { test: true } },
                {
                  onReadyForServerApproval: (paymentId: string) => console.log("approval", paymentId),
                  onReadyForServerCompletion: (paymentId: string, txid: string) => console.log("completion", paymentId, txid),
                  onCancel: (paymentId: string) => console.log("cancel", paymentId),
                  onError: (error: Error) => { console.error(error); toast.error(error.message); },
                },
              );
            } catch (e: any) {
              toast.error(e?.message || "خطا در پرداخت");
            }
          }}
          className="wood-panel rounded-xl py-3 px-5 wood-text font-bold"
        >
          پرداخت تست‌نت 0.01 Pi
        </button>
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
