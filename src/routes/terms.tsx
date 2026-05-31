import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — Chess Master" },
      { name: "description", content: "Terms of service for Chess Master." },
    ],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen wood-bg p-4">
      <div className="max-w-2xl mx-auto wood-panel rounded-2xl p-6 my-6 text-amber-50/90 leading-relaxed">
        <Link to="/" className="text-sm text-amber-200 underline">← Home</Link>
        <h1 className="text-3xl font-bold wood-text mt-3 mb-2">Terms of Service</h1>
        <p className="text-sm text-amber-100/70 mb-6">Last Updated: 2026-05-31</p>

        <p className="mb-4">
          By using this application, you agree to the following Terms of Service. Please read them carefully before using the app.
        </p>

        <h2 className="text-xl font-bold wood-text mt-6 mb-2">1. Acceptance of Terms</h2>
        <p className="mb-4">By accessing or using this app, you agree to be bound by these Terms.</p>

        <h2 className="text-xl font-bold wood-text mt-6 mb-2">2. Use of the App</h2>
        <p className="mb-4">
          You may use the app for personal, non-commercial purposes only. You agree not to misuse the app, attempt to disrupt its functionality, or engage in any abusive behavior.
        </p>

        <h2 className="text-xl font-bold wood-text mt-6 mb-2">3. User Data</h2>
        <p className="mb-4">
          We collect minimal data necessary for app functionality, including username, email, and game statistics. Profile pictures you upload must not contain inappropriate content.
        </p>

        <h2 className="text-xl font-bold wood-text mt-6 mb-2">4. Payments</h2>
        <p className="mb-4">
          All payments for in-app packages are processed through secure Iranian payment gateways. Game credits do not expire and are tied to your account.
        </p>

        <h2 className="text-xl font-bold wood-text mt-6 mb-2">5. Limitation of Liability</h2>
        <p className="mb-4">
          The app is provided "as is" without any guarantees. We are not responsible for technical errors, payment gateway issues, or user-caused problems.
        </p>

        <h2 className="text-xl font-bold wood-text mt-6 mb-2">6. Community Rules & Moderation</h2>
        <p className="mb-2">
          To keep the app safe and enjoyable for everyone, we enforce the following rules:
        </p>
        <ul className="list-disc pr-6 mb-4 space-y-1">
          <li>No insults, profanity, harassment, or hate speech in chat (including Persian profanity — filtered automatically).</li>
          <li>No inappropriate, sexual, violent, or offensive profile pictures.</li>
          <li>No cheating, spamming, or use of automated tools.</li>
          <li>No impersonation of other users.</li>
        </ul>

        <h2 className="text-xl font-bold wood-text mt-6 mb-2">7. Reports & Penalty System</h2>
        <p className="mb-2">Any user can report inappropriate profile pictures or chat messages. Reports lead to automatic action:</p>
        <ul className="list-disc pr-6 mb-4 space-y-1">
          <li><b>3 reports</b> → A warning banner is shown on your profile.</li>
          <li><b>6 reports</b> → Your account is temporarily banned for 7 days from online play.</li>
          <li><b>10 reports</b> → Your account is permanently banned from the app.</li>
        </ul>
        <p className="mb-4">
          False reporting is also a violation and may result in penalties against the reporter's account.
        </p>

        <h2 className="text-xl font-bold wood-text mt-6 mb-2">8. Changes to Terms</h2>
        <p className="mb-4">
          We may update these Terms at any time. Continued use of the app means you accept the updated version.
        </p>

        {/* Persian summary */}
        <hr className="my-6 border-amber-900/40" />
        <h2 className="text-xl font-bold wood-text mb-2" dir="rtl">خلاصه قوانین (فارسی)</h2>
        <div dir="rtl" className="space-y-2">
          <p>برای حفظ محیط سالم، قوانین زیر اجرا می‌شه:</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>فحاشی، توهین و کلمات نامناسب فارسی در چت ممنوع و فیلتر می‌شه.</li>
            <li>عکس پروفایل نامناسب (مستهجن، خشن، توهین‌آمیز) ممنوعه.</li>
            <li>هر کاربر می‌تونه پروفایل یا پیام چت بقیه رو گزارش کنه.</li>
          </ul>
          <p className="font-bold mt-3">سیستم اخطار و مسدودیت:</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>۳ گزارش → نمایش هشدار روی پروفایل</li>
            <li>۶ گزارش → مسدودیت ۷ روزه از بازی آنلاین</li>
            <li>۱۰ گزارش → مسدودیت دائمی</li>
          </ul>
          <p className="text-sm text-amber-100/70 mt-3">گزارش نادرست هم تخلفه و ممکنه به حساب گزارش‌دهنده آسیب بزنه.</p>
        </div>
      </div>
    </div>
  );
}
