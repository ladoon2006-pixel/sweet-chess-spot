import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "شطرنج آنلاین — بازی با هوش مصنوعی یا دوستت" },
      { name: "description", content: "بازی شطرنج با هوش مصنوعی یا دوستت روی یک دستگاه، با صدای واقعی مهره‌ها و تم‌های قابل تنظیم." },
    ],
  }),
});

function Home() {
  return (
    <div dir="rtl" className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="text-7xl mb-3">♛</div>
          <h1 className="text-4xl font-extrabold tracking-tight">شطرنج</h1>
          <p className="mt-2 text-muted-foreground">یک حالت بازی رو انتخاب کن</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <ModeCard
            to="/play/ai"
            title="بازی با هوش مصنوعی"
            desc="چالش با کامپیوتر در سه سطح سختی"
            icon="🤖"
          />
          <ModeCard
            to="/play/friend"
            title="بازی با دوست"
            desc="دو نفره روی همین دستگاه — بدون نیاز به مهره واقعی"
            icon="👥"
          />
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border bg-card hover:bg-accent transition-colors text-sm font-medium"
          >
            ⚙️ تنظیمات
          </Link>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  to, title, desc, icon,
}: { to: string; title: string; desc: string; icon: string }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border bg-card p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4 text-sm font-semibold text-primary group-hover:underline">
        شروع بازی ←
      </div>
    </Link>
  );
}
