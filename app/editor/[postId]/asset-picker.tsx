"use client";

/**
 * Chọn ảnh cho post (Client Component).
 * Hiển thị thư viện dạng grid; click để gắn/bỏ gắn (toggle) vào post.assetIds.
 */
import { useState, useTransition } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { attachAssetToPost } from "@/app/actions/asset";
import type { Asset } from "@/db/schema";

export function AssetPicker({
  postId,
  assets,
  attachedIds,
}: {
  postId: number;
  assets: Asset[];
  attachedIds: number[];
}) {
  const [attached, setAttached] = useState<number[]>(attachedIds);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function toggle(assetId: number) {
    // optimistic
    setAttached((prev) =>
      prev.includes(assetId) ? prev.filter((x) => x !== assetId) : [...prev, assetId],
    );
    startTransition(async () => {
      const res = await attachAssetToPost(postId, assetId);
      if (!res.success) {
        setMessage(res.message);
        // rollback
        setAttached((prev) =>
          prev.includes(assetId) ? prev.filter((x) => x !== assetId) : [...prev, assetId],
        );
      } else {
        setMessage("");
      }
    });
  }

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Ảnh đính kèm</span>
        <a href="/assets" className="text-xs text-muted-foreground underline">
          Quản lý thư viện →
        </a>
      </div>

      {assets.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Chưa có ảnh trong thư viện.{" "}
          <a href="/assets" className="underline">
            Tải ảnh lên
          </a>
          .
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {assets.map((a) => {
            const on = attached.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                disabled={pending}
                onClick={() => toggle(a.id)}
                className={`relative aspect-square overflow-hidden rounded-md border-2 ${
                  on ? "border-primary" : "border-transparent"
                }`}
                title={on ? "Bỏ gắn" : "Gắn vào post"}
              >
                <Image
                  src={a.path}
                  alt={a.prompt ?? `Ảnh ${a.id}`}
                  fill
                  sizes="20vw"
                  className="object-cover"
                  unoptimized
                />
                {on && (
                  <span className="absolute right-0.5 top-0.5 rounded-full bg-primary p-0.5 text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {message && (
        <p className="text-xs text-destructive" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
