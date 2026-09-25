/**
 * Lightweight structured security event logging.
 * Appears in Vercel/server logs — wire to an external sink later if needed.
 */

type SecurityEvent =
  | "login_failed"
  | "login_rate_limited"
  | "register_rate_limited"
  | "upload_rate_limited"
  | "upload_forbidden"
  | "auth_forbidden";

export function securityLog(
  event: SecurityEvent,
  details: Record<string, string | number | boolean | null | undefined> = {}
) {
  const payload = {
    level: "security",
    event,
    ts: new Date().toISOString(),
    ...details,
  };

  // Use console.warn so it stands out in log aggregators without being an error crash
  console.warn("[SECURITY]", JSON.stringify(payload));
}
