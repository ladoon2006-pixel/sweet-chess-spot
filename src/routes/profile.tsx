import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trophy, LogOut, Camera, AlertTriangle, ShieldX } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "پروفایل — Chess Master" }] }),
});

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  avatar_url: string | null;
  warning_count: number;
  banned_until: string | null;
  is_permanently_banned: boolean;
  paid_games_remaining: number;
}

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/" });
  }, [user, loading, nav]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      const p = data as Profile;
      setProfile(p);
      setDisplayName(p.display_name ?? p.username);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const save = async () => {
    if (!user || !displayName.trim()) return;
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", user.id);
    if (error) toast.error(error.message);
    else { toast.success("ذخیره شد"); loadProfile(); }
  };


  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم عکس باید کمتر از ۲ مگابایت باشه");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("فقط فایل تصویری مجازه");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?t=${Date.now()}`;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("عکس آپلود شد");
      loadProfile();
    }
    setUploading(false);
  };

  const banned = profile?.is_permanently_banned || (profile?.banned_until && new Date(profile.banned_until) > new Date());

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-50 p-4">
      <header className="max-w-md mx-auto flex items-center justify-between mb-4">
        <Link to="/" className="text-sm">← خانه</Link>
        <h1 className="text-xl font-bold">پروفایل</h1>
        <span className="w-12" />
      </header>

      {!profile && (
        <div className="max-w-md mx-auto space-y-4 pb-28 animate-pulse">
          <div className="wood-panel rounded-2xl p-6 flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-amber-900/40" />
            <div className="h-4 w-32 rounded bg-amber-900/40" />
            <div className="h-3 w-24 rounded bg-amber-900/30" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0,1,2].map(i => <div key={i} className="wood-panel rounded-xl h-16" />)}
          </div>
          <div className="wood-panel rounded-2xl h-32" />
        </div>
      )}

      {profile && (
        <main className="max-w-md mx-auto space-y-4 pb-28">
          {/* Ban / warning banner */}
          {profile.is_permanently_banned && (
            <div className="rounded-2xl bg-red-950/60 border border-red-700 p-4 flex items-start gap-2">
              <ShieldX className="text-red-400 shrink-0" size={20} />
              <div className="text-sm">
                <div className="font-bold text-red-300">حساب شما دائمی مسدود شده</div>
                <p className="text-red-200/80 mt-1">به دلیل گزارش‌های متعدد، حسابت برای همیشه از بازی آنلاین محروم شده.</p>
              </div>
            </div>
          )}
          {!profile.is_permanently_banned && profile.banned_until && new Date(profile.banned_until) > new Date() && (
            <div className="rounded-2xl bg-orange-950/60 border border-orange-700 p-4 flex items-start gap-2">
              <ShieldX className="text-orange-400 shrink-0" size={20} />
              <div className="text-sm">
                <div className="font-bold text-orange-300">حساب موقتاً مسدوده</div>
                <p className="text-orange-200/80 mt-1">
                  تا تاریخ {new Date(profile.banned_until).toLocaleDateString("fa-IR")} نمی‌تونی بازی آنلاین کنی.
                </p>
              </div>
            </div>
          )}
          {!banned && profile.warning_count >= 3 && (
            <div className="rounded-2xl bg-yellow-950/60 border border-yellow-700 p-4 flex items-start gap-2">
              <AlertTriangle className="text-yellow-400 shrink-0" size={20} />
              <div className="text-sm">
                <div className="font-bold text-yellow-300">هشدار</div>
                <p className="text-yellow-200/80 mt-1">
                  {profile.warning_count} گزارش روی حسابت ثبت شده. در صورت ادامه، حسابت موقت یا دائمی مسدود می‌شه.
                </p>
              </div>
            </div>
          )}

          <div className="wood-panel rounded-2xl p-6 text-center">
            <div className="relative w-24 h-24 mx-auto">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-24 h-24 rounded-full object-cover border-2 border-amber-700" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-amber-700/40 flex items-center justify-center text-4xl wood-text font-bold">
                  {profile.username[0]?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -left-1 bg-amber-600 hover:bg-amber-500 rounded-full p-2 shadow-lg"
                title="تغییر عکس"
              >
                <Camera size={14} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
              />
            </div>
            <div className="mt-3 text-lg font-bold wood-text">{profile.display_name ?? profile.username}</div>
            <div className="mt-1 text-xs text-amber-100/60 font-mono" dir="ltr">@{profile.username}</div>
            <div className="mt-1 text-amber-200/80 flex items-center justify-center gap-1 text-sm">
              <Trophy size={14} /> امتیاز: {profile.rating}
            </div>
            {uploading && <div className="text-xs text-amber-100/70 mt-1">در حال آپلود...</div>}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="wood-panel rounded-xl p-3"><div className="text-2xl wood-text font-bold">{profile.wins}</div><div className="text-xs text-amber-100/70">برد</div></div>
            <div className="wood-panel rounded-xl p-3"><div className="text-2xl wood-text font-bold">{profile.draws}</div><div className="text-xs text-amber-100/70">مساوی</div></div>
            <div className="wood-panel rounded-xl p-3"><div className="text-2xl wood-text font-bold">{profile.losses}</div><div className="text-xs text-amber-100/70">باخت</div></div>
          </div>

          <div className="wood-panel rounded-2xl p-4 space-y-2">
            <label className="text-sm text-amber-100/80">نام نمایشی</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
              className="w-full bg-black/30 rounded-lg px-3 py-2 text-amber-50 border border-amber-900/60"
            />
            <div className="text-[11px] text-amber-100/60">شناسه کاربری <span dir="ltr" className="font-mono">@{profile.username}</span> ثابته و قابل تغییر نیست.</div>
            <Button onClick={save} className="w-full">ذخیره</Button>
          </div>


          <Link to="/shop" className="block wood-panel rounded-2xl p-4 text-center">
            <div className="font-bold wood-text">بازی‌های باقی‌مانده: {profile.paid_games_remaining}</div>
            <div className="text-xs text-amber-100/70 mt-1">برای خرید بسته اینجا کلیک کن</div>
          </Link>

          <Button variant="destructive" onClick={() => signOut().then(() => nav({ to: "/" }))} className="w-full">
            <LogOut size={16} /> خروج از حساب
          </Button>
        </main>
      )}
      <BottomNav />
    </div>
  );
}
