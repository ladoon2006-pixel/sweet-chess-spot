import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trophy, LogOut } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "پروفایل — Chess Master" }] }),
});

interface Profile {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setProfile(data as Profile);
        setName(data.username);
      }
    });
  }, [user]);

  const save = async () => {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from("profiles").update({ username: name.trim() }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("ذخیره شد");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-50 p-4">
      <header className="max-w-md mx-auto flex items-center justify-between mb-4">
        <Link to="/" className="text-sm">← خانه</Link>
        <h1 className="text-xl font-bold">پروفایل</h1>
        <span className="w-12" />
      </header>

      {profile && (
        <main className="max-w-md mx-auto space-y-4 pb-28">
          <div className="wood-panel rounded-2xl p-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-700/40 flex items-center justify-center text-3xl wood-text font-bold">
              {profile.username[0]?.toUpperCase()}
            </div>
            <div className="mt-3 text-lg font-bold wood-text">{profile.username}</div>
            <div className="mt-1 text-amber-200/80 flex items-center justify-center gap-1 text-sm">
              <Trophy size={14} /> امتیاز: {profile.rating}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="wood-panel rounded-xl p-3"><div className="text-2xl wood-text font-bold">{profile.wins}</div><div className="text-xs text-amber-100/70">برد</div></div>
            <div className="wood-panel rounded-xl p-3"><div className="text-2xl wood-text font-bold">{profile.draws}</div><div className="text-xs text-amber-100/70">مساوی</div></div>
            <div className="wood-panel rounded-xl p-3"><div className="text-2xl wood-text font-bold">{profile.losses}</div><div className="text-xs text-amber-100/70">باخت</div></div>
          </div>

          <div className="wood-panel rounded-2xl p-4 space-y-2">
            <label className="text-sm text-amber-100/80">نام کاربری</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/30 rounded-lg px-3 py-2 text-amber-50 border border-amber-900/60"
            />
            <Button onClick={save} className="w-full">ذخیره</Button>
          </div>

          <Button variant="destructive" onClick={() => signOut().then(() => nav({ to: "/" }))} className="w-full">
            <LogOut size={16} /> خروج از حساب
          </Button>
        </main>
      )}
      <BottomNav />
    </div>
  );
}
