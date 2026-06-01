import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UserPlus, Check, X, Search, Send, MessageCircle, ArrowRight, Swords } from "lucide-react";
import { containsProfanity } from "@/lib/profanityFilter";
import ReportButton from "@/components/ReportButton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const search = z.object({ with: z.string().optional(), tab: z.string().optional() });

export const Route = createFileRoute("/friends")({
  component: FriendsPage,
  validateSearch: search,
  head: () => ({ meta: [{ title: "دوستان و چت — Chess Master" }] }),
});

interface Friend {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  other: { id: string; username: string; rating: number } | null;
}
interface Msg { id: string; sender_id: string; receiver_id: string; content: string; created_at: string; }

function FriendsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { with: withId, tab } = useSearch({ from: "/friends" });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; username: string; rating: number }[]>([]);
  const [activeTab, setActiveTab] = useState<string>(withId ? "chat" : (tab ?? "friends"));
  const [activeChat, setActiveChat] = useState<string | null>(withId ?? null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const [challenge, setChallenge] = useState<{ id: string; username: string } | null>(null);

  const sendChallenge = async (toId: string, tc: number) => {
    if (!user) return;
    const { error } = await supabase.from("game_challenges").insert({
      from_user: user.id, to_user: toId, time_control: tc, status: "pending",
    });
    if (error) toast.error(error.message);
    else toast.success("دعوت ارسال شد — منتظر پاسخ دوست…");
    setChallenge(null);
  };

  useEffect(() => {
    if (!loading && !user) nav({ to: "/" });
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

  // chat: load messages + subscribe
  useEffect(() => {
    if (!user || !activeChat) return;
    setMsgs([]);
    (async () => {
      const { data } = await supabase
        .from("friend_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChat}),and(sender_id.eq.${activeChat},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200);
      setMsgs((data ?? []) as any);
    })();
    const ch = supabase
      .channel(`fm-${user.id}-${activeChat}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friend_messages" }, (payload) => {
        const m = payload.new as Msg;
        if ((m.sender_id === user.id && m.receiver_id === activeChat) || (m.sender_id === activeChat && m.receiver_id === user.id)) {
          setMsgs((p) => [...p, m]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, activeChat]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const sendMsg = async () => {
    if (!user || !activeChat || !text.trim()) return;
    const body = text.trim();
    if (containsProfanity(body)) {
      toast.error("پیام شامل کلمات نامناسبه و ارسال نشد");
      return;
    }
    setText("");
    await supabase.from("friend_messages").insert({ sender_id: user.id, receiver_id: activeChat, content: body });
  };

  const searchUsers = async () => {
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
    if (error) toast.error(error.message); else reload();
  };
  const removeFriend = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id); reload();
  };

  const pending = friends.filter((f) => f.status === "pending" && f.addressee_id === user?.id);
  const accepted = friends.filter((f) => f.status === "accepted");
  const sent = friends.filter((f) => f.status === "pending" && f.requester_id === user?.id);
  const activeFriend = accepted.find((f) => f.other?.id === activeChat)?.other;

  const openChat = (id: string) => { setActiveChat(id); setActiveTab("chat"); };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-50 p-4 pb-28">
      <header className="max-w-md mx-auto flex items-center justify-between mb-4">
        <Link to="/" className="text-sm">← خانه</Link>
        <h1 className="text-xl font-bold">دوستان و چت</h1>
        <span className="w-12" />
      </header>

      <main className="max-w-md mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/40">
            <TabsTrigger value="friends">دوستان</TabsTrigger>
            <TabsTrigger value="chat">چت</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-5 mt-4">
            <section className="wood-panel rounded-2xl p-4 space-y-2">
              <h2 className="wood-text font-bold flex items-center gap-2"><Search size={16} /> پیدا کردن بازیکن</h2>
              <div className="flex gap-2">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام کاربری" onKeyDown={(e) => e.key === "Enter" && searchUsers()} />
                <Button onClick={searchUsers}>جستجو</Button>
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
                  <div className="flex gap-1 items-center">
                    {f.other && <ReportButton reportedUserId={f.other.id} type="profile" />}
                    <Button size="sm" variant="secondary" title="دعوت به بازی"
                      onClick={() => f.other && setChallenge({ id: f.other.id, username: f.other.username })}>
                      <Swords size={14} />
                    </Button>
                    <Button size="sm" onClick={() => f.other && openChat(f.other.id)}>
                      <MessageCircle size={14} />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeFriend(f.id)}><X size={14} /></Button>
                  </div>
                </div>
              ))}
            </section>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            {!activeChat ? (
              <div className="space-y-2">
                <h2 className="wood-text font-bold mb-2">یک دوست انتخاب کن:</h2>
                {accepted.length === 0 ? (
                  <p className="text-sm text-amber-100/60">هنوز دوستی نداری. به تب «دوستان» برو.</p>
                ) : accepted.map((f) => f.other && (
                  <button key={f.id} onClick={() => openChat(f.other!.id)} className="w-full wood-panel rounded-xl p-3 text-right flex justify-between items-center">
                    <span className="wood-text font-bold">{f.other.username}</span>
                    <span className="text-xs text-amber-200/70">{f.other.rating}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col h-[calc(100vh-220px)]">
                <button onClick={() => setActiveChat(null)} className="text-xs text-amber-200/70 mb-2 flex items-center gap-1">
                  <ArrowRight size={12} /> همه دوستان
                </button>
                <div className="wood-panel rounded-2xl px-3 py-2 mb-2 text-sm font-bold wood-text">
                  چت با {activeFriend?.username ?? "…"}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 py-2">
                  {msgs.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex items-end gap-1 ${mine ? "justify-start" : "justify-end"}`}>
                        {!mine && <ReportButton reportedUserId={m.sender_id} type="chat" contextId={m.id} />}
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-amber-700 text-white" : "bg-black/40 text-amber-50"}`}>
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="پیام…" onKeyDown={(e) => e.key === "Enter" && sendMsg()} />
                  <Button onClick={sendMsg}><Send size={16} /></Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />

      <Dialog open={!!challenge} onOpenChange={(o) => !o && setChallenge(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>دعوت {challenge?.username} به بازی</DialogTitle>
            <DialogDescription>زمان بازی رو انتخاب کن:</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-2">
            {[
              { v: 0, l: "بدون زمان" },
              { v: 5, l: "۵ دقیقه" },
              { v: 10, l: "۱۰ دقیقه" },
              { v: 20, l: "۲۰ دقیقه" },
            ].map((opt) => (
              <Button key={opt.v} variant="secondary" onClick={() => challenge && sendChallenge(challenge.id, opt.v)}>
                {opt.l}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
