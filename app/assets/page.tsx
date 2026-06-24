/**
 * Trang Thư viện ảnh (/assets) — Server Component.
 * Grid ảnh đã upload + form upload + nút sinh AI (disable khi thiếu key).
 */
import Image from "next/image";
import { listAssets } from "@/app/actions/asset";
import { hasGeminiKey } from "@/lib/ai/gemini-client";
import { UploadForm } from "./upload-form";

export const metadata = { title: "Thư viện ảnh" };

// Đọc danh sách ảnh + trạng thái key lúc request.
export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const [assets, geminiKey] = await Promise.all([listAssets(), Promise.resolve(hasGeminiKey())]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <p className="mb-6 text-sm text-muted-foreground">
        Tải ảnh thủ công để gắn vào bài đăng. Ảnh lưu local trong <code>public/uploads/</code>.
      </p>

      <UploadForm hasGeminiKey={geminiKey} />

      <h2 className="mt-10 mb-3 text-lg font-semibold">Ảnh ({assets.length})</h2>
      {assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có ảnh nào.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {assets.map((a) => (
            <div key={a.id} className="relative aspect-square overflow-hidden rounded-lg border">
              <Image
                src={a.path}
                alt={a.prompt ?? `Ảnh ${a.id}`}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
