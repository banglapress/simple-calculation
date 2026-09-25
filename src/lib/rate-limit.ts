/**
 * Simple in-memory sliding-window rate limiter.
 * Works per serverless instance (good baseline). For multi-instance
 * production scale, replace with Upstash Redis / Vercel KV.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

const MAX_KEYS = 10_000;

function prune(now: number) {
  if (store.size < MAX_KEYS) return;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
  // If still too large, drop oldest half
  if (store.size >= MAX_KEYS) {
    const keys = Array.from(store.keys()).slice(0, Math.floor(MAX_KEYS / 2));
    for (const key of keys) store.delete(key);
  }
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  prune(now);

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export function rateLimitActor(
  req: Request,
  actor: string,
  scope: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const normalizedActor = actor.trim().toLowerCase() || "anonymous";
  const ip = clientIp(req);

  const actorResult = rateLimit(
    scope + ":actor:" + normalizedActor,
    limit,
    windowMs
  );
  const ipResult = rateLimit(
    scope + ":ip:" + ip,
    Math.max(limit * 3, limit),
    windowMs
  );

  if (!actorResult.success) return actorResult;
  if (!ipResult.success) return ipResult;

  return {
    success: true,
    remaining: Math.min(
      actorResult.remaining,
      ipResult.remaining
    ),
    resetAt: Math.max(
      actorResult.resetAt,
      ipResult.resetAt
    ),
  };
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      message: "অনেক বেশি অনুরোধ। একটু পর আবার চেষ্টা করুন।",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
