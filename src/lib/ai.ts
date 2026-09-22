type GeminiResult = {
  json: any;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
};

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const RESEARCH_MODEL = "gemini-3.6-flash";

function apiKey() {
  return String(process.env.GEMINI_API_KEY || "").trim();
}

function model() {
  return (
    String(process.env.GEMINI_MODEL || DEFAULT_MODEL)
      .trim()
      .replace(/^models\//, "") || DEFAULT_MODEL
  );
}

function endpoint(name: string) {
  return (
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(name) +
    ":generateContent"
  );
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSource(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KhelaTV-AI-Newsroom/1.0; +https://www.khelatv.com)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error("Source returned HTTP " + response.status);
    }

    return stripHtml(text).slice(0, 14000);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Source fetch failed";
    throw new Error("Could not fetch " + url + ": " + message);
  } finally {
    clearTimeout(timer);
  }
}

const ARTICLE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    excerpt: { type: "string" },
    body_html: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["title", "excerpt", "body_html", "tags", "warnings"],
  additionalProperties: false,
};

async function generateStructured(
  prompt: string,
  schema: Record<string, unknown>,
  options: {
    timeoutMs?: number;
    maxOutputTokens?: number;
    thinkingLevel?: "minimal" | "low" | "medium";
    model?: string;
  } = {}
): Promise<GeminiResult> {
  const key = apiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const selectedModel = options.model || model();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs || 75000
  );
  const started = Date.now();

  try {
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: options.maxOutputTokens || 8192,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        thinkingConfig: {
          thinkingLevel: options.thinkingLevel || "minimal",
        },
      },
    };

    let response: Response | null = null;
    let raw = "";

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      response = await fetch(endpoint(selectedModel), {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify(body),
      });

      raw = await response.text();

      if (response.ok) break;

      const retryable = [429, 500, 502, 503, 504].includes(response.status);
      if (!retryable || attempt === 3) {
        throw new Error(
          "Gemini HTTP " + response.status + ": " + raw.slice(0, 300)
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * 2 ** (attempt - 1))
      );
    }

    if (!response?.ok) {
      throw new Error(
        "Gemini HTTP " + (response?.status || 500) + ": " + raw.slice(0, 300)
      );
    }

    const payload = JSON.parse(raw);
    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part.text || "")
        .join("") || "";

    if (!text.trim()) {
      throw new Error("Gemini returned empty output");
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Gemini returned invalid JSON");
    }

    return {
      json,
      model: selectedModel,
      inputTokens: payload?.usageMetadata?.promptTokenCount ?? null,
      outputTokens: payload?.usageMetadata?.candidatesTokenCount ?? null,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Gemini request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateSportsArticle(input: {
  title?: string;
  categoryName?: string;
  sourceText?: string;
  sourceUrls?: string[];
}) {
  const urls = (input.sourceUrls || [])
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 3);

  const sourceParts: string[] = [];

  if (input.sourceText?.trim()) {
    sourceParts.push(
      "USER-SUPPLIED SOURCE MATERIAL:\n" +
        input.sourceText.trim().slice(0, 18000)
    );
  }

  for (const url of urls) {
    try {
      const text = await fetchSource(url);
      sourceParts.push(
        "SOURCE URL: " + url + "\nSOURCE TEXT:\n" + text
      );
    } catch (error) {
      sourceParts.push(
        "SOURCE URL: " +
          url +
          "\nFETCH WARNING: " +
          (error instanceof Error ? error.message : "Unable to fetch source")
      );
    }
  }

  if (!sourceParts.length) {
    throw new Error(
      "AI draft তৈরির জন্য source material অথবা source URL দিন।"
    );
  }

  const prompt = [
    "You are the AI assistant of KhelaTV, a Bangla sports newsroom in Bangladesh.",
    "Create an original sports news draft from the supplied source material.",
    "Use ONLY facts supported by the supplied material.",
    "Never invent scores, statistics, dates, quotes, injuries, transfers, opinions or background.",
    "When the sources conflict or a fact is uncertain, mention the uncertainty in warnings and write conservatively.",
    "Do not copy sentences from the sources. Synthesize them into original Bangla newsroom language.",
    "Use natural Bangladesh Bangla (bn-BD), not India-Bengali wording.",
    "Keep sentences short and readable.",
    "The article body must be HTML using only <p>, <h2>, <strong>, <em> and <blockquote> where needed.",
    "Do not include markdown, a lead label, source labels, or a bibliography inside body_html.",
    "Prefer a strong factual opening, then context, details, reactions and what happens next when supported.",
    "Do not add generic filler just to increase length.",
    "Produce a usable newsroom draft of roughly 600-900 Bangla words when the source material supports it.",
    "If the source material is too thin, write a shorter draft and add a warning.",
    "Return 3-8 useful tags in Bangla or the standard proper-name spelling.",
    "Topic/title hint: " + (input.title?.trim() || "Untitled sports story"),
    "Category: " + (input.categoryName?.trim() || "Sports"),
    sourceParts.join("\n\n--------------------\n\n"),
  ].join("\n\n");

  const result = await generateStructured(
    prompt,
    ARTICLE_SCHEMA,
    {
      timeoutMs: 90000,
      maxOutputTokens: 9000,
      thinkingLevel: "minimal",
      model: model() || RESEARCH_MODEL,
    }
  );

  return {
    title: String(result.json?.title || input.title || "").trim(),
    excerpt: String(result.json?.excerpt || "").trim(),
    body_html: String(result.json?.body_html || "").trim(),
    tags: Array.isArray(result.json?.tags)
      ? result.json.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean).slice(0, 8)
      : [],
    warnings: Array.isArray(result.json?.warnings)
      ? result.json.warnings.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [],
    provider: "gemini",
    model: result.model,
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: result.durationMs,
    },
    sourceUrls: urls,
  };
}

export async function checkAIConfiguration() {
  return {
    configured: Boolean(apiKey()),
    model: model(),
  };
}
