"use client";

/**
 * Nút xóa tái dùng — mở dialog xác nhận trước khi gọi action.
 * Nhận `action`: server action đã bind id, trả { success, message }.
 * Tự đóng dialog khi xóa thành công; hiện lỗi ngay trong dialog nếu thất bại.
 */
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

type Result = { success: boolean; message: string };

export function DeleteButton({
  action,
  title = "Xóa mục này?",
  description = "Hành động này không thể hoàn tác.",
  triggerLabel,
}: {
  action: () => Promise<Result>;
  title?: string;
  description?: string;
  /** Nếu có → nút chữ; nếu không → nút icon thùng rác. */
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    setError("");
    startTransition(async () => {
      const res = await action();
      if (res.success) setOpen(false);
      else setError(res.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerLabel ? (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
            {triggerLabel}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Xóa"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Hủy
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Đang xóa…" : "Xóa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
