import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings, BOARD_THEMES, PIECE_THEMES } from "@/lib/settingsStore";
import { playSound } from "@/lib/chessSound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Flag, Send, MessageCircle, MessageCircleOff, Home as HomeIcon, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { containsProfanity } from "@/lib/profanityFilter";
import ReportButton from "@/components/ReportButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/play/game/$gameId")({
  component: OnlineGame,
  head: () => ({ meta: [{ title: "بازی آنلاین — Chess Master" }] }),
});

const GLYPHS: Record<string, string> = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" };

interface GameRow {
  id: string;
  white_id: string;
  black_id: string;
  fen: string;
  pgn: string;
  turn: "w" | "b";
  status: "active" | "checkmate" | "stalemate" | "draw" | "resigned" | "abandoned";
  winner_id: string | null;
  last_move_from: string | null;
  last_move_to: string | null;
  last_move_san: string | null;
  time_control: number;
  white_time_left_ms: number | null;
  black_time_left_ms: number | null;
  last_move_at: string | null;
}

interface ChatRow { id: string; sender_id: string; content: string; created_at: string; }

function fmtTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "∞";
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function OnlineGame() {
  const { gameId } = useParams({ from: "/play/game/$gameId" });
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { boardThemeIdx, pieceThemeIdx, soundEnabled, chatSoundEnabled, chatEnabled, setChatEnabled } = useSettings();
  const board = BOARD_THEMES[boardThemeIdx];
  const piecesT = PIECE_THEMES[pieceThemeIdx];

  const [game, setGame] = useState<GameRow | null>(null);
  const [opp, setOpp] = useState<{ id: string; username: string; rating: number; avatar_url: string | null } | null>(null);
  const [me, setMe] = useState<{ id: string; username: string; rating: number; avatar_url: string | null } | null>(null);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "friends">("none");
  const chessRef = useRef(new Chess());
  const [, force] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Move[]>([]);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [endMsg, setEndMsg] = useState<string | null>(null);
  const [endTone, setEndTone] = useState<"win" | "lose" | "draw" | null>(null);
  const endSoundPlayedRef = useRef(false);

  const [chat, setChat] = useState<ChatRow[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/" });
  }, [user, loading, nav, gameId]);

  const myColor: "w" | "b" | null = useMemo(() => {
    if (!user || !game) return null;
    if (game.white_id === user.id) return "w";
    if (game.black_id === user.id) return "b";
    return null;
  }, [user, game]);

  const orientation: "w" | "b" = myColor ?? "w";
  const isMyTurn = !!game && game.status === "active" && myColor === game.turn;

  // Load game + subscribe
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("games").select("*").eq("id", gameId).single();
      if (error || !data) { toast.error("بازی پیدا نشد"); return; }
      if (cancelled) return;
      const g = data as GameRow;
      setGame(g);
      chessRef.current = new Chess(g.fen);
      force((x) => x + 1);
    })();
    const ch = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, (p) => {
        const g = p.new as GameRow;
        setGame(g);
        if (chessRef.current.fen() !== g.fen) {
          chessRef.current = new Chess(g.fen);
          if (soundEnabled && g.last_move_san) {
            if (g.last_move_san.includes("#")) playSound("victory");
            else if (g.last_move_san.includes("+")) playSound("check");
            else if (g.last_move_san.includes("x")) playSound("capture");
            else playSound("move");
          }
        }
        if (g.status !== "active") {
          showEnd(g);
        }
        force((x) => x + 1);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [gameId, soundEnabled]);

  // load opponent + me profile, plus current friendship status
  useEffect(() => {
    if (!game || !user) return;
    const otherId = game.white_id === user.id ? game.black_id : game.white_id;
    supabase.from("profiles").select("id,username,rating,avatar_url").in("id", [otherId, user.id]).then(({ data }) => {
      const list = (data ?? []) as any[];
      setOpp(list.find((p) => p.id === otherId) ?? null);
      setMe(list.find((p) => p.id === user.id) ?? null);
    });
    supabase.from("friendships").select("status,requester_id,addressee_id")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${user.id})`)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setFriendStatus("none");
        else if ((data as any).status === "accepted") setFriendStatus("friends");
        else setFriendStatus("pending");
      });
  }, [game?.white_id, game?.black_id, user?.id]);

  const sendFriendRequest = async () => {
    if (!user || !opp) return;
    const { error } = await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: opp.id });
    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) toast("درخواست قبلاً ارسال شده");
      else toast.error(error.message);
      return;
    }
    setFriendStatus("pending");
    toast.success("درخواست دوستی فرستاده شد");
  };

  // Load chat + subscribe
  useEffect(() => {
    supabase.from("game_chat_messages").select("*").eq("game_id", gameId).order("created_at").then(({ data }) => {
      setChat((data ?? []) as any);
    });
    const ch = supabase
      .channel(`gchat-${gameId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_chat_messages", filter: `game_id=eq.${gameId}` }, (p) => {
        const row = p.new as ChatRow;
        setChat((c) => [...c, row]);
        // Only play sound for messages I receive from others
        if (chatEnabled && chatSoundEnabled && row.sender_id !== user?.id) {
          playSound("notify");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [gameId, chatSoundEnabled, chatEnabled, user?.id]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, chatOpen]);

  // Live ticking for timers
  useEffect(() => {
    if (!game || game.status !== "active" || !game.time_control) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 500);
    return () => window.clearInterval(id);
  }, [game?.status, game?.time_control]);

  // Browser unload during active game → confirm
  useEffect(() => {
    if (!game || game.status !== "active" || !user) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [game?.status, user?.id]);

  // Block keyboard / browser back during an active game — push a history entry
  // and re-push on popstate, opening the "are you sure" dialog instead of leaving.
  useEffect(() => {
    if (!game || game.status !== "active") return;
    window.history.pushState({ guard: true }, "");
    const onPop = () => {
      window.history.pushState({ guard: true }, "");
      setConfirmLeave(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [game?.status]);

  const showEnd = (g: GameRow) => {
    const meWon = g.winner_id && g.winner_id === user?.id;
    const otherWon = g.winner_id && g.winner_id !== user?.id;
    if (g.status === "checkmate") {
      const winner = meWon ? "شما" : opp?.username ?? "حریف";
      setEndMsg(`کیش و مات! ${winner} برنده شد.`);
      setEndTone(meWon ? "win" : "lose");
    } else if (g.status === "resigned") {
      setEndMsg(meWon ? "حریف تسلیم شد. شما برنده!" : "شما تسلیم شدید.");
      setEndTone(meWon ? "win" : "lose");
    } else if (g.status === "abandoned") {
      setEndMsg(meWon ? "حریف ترک کرد. شما برنده!" : "بازی پایان یافت.");
      setEndTone(meWon ? "win" : otherWon ? "lose" : "draw");
    } else if (g.status === "stalemate") {
      setEndMsg("پات! بازی مساوی شد.");
      setEndTone("draw");
    } else if (g.status === "draw") {
      setEndMsg("بازی مساوی شد.");
      setEndTone("draw");
    }

    if (!endSoundPlayedRef.current && soundEnabled) {
      endSoundPlayedRef.current = true;
      if (meWon) playSound("victory");
      else if (otherWon) playSound("defeat");
      else playSound("draw");
    }
  };

  const sendMove = async (m: Move) => {
    if (!game || !user) return;
    const g = chessRef.current;
    let status: GameRow["status"] = "active";
    let winner_id: string | null = null;
    if (g.isCheckmate()) { status = "checkmate"; winner_id = user.id; }
    else if (g.isStalemate()) status = "stalemate";
    else if (g.isDraw()) status = "draw";

    if (soundEnabled) {
      if (m.flags.includes("c") || m.flags.includes("e")) playSound("capture");
      else if (m.flags.includes("k") || m.flags.includes("q")) playSound("castle");
      else playSound("move");
      if (g.inCheck() && status === "active") setTimeout(() => playSound("check"), 80);
    }

    // Timer accounting
    const update: any = {
      fen: g.fen(),
      pgn: g.pgn(),
      turn: g.turn(),
      last_move_from: m.from,
      last_move_to: m.to,
      last_move_san: m.san,
      status,
      winner_id,
    };
    if (game.time_control > 0 && game.last_move_at) {
      const elapsed = Date.now() - new Date(game.last_move_at).getTime();
      const myKey = myColor === "w" ? "white_time_left_ms" : "black_time_left_ms";
      const remaining = Math.max(0, (game[myKey] ?? game.time_control * 60_000) - elapsed);
      update[myKey] = remaining;
      update.last_move_at = new Date().toISOString();
      if (remaining === 0 && status === "active") {
        update.status = "resigned";
        update.winner_id = myColor === "w" ? game.black_id : game.white_id;
      }
    } else if (game.time_control > 0) {
      update.last_move_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("games")
      .update(update)
      .eq("id", game.id);
    if (error) { toast.error(error.message); return; }

    if (update.status !== "active") {
      await updateRatings(update.status, update.winner_id);
    }
  };

  const updateRatings = async (status: GameRow["status"], winner_id: string | null) => {
    if (!game) return;
    if ((status === "checkmate" || status === "resigned" || status === "abandoned") && winner_id) {
      const loser = winner_id === game.white_id ? game.black_id : game.white_id;
      const [{ data: w }, { data: l }] = await Promise.all([
        supabase.from("profiles").select("rating,wins").eq("id", winner_id).single(),
        supabase.from("profiles").select("rating,losses").eq("id", loser).single(),
      ]);
      if (w) await supabase.from("profiles").update({ rating: (w as any).rating + 15, wins: (w as any).wins + 1 }).eq("id", winner_id);
      if (l) await supabase.from("profiles").update({ rating: Math.max(0, (l as any).rating - 12), losses: (l as any).losses + 1 }).eq("id", loser);
    } else if (status === "draw" || status === "stalemate") {
      for (const id of [game.white_id, game.black_id]) {
        const { data } = await supabase.from("profiles").select("draws").eq("id", id).single();
        if (data) await supabase.from("profiles").update({ draws: (data as any).draws + 1 }).eq("id", id);
      }
    }
  };

  const handleSquareClick = (sq: Square) => {
    if (!isMyTurn) return;
    const g = chessRef.current;
    const piece = g.get(sq);
    if (selected) {
      const cand = targets.find((m) => m.to === sq);
      if (cand) {
        if (cand.flags.includes("p")) { setPromo({ from: selected, to: sq }); return; }
        const m = g.move({ from: selected, to: sq });
        if (m) { setSelected(null); setTargets([]); force((x) => x + 1); sendMove(m); }
        return;
      }
      if (piece && piece.color === g.turn()) {
        setSelected(sq);
        setTargets(g.moves({ square: sq, verbose: true }) as Move[]);
        return;
      }
      setSelected(null); setTargets([]);
      return;
    }
    if (piece && piece.color === g.turn() && piece.color === myColor) {
      setSelected(sq);
      setTargets(g.moves({ square: sq, verbose: true }) as Move[]);
    }
  };

  const applyPromo = (p: "q" | "r" | "b" | "n") => {
    if (!promo) return;
    const g = chessRef.current;
    const m = g.move({ from: promo.from, to: promo.to, promotion: p });
    setPromo(null);
    if (m) { setSelected(null); setTargets([]); force((x) => x + 1); sendMove(m); }
  };

  const resign = async () => {
    if (!game || !user) return;
    const winner = user.id === game.white_id ? game.black_id : game.white_id;
    await supabase.from("games").update({ status: "resigned", winner_id: winner }).eq("id", game.id);
    await updateRatings("resigned", winner);
  };

  const requestLeave = () => {
    if (!game || game.status !== "active") {
      nav({ to: "/" });
      return;
    }
    setConfirmLeave(true);
  };

  const confirmAndLeave = async () => {
    setConfirmLeave(false);
    await resign();
    nav({ to: "/" });
  };

  const sendChat = async () => {
    if (!chatText.trim() || !user) return;
    const c = chatText.trim();
    if (containsProfanity(c)) {
      toast.error("پیام شامل کلمات نامناسبه و ارسال نشد");
      return;
    }
    setChatText("");
    await supabase.from("game_chat_messages").insert({ game_id: gameId, sender_id: user.id, content: c });
  };

  if (!game) return <div className="min-h-screen flex items-center justify-center text-amber-50">در حال بارگذاری…</div>;

  // Compute live remaining time for the active player
  let liveWhite = game.white_time_left_ms;
  let liveBlack = game.black_time_left_ms;
  if (game.status === "active" && game.time_control > 0 && game.last_move_at) {
    const elapsed = Date.now() - new Date(game.last_move_at).getTime();
    if (game.turn === "w" && liveWhite !== null && liveWhite !== undefined) {
      liveWhite = Math.max(0, liveWhite - elapsed);
    }
    if (game.turn === "b" && liveBlack !== null && liveBlack !== undefined) {
      liveBlack = Math.max(0, liveBlack - elapsed);
    }
  }
  const myTime = myColor === "w" ? liveWhite : liveBlack;
  const oppTime = myColor === "w" ? liveBlack : liveWhite;
  // suppress unused-tick warning
  void tick;

  const filesAll = ["a","b","c","d","e","f","g","h"];
  const ranksAll = [8,7,6,5,4,3,2,1];
  const files = orientation === "w" ? filesAll : [...filesAll].reverse();
  const ranks = orientation === "w" ? ranksAll : [...ranksAll].reverse();
  const g = chessRef.current;
  const targetSet = new Set(targets.map((m) => m.to));
  const captureSet = new Set(targets.filter((m) => m.captured || m.flags.includes("e")).map((m) => m.to));
  const lastFrom = game.last_move_from, lastTo = game.last_move_to;
  let checkSq: string | null = null;
  if (g.inCheck()) {
    const turn = g.turn();
    const b = g.board();
    outer: for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const s = b[r][c]; if (s && s.type === "k" && s.color === turn) { checkSq = s.square; break outer; }
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-50 p-3 pb-4">
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-2">
        <button onClick={requestLeave} className="text-sm flex items-center gap-1 wood-panel px-2 py-1 rounded" aria-label="خانه">
          <HomeIcon size={16} />
        </button>
        <div className="flex items-center gap-2">
          {opp && friendStatus === "none" && (
            <button onClick={sendFriendRequest} className="text-xs flex items-center gap-1 wood-panel px-2 py-1 rounded" title="درخواست دوستی">
              <UserPlus size={14} /> دوستی
            </button>
          )}
          {friendStatus === "pending" && <span className="text-[11px] text-amber-200/80">درخواست ارسال شد</span>}
          {friendStatus === "friends" && <span className="text-[11px] text-emerald-300 flex items-center gap-1"><Check size={12} /> دوست</span>}
          <button
            onClick={() => { if (!chatEnabled) { toast.error("چت خاموشه"); return; } setChatOpen((o) => !o); }}
            className="relative p-2 rounded-lg bg-amber-800/40"
            aria-label="چت"
          >
            {chatEnabled ? <MessageCircle size={18} /> : <MessageCircleOff size={18} className="opacity-60" />}
            {chatEnabled && chat.length > 0 && <span className="absolute -top-1 -left-1 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{chat.length}</span>}
          </button>
        </div>
      </header>

      {/* Player strips: avatar + username + remaining time only */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 gap-2 mb-2">
        <PlayerStrip
          name={opp?.username ?? "حریف"}
          avatarUrl={opp?.avatar_url ?? null}
          timeMs={oppTime}
          hasClock={game.time_control > 0}
          active={!isMyTurn && game.status === "active"}
        />
        <PlayerStrip
          name={me?.username ?? "شما"}
          avatarUrl={me?.avatar_url ?? null}
          timeMs={myTime}
          hasClock={game.time_control > 0}
          active={isMyTurn && game.status === "active"}
        />
      </div>

      <div className="flex justify-center">
        <div className="rounded-xl overflow-hidden shadow-2xl border-2" style={{ borderColor: board.dark }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
              gridTemplateRows: "repeat(8, minmax(0, 1fr))",
              width: "min(94vw, 520px)",
              height: "min(94vw, 520px)",
            }}
          >
            {ranks.map((rank) => files.map((file) => {
              const sq = `${file}${rank}` as Square;
              const isDark = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 1;
              const piece = g.get(sq);
              const isSel = selected === sq;
              const isTgt = targetSet.has(sq);
              const isCap = captureSet.has(sq);
              const isLast = lastFrom === sq || lastTo === sq;
              const isChk = checkSq === sq;
              return (
                <button
                  key={sq}
                  onClick={() => handleSquareClick(sq)}
                  className="relative flex items-center justify-center"
                  style={{ backgroundColor: isDark ? board.dark : board.light, outline: isSel ? "3px solid rgba(255,235,59,0.9)" : "none", outlineOffset: "-3px" }}
                >
                  {isLast && <span className="absolute inset-0 pointer-events-none" style={{ backgroundColor: "rgba(255,235,59,0.28)" }} />}
                  {isChk && <span className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(244,67,54,0.85) 0%, rgba(244,67,54,0) 70%)" }} />}
                  {piece && (
                    <span className="chess-piece relative z-10" style={{ fontSize: "min(11vw, 56px)", color: piece.color === "w" ? piecesT.white : piecesT.black, textShadow: piece.color === "w" ? "0 0 1px #000,0 1px 2px rgba(0,0,0,.55)" : "0 0 1px #fff,0 1px 2px rgba(0,0,0,.55)" }}>
                      {GLYPHS[piece.type]}
                    </span>
                  )}
                  {isTgt && !piece && <span className="absolute pointer-events-none rounded-full" style={{ width: "28%", height: "28%", backgroundColor: "rgba(0,0,0,0.28)" }} />}
                  {isTgt && isCap && <span className="absolute inset-1 pointer-events-none rounded-full" style={{ boxShadow: "inset 0 0 0 4px rgba(0,0,0,0.35)" }} />}
                </button>
              );
            }))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-4 flex justify-center gap-2 flex-wrap">
        {game.status === "active" && (
          <Button variant="destructive" onClick={resign}><Flag size={14} /> تسلیم</Button>
        )}
        <Button
          variant="secondary"
          onClick={() => setChatEnabled(!chatEnabled)}
          title="خاموش/روشن کردن چت"
        >
          {chatEnabled ? <><MessageCircleOff size={14} /> خاموش کردن چت</> : <><MessageCircle size={14} /> روشن کردن چت</>}
        </Button>
      </div>

      {/* Chat panel */}
      {chatOpen && chatEnabled && (
        <div className="fixed inset-x-0 bottom-0 top-1/2 bg-stone-950 border-t-2 border-amber-700/60 z-30 flex flex-col">
          <div className="p-3 border-b border-amber-900/40 flex justify-between items-center">
            <span className="font-bold">چت بازی</span>
            <button onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chat.map((m) => {
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
            <div ref={chatEnd} />
          </div>
          <div className="p-2 border-t border-amber-900/40 flex gap-2">
            <Input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="پیام…" onKeyDown={(e) => e.key === "Enter" && sendChat()} />
            <Button onClick={sendChat}><Send size={16} /></Button>
          </div>
        </div>
      )}

      <Dialog open={!!promo} onOpenChange={(o) => !o && setPromo(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ترفیع پیاده</DialogTitle>
            <DialogDescription>به کدوم مهره تبدیل بشه؟</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-2">
            {(["q","r","b","n"] as const).map((p) => (
              <button key={p} onClick={() => applyPromo(p)} className="aspect-square rounded-lg border-2 flex items-center justify-center text-5xl chess-piece"
                style={{ borderColor: board.dark, backgroundColor: board.light, color: myColor === "w" ? piecesT.white : piecesT.black }}>
                {GLYPHS[p]}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>خروج از بازی</DialogTitle>
            <DialogDescription>
              اگر الان از بازی خارج بشی، به منزله تسلیم شدنه و این بازی رو می‌بازی. مطمئنی؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button variant="destructive" onClick={confirmAndLeave}>بله، تسلیم می‌شم</Button>
            <Button variant="secondary" onClick={() => setConfirmLeave(false)}>ادامه بازی</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!endMsg} onOpenChange={(o) => !o && setEndMsg(null)}>
        <DialogContent className={`sm:max-w-sm ${endTone === "win" ? "ring-4 ring-amber-400/60" : endTone === "lose" ? "ring-4 ring-red-500/60" : ""}`}>
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">
              {endTone === "win" ? "🏆 پیروزی!" : endTone === "lose" ? "😔 باخت" : "🤝 مساوی"}
            </DialogTitle>
            <DialogDescription className="text-center text-base">{endMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => nav({ to: "/" })} className="w-full">بازگشت به منو</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayerStrip({
  name, avatarUrl, timeMs, hasClock, active,
}: { name: string; avatarUrl: string | null; timeMs: number | null | undefined; hasClock: boolean; active: boolean }) {
  const fmt = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return "∞";
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };
  const low = timeMs !== null && timeMs !== undefined && timeMs < 30000;
  return (
    <div className={`rounded-lg px-3 py-2 flex items-center gap-3 ${active ? "bg-amber-600/30 ring-1 ring-amber-300/60" : "bg-black/30"}`}>
      <Avatar className="w-9 h-9 border border-amber-700/60">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="bg-amber-900/60 text-amber-100 text-xs">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-bold truncate flex-1">{name}</span>
      <span className={`font-mono text-lg tabular-nums ${low ? "text-red-400" : "text-amber-100"}`}>
        {hasClock ? fmt(timeMs) : "∞"}
      </span>
    </div>
  );
}
