import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyPiToken } from "@/lib/pi.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

declare global {
  interface Window {
    Pi?: {
      init: (cfg: { version: string; sandbox?: boolean }) => Promise<void> | void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound: (p: unknown) => void,
      ) => Promise<{ accessToken: string; user: { uid: string; username: string } }>;
    };
  }
}

function waitForPi(timeoutMs = 8000): Promise<NonNullable<Window["Pi"]>> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (typeof window !== "undefined" && window.Pi) return resolve(window.Pi);
      if (Date.now() - start > timeoutMs) return reject(new Error("Pi SDK not loaded"));
      setTimeout(tick, 150);
    };
    tick();
  });
}

let initPromise: Promise<void> | null = null;
async function ensurePiInit() {
  const Pi = await waitForPi();
  if (!initPromise) {
    const isSandbox =
      typeof window !== "undefined" &&
      /sandbox\.minepi\.com/i.test(window.location.hostname);
    initPromise = Promise.resolve(Pi.init({ version: "2.0", sandbox: isSandbox }));
  }
  await initPromise;
}

// Legacy export — kept so older imports compile. Use useAuth() instead.
export function usePiSession() {
  const { user } = useAuth();
  return user
    ? { uid: user.user_metadata?.pi_uid ?? user.id, username: user.user_metadata?.username ?? "" }
    : null;
}

export default function PiAuth() {
  const verify = useServerFn(verifyPiToken);
  const { user, loading, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  const signIn = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await ensurePiInit();
      const Pi = window.Pi!;
      const auth = await Pi.authenticate(["username"], () => {});
      const result = await verify({ data: { accessToken: auth.accessToken } });
      if (!result.ok) throw new Error(result.error);
      // Establish Supabase session from magic-link token hash
      const { error: otpErr } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: result.tokenHash,
      });
      if (otpErr) throw otpErr;
      toast.success(`خوش آمدید ${result.user.username}`);
    } catch (e: any) {
      console.error("Pi auth failed", e);
      toast.error(e?.message || "ورود با Pi ناموفق بود");
    } finally {
      setBusy(false);
    }
  }, [busy, verify]);

  // Auto-trigger once on load if no session
  useEffect(() => {
    if (loading || user || autoTried) return;
    setAutoTried(true);
    void signIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, autoTried]);

  if (user) {
    return (
      <div className="text-xs text-amber-100/80 mt-2 flex items-center gap-2">
        <span>وارد شده: <b>{user.user_metadata?.username ?? "Pi user"}</b></span>
        <button onClick={() => signOut()} className="underline">خروج</button>
      </div>
    );
  }

  return (
    <Button onClick={signIn} disabled={busy} variant="secondary" className="mt-2">
      {busy ? "در حال ورود..." : "ورود با Pi Network"}
    </Button>
  );
}
