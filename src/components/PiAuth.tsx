import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyPiToken } from "@/lib/pi.functions";
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

interface PiSession {
  uid: string;
  username: string;
  accessToken: string;
}

const STORAGE_KEY = "pi_session";
const SESSION_EVENT = "pi-session-changed";

function loadSession(): PiSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PiSession) : null;
  } catch {
    return null;
  }
}

export function usePiSession(): PiSession | null {
  const [s, setS] = useState<PiSession | null>(() => loadSession());
  useEffect(() => {
    const update = () => setS(loadSession());
    window.addEventListener(SESSION_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(SESSION_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return s;
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
    // In Pi Browser production, sandbox must be false.
    // Only use sandbox=true when testing from the Pi sandbox URL.
    const isSandbox =
      typeof window !== "undefined" &&
      /sandbox\.minepi\.com/i.test(window.location.hostname);
    initPromise = Promise.resolve(Pi.init({ version: "2.0", sandbox: isSandbox }));
  }
  await initPromise;
}

export default function PiAuth() {
  const verify = useServerFn(verifyPiToken);
  const [session, setSession] = useState<PiSession | null>(() => loadSession());
  const [busy, setBusy] = useState(false);

  const signIn = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await ensurePiInit();
      const Pi = window.Pi!;
      const auth = await Pi.authenticate(["username"], () => {});
      const result = await verify({ data: { accessToken: auth.accessToken } });
      if (!result.ok) throw new Error(result.error);
      const next: PiSession = {
        uid: result.user.uid,
        username: result.user.username,
        accessToken: auth.accessToken,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSession(next);
      toast.success(`خوش آمدید ${result.user.username}`);
    } catch (e: any) {
      console.error("Pi auth failed", e);
      toast.error(e?.message || "ورود با Pi ناموفق بود");
    } finally {
      setBusy(false);
    }
  }, [busy, verify]);

  // Auto-trigger on load if no session yet
  useEffect(() => {
    if (session) return;
    if (typeof window === "undefined") return;
    void signIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (session) {
    return (
      <div className="text-xs text-amber-100/80 mt-2">
        وارد شده با Pi: <span className="font-bold">{session.username}</span>
      </div>
    );
  }

  return (
    <Button onClick={signIn} disabled={busy} variant="secondary" className="mt-2">
      {busy ? "در حال ورود..." : "ورود با Pi Network"}
    </Button>
  );
}
