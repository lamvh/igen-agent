"use client";

/**
 * IdeaCard — thẻ ý tưởng (client) + panel chi tiết trượt từ phải.
 * Click cả thẻ để mở panel xem dàn ý + prompt Gemini đầy đủ; các nút action
 * bên trong chặn lan (stopPropagation) để không mở nhầm panel.
 */
import { useState } from "react";
import { Sparkles, ListChecks, ImageIcon } from "lucide-react";
import { CopyButton } from "@/components/shell/copy-button";
import { IdeaActions } from "./idea-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";

const PLATFORM_BADGE: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
  tiktok: "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
};

export type IdeaCardData = {
  id: number;
  title: string;
  pillar: string | null;
  platform: string | null;
  outline: string | null;
  imagePrompt: string | null;
  tags: string[];
};

export function IdeaCard({
  idea,
  availableTags,
  hasApiKey,
}: {
  idea: IdeaCardData;
  availableTags: string[];
  hasApiKey: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(idea.outline || idea.imagePrompt);

  // Trích câu Hook từ dàn ý (format "Hook: ...\n\nNội dung chính:...") làm snippet.
  // Nếu không khớp, lấy dòng đầu tiên không rỗng.
  const outlineHook = (() => {
    if (!idea.outline) return "";
    const m = idea.outline.match(/Hook:\s*(.+)/i);
    if (m) return m[1].trim();
    return idea.outline.split("\n").find((l) => l.trim())?.trim() ?? "";
  })();

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-violet-500 via-fuchsia-500 to-indigo-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-violet-100 to-indigo-100 text-primary dark:from-violet-950/60 dark:to-indigo-950/60">
              <Sparkles className="size-4" />
            </span>
            {idea.platform && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLATFORM_BADGE[idea.platform] ?? "bg-muted"}`}
              >
                {PLATFORM_LABELS[idea.platform as Platform] ?? idea.platform}
              </span>
            )}
          </div>

          <p className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
            {idea.title}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {idea.pillar && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {idea.pillar}
              </span>
            )}
            {idea.tags.map((t) => (
              <span
                key={t}
                className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-medium text-primary"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Badge trạng thái có màu: cho biết đã tạo dàn ý / prompt chưa. */}
          {hasDetail && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {idea.outline && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <ListChecks className="size-3" /> Đã có dàn ý
                </span>
              )}
              {idea.imagePrompt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                  <ImageIcon className="size-3" /> Đã có prompt ảnh
                </span>
              )}
            </div>
          )}

          {/* Snippet hook của dàn ý — xem nội dung ngay không cần mở panel. */}
          {outlineHook && (
            <div className="mt-3 rounded-lg border-l-2 border-primary/40 bg-muted/40 py-2 pr-2 pl-3">
              <p className="line-clamp-2 text-xs italic text-muted-foreground">“{outlineHook}”</p>
            </div>
          )}

          {hasDetail && (
            <p className="mt-2 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Xem chi tiết →
            </p>
          )}

          <div className="mt-4 flex-1" />

          {/* Action: chặn lan để không mở panel khi bấm. */}
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <IdeaActions
              ideaId={idea.id}
              outline={idea.outline}
              imagePrompt={idea.imagePrompt}
              tags={idea.tags}
              availableTags={availableTags}
              hasApiKey={hasApiKey}
            />
          </div>
        </div>
      </div>

      {/* Panel chi tiết trượt từ phải. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="top-0 right-0 left-auto h-svh max-h-svh w-full max-w-md translate-x-0 translate-y-0 overflow-y-auto rounded-none rounded-l-2xl sm:max-w-md data-open:slide-in-from-right data-closed:slide-out-to-right"
        >
          <DialogHeader>
            <DialogTitle className="pr-8">{idea.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {idea.platform && (
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${PLATFORM_BADGE[idea.platform] ?? "bg-muted"}`}
                >
                  {PLATFORM_LABELS[idea.platform as Platform] ?? idea.platform}
                </span>
              )}
              {idea.pillar && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                  {idea.pillar}
                </span>
              )}
              {idea.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-accent px-1.5 py-0.5 font-medium text-primary"
                >
                  {t}
                </span>
              ))}
            </div>

            {idea.outline ? (
              <section>
                <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <ListChecks className="size-4 text-primary" /> Dàn ý
                </div>
                <pre className="whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                  {idea.outline}
                </pre>
              </section>
            ) : (
              <p className="text-xs text-muted-foreground">
                Chưa có dàn ý. Bấm “Dàn ý” trên thẻ để tạo.
              </p>
            )}

            {idea.imagePrompt ? (
              <section>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <ImageIcon className="size-4 text-primary" /> Prompt ảnh (Gemini)
                  </span>
                  <CopyButton text={idea.imagePrompt} />
                </div>
                <p className="whitespace-pre-wrap rounded-lg border border-primary/20 bg-accent/40 p-3 text-xs text-muted-foreground">
                  {idea.imagePrompt}
                </p>
              </section>
            ) : (
              <p className="text-xs text-muted-foreground">
                Chưa có prompt ảnh. Bấm “Prompt ảnh” trên thẻ để tạo.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
