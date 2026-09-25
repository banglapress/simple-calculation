/**
 * Lightweight HTML sanitizer for article content.
 * Strips scripts, event handlers, dangerous URLs and disallowed tags.
 * No external dependency — safe default for news HTML from Lexical.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "figure",
  "figcaption",
  "span",
  "div",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "sub",
  "sup",
  "code",
  "pre",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
  span: new Set(["class"]),
  div: new Set(["class"]),
  p: new Set(["class"]),
  h1: new Set(["class"]),
  h2: new Set(["class"]),
  h3: new Set(["class"]),
  h4: new Set(["class"]),
  h5: new Set(["class"]),
  h6: new Set(["class"]),
};

const VOID_TAGS = new Set(["br", "hr", "img"]);

function isSafeUrl(value: string, attr: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("vbscript:")) {
    return false;
  }
  if (trimmed.startsWith("data:") && attr === "href") {
    return false;
  }
  // Allow relative, http(s), mailto, and data:image for img src
  if (attr === "src") {
    return (
      trimmed.startsWith("https://") ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("data:image/")
    );
  }
  if (attr === "href") {
    return (
      trimmed.startsWith("https://") ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("mailto:")
    );
  }
  return true;
}

function sanitizeAttributes(tag: string, attrString: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed || !attrString) return "";

  const result: string[] = [];
  const attrRegex =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";

    if (name.startsWith("on")) continue;
    if (!allowed.has(name)) continue;

    if ((name === "href" || name === "src") && !isSafeUrl(value, name)) {
      continue;
    }

    // Force safe target/rel for external links
    if (name === "target" && value === "_blank") {
      result.push('target="_blank"');
      result.push('rel="noopener noreferrer"');
      continue;
    }

    if (name === "rel") continue; // handled above when target=_blank

    const escaped = value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    result.push(`${name}="${escaped}"`);
  }

  return result.length ? " " + result.join(" ") : "";
}

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Remove script/style/iframe blocks entirely (including content)
  let html = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "");

  // Process remaining tags
  html = html.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (full, rawTag: string, attrs: string) => {
      const isClosing = full.startsWith("</");
      const tag = rawTag.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        return "";
      }

      if (isClosing) {
        return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
      }

      const safeAttrs = sanitizeAttributes(tag, attrs || "");

      if (VOID_TAGS.has(tag)) {
        return `<${tag}${safeAttrs} />`;
      }

      return `<${tag}${safeAttrs}>`;
    }
  );

  return html;
}
