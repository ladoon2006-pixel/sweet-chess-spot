import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/play/ai")({
  component: AIMode,
  head: () => ({ meta: [{ title: "بازی با هوش مصنوعی — Chess Master" }] }),
});

function AIMode() {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return <div className="min-h-screen flex items-center justify-center">نیازمند ورود</div>;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-amber-50 p-4 flex flex-col items-center justify-center">
      <Link to="/" className="absolute top-4 right-4 text-sm">← منو</Link>
      
      <Bot size={64} className="text-amber-300 mb-4" />
      <h1 className="text-2xl font-bold mb-2">بازی با هوش مصنوعی</h1>
      <p className="text-amber-100/80 text-center max-w-sm">
        این بخش به‌زودی فعال می‌شود
      </p>
    </div>
  );
}
