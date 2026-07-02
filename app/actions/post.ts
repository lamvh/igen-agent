"use server";

/**
 * Server actions cho idea/post (đọc + lưu thủ công).
 * - listIdeas: ý tưởng của brand (mới nhất trước).
 * - getPost / getSiblingPosts: dữ liệu cho caption editor.
 * - saveCaption: lưu chỉnh sửa caption + hashtags thủ công (cũng dùng khi thiếu API key).
 */
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray, like, sql, type SQL } from "drizzle-orm";
import { db, safeRead } from "@/db";
import { asset, idea, post, type Idea, type Post } from "@/db/schema";
import { getBrand } from "@/app/actions/brand";
import { parseJsonArray, serializeJsonArray } from "@/lib/json";
import type { PostStatus } from "@/lib/post-status";
import { PLATFORMS, type Platform } from "@/lib/ai/prompts";
import {
  appendOutlineVersion,
  parseOutlineVersions,
  restoreOutlineVersionById,
  type OutlineVersion,
} from "@/lib/outline-versions";

export type PostView = Omit<Post, "hashtags"> & { hashtags: string[]; ideaTitle: string | null };

/** Item cho danh sách tất cả post (/posts): kèm tiêu đề ý tưởng + thumbnail ảnh đầu. */
export type PostListItem = Omit<Post, "hashtags"> & {
  hashtags: string[];
  ideaTitle: string | null;
  thumbnailPath: string | null;
};

export type SaveCaptionState = { success: boolean; message: string };

/** Post tóm tắt (id + nền tảng) gắn với 1 ý tưởng — để link từ /ideas vào editor. */
export type IdeaPostLink = { id: number; platform: string | null };

/** Ý tưởng kèm tags + lịch sử dàn ý đã parse + các post đã tạo từ nó. */
export type IdeaView = Omit<Idea, "tags" | "outlineVersions"> & {
  tags: string[];
  outlineVersions: OutlineVersion[];
  posts: IdeaPostLink[];
};

/** Bộ lọc + phân trang cho danh sách ý tưởng (dùng cho cả SSR lẫn infinite scroll). */
export type IdeaFilter = {
  tag?: string;
  pillar?: string;
  /** Từ khóa lọc theo tiêu đề (LIKE, không phân biệt hoa thường). */
  search?: string;
  limit?: number;
  offset?: number;
};

/** Một "trang" ý tưởng + tổng số ý tưởng khớp filter (để dựng phân trang). */
export type IdeaPage = { items: IdeaView[]; total: number };

const IDEA_PAGE_SIZE = 18; // chia hết cho lưới 2 & 3 cột
const POST_PAGE_SIZE = 20;

export type ManualIdeaState = { success: boolean; message: string };

const TITLE_MAX = 300; // chặn tiêu đề quá dài từ input không tin cậy, tránh vỡ layout thẻ ý tưởng.

/**
 * Lưu 1 ý tưởng thủ công — không gọi Claude, không tốn token.
 * Dùng khi thiếu ANTHROPIC_API_KEY hoặc khi người dùng muốn tự nhập tiêu đề.
 */
export async function createIdeaManual(
  _prev: ManualIdeaState,
  formData: FormData,
): Promise<ManualIdeaState> {
  const title = String(formData.get("title") ?? "").trim().slice(0, TITLE_MAX);
  if (!title) return { success: false, message: "Vui lòng nhập tiêu đề ý tưởng." };

  const brand = await getBrand();
  if (!brand) return { success: false, message: "Vui lòng tạo Brand Profile trước." };

  const pillar = String(formData.get("pillar") ?? "").trim() || null;

  try {
    await db.insert(idea).values({ brandId: brand.id, title, pillar, status: "draft" });
  } catch {
    return { success: false, message: "Lưu ý tưởng thất bại, vui lòng thử lại." };
  }

  revalidatePath("/ideas");
  return { success: true, message: "Đã lưu ý tưởng." };
}

export type EmptyPostState = { success: boolean; message: string; postId?: number };

