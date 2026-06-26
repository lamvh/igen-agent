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
