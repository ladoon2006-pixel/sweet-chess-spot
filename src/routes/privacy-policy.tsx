import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Chess Master Online" },
      { name: "description", content: "Privacy Policy for Chess Master Online within the Pi Network ecosystem." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div dir="rtl" className="relative min-h-screen w-full flex flex-col">
      <div className="wood-bg absolute inset-0 -z-10" />

      <div className="flex-1 max-w-3xl mx-auto w-full p-6">
        <header className="flex items-center justify-between mb-8">
          <Link to="/" className="text-sm text-amber-100/80 hover:text-amber-100 hover:underline transition-colors">← منو</Link>
          <h1 className="text-2xl font-bold wood-text text-center flex-1">Privacy Policy</h1>
          <span className="w-12" />
        </header>

        <main className="wood-panel rounded-2xl p-6 sm:p-8 space-y-6 text-amber-50/90 leading-relaxed">
          <section>
            <p className="text-amber-200/70 text-sm">Last Updated: 2026-05-29</p>
            <p className="mt-2">
              This Privacy Policy explains how the application <strong className="text-amber-100">Chess Master Online</strong> handles user data within the Pi Network ecosystem.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">1. Data Collection</h2>
            <p>
              This app does <strong className="text-amber-100">not</strong> collect, store, or share any personal information outside the Pi Network environment. We do not request or store:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 mr-4">
              <li>Email addresses</li>
              <li>Phone numbers</li>
              <li>Real names</li>
              <li>Location data</li>
              <li>Device identifiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">2. Authentication</h2>
            <p>
              All authentication is handled securely by the official Pi Network SDK. We do not store authentication tokens or user credentials.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">3. Payments</h2>
            <p>
              All payments are processed through the Pi Network SDK. We do not store wallet addresses, transaction IDs, or payment details. All Pi transactions occur directly between the user and Pi Network servers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">4. Cookies &amp; Tracking</h2>
            <p>
              This app does not use cookies, analytics, tracking scripts, or third-party advertising.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">5. Security</h2>
            <p>
              All communication with the Pi Network is encrypted and handled by the Pi Browser. We do not operate external servers that store user data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold wood-text mb-2">6. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, you can contact the developer through the Pi Network Developer Portal.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
