type ResearchJson = {
  summary?: string;
  key_facts?: string[];
  source_conflicts?: string[];
  warnings?: string[];
  relevance_score?: number;
  relevance_reason?: string;
};

type ResearchResult = {
  summary: string;
  keyFacts: string[];
  conflicts: string[];
  warnings: string[];
  relevanceScore: number;
  relevanceReason: string;
  model: string;
};

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

function getModel() {
  return (
    String(process.env.GEMINI_MODEL || DEFAULT_MODEL)
      .trim()
      .replace(/^models\//, "") || DEFAULT_MODEL
  );
}

function getKey() {
  return String(process.env.GEMINI_API_KEY || "").trim();
}

function stripHtml(value: string) {
  return value
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
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KhelaTV-Research/1.0; +https://www.khelatv.com)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return "";
    }

    return stripHtml(await response.text()).slice(0, 7000);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function enrichSources(
  sources: Array<{
    name: string;
    title: string;
    url: string;
    excerpt?: string | null;
    rawText?: string | null;
  }>
) {
  return Promise.all(
    sources.slice(0, 8).map(async (source) => {
      const localText = String(source.rawText || source.excerpt || "").trim();
      if (localText.length >= 1200) return { ...source, rawText: localText };

      const fetched = await fetchSource(source.url);
      return {
        ...source,
        rawText: fetched || localText,
      };
    })
  );
}

export async function generateSportsResearch(input: {
  title: string;
  categoryName: string;
  sources: Array<{
    name: string;
    title: string;
    url: string;
    excerpt?: string | null;
    rawText?: string | null;
  }>;
}): Promise<ResearchResult> {
  const key = getKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const enriched = await enrichSources(input.sources);

  const sourceBlock = enriched
    .map((source, index) =>
      [
        "[SOURCE " + (index + 1) + "]",
        "Publisher: " + source.name,
        "Title: " + source.title,
        "URL: " + source.url,
        "Excerpt: " + String(source.excerpt || "").slice(0, 1800),
        "Available text: " + String(source.rawText || "").slice(0, 6500),
      ].join("\n")
    )
    .join("\n\n--------------------\n\n");

  const prompt = [
    "You are the research desk of KhelaTV, a Bangladesh sports newsroom.",
    "Build a factual research dossier before an editor receives an AI-written draft.",
    "Use ONLY the supplied source material.",
    "Never invent facts, dates, scores, quotes, injuries, transfers or statistics.",
    "Identify whether the item is actually relevant to a sports newsroom.",
    "relevance_score: 90-100 clearly important sports news; 70-89 useful sports news; 50-69 marginal; below 50 unsuitable.",
    "Extract only facts supported by the sources.",
    "Separate conflicts between sources instead of silently choosing one.",
    "Write the summary and facts in concise Bangladesh Bangla.",
    "Return JSON only.",
    "Topic: " + input.title,
    "Category: " + input.categoryName,
    sourceBlock,
  ].join("\n\n");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(getModel()) +
      ":generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              key_facts: { type: "array", items: { type: "string" } },
              source_conflicts: { type: "array", items: { type: "string" } },
              warnings: { type: "array", items: { type: "string" } },
              relevance_score: { type: "integer", minimum: 0, maximum: 100 },
              relevance_reason: { type: "string" },
            },
            required: [
              "summary",
              "key_facts",
              "source_conflicts",
              "warnings",
              "relevance_score",
              "relevance_reason",
            ],
            additionalProperties: false,
          },
          thinkingConfig: { thinkingLevel: "minimal" },
          maxOutputTokens: 5000,
        },
      }),
    }
  );

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      "Gemini research HTTP " + response.status + ": " + raw.slice(0, 300)
    );
  }

  const payload = JSON.parse(raw) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("") || "";

  if (!text.trim()) {
    throw new Error("Gemini research returned empty output");
  }

  const parsed = JSON.parse(text) as ResearchJson;
  const score = Number(parsed.relevance_score);

  return {
    summary: String(parsed.summary || "").trim(),
    keyFacts: Array.isArray(parsed.key_facts)
      ? parsed.key_facts
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, 20)
      : [],
    conflicts: Array.isArray(parsed.source_conflicts)
      ? parsed.source_conflicts
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, 10)
      : [],
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, 10)
      : [],
    relevanceScore: Number.isFinite(score)
      ? Math.min(100, Math.max(0, Math.round(score)))
      : 0,
    relevanceReason: String(parsed.relevance_reason || "").trim(),
    model: getModel(),
  };
}
