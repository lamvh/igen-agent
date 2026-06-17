"use client";

/**
 * Thẻ post trên lịch (Client Component).
 * Hiện badge nền tảng + trạng thái, snippet caption; đổi trạng thái + copy caption.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";
import { updatePostStatus } from "@/app/actions/calendar";
import { POST_STATUSES, type CalendarPost, type PostStatus } from "@/lib/post-status";

const PLATFORM_COLOR: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
  tiktok: "bg-neutral-200 text-neutral-800",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  scheduled: "bg-sky-100 text-sky-700",
  posted: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  posted: "Đã đăng",
};

export function PostCard({ post }: { post: CalendarPost }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function copyCaption() {
    const text = [post.caption, post.hashtags.map((h) => `#${h}`).join(" ")]
      .filter(Boolean)
      .join("\n\n");
    // clipboard chỉ có trên secure context (https/localhost). Bắt lỗi để không nuốt im.
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => setError("Không copy được — chọn caption và copy tay."));
    if (!navigator.clipboard) setError("Trình duyệt không hỗ trợ copy ở kết nối này.");
  }

  function changeStatus(status: PostStatus) {
    startTransition(async () => {
      const res = await updatePostStatus(post.id, status);
      if (!res.success) setError(res.message);
    });
  }

  return (
    <div className="rounded-md border bg-card p-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        <span className={`rounded px-1 py-0.5 ${PLATFORM_COLOR[post.platform] ?? "bg-muted"}`}>
          {PLATFORM_LABELS[post.platform as Platform] ?? post.platform}
        </span>
        <span className={`rounded px-1 py-0.5 ${STATUS_COLOR[post.status] ?? "bg-muted"}`}>
          {STATUS_LABEL[post.status as PostStatus] ?? post.status}
        </span>
      </div>

      <Link
        href={`/editor/${post.id}`}
        className="mt-1 line-clamp-2 block text-foreground hover:underline"
        title={post.caption}
      >
        {post.caption || "(chưa có caption)"}
      </Link>

      <div className="mt-1.5 flex items-center gap-1">
        <select
          aria-label="Đổi trạng thái"
          value={post.status}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value as PostStatus)}
          className="h-6 rounded border border-input bg-transparent px-1 text-[11px]"
        >
          {POST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={copyCaption}
          className="inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[11px] hover:bg-muted"
          title="Copy caption + hashtags"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Đã copy" : "Copy"}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-[11px] text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
