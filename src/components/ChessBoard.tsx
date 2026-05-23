import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";
import { useSettings, BOARD_THEMES, PIECE_THEMES } from "@/lib/settingsStore";
import { playSound } from "@/lib/chessSound";
import { pickAIMove } from "@/lib/chessAI";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const PIECE_GLYPHS: Record<string, string> = {
  p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
};

type Mode = "ai" | "friend";

interface Props {
  mode: Mode;
  /** Which color the human plays when mode === "ai" */
  humanColor?: "w" | "b";
  /** Force board orientation (used by friend mode flip button) */
  orientationOverride?: "w" | "b";
}

export default function ChessBoard({ mode, humanColor = "w", orientationOverride }: Props) {
  const { boardThemeIdx, pieceThemeIdx, soundEnabled, aiDifficulty } = useSettings();
  const board = BOARD_THEMES[boardThemeIdx];
  const pieces = PIECE_THEMES[pieceThemeIdx];

  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [endDialog, setEndDialog] = useState<string | null>(null);

  const orientation: "w" | "b" = orientationOverride ?? (mode === "ai" ? humanColor : "w");

  const beep = (m: Move) => {
    if (!soundEnabled) return;
    if (m.flags.includes("c") || m.flags.includes("e")) playSound("capture");
    else if (m.flags.includes("k") || m.flags.includes("q")) playSound("castle");
    else if (m.flags.includes("p")) playSound("promote");
    else playSound("move");
  };

  const finishMove = (m: Move) => {
    beep(m);
    setLastMove({ from: m.from as Square, to: m.to as Square });
    setFen(gameRef.current.fen());
    setHistory([...gameRef.current.history()]);
    setSelected(null);
    setLegalTargets([]);

    const g = gameRef.current;
    if (g.isGameOver()) {
      setTimeout(() => {
        if (soundEnabled) playSound(g.isCheckmate() ? "victory" : "draw");
        if (g.isCheckmate()) {
          const winner = g.turn() === "w" ? "سیاه" : "سفید";
          setEndDialog(`کیش و مات! ${winner} برنده شد.`);
        } else if (g.isStalemate()) setEndDialog("پات! بازی مساوی شد.");
        else if (g.isDraw()) setEndDialog("بازی مساوی شد.");
      }, 50);
    } else if (g.inCheck() && soundEnabled) {
      setTimeout(() => playSound("check"), 80);
    }
  };

  // AI turn
  useEffect(() => {
    if (mode !== "ai") return;
    const g = gameRef.current;
    if (g.isGameOver()) return;
    if (g.turn() === humanColor) return;
    setThinking(true);
    const id = setTimeout(() => {
      const move = pickAIMove(g.fen(), aiDifficulty + 1);
      if (move) {
        const applied = g.move({ from: move.from, to: move.to, promotion: move.promotion });
        if (applied) finishMove(applied);
      }
      setThinking(false);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, mode, humanColor, aiDifficulty]);

  const handleSquareClick = (sq: Square) => {
    const g = gameRef.current;
    if (g.isGameOver()) return;
    if (mode === "ai" && g.turn() !== humanColor) return;

    const piece = g.get(sq);

    if (selected) {
      const candidate = legalTargets.find((m) => m.to === sq);
      if (candidate) {
        // Promotion?
        if (candidate.flags.includes("p")) {
          setPromotion({ from: selected, to: sq });
          return;
        }
        const applied = g.move({ from: selected, to: sq });
        if (applied) finishMove(applied);
        return;
      }
      if (piece && piece.color === g.turn()) {
        setSelected(sq);
        setLegalTargets(g.moves({ square: sq, verbose: true }) as Move[]);
        return;
      }
      setSelected(null);
      setLegalTargets([]);
      return;
    }

    if (piece && piece.color === g.turn()) {
      setSelected(sq);
      setLegalTargets(g.moves({ square: sq, verbose: true }) as Move[]);
    }
  };

  const applyPromotion = (piece: "q" | "r" | "b" | "n") => {
    if (!promotion) return;
    const g = gameRef.current;
    const applied = g.move({ from: promotion.from, to: promotion.to, promotion: piece });
    setPromotion(null);
    if (applied) finishMove(applied);
  };

  const reset = () => {
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    setHistory([]);
    setEndDialog(null);
  };

  const undo = () => {
    const g = gameRef.current;
    // In AI mode undo both plies so it's human's turn again
    g.undo();
    if (mode === "ai" && g.turn() !== humanColor) g.undo();
    setFen(g.fen());
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    setHistory([...g.history()]);
    setEndDialog(null);
  };

  const filesAll = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranksAll = [8, 7, 6, 5, 4, 3, 2, 1];
  const files = orientation === "w" ? filesAll : [...filesAll].reverse();
  const ranks = orientation === "w" ? ranksAll : [...ranksAll].reverse();

  const targetSet = useMemo(() => new Set(legalTargets.map((m) => m.to)), [legalTargets]);
  const captureSet = useMemo(
    () => new Set(legalTargets.filter((m) => m.captured || m.flags.includes("e")).map((m) => m.to)),
    [legalTargets],
  );

  const g = gameRef.current;
  const inCheckSquare: Square | null = (() => {
    if (!g.inCheck()) return null;
    const turn = g.turn();
    const b = g.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = b[r][c];
        if (sq && sq.type === "k" && sq.color === turn) return sq.square as Square;
      }
    }
    return null;
  })();

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 w-full">
      <div
        className="rounded-xl overflow-hidden shadow-2xl border-2"
        style={{ borderColor: board.dark }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
            gridTemplateRows: "repeat(8, minmax(0, 1fr))",
            width: "min(92vw, 560px)",
            height: "min(92vw, 560px)",
          }}
        >
          {ranks.map((rank) =>
            files.map((file) => {
              const sq = `${file}${rank}` as Square;
              const isDark = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 1;
              const piece = g.get(sq);
              const isSelected = selected === sq;
              const isTarget = targetSet.has(sq);
              const isCapture = captureSet.has(sq);
              const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
              const isCheck = inCheckSquare === sq;
              const bg = isDark ? board.dark : board.light;
              return (
                <button
                  key={sq}
                  onClick={() => handleSquareClick(sq)}
                  className="relative flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: bg,
                    outline: isSelected ? `3px solid rgba(255,235,59,0.9)` : "none",
                    outlineOffset: "-3px",
                  }}
                >
                  {isLast && (
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: "rgba(255, 235, 59, 0.28)" }}
                    />
                  )}
                  {isCheck && (
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(244,67,54,0.85) 0%, rgba(244,67,54,0) 70%)",
                      }}
                    />
                  )}
                  {piece && (
                    <span
                      className="chess-piece relative z-10"
                      style={{
                        fontSize: "min(11vw, 64px)",
                        color: piece.color === "w" ? pieces.white : pieces.black,
                        textShadow:
                          piece.color === "w"
                            ? "0 0 1px #000, 0 0 1px #000, 0 1px 2px rgba(0,0,0,.55)"
                            : "0 0 1px #fff, 0 0 1px #fff, 0 1px 2px rgba(0,0,0,.55)",
                      }}
                    >
                      {PIECE_GLYPHS[piece.type]}
                    </span>
                  )}
                  {isTarget && !piece && (
                    <span
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        width: "28%",
                        height: "28%",
                        backgroundColor: "rgba(0,0,0,0.28)",
                      }}
                    />
                  )}
                  {isTarget && isCapture && (
                    <span
                      className="absolute inset-1 pointer-events-none rounded-full"
                      style={{ boxShadow: "inset 0 0 0 4px rgba(0,0,0,0.35)" }}
                    />
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <aside className="w-full lg:w-72 flex flex-col gap-4">
        <div className="rounded-xl border bg-card p-4 text-card-foreground">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {mode === "ai" ? "بازی با هوش مصنوعی" : "بازی با دوست"}
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            نوبت:{" "}
            <span className="font-semibold text-foreground">
              {g.turn() === "w" ? "سفید" : "سیاه"}
            </span>
            {thinking && mode === "ai" && (
              <span className="ms-2 text-xs animate-pulse">در حال فکر کردن…</span>
            )}
          </p>
          {g.inCheck() && !g.isGameOver() && (
            <p className="mt-1 text-sm font-bold text-destructive">کیش!</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={undo} disabled={history.length === 0}>
            بازگشت حرکت
          </Button>
          <Button variant="default" className="flex-1" onClick={reset}>
            بازی جدید
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-4 text-card-foreground max-h-64 overflow-auto">
          <h3 className="text-sm font-semibold mb-2">تاریخچه حرکات</h3>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">هنوز حرکتی انجام نشده</p>
          ) : (
            <ol className="text-sm grid grid-cols-2 gap-x-3 gap-y-1 font-mono" dir="ltr">
              {history.map((h, i) => (
                <li key={i} className="flex gap-2">
                  {i % 2 === 0 && (
                    <span className="text-muted-foreground w-6">{i / 2 + 1}.</span>
                  )}
                  <span>{h}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>

      <Dialog open={!!promotion} onOpenChange={(o) => !o && setPromotion(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ترفیع پیاده</DialogTitle>
            <DialogDescription>پیاده‌ات به کدوم مهره ترفیع پیدا کنه؟</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-2">
            {(["q", "r", "b", "n"] as const).map((p) => (
              <button
                key={p}
                onClick={() => applyPromotion(p)}
                className="aspect-square rounded-lg border-2 flex items-center justify-center text-5xl chess-piece hover:scale-105 transition-transform"
                style={{
                  borderColor: board.dark,
                  backgroundColor: board.light,
                  color: g.turn() === "w" ? pieces.white : pieces.black,
                  textShadow:
                    g.turn() === "w"
                      ? "0 0 1px #000,0 1px 2px rgba(0,0,0,.5)"
                      : "0 0 1px #fff,0 1px 2px rgba(0,0,0,.5)",
                }}
              >
                {PIECE_GLYPHS[p]}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!endDialog} onOpenChange={(o) => !o && setEndDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>پایان بازی</DialogTitle>
            <DialogDescription>{endDialog}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={reset} className="w-full">شروع بازی جدید</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
