import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

const PRIMARY_CLOUDFLARE_MODEL =
  "@cf/black-forest-labs/flux-2-klein-4b";
const FALLBACK_CLOUDFLARE_MODEL =
  "@cf/black-forest-labs/flux-1-schnell";
const WIDTH = 1024;
const HEIGHT = 1280;

function env(name: string) {
  return String(process.env[name] || "").trim();
}

export function cloudflareFacebookImageConfigured() {
  return Boolean(env("CLOUDFLARE_ACCOUNT_ID") && env("CLOUDFLARE_API_TOKEN"));
}

export function defaultFacebookImagePrompt(input: {
  title: string;
  excerpt?: string | null;
  category?: string | null;
  tags?: string | null;
}) {
  const title = input.title.replace(/\s+/g, " ").trim().slice(0, 280);
  const excerpt = String(input.excerpt || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
  const category = String(input.category || "sports").trim().slice(0, 100);
  const tags = String(input.tags || "").trim().slice(0, 250);

  return [
    "Create one premium editorial sports news photograph/illustration for a Bangladeshi digital sports newsroom.",
    "4:5 portrait composition, realistic and visually strong, one clear subject, natural believable lighting, modern professional newspaper aesthetic.",
    "The image must visually communicate the core event or subject of the story without using any text.",
    "Do not add words, letters, numbers, captions, logos, watermarks, scoreboards, fake screenshots, fake documents or readable signage.",
    "Do not create an identifiable fake portrait of a real person. Use an adult generic athlete, stadium, equipment, venue, crowd, trophy or action scene when appropriate.",
    "Avoid excessive cinematic effects, collage, clutter and generic stock-photo appearance.",
    "Keep the main subject inside the central safe area because a branded headline panel will be added by the website.",
    "Category: " + category,
    "Story headline: " + title,
    excerpt ? "Story context: " + excerpt : "",
    tags ? "Relevant tags: " + tags : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function detectSport(text: string) {
  const normalized = text.toLowerCase();

  if (/tennis|টেনিস|ডেভিস কাপ|davis cup/.test(normalized)) {
    return "professional tennis";
  }
  if (/football|ফুটবল|soccer|সকার|premier league|champions league/.test(normalized)) {
    return "professional football";
  }
  if (/cricket|ক্রিকেট|ipl|t20|test match|odi/.test(normalized)) {
    return "professional cricket";
  }
  if (/basketball|বাস্কেটবল|nba/.test(normalized)) {
    return "professional basketball";
  }
  if (/athletics|অ্যাথলেটিক্স|sprint|marathon|দৌড়/.test(normalized)) {
    return "professional athletics";
  }

  return "professional sport";
}

function buildSafeFallbackPrompt(originalPrompt: string) {
  const sport = detectSport(originalPrompt);

  return [
    "Create a premium editorial sports photograph for a Bangladeshi digital newsroom.",
    "Show an adult professional athlete in " + sport + ".",
    "Show a high-stakes international team competition or major tournament moment, with the athlete competing or celebrating on a professional court or field.",
    "Use a realistic newspaper-photography aesthetic, natural stadium lighting, believable action, and a clean 4:5 portrait composition.",
    "Do not depict any specific real person or recognizable public figure. Use a generic adult athlete with an unidentifiable face.",
    "Do not include text, letters, numbers, captions, logos, watermarks, scoreboards, flags with readable symbols, fake documents, or readable signage.",
    "Keep the composition uncluttered with one clear central subject and enough negative space for a headline overlay.",
  ].join("\n\n");
}

function isFlaggedResponse(raw: string) {
  return /(?:code['":\\s]*3030|output has been flagged|choose another prompt)/i.test(
    raw
  );
}

function classifyError(status: number, raw: string) {
  if (isFlaggedResponse(raw)) {
    return "Cloudflare safety filter flagged the generated output";
  }
  if (status === 429 || /rate.?limit|quota/i.test(raw)) return "Cloudflare rate limit/quota";
  if (status === 401 || /invalid.+token|authentication/i.test(raw)) return "Cloudflare API token is invalid";
  if (status === 403 || /permission|not authorized|insufficient/i.test(raw)) return "Cloudflare API token does not have Workers AI permission";
  if (status === 404 || /model.+not found|unknown model/i.test(raw)) return "Cloudflare image model is unavailable";
  if (status >= 500) return "Cloudflare AI provider error";
  return raw.slice(0, 300) || "Cloudflare image generation failed";
}

function cloudflareErrorDetails(
  status: number,
  raw: string
) {
  let code = "";
  let message = "";

  try {
    const payload = JSON.parse(raw) as {
      errors?: Array<{ code?: number | string; message?: string }>;
      error?: { code?: number | string; message?: string };
    };

    const firstError = payload.errors?.[0] || payload.error;
    code = String(firstError?.code || "");
    message = String(firstError?.message || "");
  } catch {
    // Keep raw text below.
  }

  message = message || raw.slice(0, 400);

  return { status, code, message };
}

function classifyCloudflareError(
  status: number,
  raw: string
) {
  const details = cloudflareErrorDetails(status, raw);
  const code = details.code;
  const message = details.message;

  if (code === "3036") {
    return "Cloudflare Workers AI daily free allocation শেষ হয়েছে (3036).";
  }
  if (code === "3040") {
    return "Cloudflare Workers AI capacity সাময়িকভাবে পূর্ণ (3040).";
  }
  if (code === "5035") {
    return "এই Cloudflare AI model-এর জন্য Workers Paid plan প্রয়োজন (5035).";
  }
  if (code === "3042" || code === "5007") {
    return "Cloudflare AI model পাওয়া যাচ্ছে না (" + code + ").";
  }
  if (code === "5018" || code === "3041") {
    return "Cloudflare account এই AI model ব্যবহার করতে অনুমোদিত নয় (" + code + ").";
  }
  if (code === "3003") {
    return "Cloudflare AI request incomplete (3003).";
  }
  if (code === "3007" || code === "3008") {
    return "Cloudflare AI request timeout/aborted (" + code + ").";
  }
  if (status === 401 || /invalid.+token|authentication/i.test(message)) {
    return "Cloudflare API token invalid.";
  }
  if (status === 403 || /permission|not authorized|insufficient/i.test(message)) {
    return "Cloudflare API token-এর Workers AI permission নেই.";
  }
  if (status === 429) {
    return "Cloudflare AI rate limit/capacity error.";
  }
  if (status >= 500) {
    return "Cloudflare AI provider error.";
  }

  return message || "Cloudflare image generation failed.";
}

function isRetryable(status: number, raw: string) {
  const details = cloudflareErrorDetails(status, raw);
  return (
    [429, 500, 502, 503, 504].includes(status) ||
    details.code === "3040"
  );
}

async function callCloudflareModel(
  model: string,
  prompt: string
) {
  const accountId = env("CLOUDFLARE_ACCOUNT_ID");
  const token = env("CLOUDFLARE_API_TOKEN");

  if (!accountId || !token) {
    throw new Error(
      "Cloudflare image generation is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  try {
    let response: Response;

    if (model === FALLBACK_CLOUDFLARE_MODEL) {
      response = await fetch(
        "https://api.cloudflare.com/client/v4/accounts/" +
          encodeURIComponent(accountId) +
          "/ai/run/" +
          FALLBACK_CLOUDFLARE_MODEL,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt.slice(0, 2048),
            steps: 4,
          }),
          signal: controller.signal,
        }
      );
    } else {
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("width", String(WIDTH));
      form.append("height", String(HEIGHT));

      response = await fetch(
        "https://api.cloudflare.com/client/v4/accounts/" +
          encodeURIComponent(accountId) +
          "/ai/run/" +
          PRIMARY_CLOUDFLARE_MODEL,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
          },
          body: form,
          signal: controller.signal,
        }
      );
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("image/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!response.ok || buffer.byteLength < 32) {
        throw new Error(
          "Cloudflare image generation failed: HTTP " +
            response.status
        );
      }

      return {
        mime: contentType.split(";")[0] || "image/jpeg",
        base64: buffer.toString("base64"),
      };
    }

    const raw = await response.text();

    if (!response.ok) {
      const details = cloudflareErrorDetails(response.status, raw);
      const error = new Error(
        classifyCloudflareError(response.status, raw) +
          (details.code ? " [code " + details.code + "]" : "")
      );
      (error as Error & { cloudflareCode?: string }).cloudflareCode =
        details.code;
      (error as Error & { cloudflareStatus?: number }).cloudflareStatus =
        response.status;
      throw error;
    }

    let payload: {
      result?: {
        image?: unknown;
        images?: unknown[];
      };
      image?: unknown;
    };

    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      throw new Error(
        "Cloudflare image generation failed: invalid provider response"
      );
    }

    const candidate =
      payload.result?.image ??
      payload.result?.images?.[0] ??
      payload.image ??
      "";

    const base64 =
      typeof candidate === "string"
        ? candidate.replace(/^data:image\/[^;]+;base64,/, "")
        : "";

    if (!base64) {
      throw new Error(
        "Cloudflare image generation failed: no image bytes returned"
      );
    }

    return {
      mime: "image/jpeg",
      base64,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function generateBytes(prompt: string) {
  const models = [PRIMARY_CLOUDFLARE_MODEL, FALLBACK_CLOUDFLARE_MODEL];
  let lastError: unknown = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await callCloudflareModel(model, prompt);
      } catch (error) {
        lastError = error;

        const status = Number(
          (error as { cloudflareStatus?: number }).cloudflareStatus || 0
        );
        const raw = String(error instanceof Error ? error.message : error);

        if (!isRetryable(status, raw) || attempt === 3) break;

        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * 2 ** (attempt - 1))
        );
      }
    }

    const code = String(
      (lastError as { cloudflareCode?: string })?.cloudflareCode || ""
    );

    // Try FLUX.1 schnell when the primary model itself is unavailable or
    // temporarily out of capacity. Do not waste another model call when the
    // account has exhausted its daily neuron allocation.
    if (
      model === PRIMARY_CLOUDFLARE_MODEL &&
      ["3040", "3042", "5007", "5018", "3041", "5035"].includes(code)
    ) {
      continue;
    }

    break;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Cloudflare image generation failed");
}

async function uploadToCloudinary(mime: string, base64: string) {
  const cloudName = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const apiSecret = env("CLOUDINARY_API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary server credentials are required to store generated Facebook images."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const dataUri = "data:" + mime + ";base64," + base64;

  const result: UploadApiResponse = await cloudinary.uploader.upload(dataUri, {
    folder: "khela-tv/facebook-ai",
    resource_type: "image",
  });

  return result.secure_url;
}

export async function generateAndStoreFacebookImage(input: {
  prompt: string;
}) {
  const originalPrompt = input.prompt.trim();

  let image;
  try {
    image = await generateBytes(originalPrompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes("[3030]")) {
      throw error;
    }

    image = await generateBytes(buildSafeFallbackPrompt(originalPrompt));
  }

  const url = await uploadToCloudinary(image.mime, image.base64);

  return {
    imageUrl: url,
    provider: "cloudflare",
    model:
      PRIMARY_CLOUDFLARE_MODEL,
    width: WIDTH,
    height: HEIGHT,
  };
}
