import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — Chess Master Online" },
      { name: "description", content: "Terms of Service for Chess Master Online within the Pi Network ecosystem." },
    ],
  }),
});

function TermsPage() {
  return (
    <div dir="rtl" className="relative min-h-screen w-full flex flex-col">
      <div className="wood-bg absolute inset-0 -z-10" />

      <div className="flex-1 max-w-3xl mx-auto w-full p-6">
        <header className="flex items-center justify-between mb-8">
          <Link to="/" className="text-sm text-amber-100/80 hover:text-amber-100 hover:underline transition-colors">← منو</Link>
          <h1 className="text-2xl font-bold wood-text text-center flex-1">Terms of Service</h1>
          <span className="w-12" />
        </header>

        <main className="wood-panel rounded-2xl p-6 sm:p-8 space-y-6 text-amber-50/90 leading-relaxed">
          <section>
            <p className="text-amber-200/70 text-sm">Last Updated: 2026-05-30</p>
            <p className="mt-2">
              By using this application, you agree to the following Terms of Service. Please read them carefully before using the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using this app, you confirm that you accept these Terms and agree to follow them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">2. Use of the App</h2>
            <p>
              You may only use this app for lawful purposes and in accordance with the rules of the Pi Network ecosystem. Any attempt to hack, exploit, or misuse the app is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">3. User Data</h2>
            <p>
              This app does not store or collect personal data outside the Pi Network. All authentication and payments are handled securely by the official Pi SDK.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">4. Payments</h2>
            <p>
              All Pi transactions are processed through the Pi Network. The app does not store wallet information or transaction details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">5. Limitation of Liability</h2>
            <p>
              The app is provided "as is" without any guarantees. We are not responsible for issues caused by the Pi Network, technical errors, or user actions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">6. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the app means you accept the updated version.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
