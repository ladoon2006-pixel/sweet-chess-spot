import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/chat")({
  validateSearch: z.object({ with: z.string().optional() }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/friends", search: { with: search.with, tab: search.with ? "chat" : "chat" } });
  },
});