/**
 * Tạo 1 post nháp trống (caption rỗng) — không gọi Claude, không tốn token.
 * Dùng để dán caption sinh từ nguồn ngoài (vd Claude app) vào editor sẵn có.
 * Chặn trùng: mỗi ý tưởng chỉ 1 post cho mỗi nền tảng (giống generateCaptionForPlatform).
 */
export async function createEmptyPost(ideaId: number, platform: Platform): Promise<EmptyPostState> {
  if (!Number.isInteger(ideaId) || ideaId <= 0) {
    return { success: false, message: "Ý tưởng không hợp lệ." };
  }
  if (!PLATFORMS.includes(platform)) {
    return { success: false, message: "Nền tảng không hợp lệ." };
  }

  const ideaRows = await db.select({ id: idea.id }).from(idea).where(eq(idea.id, ideaId)).limit(1);
  if (!ideaRows[0]) return { success: false, message: "Không tìm thấy ý tưởng." };

  const existing = await db
    .select({ id: post.id })
    .from(post)
    .where(and(eq(post.ideaId, ideaId), eq(post.platform, platform)))
    .limit(1);
  if (existing[0]) return { success: false, message: "Nền tảng này đã có nội dung." };

  let postId: number | undefined;
  try {
    const ids = await db
      .insert(post)
      .values({ ideaId, platform, caption: "", status: "draft" })
      .returning({ id: post.id });
    postId = ids[0]?.id;
  } catch {
    return { success: false, message: "Tạo nháp thất bại, vui lòng thử lại." };
  }
  if (postId === undefined) return { success: false, message: "Tạo nháp thất bại, vui lòng thử lại." };

  revalidatePath("/ideas");
  return { success: true, message: "Đã tạo nháp.", postId };
}

/**
 * Ý tưởng của brand hiện tại (mới nhất trước), có lọc + phân trang.
 * - tag: khớp khi JSON text idea.tags chứa "tag" (đủ cho single-user local).
 * - pillar: khớp tuyệt đối idea.pillar.
 * - search: LIKE trên idea.title.
 * Trả {items, hasMore}; rỗng nếu chưa có brand.
 */
export async function listIdeas(filter: IdeaFilter = {}): Promise<IdeaPage> {
  return safeRead(async () => listIdeasInner(filter), { items: [], total: 0 });
}

