export type RSSItem = {
  title: string;
  link: string;
  description: string;
  publishedAt: string | null;
};

export type RSSFilterResult = {
  items: RSSItem[];
  total: number;
  excluded: number;
};

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code))
    )
    .trim();
}

function tagValue(block: string, tag: string) {
  const match = block.match(
    new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i")
  );
  return match ? decodeXml(match[1]) : "";
}

function atomLink(block: string) {
  const href = block.match(
    /<link[^>]+href=["']([^"']+?)["'][^>]*\/>/i
  );
  return href ? decodeXml(href[1]) : tagValue(block, "link");
}

function cleanDescription(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function parseKeywords(value?: string | null) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim().toLocaleLowerCase("bn-BD"))
    .filter(Boolean);
}

export function filterRSSItems(
  items: RSSItem[],
  includeKeywords?: string | null,
  excludeKeywords?: string | null
): RSSFilterResult {
  const includes = parseKeywords(includeKeywords);
  const excludes = parseKeywords(excludeKeywords);

  const filtered = items.filter((item) => {
    const haystack = [item.title, item.description, item.link]
      .join(" ")
      .toLocaleLowerCase("bn-BD");

    if (excludes.some((keyword) => haystack.includes(keyword))) {
      return false;
    }

    if (includes.length && !includes.some((keyword) => haystack.includes(keyword))) {
      return false;
    }

    return true;
  });

  return {
    items: filtered,
    total: items.length,
    excluded: items.length - filtered.length,
  };
}

export async function fetchRSSFeed(url: string): Promise<RSSItem[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; KhelaTV-RSS-Desk/1.0; +https://www.khelatv.com)",
      Accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("RSS feed returned HTTP " + response.status);
  }

  const xml = await response.text();
  const items: RSSItem[] = [];

  const rssBlocks =
    xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];

  for (const block of rssBlocks.slice(0, 30)) {
    const title = tagValue(block, "title");
    const link = tagValue(block, "link");
    const description =
      tagValue(block, "description") ||
      tagValue(block, "content:encoded") ||
      "";
    const published =
      tagValue(block, "pubDate") ||
      tagValue(block, "dc:date") ||
      tagValue(block, "published") ||
      tagValue(block, "updated");

    if (title && link) {
      const parsedDate = published ? new Date(published) : null;
      items.push({
        title,
        link,
        description: cleanDescription(description),
        publishedAt:
          parsedDate && !Number.isNaN(parsedDate.getTime())
            ? parsedDate.toISOString()
            : null,
      });
    }
  }

  const entryBlocks =
    xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || [];

  for (const block of entryBlocks.slice(0, 30)) {
    const title = tagValue(block, "title");
    const link = atomLink(block);
    const description =
      tagValue(block, "summary") ||
      tagValue(block, "content") ||
      "";
    const published =
      tagValue(block, "published") ||
      tagValue(block, "updated");

    if (title && link && !items.some((item) => item.link === link)) {
      const parsedDate = published ? new Date(published) : null;
      items.push({
        title,
        link,
        description: cleanDescription(description),
        publishedAt:
          parsedDate && !Number.isNaN(parsedDate.getTime())
            ? parsedDate.toISOString()
            : null,
      });
    }
  }

  return items;
}
