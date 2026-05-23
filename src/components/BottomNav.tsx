import { Link, useLocation } from "@tanstack/react-router";
import { Home, MessageCircle, Settings, User, Users } from "lucide-react";

export default function BottomNav() {
  const { pathname } = useLocation();
  const items = [
    { to: "/", icon: Home, label: "خانه" },
    { to: "/friends", icon: Users, label: "دوستان" },
    { to: "/chat", icon: MessageCircle, label: "چت" },
    { to: "/settings", icon: Settings, label: "تنظیمات" },
    { to: "/profile", icon: User, label: "پروفایل" },
  ] as const;

  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-40 wood-panel px-2 py-1.5 flex justify-around items-stretch safe-area-pb"
    >
      {items.map(({ to, icon: Icon, label }) => {
        const active = pathname === to || (to !== "/" && pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
              active ? "bg-black/30 wood-text" : "text-amber-100/70 hover:wood-text"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
