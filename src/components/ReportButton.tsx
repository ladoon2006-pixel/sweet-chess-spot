import { useState } from "react";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  reportedUserId: string;
  type: "profile" | "chat";
  contextId?: string;
  size?: "sm" | "icon";
  label?: string;
  /** When provided, replaces the default flag-button trigger. The child is rendered
   *  inside a button that opens the report dialog. */
  children?: React.ReactNode;
  triggerClassName?: string;
}

export default function ReportButton({
  reportedUserId, type, contextId, size = "icon", label, children, triggerClassName,
}: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || user.id === reportedUserId) {
    // Still render children (without report capability) so layout doesn't break
    return children ? <>{children}</> : null;
  }

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      type,
      reason: reason.trim() || null,
      context_id: contextId ?? null,
    });
    setBusy(false);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        toast.info("قبلاً این مورد رو گزارش کردی");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("گزارش ثبت شد. ممنون!");
      setOpen(false);
      setReason("");
    }
  };

  return (
    <>
      {children ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={triggerClassName ?? "text-right"}
          title="برای گزارش پیام لمس کن"
        >
          {children}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1 text-xs text-amber-200/70 hover:text-red-400 transition-colors ${size === "sm" ? "px-2 py-1" : "p-1"}`}
          title="گزارش"
        >
          <Flag size={14} />
          {label && <span>{label}</span>}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>گزارش {type === "profile" ? "پروفایل" : "پیام"}</DialogTitle>
            <DialogDescription>
              لطفاً دلیل گزارش را بنویس. گزارش‌های نادرست ممکنه به حساب خودت آسیب بزنه.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثلاً: عکس نامناسب، فحاشی، اسپم..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
            <Button variant="destructive" onClick={submit} disabled={busy}>
              {busy ? "در حال ارسال..." : "ثبت گزارش"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
