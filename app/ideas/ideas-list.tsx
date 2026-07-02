/**
 * IdeasList — lưới thẻ ý tưởng (Server Component, phân trang ở page.tsx).
 * Chỉ render trang hiện tại; điều hướng trang qua PaginationBar bên ngoài.
 */
import { Lightbulb } from "lucide-react";
import type { IdeaView } from "@/app/actions/post";
import { IdeaCard } from "./idea-card";

export function IdeasList({
  items,
  availableTags,
  hasApiKey,
  emptyHint,
  openIdeaId,
}: {
  items: IdeaView[];
  availableTags: string[];
  hasApiKey: boolean;
  emptyHint: string;
  /** Deep-link ?idea=<id>: card khớp id sẽ tự mở panel chi tiết. */
  openIdeaId?: number;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <Lightbulb className="size-6" />
        </span>
        <p className="text-sm font-medium">Không có ý tưởng nào</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <li key={it.id}>
          <IdeaCard
            idea={{
              id: it.id,
              title: it.title,
              pillar: it.pillar,
              outline: it.outline,
              outlineVersions: it.outlineVersions,
              imagePrompt: it.imagePrompt,
              tags: it.tags,
              posts: it.posts,
            }}
            availableTags={availableTags}
            hasApiKey={hasApiKey}
            initialOpen={it.id === openIdeaId}
          />
        </li>
      ))}
    </ul>
  );
}
