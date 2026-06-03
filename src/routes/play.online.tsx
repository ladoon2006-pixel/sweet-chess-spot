import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Globe, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { playMenuClick } from "@/lib/chessSound";

export const Route = createFileRoute("/play/online")({
  component: OnlineMatch,
  head: () => ({ meta: [{ title: "بازی آنلاین — Chess Master" }] }),
});

const TIME_OPTIONS = [
  { value: 0, label: "بدون زمان" },
  { value: 5, label: "۵ دقیقه" },
  { value: 10, label: "۱۰ دقیقه" },
  { value: 20, label: "۲۰ دقیقه" },
];

function OnlineMatch() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [searching, setSearching] = useState(false);
  const [timeControl, setTimeControl] = useState(5);
  const subRef = useRef<any>(null);
  const pollRef = useRef<number | null>(null);
  const retryRef = useRef<number | null>(null);
  const searchStartedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const goToGame = (gameId: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (retryRef.current) window.clearInterval(retryRef.current);
    nav({ to: "/play/game/$gameId", params: { gameId } });
  };

  const tryMatch = async (uid: string, tc: number) => {
    const { data, error } = await supabase.rpc("find_or_join_match", {
      p_user: uid,
      p_time_control: tc,
    });
    if (error) {
      toast.error(error.message);
      return null;
    }
    return (data as string | null) ?? null;
  };

  const start = async () => {
    if (!user) return;
    playMenuClick();
    setSearching(true);
    searchStartedAtRef.current = new Date().toISOString();

    // Subscribe FIRST so the opponent's INSERT doesn't fire before our channel is ready.
    const ch = supabase
      .channel(`games-watch-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "games", filter: `white_id=eq.${user.id}` },
        (p) => goToGame((p.new as any).id),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "games", filter: `black_id=eq.${user.id}` },
        (p) => goToGame((p.new as any).id),
      );
    subRef.current = ch;
    await new Promise<void>((resolve) => {
      ch.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); });
      setTimeout(resolve, 2500);
    });

    // Polling fallback for new games (in case realtime is delayed)
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      if (!user || !searchStartedAtRef.current) return;
      const { data } = await supabase
        .from("games")
        .select("id,created_at")
        .or(`white_id.eq.${user.id},black_id.eq.${user.id}`)
        .eq("status", "active")
        .gte("created_at", searchStartedAtRef.current)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) goToGame(data.id);
    }, 1500);

    // First attempt
    const gid = await tryMatch(user.id, timeControl);
    if (gid) { goToGame(gid); return; }

    // Retry loop — fixes the race where two players queue at the same instant
    // and neither sees the other on the first call (especially for "no timer").
    if (retryRef.current) window.clearInterval(retryRef.current);
    retryRef.current = window.setInterval(async () => {
      if (!user) return;
      const g = await tryMatch(user.id, timeControl);
      if (g) goToGame(g);
    }, 3500);
  };

  const cancel = async () => {
    if (!user) return;
    playMenuClick();
    if (subRef.current) supabase.removeChannel(subRef.current);
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (retryRef.current) window.clearInterval(retryRef.current);
    await supabase.from("matchmaking_queue").delete().eq("user_id", user.id);
    setSearching(false);
  };

  useEffect(() => {
    return () => {
      if (subRef.current) supabase.removeChannel(subRef.current);
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (retryRef.current) window.clearInterval(retryRef.current);
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
          <p className="text-amber-100/80 mb-4 text-center">زمان بازی رو انتخاب کن:</p>

          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
            {TIME_OPTIONS.map((opt) => {
              const active = timeControl === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { playMenuClick(); setTimeControl(opt.value); }}
                  className={`rounded-xl border-2 px-4 py-3 flex items-center justify-center gap-2 font-bold transition-all ${
                    active
                      ? "border-amber-300 bg-amber-700/40 text-amber-50 ring-2 ring-amber-300/50"
                      : "border-amber-900/60 bg-black/30 text-amber-100/80"
                  }`}
                >
                  <Clock size={16} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          <Button size="lg" onClick={start}>پیدا کردن حریف</Button>
          <p className="text-xs text-amber-100/60 mt-3 text-center max-w-sm">
            فقط با کسانی که همین زمان رو انتخاب کنن جور می‌شی
          </p>
        </>
      ) : (
        <>
          <div className="text-amber-100/80 mb-2 flex items-center gap-2">
            <span className="animate-spin h-5 w-5 border-2 border-amber-300 border-t-transparent rounded-full" />
            در حال جستجوی حریف…
          </div>
          <div className="text-xs text-amber-200/70 mb-6">
            زمان انتخابی: {TIME_OPTIONS.find((o) => o.value === timeControl)?.label}
          </div>
          <Button variant="destructive" onClick={cancel}><X size={16} /> لغو</Button>
        </>
      )}
    </div>
  );
}
