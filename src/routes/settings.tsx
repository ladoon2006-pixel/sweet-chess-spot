import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useSettings,
  BOARD_THEMES,
  PIECE_THEMES,
} from "@/lib/settingsStore";
import { playSound } from "@/lib/chessSound";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "تنظیمات — شطرنج" }] }),
});

const PIECE_PREVIEW = "♚";

function SettingsPage() {
  const s = useSettings();
  const board = BOARD_THEMES[s.boardThemeIdx];
  const pieces = PIECE_THEMES[s.pieceThemeIdx];

  return (
    <div dir="rtl" className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted p-4">
      <header className="max-w-3xl mx-auto flex items-center justify-between mb-6">
        <Link to="/" className="text-sm hover:underline">← منو</Link>
        <h1 className="text-xl font-bold">تنظیمات</h1>
        <span className="w-12" />
      </header>

      <main className="max-w-3xl mx-auto space-y-6">
        {/* Sound */}
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">صدای حرکت مهره‌ها</h2>
              <p className="text-sm text-muted-foreground">صدای واقعی برخورد مهره به صفحه</p>
            </div>
            <Switch
              checked={s.soundEnabled}
              onCheckedChange={(v) => {
                s.setSoundEnabled(v);
                if (v) playSound("move");
              }}
            />
          </div>
        </section>

        {/* Board themes */}
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold mb-3">رنگ صفحه شطرنج</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BOARD_THEMES.map((t, i) => {
              const active = s.boardThemeIdx === i;
              return (
                <button
                  key={t.name}
                  onClick={() => s.setBoardTheme(i)}
                  className={`group rounded-xl border-2 p-3 text-start transition-all ${
                    active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="grid grid-cols-4 grid-rows-2 rounded-md overflow-hidden mb-2 h-16">
                    {Array.from({ length: 8 }).map((_, k) => {
                      const r = Math.floor(k / 4), c = k % 4;
                      const dark = (r + c) % 2 === 1;
                      return (
                        <div key={k} style={{ backgroundColor: dark ? t.dark : t.light }} />
                      );
                    })}
                  </div>
                  <div className="text-sm font-medium">{t.name}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Piece themes */}
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold mb-3">رنگ مهره‌ها</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PIECE_THEMES.map((t, i) => {
              const active = s.pieceThemeIdx === i;
              return (
                <button
                  key={t.name}
                  onClick={() => s.setPieceTheme(i)}
                  className={`rounded-xl border-2 p-3 transition-all ${
                    active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"
                  }`}
                  style={{ backgroundColor: board.light }}
                >
                  <div className="flex items-center justify-center gap-1 text-4xl chess-piece">
                    <span style={{ color: t.white, textShadow: "0 0 1px #000" }}>{PIECE_PREVIEW}</span>
                    <span style={{ color: t.black, textShadow: "0 0 1px #fff" }}>{PIECE_PREVIEW}</span>
                  </div>
                  <div className="text-sm font-medium mt-2 text-foreground bg-background/80 rounded px-2 py-0.5 text-center">
                    {t.name}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Preview */}
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold mb-3">پیش‌نمایش</h2>
          <div className="flex justify-center">
            <div className="rounded-lg overflow-hidden border-2" style={{ borderColor: board.dark }}>
              <div className="grid grid-cols-4" style={{ width: 240 }}>
                {Array.from({ length: 16 }).map((_, k) => {
                  const r = Math.floor(k / 4), c = k % 4;
                  const dark = (r + c) % 2 === 1;
                  const glyphs = ["♜", "♞", "♝", "♛", "♚", "♟", "", ""];
                  const g = glyphs[k % glyphs.length];
                  const isWhite = k % 2 === 0;
                  return (
                    <div
                      key={k}
                      className="aspect-square flex items-center justify-center text-3xl chess-piece"
                      style={{
                        backgroundColor: dark ? board.dark : board.light,
                        color: isWhite ? pieces.white : pieces.black,
                        textShadow: isWhite ? "0 0 1px #000" : "0 0 1px #fff",
                      }}
                    >
                      {g}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
