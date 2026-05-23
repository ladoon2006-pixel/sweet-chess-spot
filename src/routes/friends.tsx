import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserPlus, Check, X, Search } from "lucide-react";

export const Route = createFileRoute("/friends")({
  component: FriendsPage,
  head: () => ({ meta: [{ title: "دوستان — Chess Master" }] }),
});

interface Friend {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  other: { id: string; username: string; rating: number } | null;
}

function FriendsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; username: string; rating: number }[]>([]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { next: "/friends" } });
  }, [user, loading, nav]);

  const reload = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (!data) return;
    const ids = data.map((f: any) => (f.requester_id === user.id ? f.addressee_id : f.requester_id));
    const { data: profs } = await supabase.from("profiles").select("id,username,rating").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setFriends(
      data.map((f: any) => ({
        ...f,
        other: profMap.get(f.requester_id === user.id ? f.addressee_id : f.requester_id) ?? null,
      })),
    );
  };

  useEffect(() => {
    reload();
    if (!user) return;
    const ch = supabase
      .channel("friendships-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const search = async () => {
    if (!q.trim() || !user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id,username,rating")
      .ilike("username", `%${q.trim()}%`)
      .neq("id", user.id)
      .limit(10);
    setResults((data ?? []) as any);
  };

  const sendRequest = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: id });
    if (error) toast.error(error.message);
    else { toast.success("درخواست ارسال شد"); reload(); }
  };

  const respond = async (id: string, status: "accepted" | "blocked") => {
    const { error } = await supabase.from("friendships").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else reload();
  };

  const removeFriend = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    reload();
  };

  const pending = friends.filter((f) => f.status === "pending" && f.addressee_id === user?.id);
  const accepted = friends.filter((f) => f.status === "accepted");
  const sent = friends.filter((f) => f.status === "pending" && f.requester_id === user?.id);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-50 p-4 pb-28">
      <header className="max-w-md mx-auto flex items-center justify-between mb-4">
        <Link to="/" className="text-sm">← خانه</Link>
        <h1 className="text-xl font-bold">دوستان</h1>
        <span className="w-12" />
      </header>

      <main className="max-w-md mx-auto space-y-5">
        <section className="wood-panel rounded-2xl p-4 space-y-2">
          <h2 className="wood-text font-bold flex items-center gap-2"><Search size={16} /> پیدا کردن بازیکن</h2>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام کاربری" onKeyDown={(e) => e.key === "Enter" && search()} />
            <Button onClick={search}>جستجو</Button>
          </div>
          {results.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
              <div className="text-sm"><b>{r.username}</b> <span className="text-amber-200/70 text-xs">({r.rating})</span></div>
              <Button size="sm" onClick={() => sendRequest(r.id)}><UserPlus size={14} /></Button>
            </div>
          ))}
        </section>

        {pending.length > 0 && (
          <section className="wood-panel rounded-2xl p-4 space-y-2">
            <h2 className="wood-text font-bold">درخواست‌های دریافتی</h2>
            {pending.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
                <span>{f.other?.username ?? "—"}</span>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => respond(f.id, "accepted")}><Check size={14} /></Button>
                  <Button size="sm" variant="destructive" onClick={() => respond(f.id, "blocked")}><X size={14} /></Button>
                </div>
              </div>
            ))}
          </section>
        )}

        {sent.length > 0 && (
          <section className="wood-panel rounded-2xl p-4 space-y-2">
            <h2 className="wood-text font-bold">درخواست‌های ارسالی</h2>
            {sent.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 text-sm">
                <span>{f.other?.username ?? "—"}</span>
                <span className="text-amber-200/70 text-xs">در انتظار…</span>
              </div>
            ))}
          </section>
        )}

        <section className="wood-panel rounded-2xl p-4 space-y-2">
          <h2 className="wood-text font-bold">دوستان شما ({accepted.length})</h2>
          {accepted.length === 0 && <p className="text-sm text-amber-100/60">هنوز دوستی نداری</p>}
          {accepted.map((f) => (
            <div key={f.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
              <div className="text-sm"><b>{f.other?.username}</b> <span className="text-amber-200/70 text-xs">({f.other?.rating})</span></div>
              <div className="flex gap-1">
                <Link to="/chat" search={{ with: f.other?.id ?? "" }} className="text-xs bg-amber-700 px-2 py-1 rounded">چت</Link>
                <Button size="sm" variant="destructive" onClick={() => removeFriend(f.id)}><X size={14} /></Button>
              </div>
            </div>
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
