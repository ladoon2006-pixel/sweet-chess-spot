import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

// Email auth removed — Pi Network is the only sign-in method.
export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }),
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
