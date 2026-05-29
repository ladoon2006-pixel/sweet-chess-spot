import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Play chess online against AI, friends, or random opponents with live chat and friend requests." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Play chess online against AI, friends, or random opponents with live chat and friend requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Lovable App" },
      { name: "twitter:description", content: "Play chess online against AI, friends, or random opponents with live chat and friend requests." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f8b99381-59d5-4eb3-94df-0f5134118097/id-preview-b268858d--06f3e957-4b2c-49da-b4d1-ee3769c90821.lovable.app-1779544208123.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f8b99381-59d5-4eb3-94df-0f5134118097/id-preview-b268858d--06f3e957-4b2c-49da-b4d1-ee3769c90821.lovable.app-1779544208123.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      { src: "https://sdk.minepi.com/pi-sdk.js" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const piFooter = `
    (function(){
      function init(){
        if(!window.Pi) return;
        try { window.Pi.init({ version: "2.0", sandbox: true }); } catch(e) { console.error("Pi.init failed", e); }
      }
      async function startPiAuth(){
        if(!window.Pi) return;
        try {
          await window.Pi.authenticate(['username','payments'],
            function(paymentId){ console.log("Incomplete:", paymentId); }
          );
          console.log("Authenticated");
        } catch(e){ console.error("Pi auth failed", e); }
      }
      function bindPay(){
        var btn = document.getElementById("pay");
        if(!btn || btn.dataset.piBound) return;
        btn.dataset.piBound = "1";
        btn.onclick = async function(){
          if(!window.Pi){ alert("Pi SDK not loaded"); return; }
          try {
            await window.Pi.createPayment(
              { amount: 0.01, memo: "Testnet payment", metadata: { test: true } },
              {
                onReadyForServerApproval: function(id){ console.log("approval", id); },
                onReadyForServerCompletion: function(id, txid){ console.log("completion", id, txid); },
                onCancel: function(id){ console.log("cancel", id); },
                onError: function(err){ console.error(err); }
              }
            );
          } catch(e){ alert("خطا در پرداخت: " + e); }
        };
      }
      window.addEventListener("load", function(){
        init();
        startPiAuth();
        bindPay();
        var mo = new MutationObserver(bindPay);
        mo.observe(document.body, { childList: true, subtree: true });
      });
    })();
  `;
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <script dangerouslySetInnerHTML={{ __html: piFooter }} />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
