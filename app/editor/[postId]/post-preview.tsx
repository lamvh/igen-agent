"use client";

/**
 * PostPreview — khung xem trước bài đăng theo style từng nền tảng (FB/IG/TikTok).
 * Render real-time từ caption + hashtags + ảnh đính kèm (ảnh Gemini đã upload).
 * Chỉ mô phỏng giao diện; không gọi API mạng xã hội.
 */
import { useState } from "react";
import Image from "next/image";
import { Heart, MessageCircle, Send, Bookmark, ThumbsUp, Share2, Music2 } from "lucide-react";
import type { Platform } from "@/lib/ai/prompts";

// Ngưỡng ký tự trước khi caption bị cắt và hiện nút "Xem thêm" (giống Facebook).
const COLLAPSE_LIMIT = 200;

// Tỉ lệ khung ảnh theo chuẩn phổ biến từng nền tảng.
const ASPECT: Record<Platform, string> = {
  facebook: "aspect-[1.91/1]",
  instagram: "aspect-[4/5]",
  tiktok: "aspect-[9/16]",
};

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "B";
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-indigo-600 text-sm font-semibold text-white">
      {initial}
    </span>
  );
}

function CaptionText({ caption, hashtags }: { caption: string; hashtags: string[] }) {
  const [expanded, setExpanded] = useState(false);
  // Cắt caption khi vượt ngưỡng; cho phép mở rộng/thu gọn như Facebook.
  const isLong = caption.length > COLLAPSE_LIMIT;
  const shown = isLong && !expanded ? caption.slice(0, COLLAPSE_LIMIT).trimEnd() : caption;

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {caption ? (
        <>
          {shown}
          {isLong && (
            <>
              {!expanded && "… "}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="font-medium text-muted-foreground hover:underline"
              >
                {expanded ? "Thu gọn" : "Xem thêm"}
              </button>
            </>
          )}
        </>
      ) : (
        <span className="text-muted-foreground">(chưa có caption)</span>
      )}
      {hashtags.length > 0 && (
        <span className="mt-1 block text-sky-600 dark:text-sky-400">
          {hashtags.map((h) => `#${h}`).join(" ")}
        </span>
      )}
    </p>
  );
}

function MediaFrame({
  platform,
  imagePath,
  alt,
}: {
  platform: Platform;
  imagePath: string | null;
  alt: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden bg-muted ${ASPECT[platform]}`}>
      {imagePath ? (
        <Image src={imagePath} alt={alt} fill sizes="400px" className="object-cover" unoptimized />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Chưa gắn ảnh — upload ảnh từ Gemini rồi gắn ở mục “Ảnh đính kèm”.
        </div>
      )}
    </div>
  );
}

/** Facebook: header → caption → ảnh ngang → hàng action (Like/Comment/Share). */
function FacebookFrame(props: PreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 p-3">
        <Avatar name={props.brandName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{props.brandName}</p>
          <p className="text-xs text-muted-foreground">Vừa xong · 🌐</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        <CaptionText caption={props.caption} hashtags={props.hashtags} />
      </div>
      <MediaFrame platform="facebook" imagePath={props.imagePaths[0] ?? null} alt={props.brandName} />
      <div className="flex items-center justify-around border-t py-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ThumbsUp className="size-4" /> Thích
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-4" /> Bình luận
        </span>
        <span className="flex items-center gap-1.5">
          <Share2 className="size-4" /> Chia sẻ
        </span>
      </div>
    </div>
  );
}

/** Instagram: header → ảnh dọc 4:5 → action icons → caption dưới. */
function InstagramFrame(props: PreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 p-3">
        <Avatar name={props.brandName} />
        <p className="truncate text-sm font-semibold">{props.brandName}</p>
      </div>
      <MediaFrame platform="instagram" imagePath={props.imagePaths[0] ?? null} alt={props.brandName} />
      <div className="flex items-center gap-4 px-3 pt-2.5 text-foreground">
        <Heart className="size-5" />
        <MessageCircle className="size-5" />
        <Send className="size-5" />
        <Bookmark className="ml-auto size-5" />
      </div>
      <div className="px-3 pb-3 pt-2">
        <CaptionText caption={props.caption} hashtags={props.hashtags} />
      </div>
    </div>
  );
}

/** TikTok: ảnh full 9:16, caption overlay đáy, action dọc bên phải. */
function TikTokFrame(props: PreviewProps) {
  return (
    <div className="relative mx-auto max-w-85 overflow-hidden rounded-xl border bg-black">
      <MediaFrame platform="tiktok" imagePath={props.imagePaths[0] ?? null} alt={props.brandName} />
      {/* Overlay thông tin + caption ở đáy. */}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3 pr-12 text-white">
        <p className="text-sm font-semibold">@{props.brandName.replace(/\s+/g, "").toLowerCase()}</p>
        <div className="mt-1 [&_*]:text-white">
          <CaptionText caption={props.caption} hashtags={props.hashtags} />
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
          <Music2 className="size-3" /> Nhạc nền gốc
        </p>
      </div>
      {/* Cột action bên phải. */}
      <div className="absolute bottom-4 right-2 flex flex-col items-center gap-3 text-white">
        <Heart className="size-6" />
        <MessageCircle className="size-6" />
        <Share2 className="size-6" />
      </div>
    </div>
  );
}

type PreviewProps = {
  platform: Platform;
  brandName: string;
  caption: string;
  hashtags: string[];
  imagePaths: string[];
};

export function PostPreview(props: PreviewProps) {
  if (props.platform === "instagram") return <InstagramFrame {...props} />;
  if (props.platform === "tiktok") return <TikTokFrame {...props} />;
  return <FacebookFrame {...props} />;
}
