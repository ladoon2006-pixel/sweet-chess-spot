import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
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
import { Flag, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";

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
}

interface ChatRow { id: string; sender_id: string; content: string; created_at: string; }

function OnlineGame() {
  const { gameId } = useParams({ from: "/play/game/$gameId" });
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { boardThemeIdx, pieceThemeIdx, soundEnabled } = useSettings();
  const board = BOARD_THEMES[boardThemeIdx];
  const piecesT = PIECE_THEMES[pieceThemeIdx];

  const [game, setGame] = useState<GameRow | null>(null);
  const [opp, setOpp] = useState<{ id: string; username: string; rating: number } | null>(null);
  const chessRef = useRef(new Chess());
  const [, force] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Move[]>([]);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [endMsg, setEndMsg] = useState<string | null>(null);

  const [chat, setChat] = useState<ChatRow[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

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

  // load opponent profile
  useEffect(() => {
    if (!game || !user) return;
    const otherId = game.white_id === user.id ? game.black_id : game.white_id;
    supabase.from("profiles").select("id,username,rating").eq("id", otherId).single().then(({ data }) => {
      if (data) setOpp(data as any);
    });
  }, [game?.white_id, game?.black_id, user?.id]);

  // Load chat + subscribe
  useEffect(() => {
    supabase.from("game_chat_messages").select("*").eq("game_id", gameId).order("created_at").then(({ data }) => {
      setChat((data ?? []) as any);
    });
    const ch = supabase
      .channel(`gchat-${gameId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_chat_messages", filter: `game_id=eq.${gameId}` }, (p) => {
        setChat((c) => [...c, p.new as ChatRow]);
        if (soundEnabled) playSound("notify");
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [gameId, soundEnabled]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, chatOpen]);

  const showEnd = (g: GameRow) => {
    if (g.status === "checkmate") {
      const winner = g.winner_id === user?.id ? "شما" : opp?.username ?? "حریف";
      setEndMsg(`کیش و مات! ${winner} برنده شد.`);
    } else if (g.status === "resigned") {
      setEndMsg(g.winner_id === user?.id ? "حریف تسلیم شد. شما برنده!" : "شما تسلیم شدید.");
    } else if (g.status === "stalemate") setEndMsg("پات! بازی مساوی شد.");
    else if (g.status === "draw") setEndMsg("بازی مساوی شد.");
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

    const { error } = await supabase
      .from("games")
      .update({
        fen: g.fen(),
        pgn: g.pgn(),
        turn: g.turn(),
        last_move_from: m.from,
        last_move_to: m.to,
        last_move_san: m.san,
        status,
        winner_id,
      })
      .eq("id", game.id);
    if (error) { toast.error(error.message); return; }

    if (status !== "active") {
      await updateRatings(status, winner_id);
    }
  };

  const updateRatings = async (status: GameRow["status"], winner_id: string | null) => {
    if (!game) return;
    if (status === "checkmate" && winner_id) {
      const loser = winner_id === game.white_id ? game.black_id : game.white_id;
      await supabase.rpc as any; // skip — handled below with simple updates
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
    await updateRatings("checkmate", winner);
  };

  const sendChat = async () => {
    if (!chatText.trim() || !user) return;
    const c = chatText.trim();
    setChatText("");
    await supabase.from("game_chat_messages").insert({ game_id: gameId, sender_id: user.id, content: c });
  };

  if (!game) return <div className="min-h-screen flex items-center justify-center text-amber-50">در حال بارگذاری…</div>;

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
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-3">
        <Link to="/" className="text-sm">← خانه</Link>
        <div className="text-center text-sm">
          <div className="font-bold">{opp?.username ?? "حریف"} <span className="text-amber-200/70">({opp?.rating ?? "—"})</span></div>
          <div className="text-xs text-amber-200/70">
            {game.status === "active" ? (isMyTurn ? "نوبت شماست" : "نوبت حریف…") : "بازی تمام شد"}
          </div>
        </div>
        <button onClick={() => setChatOpen((o) => !o)} className="relative p-2 rounded-lg bg-amber-800/40">
          <MessageCircle size={20} />
          {chat.length > 0 && <span className="absolute -top-1 -left-1 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{chat.length}</span>}
        </button>
      </header>

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

      <div className="max-w-5xl mx-auto mt-4 flex justify-center gap-2">
        {game.status === "active" && (
          <Button variant="destructive" onClick={resign}><Flag size={14} /> تسلیم</Button>
        )}
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="fixed inset-x-0 bottom-0 top-1/2 bg-stone-950 border-t-2 border-amber-700/60 z-30 flex flex-col">
          <div className="p-3 border-b border-amber-900/40 flex justify-between items-center">
            <span className="font-bold">چت بازی</span>
            <button onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chat.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
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

      <Dialog open={!!endMsg} onOpenChange={(o) => !o && setEndMsg(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>پایان بازی</DialogTitle>
            <DialogDescription>{endMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => nav({ to: "/" })} className="w-full">بازگشت به منو</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
