"use client";

/**
 * IdeaCard — thẻ ý tưởng (client) + panel chi tiết trượt từ phải.
 * Click cả thẻ để mở panel xem dàn ý + prompt Gemini đầy đủ; các nút action
 * bên trong chặn lan (stopPropagation) để không mở nhầm panel.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ListChecks, ImageIcon, FileText, ArrowUpRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { CopyButton } from "@/components/shell/copy-button";
import { IdeaActions, CaptionCreator } from "./idea-actions";
import {
  generateOutline,
  generateImagePromptForIdea,
  refineOutline,
  type GenerateState,
} from "@/app/actions/generate";
import { saveIdeaOutline, type IdeaPostLink } from "@/app/actions/post";

/** Nút sinh dàn ý / prompt trong panel; refresh để hiện nội dung mới. */
function GenerateButton({
  action,
  label,
  pendingLabel,
}: {
  action: () => Promise<GenerateState>;
  label: string;
  pendingLabel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function onClick() {
    setError("");
    start(async () => {
      const res = await action();
      if (res.success) router.refresh();
      else setError(res.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" onClick={onClick} disabled={pending}>
        {pending ? <Spinner /> : <Sparkles className="size-4" />}
        {pending ? pendingLabel : label}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";

/**
 * Editor dàn ý trong panel: sửa tay (textarea + Lưu) + tinh chỉnh bằng AI
 * (nhập yêu cầu → refineOutline viết lại). Đồng bộ lại từ server sau khi đổi.
 */
function OutlineEditor({
  ideaId,
  outline,
  hasApiKey,
}: {
  ideaId: number;
  outline: string | null;
  hasApiKey: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(outline ?? "");
  const [instruction, setInstruction] = useState("");
  const [saving, startSave] = useTransition();
  const [refining, startRefine] = useTransition();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const dirty = text !== (outline ?? "");

  function onSave() {
    setError("");
    setMsg("");
    startSave(async () => {
      const res = await saveIdeaOutline(ideaId, text);
      if (res.success) {
        setMsg("Đã lưu");
        router.refresh();
      } else setError(res.message);
    });
  }

  function onRefine() {
    const note = instruction.trim();
    if (!note) return;
    setError("");
    setMsg("");
    startRefine(async () => {
      const res = await refineOutline(ideaId, note);
      if (res.success) {
        setInstruction("");
        router.refresh(); // server trả dàn ý mới → useEffect đồng bộ qua key
      } else setError(res.message);
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="Chưa có dàn ý. Bấm “Tạo dàn ý” hoặc viết tay tại đây."
        className="text-xs"
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={onSave} disabled={saving || !dirty}>
          {saving && <Spinner />}
          Lưu dàn ý
        </Button>
        {msg && <span className="text-xs text-green-600">{msg}</span>}
      </div>

      {/* Tinh chỉnh bằng AI theo yêu cầu. */}
      {hasApiKey && outline && (
        <div className="space-y-2 rounded-lg border border-dashed p-2.5">
          <Input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onRefine();
              }
            }}
            placeholder="Yêu cầu chỉnh: VD thêm phần khuyến mãi, ngắn gọn hơn…"
            disabled={refining}
            className="text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRefine}
            disabled={refining || !instruction.trim()}
          >
            {refining ? <Spinner /> : <Wand2 className="size-4" />}
            {refining ? "Đang cập nhật…" : "Cập nhật bằng AI"}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

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
  posts: IdeaPostLink[];
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

          {/* Tag + xóa: chặn lan để không mở panel khi bấm. */}
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <IdeaActions ideaId={idea.id} tags={idea.tags} availableTags={availableTags} />
          </div>
        </div>
      </div>

      {/* Panel chi tiết trượt từ phải. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="top-0 right-0 left-auto flex h-svh max-h-svh w-full max-w-md translate-x-0 translate-y-0 flex-col items-stretch gap-0 space-y-4 overflow-y-auto rounded-none rounded-l-2xl p-5 sm:max-w-md data-open:slide-in-from-right data-closed:slide-out-to-right"
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

            {/* Tạo caption: chọn nền tảng + độ dài rồi sinh nội dung. */}
            {hasApiKey && (
              <section>
                <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="size-4 text-primary" /> Tạo nội dung
                </div>
                <CaptionCreator ideaId={idea.id} />
              </section>
            )}

            {/* Nội dung đã tạo từ ý tưởng — link thẳng vào editor. */}
            {idea.posts.length > 0 && (
              <section>
                <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <FileText className="size-4 text-primary" /> Nội dung đã tạo
                </div>
                <div className="space-y-1.5">
                  {idea.posts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/editor/${p.id}`}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted"
                    >
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_BADGE[p.platform ?? ""] ?? "bg-muted"}`}
                      >
                        {PLATFORM_LABELS[p.platform as Platform] ?? p.platform ?? "Nội dung"}
                      </span>
                      <ArrowUpRight className="size-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Dàn ý — sửa tay + tinh chỉnh AI. key theo nội dung để đồng bộ sau refresh. */}
            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <ListChecks className="size-4 text-primary" /> Dàn ý
                </span>
                {hasApiKey && (
                  <GenerateButton
                    action={() => generateOutline(idea.id)}
                    label={idea.outline ? "Tạo lại" : "Tạo dàn ý"}
                    pendingLabel="Đang tạo…"
                  />
                )}
              </div>
              <OutlineEditor
                key={idea.outline ?? "empty"}
                ideaId={idea.id}
                outline={idea.outline}
                hasApiKey={hasApiKey}
              />
            </section>

            {/* Prompt ảnh — nút tạo nằm ngay tại section này. */}
            <section>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <ImageIcon className="size-4 text-primary" /> Prompt ảnh (Gemini)
                </span>
                <div className="flex items-center gap-2">
                  {idea.imagePrompt && <CopyButton text={idea.imagePrompt} />}
                  {hasApiKey && (
                    <GenerateButton
                      action={() => generateImagePromptForIdea(idea.id)}
                      label={idea.imagePrompt ? "Tạo lại" : "Tạo prompt"}
                      pendingLabel="Đang tạo…"
                    />
                  )}
                </div>
              </div>
              {idea.imagePrompt ? (
                <p className="whitespace-pre-wrap rounded-lg border border-primary/20 bg-accent/40 p-3 text-xs text-muted-foreground">
                  {idea.imagePrompt}
                </p>
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  Chưa có prompt ảnh. Bấm “Tạo prompt” để sinh prompt tiếng Anh cho Gemini.
                </p>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
