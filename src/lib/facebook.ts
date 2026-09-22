const META_GRAPH_VERSION = "v26.0";

function env(name: string) {
  return String(process.env[name] || "").trim();
}

export function readFacebookConfig() {
  return {
    token: env("META_ACCESS_TOKEN") || env("FACEBOOK_PAGE_ACCESS_TOKEN"),
    pageId: env("META_PAGE_ID") || env("FACEBOOK_PAGE_ID"),
    pageName: env("META_PAGE_NAME") || env("FACEBOOK_PAGE_NAME") || "",
  };
}

function graphErrorMessage(payload: unknown, fallback: string) {
  const json = payload as { error?: { message?: string } } | null;
  const message = String(json?.error?.message || fallback);
  if (/expired|session has expired|invalid oauth/i.test(message)) {
    return "Facebook Page access token is expired or invalid.";
  }
  return message;
}

async function graphGet(path: string, token: string) {
  const url = new URL("https://graph.facebook.com/" + META_GRAPH_VERSION + path);
  if (!url.searchParams.has("access_token")) {
    url.searchParams.set("access_token", token);
  }
  const response = await fetch(url.toString());
  const raw = await response.text();
  let json: unknown = null;
  try { json = raw ? JSON.parse(raw) : null; } catch { json = { raw }; }
  if (!response.ok || (json as { error?: unknown })?.error) {
    throw new Error(graphErrorMessage(json, raw.slice(0, 250)));
  }
  return json as Record<string, unknown>;
}

export async function probeFacebook() {
  const config = readFacebookConfig();
  if (!config.token || !config.pageId) {
    return { configured: false, pageName: config.pageName || null, pageId: config.pageId };
  }

  const page = await graphGet(
    "/" + encodeURIComponent(config.pageId) + "?fields=id,name,access_token",
    config.token
  );

  return {
    configured: true,
    pageId: String(page.id || config.pageId),
    pageName: String(page.name || config.pageName || ""),
  };
}

async function resolvePage() {
  const config = readFacebookConfig();
  if (!config.token || !config.pageId) {
    throw new Error("Facebook is not configured. Set META_ACCESS_TOKEN and META_PAGE_ID.");
  }

  try {
    const page = await graphGet(
      "/" + encodeURIComponent(config.pageId) + "?fields=id,name,access_token",
      config.token
    );
    return {
      token: String(page.access_token || config.token),
      pageId: String(page.id || config.pageId),
      pageName: String(page.name || config.pageName || ""),
    };
  } catch (firstError) {
    try {
      const accounts = await graphGet("/me/accounts?fields=id,name,access_token,tasks", config.token);
      const rows = Array.isArray(accounts.data) ? accounts.data : [];
      const found = rows.find(
        (row) => String((row as { id?: unknown }).id || "") === config.pageId
      ) as { id?: unknown; name?: unknown; access_token?: unknown } | undefined;
      if (found?.access_token) {
        return {
          token: String(found.access_token),
          pageId: String(found.id),
          pageName: String(found.name || ""),
        };
      }
    } catch {
      // Keep the original error.
    }
    throw firstError;
  }
}

export function buildFacebookCaption(input: {
  title: string;
  excerpt?: string | null;
  url: string;
  tags?: string | null;
}) {
  const tags = String(input.tags || "")
    .split(",")
    .map((tag) => tag.replace(/[^\\p{L}\\p{M}\\p{N}]+/gu, "").trim())
    .filter((tag) => tag.length >= 2)
    .slice(0, 3)
    .map((tag) => "#" + tag);

  return [
    input.title.trim(),
    input.excerpt ? input.excerpt.replace(/<[^>]+>/g, "").trim().slice(0, 220) : "",
    input.url,
    tags.join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function publishFacebookPhoto(input: {
  imageUrl: string;
  caption: string;
}) {
  const page = await resolvePage();
  const body = new URLSearchParams();
  body.set("url", input.imageUrl);
  body.set("caption", input.caption);
  body.set("published", "true");
  body.set("access_token", page.token);

  const response = await fetch(
    "https://graph.facebook.com/" +
      META_GRAPH_VERSION +
      "/" +
      encodeURIComponent(page.pageId) +
      "/photos",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const raw = await response.text();
  let json: { id?: string; post_id?: string; error?: unknown } | null = null;
  try { json = raw ? JSON.parse(raw) : null; } catch { json = null; }

  if (!response.ok || json?.error) {
    throw new Error(
      graphErrorMessage(json, raw.slice(0, 250) || "Facebook publish failed")
    );
  }

  return {
    photoId: String(json?.id || ""),
    postId: String(json?.post_id || json?.id || ""),
    pageId: page.pageId,
    pageName: page.pageName,
  };
}
