"use client";

/**
 * TagManager — quản lý danh sách tag phân loại chung của brand (tab Settings).
 * Thêm/xóa qua addBrandTag/removeBrandTag (server actions). Xóa tag cũng gỡ tag
 * đó khỏi mọi ý tưởng đang dùng (xử lý trong removeBrandTag).
 */
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { addBrandTag, removeBrandTag } from "@/app/actions/brand";

export function TagManager({ initialTags }: { initialTags: string[] }) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function onAdd() {
    const name = newTag.trim();
    if (!name) return;
    setError("");
    start(async () => {
      const res = await addBrandTag(name);
      setTags(res.tags);
      if (res.success) setNewTag("");
      else setError(res.message);
    });
  }

  function onRemove(tag: string) {
    setError("");
    start(async () => {
      const res = await removeBrandTag(tag);
      setTags(res.tags);
      if (!res.success) setError(res.message);
    });
  }

  return (
    <div className="space-y-4">
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-input pr-1 text-sm"
            >
              <span className="py-1 pl-3">{tag}</span>
              <button
                type="button"
                onClick={() => onRemove(tag)}
                disabled={pending}
                aria-label={`Xóa tag ${tag}`}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chưa có tag nào. Tạo tag đầu tiên bên dưới.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder="Tạo tag mới…"
          maxLength={40}
          disabled={pending}
        />
        <Button type="button" variant="outline" onClick={onAdd} disabled={pending || !newTag.trim()}>
          {pending ? <Spinner /> : <Plus className="size-4" />}
          Thêm
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
