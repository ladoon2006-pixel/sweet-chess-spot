import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const verifyPiToken = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ accessToken: z.string().min(10).max(4096) }).parse(input),
  )
  .handler(async ({ data }) => {
    // 1) Validate the Pi access token against Pi's API
    const res = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!res.ok) {
      return { ok: false as const, error: `Pi /me failed: ${res.status}` };
    }
    const me = (await res.json()) as { uid: string; username: string };

    // 2) Bridge to a Supabase user (deterministic email per Pi uid)
    const email = `pi_${me.uid}@pi.lovable.app`;
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID(),
      user_metadata: { username: me.username, pi_uid: me.uid },
    });
    // Ignore "already exists" errors
    if (createErr && !/already|exists|registered/i.test(createErr.message)) {
      console.error("[Pi] createUser failed", createErr);
      return { ok: false as const, error: createErr.message };
    }

    // 3) Generate a magic-link token hash to establish a session client-side
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      console.error("[Pi] generateLink failed", linkErr);
      return { ok: false as const, error: linkErr?.message || "no token" };
    }

    return {
      ok: true as const,
      email,
      tokenHash: link.properties.hashed_token,
      user: { uid: me.uid, username: me.username },
    };
  });
