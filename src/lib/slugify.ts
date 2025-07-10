// src/lib/slugify.ts

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "") // remove diacritics
    .replace(/[^\u0980-\u09FFa-z0-9]+/g, "-") // keep Bangla + English + digits
    .replace(/^-+|-+$/g, "") // trim dashes
    .replace(/--+/g, "-"); // collapse dashes
}