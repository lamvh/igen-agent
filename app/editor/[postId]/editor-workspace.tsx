"use client";

/**
 * EditorWorkspace — gom 1 ý tưởng thành 3 tab FB/IG/TikTok trong cùng 1 trang.
 * - Tab có post: editor caption + lịch + ảnh + preview real-time (chia sẻ state).
 * - Tab chưa có post: nút sinh nội dung on-demand cho nền tảng đó (tiết kiệm token).
 * Mỗi tab độc lập; preview cập nhật ngay khi gõ caption / đổi ảnh.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CaptionEditor } from "./caption-editor";
import { ScheduleControl } from "./schedule-control";
import { AssetPicker } from "./asset-picker";
import { PostPreview } from "./post-preview";
import { generateCaptionForPlatform } from "@/app/actions/generate";
import { PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";
import { toDateInputValue } from "@/lib/date";
import { parseJsonArray } from "@/lib/json";
import type { PostView } from "@/app/actions/post";
import type { Asset } from "@/db/schema";

/** Panel cho 1 nền tảng đã có post: editor (trái) + preview (phải), state chia sẻ. */
function PlatformPanel({
  post,
  assets,
  brandName,
  hasApiKey,
}: {
  post: PostView;
  assets: Asset[];
  brandName: string;
  hasApiKey: boolean;
}) {
  const platform = (PLATFORMS.includes(post.platform as Platform) ? post.platform : "facebook") as Platform;
  const attachedIds = useMemo(() => parseJsonArray<number>(post.assetIds), [post.assetIds]);
  const pathById = useMemo(() => new Map(assets.map((a) => [a.id, a.path])), [assets]);

  // State chia sẻ cho preview real-time.
  const [caption, setCaption] = useState(post.caption);
  const [hashtags, setHashtags] = useState<string[]>(post.hashtags);
  const [imagePaths, setImagePaths] = useState<string[]>(
    attachedIds.map((id) => pathById.get(id)).filter((p): p is string => Boolean(p)),
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <CaptionEditor
          post={post}
          hasApiKey={hasApiKey}
          onCaptionChange={setCaption}
          onHashtagsChange={setHashtags}
        />
        <ScheduleControl
          postId={post.id}
          initialDate={toDateInputValue(post.scheduledDate ? new Date(post.scheduledDate) : null)}
        />
        <AssetPicker
          postId={post.id}
          assets={assets}
          attachedIds={attachedIds}
          onAttachedChange={setImagePaths}
        />
      </div>

      {/* Preview dính theo cuộn để luôn nhìn thấy. */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Xem trước bài đăng</p>
        <PostPreview
          platform={platform}
          brandName={brandName}
          caption={caption}
          hashtags={hashtags}
          imagePaths={imagePaths}
          title={post.ideaTitle ?? undefined}
        />
      </div>
    </div>
  );
}

/** Tab chưa có post: nút sinh nội dung on-demand cho nền tảng đó. */
function EmptyPlatform({
  ideaId,
  platform,
  hasApiKey,
}: {
  ideaId: number;
  platform: Platform;
  hasApiKey: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function onGenerate() {
    setError("");
    start(async () => {
      const res = await generateCaptionForPlatform(ideaId, platform);
      if (res.success) router.refresh();
      else setError(res.message);
    });
  }

  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <p className="text-sm font-medium">Chưa có nội dung cho {PLATFORM_LABELS[platform]}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Sinh caption riêng tối ưu cho {PLATFORM_LABELS[platform]} từ ý tưởng này.
      </p>
      {hasApiKey ? (
        <Button type="button" className="mt-4" onClick={onGenerate} disabled={pending}>
          {pending ? <Spinner /> : <Sparkles className="size-4" />}
          {pending ? "Đang sinh…" : `Sinh nội dung cho ${PLATFORM_LABELS[platform]}`}
        </Button>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Cần cấu hình ANTHROPIC_API_KEY để sinh nội dung.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function EditorWorkspace({
  ideaId,
  posts,
  assets,
  brandName,
  hasApiKey,
  activePlatform,
}: {
  ideaId: number;
  posts: PostView[];
  assets: Asset[];
  brandName: string;
  hasApiKey: boolean;
  /** Nền tảng mở mặc định (post đang xem). */
  activePlatform: Platform;
}) {
  const [tab, setTab] = useState<Platform>(activePlatform);
  const byPlatform = useMemo(() => {
    const m = new Map<Platform, PostView>();
    for (const p of posts) {
      if (PLATFORMS.includes(p.platform as Platform)) m.set(p.platform as Platform, p);
    }
    return m;
  }, [posts]);

  const activePost = byPlatform.get(tab);

  return (
    <div className="space-y-6">
      {/* Tab bar 3 nền tảng. */}
      <div className="flex gap-1 rounded-xl border bg-muted/40 p-1">
        {PLATFORMS.map((p) => {
          const has = byPlatform.has(p);
          const active = tab === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setTab(p)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {PLATFORM_LABELS[p]}
              {!has && <span className="ml-1 text-xs text-muted-foreground">·＋</span>}
            </button>
          );
        })}
      </div>

      {activePost ? (
        <PlatformPanel
          key={activePost.id}
          post={activePost}
          assets={assets}
          brandName={brandName}
          hasApiKey={hasApiKey}
        />
      ) : (
        <EmptyPlatform ideaId={ideaId} platform={tab} hasApiKey={hasApiKey} />
      )}
    </div>
  );
}
