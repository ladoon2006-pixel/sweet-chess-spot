import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { playSound } from "@/lib/chessSound";

/**
 * Global listener for incoming friend game challenges & accepted challenges.
 * - Receiver: shows toast with Accept/Decline.
 * - Sender: when their challenge is accepted, navigated to the new game.
 */
export default function ChallengeListener() {
  const { user } = useAuth();
  const nav = useNavigate();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const handleIncoming = async (row: any) => {
      if (seen.current.has(row.id)) return;
      seen.current.add(row.id);
      if (row.status !== "pending") return;
      const { data: prof } = await supabase
        .from("profiles").select("username").eq("id", row.from_user).single();
      const name = (prof as any)?.username ?? "یک دوست";
      try { playSound("notify"); } catch {}
      toast(`${name} تو رو به بازی دعوت کرد!`, {
        duration: 30000,
        action: {
          label: "قبول",
          onClick: async () => {
            const { data, error } = await supabase.rpc("accept_game_challenge", { p_challenge: row.id });
            if (error) { toast.error(error.message); return; }
            if (data) nav({ to: "/play/game/$gameId", params: { gameId: data as string } });
          },
        },
        cancel: {
          label: "رد",
          onClick: async () => {
            await supabase.from("game_challenges").update({ status: "declined" }).eq("id", row.id);
          },
        },
      });
    };

    const handleAccepted = (row: any) => {
      if (row.status === "accepted" && row.game_id && row.from_user === user.id) {
        nav({ to: "/play/game/$gameId", params: { gameId: row.game_id } });
      }
    };

    // Load any pending challenges already waiting for us
    (async () => {
      const { data } = await supabase
        .from("game_challenges")
        .select("*")
        .eq("to_user", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      (data ?? []).forEach(handleIncoming);
    })();

    const ch = supabase
      .channel(`challenges-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "game_challenges", filter: `to_user=eq.${user.id}` },
        (p) => handleIncoming(p.new))
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_challenges", filter: `from_user=eq.${user.id}` },
        (p) => handleAccepted(p.new))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id, nav]);

  return null;
}
