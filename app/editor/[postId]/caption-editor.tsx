"use client";

/**
 * Caption Editor (Client Component).
 * Sửa caption + hashtags của 1 post, lưu thủ công qua saveCaption.
 * Hashtags nhập dạng văn bản (cách nhau bởi khoảng trắng/dấu phẩy), parse ở server.
 */
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveCaption, type PostView, type SaveCaptionState } from "@/app/actions/post";

const initialState: SaveCaptionState = { success: false, message: "" };

export function CaptionEditor({ post }: { post: PostView }) {
  const [state, formAction, pending] = useActionState(saveCaption, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="postId" value={post.id} />

      <div className="space-y-2">
        <Label htmlFor="caption">Caption</Label>
        <Textarea id="caption" name="caption" rows={10} defaultValue={post.caption} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hashtags">Hashtags</Label>
        <Input
          id="hashtags"
          name="hashtags"
          defaultValue={post.hashtags.join(" ")}
          placeholder="cachpha caphe sang"
        />
        <p className="text-xs text-muted-foreground">
          Cách nhau bởi khoảng trắng hoặc dấu phẩy; không cần gõ dấu #.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu caption"}
        </Button>
        {state.message && (
          <p
            className={state.success ? "text-sm text-green-600" : "text-sm text-destructive"}
            aria-live="polite"
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
