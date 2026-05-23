import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Globe, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/play/online")({
  component: OnlineMatch,
  head: () => ({ meta: [{ title: "بازی آنلاین — Chess Master" }] }),
});

function OnlineMatch() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [searching, setSearching] = useState(false);
  const subRef = useRef<any>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { next: "/play/online" } });
  }, [user, loading, nav]);

  const start = async () => {
    if (!user) return;
    setSearching(true);

    // subscribe to new games for me BEFORE calling the rpc (avoid race)
    const ch = supabase
      .channel(`games-watch-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "games", filter: `white_id=eq.${user.id}` },
        (p) => nav({ to: "/play/game/$gameId", params: { gameId: (p.new as any).id } }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "games", filter: `black_id=eq.${user.id}` },
        (p) => nav({ to: "/play/game/$gameId", params: { gameId: (p.new as any).id } }),
      )
      .subscribe();
    subRef.current = ch;

    const { data, error } = await supabase.rpc("find_or_join_match", { p_user: user.id });
    if (error) { toast.error(error.message); setSearching(false); return; }
    if (data) {
      // matched instantly
      nav({ to: "/play/game/$gameId", params: { gameId: data as string } });
    }
  };

  const cancel = async () => {
    if (!user) return;
    if (subRef.current) supabase.removeChannel(subRef.current);
    await supabase.from("matchmaking_queue").delete().eq("user_id", user.id);
    setSearching(false);
  };

  useEffect(() => {
    return () => {
      if (subRef.current) supabase.removeChannel(subRef.current);
      if (user) supabase.from("matchmaking_queue").delete().eq("user_id", user.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-50 flex flex-col items-center justify-center p-4">
      <Link to="/" className="absolute top-4 right-4 text-sm">← منو</Link>

      <Globe size={64} className="text-amber-300 mb-4" />
      <h1 className="text-2xl font-bold mb-2">بازی آنلاین</h1>

      {!searching ? (
        <>
          <p className="text-amber-100/80 mb-6 text-center">با یک حریف تصادفی روبه‌رو شو</p>
          <Button size="lg" onClick={start}>پیدا کردن حریف</Button>
        </>
      ) : (
        <>
          <div className="text-amber-100/80 mb-6 flex items-center gap-2">
            <span className="animate-spin h-5 w-5 border-2 border-amber-300 border-t-transparent rounded-full" />
            در حال جستجوی حریف…
          </div>
          <Button variant="destructive" onClick={cancel}><X size={16} /> لغو</Button>
        </>
      )}
    </div>
  );
}
