"use client";

/**
 * Điều khiển lịch đăng cho 1 post (Client Component).
 * Chọn ngày → updatePostSchedule (tự set status=scheduled); xóa ngày → về draft.
 */
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePostSchedule } from "@/app/actions/calendar";
import { parseDateInput } from "@/lib/date";

export function ScheduleControl({
  postId,
  initialDate,
}: {
  postId: number;
  initialDate: string; // "YYYY-MM-DD" hoặc ""
}) {
  const [value, setValue] = useState(initialDate);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function save() {
    const date = value ? parseDateInput(value) : null;
    startTransition(async () => {
      const res = await updatePostSchedule(postId, date);
      setMessage(res.message);
    });
  }

  function clear() {
    setValue("");
    startTransition(async () => {
      const res = await updatePostSchedule(postId, null);
      setMessage(res.message);
    });
  }

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <Label htmlFor="scheduledDate">Ngày đăng</Label>
      <div className="flex items-center gap-2">
        <Input
          id="scheduledDate"
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-44"
        />
        <Button type="button" size="sm" onClick={save} disabled={pending || !value}>
          {pending ? "Đang lưu…" : "Lên lịch"}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={pending}>
            Bỏ lịch
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Lên lịch sẽ đặt trạng thái thành “Đã lên lịch”. Bỏ lịch đưa về “Nháp”.
      </p>
      {message && (
        <p className="text-xs text-green-600" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
