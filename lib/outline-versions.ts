/**
 * Lịch sử phiên bản dàn ý (outline) cho 1 ý tưởng.
 * Lưu dưới dạng JSON text trong cột idea.outlineVersions: OutlineVersion[].
 * Bản "active" vẫn là idea.outline; mảng này là lịch sử để chọn lại bản cũ.
 */
import { parseJsonArray, serializeJsonArray } from "@/lib/json";

/** Nguồn tạo ra một phiên bản dàn ý. */
export type OutlineSource = "generate" | "refine" | "manual";

export type OutlineVersion = {
  id: string;
  content: string;
  source: OutlineSource;
  createdAt: number; // epoch ms
};

/** Nhãn tiếng Việt cho nguồn — hiển thị trong lịch sử. */
export const OUTLINE_SOURCE_LABELS: Record<OutlineSource, string> = {
  generate: "AI sinh",
  refine: "AI chỉnh",
  manual: "Sửa tay",
};

/** Parse cột JSON thành mảng version (an toàn). */
export function parseOutlineVersions(value: string | null | undefined): OutlineVersion[] {
  return parseJsonArray<OutlineVersion>(value);
}

/** Tạo id ngắn duy nhất cho một version (đủ dùng cho single-user local). */
function newVersionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Thêm một bản dàn ý mới vào lịch sử và trả JSON text để lưu.
 * Bỏ qua nếu content rỗng hoặc trùng y hệt bản gần nhất (tránh rác lịch sử).
 */
export function appendOutlineVersion(
  currentJson: string | null | undefined,
  content: string,
  source: OutlineSource,
): string {
  const versions = parseOutlineVersions(currentJson);
  const trimmed = content.trim();
  if (!trimmed) return serializeJsonArray(versions);

  const last = versions[versions.length - 1];
  if (last && last.content.trim() === trimmed) {
    return serializeJsonArray(versions);
  }

  versions.push({
    id: newVersionId(),
    content: trimmed,
    source,
    createdAt: Date.now(),
  });
  return serializeJsonArray(versions);
}

/**
 * Khôi phục một phiên bản cũ làm bản đang dùng: di chuyển bản đó xuống cuối
 * mảng (quy ước bản cuối = đang dùng) thay vì nhân bản — tránh trùng lịch sử.
 * Trả null nếu không tìm thấy id.
 */
export function restoreOutlineVersionById(
  currentJson: string | null | undefined,
  versionId: string,
): { content: string; json: string } | null {
  const versions = parseOutlineVersions(currentJson);
  const idx = versions.findIndex((v) => v.id === versionId);
  if (idx === -1) return null;

  const [target] = versions.splice(idx, 1);
  versions.push(target);
  return { content: target.content, json: serializeJsonArray(versions) };
}

/** Id của bản đang dùng (bản cuối mảng theo quy ước); null nếu rỗng. */
export function activeVersionId(versions: OutlineVersion[]): string | null {
  return versions.length > 0 ? versions[versions.length - 1].id : null;
}
