/**
 * Shared input sanitization helpers for post fields.
 */

const MAX_TITLE_LENGTH = 300;
const MAX_TAGS_LENGTH = 500;

/** Strip HTML tags and control characters, collapse whitespace. */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = stripHtml(value).slice(0, MAX_TITLE_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizeTags(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const cleaned = stripHtml(value).slice(0, MAX_TAGS_LENGTH);
  return cleaned || undefined;
}

/**
 * Allow only https image URLs (Cloudinary or same-origin relative paths).
 * Rejects javascript:, data: (except we don't need data for feature images).
 */
export function sanitizeImageUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Relative path
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed.slice(0, 2000);
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return undefined;
    // Block credentials in URL
    if (url.username || url.password) return undefined;
    return url.toString().slice(0, 2000);
  } catch {
    return undefined;
  }
}

export function sanitizeImageUrlList(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    const url = sanitizeImageUrl(item);
    if (url) result.push(url);
    if (result.length >= max) break;
  }
  return result;
}
