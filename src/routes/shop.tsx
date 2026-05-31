import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Coins, Check, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shop")({
  component: ShopPage,
  head: () => ({ meta: [{ title: "خرید بازی — Chess Master" }] }),
});

const PACKAGES = [
  { games: 100, price: 50000, label: "بسته شروع" },
  { games: 200, price: 90000, label: "بسته اقتصادی", popular: true },
  { games: 500, price: 200000, label: "بسته حرفه‌ای" },
];

function ShopPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("paid_games_remaining").eq("id", user.id).single().then(({ data }) => {
      if (data) setRemaining((data as any).paid_games_remaining);
    });
  }, [user]);

  const purchase = async (pkg: typeof PACKAGES[number]) => {
    if (!user) return;
    setBusy(pkg.games);
    // TODO: اتصال واقعی به درگاه پرداخت ایرانی (زرین‌پال/نکست‌پی)
    // فعلاً پیام می‌دیم که سیستم پرداخت در حال راه‌اندازیه
    toast.info("سیستم پرداخت در حال راه‌اندازیه. به‌زودی فعال می‌شه.");
    setBusy(null);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-50 p-4 pb-28">
      <header className="max-w-md mx-auto flex items-center justify-between mb-4">
        <Link to="/" className="text-sm">← خانه</Link>
        <h1 className="text-xl font-bold">خرید بازی</h1>
        <span className="w-12" />
      </header>

      <main className="max-w-md mx-auto space-y-4">
        <div className="wood-panel rounded-2xl p-4 text-center">
          <Coins className="mx-auto text-amber-300 mb-2" size={32} />
          <div className="text-xs text-amber-100/70">بازی‌های خریداری‌شده باقی‌مانده</div>
          <div className="text-3xl font-bold wood-text mt-1">{remaining ?? "—"}</div>
          <p className="text-xs text-amber-100/60 mt-2">
            هر روز ۵ بازی رایگان داری. برای بازی بیشتر، یکی از بسته‌ها رو بخر.
          </p>
        </div>

        <div className="space-y-3">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.games}
              className={`wood-panel rounded-2xl p-5 relative ${
                pkg.popular ? "ring-2 ring-amber-300" : ""
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-2 right-4 bg-amber-400 text-stone-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  پرطرفدار
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-lg font-bold wood-text">{pkg.label}</div>
                  <div className="text-sm text-amber-100/80">{pkg.games.toLocaleString("fa-IR")} بازی آنلاین</div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold wood-text">{pkg.price.toLocaleString("fa-IR")}</div>
                  <div className="text-xs text-amber-100/70">تومان</div>
                </div>
              </div>
              <ul className="text-xs text-amber-100/80 space-y-1 mb-4">
                <li className="flex items-center gap-1"><Check size={12} /> بدون انقضا</li>
                <li className="flex items-center gap-1"><Check size={12} /> همه زمان‌ها (۵، ۱۰، ۲۰ دقیقه)</li>
                <li className="flex items-center gap-1"><Check size={12} /> ذخیره دائمی در حساب</li>
              </ul>
              <Button
                onClick={() => purchase(pkg)}
                disabled={busy === pkg.games}
                className="w-full"
              >
                <ShoppingBag size={16} /> {busy === pkg.games ? "در حال انتقال..." : "خرید"}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-xs text-amber-100/60 text-center pt-2">
          پرداخت از طریق درگاه‌های امن ایرانی انجام می‌شه.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
