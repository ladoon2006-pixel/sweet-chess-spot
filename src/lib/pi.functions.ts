import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifyPiToken = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ accessToken: z.string().min(10).max(4096) }).parse(input),
  )
  .handler(async ({ data }) => {
    const res = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!res.ok) {
      return { ok: false as const, error: `Pi /me failed: ${res.status}` };
    }
    const me = (await res.json()) as { uid: string; username: string };
    return { ok: true as const, user: { uid: me.uid, username: me.username } };
  });