async function listIdeasInner(filter: IdeaFilter): Promise<IdeaPage> {
  const brand = await getBrand();
  if (!brand) return { items: [], total: 0 };

  const limit = filter.limit ?? IDEA_PAGE_SIZE;
  const offset = filter.offset ?? 0;

  // LIKE cần escape ký tự đặc biệt để khớp đúng nghĩa đen.
  const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

  const conditions: SQL[] = [eq(idea.brandId, brand.id)];
  if (filter.pillar) conditions.push(eq(idea.pillar, filter.pillar));
  if (filter.search?.trim()) {
    conditions.push(like(idea.title, `%${escapeLike(filter.search.trim())}%`));
  }
  if (filter.tag?.trim()) {
    // tags lưu JSON array dạng text: ["a","b"] → tìm phần tử "tag".
    conditions.push(like(idea.tags, `%${escapeLike(JSON.stringify(filter.tag.trim()))}%`));
  }

  // Trang hiện tại + tổng số dòng khớp filter (count nhẹ với SQLite local).
  const [pageRows, countRows] = await Promise.all([
    db
      .select()
      .from(idea)
      .where(and(...conditions))
      .orderBy(desc(idea.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)` })
      .from(idea)
      .where(and(...conditions)),
  ]);
  const total = Number(countRows[0]?.n ?? 0);

  // Gom post của các ý tưởng bằng 1 query (tránh N+1), rồi nhóm theo ideaId.
  const ideaIds = pageRows.map((r) => r.id);
  const postRows = ideaIds.length
    ? await db
        .select({ id: post.id, platform: post.platform, ideaId: post.ideaId })
        .from(post)
        .where(inArray(post.ideaId, ideaIds))
        .orderBy(asc(post.id))
    : [];
  const postsByIdea = new Map<number, IdeaPostLink[]>();
  for (const p of postRows) {
    if (p.ideaId == null) continue;
    const list = postsByIdea.get(p.ideaId) ?? [];
    list.push({ id: p.id, platform: p.platform });
    postsByIdea.set(p.ideaId, list);
  }

  const items = pageRows.map((r) => ({
    ...r,
    tags: parseJsonArray<string>(r.tags),
    outlineVersions: parseOutlineVersions(r.outlineVersions),
    posts: postsByIdea.get(r.id) ?? [],
  }));
  return { items, total };
}

/**
 * Lấy 1 ý tưởng đầy đủ (IdeaView) theo id — phục vụ deep-link /ideas?idea=<id>
 * (link back từ trang nội dung/editor về đúng panel ý tưởng). Null nếu không có.
 */
export async function getIdeaView(ideaId: number): Promise<IdeaView | null> {
  return safeRead(async () => {
    const rows = await db.select().from(idea).where(eq(idea.id, ideaId)).limit(1);
    const row = rows[0];
    if (!row) return null;
    const postRows = await db
      .select({ id: post.id, platform: post.platform })
      .from(post)
      .where(eq(post.ideaId, ideaId))
      .orderBy(asc(post.id));
    return {
      ...row,
      tags: parseJsonArray<string>(row.tags),
      outlineVersions: parseOutlineVersions(row.outlineVersions),
      posts: postRows,
    };
  }, null);
}

function toView(row: Post, ideaTitle: string | null): PostView {
  return { ...row, hashtags: parseJsonArray<string>(row.hashtags), ideaTitle };
}

/** Lấy 1 post + tiêu đề ý tưởng kèm theo; null nếu không tồn tại. */
export async function getPost(postId: number): Promise<PostView | null> {
  return safeRead(async () => {
    const rows = await db.select().from(post).where(eq(post.id, postId)).limit(1);
    const row = rows[0];
    if (!row) return null;

    let ideaTitle: string | null = null;
    if (row.ideaId) {
      const ir = await db.select({ title: idea.title }).from(idea).where(eq(idea.id, row.ideaId)).limit(1);
      ideaTitle = ir[0]?.title ?? null;
    }
    return toView(row, ideaTitle);
  }, null);
}

/** Các post cùng ý tưởng (các nền tảng khác) để chuyển nhanh trong editor. */
export async function getSiblingPosts(ideaId: number): Promise<Pick<Post, "id" | "platform">[]> {
  return safeRead(
    async () =>
      db
        .select({ id: post.id, platform: post.platform })
        .from(post)
        .where(eq(post.ideaId, ideaId))
        .orderBy(asc(post.id)),
    [],
  );
}

/** Tất cả post (full view) của 1 ý tưởng — cho editor 3 tab. Hashtags đã parse. */
export async function getIdeaPosts(ideaId: number): Promise<PostView[]> {
  return safeRead(async () => {
    const rows = await db.select().from(post).where(eq(post.ideaId, ideaId)).orderBy(asc(post.id));
    // Mọi post cùng ý tưởng nên ideaTitle giống nhau — lấy 1 lần.
    let ideaTitle: string | null = null;
    if (rows[0]) {
      const ir = await db.select({ title: idea.title }).from(idea).where(eq(idea.id, ideaId)).limit(1);
      ideaTitle = ir[0]?.title ?? null;
    }
    return rows.map((r) => toView(r, ideaTitle));
  }, []);
}

/** Bộ lọc + phân trang cho danh sách post (/posts). */
export type PostListFilter = {
  status?: PostStatus;
  platform?: Platform;
  limit?: number;
  offset?: number;
};

/** Một "trang" post + tổng số post khớp filter (để dựng phân trang). */
export type PostListPage = { items: PostListItem[]; total: number };

/**
 * Post (mới nhất trước) có phân trang, lọc tùy chọn theo status + platform.
 * Kèm tiêu đề ý tưởng + thumbnail (ảnh đầu) để hiện trong danh sách /posts.
 * Phạm vi toàn DB (v1 chỉ 1 brand) — nếu sau này nhiều brand cần lọc theo brandId.
 */
export async function listAllPosts(filters?: PostListFilter): Promise<PostListPage> {
  return safeRead(async () => listAllPostsInner(filters), { items: [], total: 0 });
}

async function listAllPostsInner(filters?: PostListFilter): Promise<PostListPage> {
  const conds = [];
  if (filters?.status) conds.push(eq(post.status, filters.status));
  if (filters?.platform) conds.push(eq(post.platform, filters.platform));
  const where = conds.length ? and(...conds) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(post)
      .where(where)
      .orderBy(desc(post.id))
      .limit(filters?.limit ?? POST_PAGE_SIZE)
      .offset(filters?.offset ?? 0),
    db.select({ n: sql<number>`count(*)` }).from(post).where(where),
  ]);
  const total = Number(countRows[0]?.n ?? 0);

  // Gom tiêu đề ý tưởng + ảnh đầu bằng 2 query inArray (tránh N+1).
  const ideaIds = [...new Set(rows.map((r) => r.ideaId).filter((x): x is number => x != null))];
  const firstAssetIds = rows
    .map((r) => parseJsonArray<number>(r.assetIds)[0])
    .filter((x): x is number => typeof x === "number");

  const [ideaRows, assetRows] = await Promise.all([
    ideaIds.length
      ? db.select({ id: idea.id, title: idea.title }).from(idea).where(inArray(idea.id, ideaIds))
      : Promise.resolve([]),
    firstAssetIds.length
      ? db.select({ id: asset.id, path: asset.path }).from(asset).where(inArray(asset.id, firstAssetIds))
      : Promise.resolve([]),
  ]);
  const titleById = new Map(ideaRows.map((r) => [r.id, r.title]));
  const pathById = new Map(assetRows.map((r) => [r.id, r.path]));

  const items = rows.map((row) => {
    const firstAssetId = parseJsonArray<number>(row.assetIds)[0];
    return {
      ...row,
      hashtags: parseJsonArray<string>(row.hashtags),
      ideaTitle: row.ideaId != null ? titleById.get(row.ideaId) ?? null : null,
      thumbnailPath: typeof firstAssetId === "number" ? pathById.get(firstAssetId) ?? null : null,
    };
  });
  return { items, total };
}

/** Lưu chỉnh sửa caption + hashtags. useActionState: (prev, formData) với postId qua hidden field. */
export async function saveCaption(_prev: SaveCaptionState, formData: FormData): Promise<SaveCaptionState> {
  const postId = Number(formData.get("postId"));
  if (!Number.isInteger(postId) || postId <= 0) {
    return { success: false, message: "Post không hợp lệ." };
  }

  const caption = String(formData.get("caption") ?? "");
  const hashtags = String(formData.get("hashtags") ?? "")
    .split(/[\s,]+/)
    .map((h) => h.replace(/^#/, "").trim())
    .filter(Boolean);

  try {
    await db
      .update(post)
      .set({ caption, hashtags: serializeJsonArray(hashtags) })
      .where(eq(post.id, postId));
  } catch {
    return { success: false, message: "Lưu thất bại, vui lòng thử lại." };
  }

  revalidatePath(`/editor/${postId}`);
  return { success: true, message: "Đã lưu caption." };
}

export type DeleteState = { success: boolean; message: string };

/** Gán danh sách tag cho 1 ý tưởng (thay thế toàn bộ tags hiện có). */
export async function updateIdeaTags(ideaId: number, tags: string[]): Promise<DeleteState> {
  if (!Number.isInteger(ideaId) || ideaId <= 0) {
    return { success: false, message: "Ý tưởng không hợp lệ." };
  }
  const clean = tags.map((t) => t.trim()).filter(Boolean);
  try {
    await db.update(idea).set({ tags: serializeJsonArray(clean) }).where(eq(idea.id, ideaId));
  } catch {
    return { success: false, message: "Cập nhật tag thất bại." };
  }
  revalidatePath("/ideas");
  return { success: true, message: "Đã cập nhật tag." };
}

/** Lưu dàn ý sửa tay cho 1 ý tưởng. Trống → đặt null (coi như chưa có dàn ý). */
export async function saveIdeaOutline(ideaId: number, outline: string): Promise<DeleteState> {
  if (!Number.isInteger(ideaId) || ideaId <= 0) {
    return { success: false, message: "Ý tưởng không hợp lệ." };
  }
  const value = outline.trim() || null;
  try {
    const rows = await db
      .select({ outlineVersions: idea.outlineVersions })
      .from(idea)
      .where(eq(idea.id, ideaId))
      .limit(1);
    if (!rows[0]) return { success: false, message: "Không tìm thấy ý tưởng." };

    // Chỉ snapshot khi có nội dung; xoá trắng outline thì giữ nguyên lịch sử.
    const outlineVersions = value
      ? appendOutlineVersion(rows[0].outlineVersions, value, "manual")
      : rows[0].outlineVersions;

    await db.update(idea).set({ outline: value, outlineVersions }).where(eq(idea.id, ideaId));
  } catch {
    return { success: false, message: "Lưu dàn ý thất bại." };
  }
  revalidatePath("/ideas");
  return { success: true, message: "Đã lưu dàn ý." };
}

/**
 * Khôi phục 1 phiên bản dàn ý cũ làm bản active (idea.outline).
 * Vẫn append một bản "manual" vào lịch sử để không mất mạch — sau đó có thể
 * tinh chỉnh tiếp hoặc dùng để sinh caption.
 */
export async function restoreOutlineVersion(
  ideaId: number,
  versionId: string,
): Promise<DeleteState> {
  if (!Number.isInteger(ideaId) || ideaId <= 0) {
    return { success: false, message: "Ý tưởng không hợp lệ." };
  }
  const rows = await db
    .select({ outlineVersions: idea.outlineVersions })
    .from(idea)
    .where(eq(idea.id, ideaId))
    .limit(1);
  if (!rows[0]) return { success: false, message: "Không tìm thấy ý tưởng." };

  // Di chuyển bản được chọn xuống cuối (đánh dấu đang dùng) thay vì nhân bản.
  const restored = restoreOutlineVersionById(rows[0].outlineVersions, versionId);
  if (!restored) return { success: false, message: "Không tìm thấy phiên bản dàn ý." };

  try {
    await db
      .update(idea)
      .set({ outline: restored.content, outlineVersions: restored.json })
      .where(eq(idea.id, ideaId));
  } catch {
    return { success: false, message: "Khôi phục dàn ý thất bại." };
  }
  revalidatePath("/ideas");
  return { success: true, message: "Đã khôi phục phiên bản dàn ý." };
}

/**
 * Xóa 1 ý tưởng. Các post sinh từ ý tưởng này được GIỮ LẠI — chỉ gỡ liên kết
 * (post.ideaId = null) để không phá ràng buộc khóa ngoại và không mất nội dung.
 */
export async function deleteIdea(ideaId: number): Promise<DeleteState> {
  if (!Number.isInteger(ideaId) || ideaId <= 0) {
    return { success: false, message: "Ý tưởng không hợp lệ." };
  }
  try {
    await db.transaction(async (tx) => {
      await tx.update(post).set({ ideaId: null }).where(eq(post.ideaId, ideaId));
      await tx.delete(idea).where(eq(idea.id, ideaId));
    });
  } catch {
    return { success: false, message: "Xóa ý tưởng thất bại, vui lòng thử lại." };
  }
  revalidatePath("/ideas");
  return { success: true, message: "Đã xóa ý tưởng." };
}

/** Xóa 1 post (caption). Không xóa ảnh đính kèm (ảnh dùng chung trong thư viện). */
export async function deletePost(postId: number): Promise<DeleteState> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return { success: false, message: "Post không hợp lệ." };
  }
  try {
    await db.delete(post).where(eq(post.id, postId));
  } catch {
    return { success: false, message: "Xóa post thất bại, vui lòng thử lại." };
  }
  revalidatePath("/posts");
  revalidatePath("/calendar");
  return { success: true, message: "Đã xóa post." };
}
