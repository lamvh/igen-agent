/**
 * Trang Ý tưởng (/ideas) — Server Component.
 * Sinh ý tưởng theo pillar/nền tảng, liệt kê ý tưởng, tạo caption từ ý tưởng.
 */
import Link from "next/link";
import { getBrand } from "@/app/actions/brand";
import { listIdeas } from "@/app/actions/post";
import { hasApiKey } from "@/lib/ai/claude-client";
import { PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";
import { IdeasGenerator } from "./ideas-generator";
import { CreateCaptionButton } from "./create-caption-button";

export const metadata = { title: "Ý tưởng & Caption" };

// Đọc brand + ý tưởng từ DB lúc request.
export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const [brand, ideas] = await Promise.all([getBrand(), listIdeas()]);
  const keyAvailable = hasApiKey();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Ý tưởng & Caption</h1>
        <Link href="/posts" className="text-sm text-muted-foreground underline">
          Xem nội dung đã tạo →
        </Link>
      </div>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Sinh ý tưởng nội dung rồi tạo caption riêng cho từng nền tảng.
      </p>

      {!brand ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Bạn cần{" "}
          <Link href="/brand" className="underline">
            thiết lập Brand Profile
          </Link>{" "}
          trước khi sinh nội dung.
        </div>
      ) : (
        <>
          <IdeasGenerator pillars={brand.pillars} hasApiKey={keyAvailable} />

          <h2 className="mt-10 mb-3 text-lg font-semibold">Ý tưởng ({ideas.length})</h2>
          {ideas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có ý tưởng nào.</p>
          ) : (
            <ul className="space-y-3">
              {ideas.map((it) => (
                <li
                  key={it.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{it.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {it.pillar}
                      {it.platform ? ` · ${PLATFORM_LABELS[it.platform as Platform]}` : ""}
                    </p>
                  </div>
                  <CreateCaptionButton ideaId={it.id} hasApiKey={keyAvailable} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
