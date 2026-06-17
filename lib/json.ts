/**
 * Helper serialize/parse JSON text cho các trường danh sách lưu trong SQLite
 * (pillars, hashtags, assetIds). Parse an toàn: lỗi → trả mảng rỗng.
 */

/** Parse JSON text thành mảng; trả [] nếu rỗng/sai định dạng. */
export function parseJsonArray<T = unknown>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Serialize mảng thành JSON text để lưu DB. */
export function serializeJsonArray<T>(value: T[]): string {
  return JSON.stringify(value ?? []);
}
