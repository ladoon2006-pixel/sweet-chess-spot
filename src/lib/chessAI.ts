import { Chess, type Move } from "chess.js";

const VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

function evaluate(game: Chess): number {
  // Positive = good for white
  let score = 0;
  const board = game.board();
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      const v = VALUES[sq.type] ?? 0;
      score += sq.color === "w" ? v : -v;
    }
  }
  return score;
}

function negamax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  color: 1 | -1,
): number {
  if (depth === 0 || game.isGameOver()) {
    if (game.isCheckmate()) return -100000 * color * (color === 1 ? 1 : 1);
    return color * evaluate(game);
  }
  const moves = game.moves({ verbose: true }) as Move[];
  // Order: captures first
  moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));
  let best = -Infinity;
  for (const m of moves) {
    game.move(m);
    const score = -negamax(game, depth - 1, -beta, -alpha, (-color) as 1 | -1);
    game.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Returns the best move for the side to move at the given depth. */
export function pickAIMove(fen: string, depth: number): Move | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;
  const color: 1 | -1 = game.turn() === "w" ? 1 : -1;

  let bestMove: Move = moves[0];
  let bestScore = -Infinity;
  // Add a touch of randomness among near-best moves
  const scored: { m: Move; s: number }[] = [];
  for (const m of moves) {
    game.move(m);
    const s = -negamax(game, depth - 1, -Infinity, Infinity, (-color) as 1 | -1);
    game.undo();
    scored.push({ m, s });
    if (s > bestScore) {
      bestScore = s;
      bestMove = m;
    }
  }
  const top = scored.filter((x) => x.s >= bestScore - 15);
  return top[Math.floor(Math.random() * top.length)].m;
}
