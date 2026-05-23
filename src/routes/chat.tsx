import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

const search = z.object({ with: z.string().optional() });

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  validateSearch: search,
  head: () => ({ meta: [{ title: "چت دوستان — Chess Master" }] }),
});

interface Msg { id: string; sender_id: string; receiver_id: string; content: string; created_at: string; }
interface Friend { id: string; username: string; rating: number; }

function ChatPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { with: withId } = useSearch({ from: "/chat" });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [active, setActive] = useState<string | null>(withId ?? null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { next: "/chat" } });
  }, [user, loading, nav]);

  // load friend list
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: f } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const ids = (f ?? []).map((r: any) => (r.requester_id === user.id ? r.addressee_id : r.requester_id));
      if (ids.length === 0) { setFriends([]); return; }
      const { data: profs } = await supabase.from("profiles").select("id,username,rating").in("id", ids);
      setFriends((profs ?? []) as any);
    })();
  }, [user?.id]);

  // load messages & subscribe
  useEffect(() => {
    if (!user || !active) return;
    setMsgs([]);
    (async () => {
      const { data } = await supabase
        .from("friend_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${active}),and(sender_id.eq.${active},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200);
      setMsgs((data ?? []) as any);
    })();

    const ch = supabase
      .channel(`fm-${user.id}-${active}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friend_messages" }, (payload) => {
        const m = payload.new as Msg;
        if ((m.sender_id === user.id && m.receiver_id === active) || (m.sender_id === active && m.receiver_id === user.id)) {
          setMsgs((p) => [...p, m]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!user || !active || !text.trim()) return;
    const body = text.trim();
    setText("");
    await supabase.from("friend_messages").insert({ sender_id: user.id, receiver_id: active, content: body });
  };

  const activeFriend = friends.find((f) => f.id === active);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-50 flex flex-col">
      <header className="p-4 flex items-center justify-between border-b border-amber-900/40">
        <Link to="/" className="text-sm">← خانه</Link>
        <h1 className="text-lg font-bold">{activeFriend ? `چت با ${activeFriend.username}` : "چت دوستان"}</h1>
        <span className="w-12" />
      </header>

      {!active ? (
        <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-2 pb-28">
          <h2 className="wood-text font-bold mb-2">یک دوست انتخاب کن:</h2>
          {friends.length === 0 ? (
            <p className="text-sm text-amber-100/60">هنوز دوستی نداری. به صفحه <Link to="/friends" className="underline">دوستان</Link> برو.</p>
          ) : friends.map((f) => (
            <button key={f.id} onClick={() => setActive(f.id)} className="w-full wood-panel rounded-xl p-3 text-right flex justify-between items-center">
              <span className="wood-text font-bold">{f.username}</span>
              <span className="text-xs text-amber-200/70">{f.rating}</span>
            </button>
          ))}
        </main>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto p-3 pb-32 space-y-2 max-w-md mx-auto w-full">
            <button onClick={() => setActive(null)} className="text-xs text-amber-200/70 mb-2">← همه دوستان</button>
            {msgs.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-amber-700 text-white" : "bg-black/40 text-amber-50"}`}>
                    {m.content}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </main>
          <div className="fixed bottom-16 inset-x-0 p-2 bg-stone-950/95 border-t border-amber-900/40">
            <div className="max-w-md mx-auto flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="پیام…" onKeyDown={(e) => e.key === "Enter" && send()} />
              <Button onClick={send}><Send size={16} /></Button>
            </div>
          </div>
        </>
      )}
      <BottomNav />
    </div>
  );
}
