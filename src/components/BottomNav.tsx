import { Link, useLocation } from "@tanstack/react-router";
import { Home, Settings, User, Users, ShoppingBag } from "lucide-react";
import { playMenuClick } from "@/lib/chessSound";

export default function BottomNav() {
  const { pathname } = useLocation();
  const items = [
    { to: "/settings", icon: Settings, label: "تنظیمات" },
    { to: "/profile", icon: User, label: "پروفایل" },
    { to: "/shop", icon: ShoppingBag, label: "خرید" },
    { to: "/friends", icon: Users, label: "دوستان" },
    { to: "/", icon: Home, label: "خانه" },
  ] as const;

  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-40 royal-nav px-2 pt-2 pb-3 flex justify-around items-stretch"
    >
      {items.map(({ to, icon: Icon, label }) => {
        const active = pathname === to || (to !== "/" && pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            onClick={() => playMenuClick()}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-lg transition-all ${
              active ? "royal-nav-active" : "text-amber-200/70"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            <span className="text-[10px] font-bold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
