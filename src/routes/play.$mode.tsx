import { createFileRoute, Link, notFound, useParams } from "@tanstack/react-router";
import { useState } from "react";
import ChessBoard from "@/components/ChessBoard";
import { useSettings } from "@/lib/settingsStore";

export const Route = createFileRoute("/play/$mode")({
  component: PlayPage,
  beforeLoad: ({ params }) => {
    if (params.mode !== "ai" && params.mode !== "friend") throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      {
        title:
          params.mode === "ai"
            ? "بازی با هوش مصنوعی — شطرنج"
            : "بازی با دوست — شطرنج",
      },
    ],
  }),
});

function PlayPage() {
  const { mode } = useParams({ from: "/play/$mode" });
  const m = mode as "ai" | "friend";
  const { aiDifficulty, setAiDifficulty } = useSettings();
  const [humanColor, setHumanColor] = useState<"w" | "b">("w");
  const [friendOrientation, setFriendOrientation] = useState<"w" | "b">("w");
  const [key, setKey] = useState(0);

  return (
    <div dir="rtl" className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted p-4">
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-6">
        <Link to="/" className="text-sm hover:underline">← منو</Link>
        <h1 className="text-xl font-bold">
          {m === "ai" ? "بازی با هوش مصنوعی" : "بازی دونفره"}
        </h1>
        <Link to="/settings" className="text-sm hover:underline">⚙️ تنظیمات</Link>
      </header>

      {m === "ai" && (
        <div className="max-w-5xl mx-auto mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
          <span className="text-sm font-medium">سطح:</span>
          {[
            { v: 1, l: "آسان" },
            { v: 2, l: "متوسط" },
            { v: 3, l: "سخت" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => {
                setAiDifficulty(opt.v as 1 | 2 | 3);
                setKey((k) => k + 1);
              }}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                aiDifficulty === opt.v
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent"
              }`}
            >
              {opt.l}
            </button>
          ))}
          <span className="text-sm font-medium ms-4">رنگ شما:</span>
          {[
            { v: "w", l: "سفید" },
            { v: "b", l: "سیاه" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => {
                setHumanColor(opt.v as "w" | "b");
                setKey((k) => k + 1);
              }}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                humanColor === opt.v
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent"
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      )}

      <main className="max-w-5xl mx-auto flex justify-center">
        <ChessBoard key={key} mode={m} humanColor={humanColor} />
      </main>
    </div>
  );
}
