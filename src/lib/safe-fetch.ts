import dns from "node:dns/promises";
import net from "node:net";

const MAX_REDIRECTS = 3;
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "instance-data.ec2.internal",
]);

type FetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  allowedContentTypes?: string[];
  headers?: Record<string, string>;
};

function ipv4ToNumber(ip: string) {
  const parts = ip.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) || part < 0 || part > 255
    )
  ) {
    return null;
  }

  return (
    ((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]
  ) >>> 0;
}

function isBlockedIpv4(ip: string) {
  const value = ipv4ToNumber(ip);
  if (value === null) return true;

  const ranges = [
    [0x00000000, 0x00ffffff], // 0.0.0.0/8
    [0x0a000000, 0x0affffff], // 10.0.0.0/8
    [0x64400000, 0x647fffff], // 100.64.0.0/10
    [0x7f000000, 0x7fffffff], // 127.0.0.0/8
    [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16
    [0xac100000, 0xac1fffff], // 172.16.0.0/12
    [0xc0000000, 0xc00000ff], // 192.0.0.0/24
    [0xc0000200, 0xc00002ff], // 192.0.2.0/24
    [0xc0006400, 0xc00064ff], // 192.0.100.0/24
    [0xc6120000, 0xc613ffff], // 198.18.0.0/15
    [0xcb007100, 0xcb0071ff], // 203.0.113.0/24
    [0xe0000000, 0xffffffff], // multicast/reserved
  ];

  return ranges.some(([start, end]) => value >= start && value <= end);
}

function isBlockedIpv6(ip: string) {
  const normalized = ip.toLowerCase();

  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("ff")) return true;

  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (net.isIP(mapped) === 4) return isBlockedIpv4(mapped);
  }

  return false;
}

function isBlockedIp(ip: string) {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true;
}

async function assertPublicUrl(rawUrl: string) {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid external URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP(S) URLs are allowed");
  }

  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }

  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new Error("Non-standard ports are not allowed");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Private/internal host is not allowed");
  }

  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    throw new Error("Private/internal IP is not allowed");
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });
  } catch {
    throw new Error("External host could not be resolved");
  }

  if (
    !addresses.length ||
    addresses.some((entry) => isBlockedIp(entry.address))
  ) {
    throw new Error("External host resolves to a private/internal IP");
  }

  return url;
}

async function readLimitedBody(response: Response, maxBytes: number) {
  const declaredLength = Number(
    response.headers.get("content-length") || ""
  );

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maxBytes
  ) {
    throw new Error("External response is too large");
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error("External response is too large");
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;

      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("External response is too large");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    total
  );
}

export async function fetchPublicResource(
  rawUrl: string,
  options: FetchOptions = {}
) {
  const timeoutMs = Math.max(
    1000,
    Math.min(options.timeoutMs || 12000, 30000)
  );
  const maxBytes = Math.max(
    1024,
    Math.min(
      options.maxBytes || 1024 * 1024,
      10 * 1024 * 1024
    )
  );

  let url = await assertPublicUrl(rawUrl);

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: options.headers,
        cache: "no-store",
      });

      if (response.status >= 300 && response.status < 400) {
        if (redirectCount === MAX_REDIRECTS) {
          throw new Error("Too many redirects");
        }

        const location = response.headers.get("location");
        if (!location) {
          throw new Error("Redirect response has no location");
        }

        url = await assertPublicUrl(
          new URL(location, url).toString()
        );
        continue;
      }

      if (!response.ok) {
        throw new Error(
          "External resource returned HTTP " +
            response.status
        );
      }

      const contentType = (
        response.headers.get("content-type") ||
        "application/octet-stream"
      )
        .split(";")[0]
        .trim()
        .toLowerCase();

      const allowedTypes =
        options.allowedContentTypes || [];

      if (
        allowedTypes.length &&
        !allowedTypes.some((allowed) => {
          const normalizedAllowed = allowed
            .trim()
            .toLowerCase();
          return normalizedAllowed.endsWith("/")
            ? contentType.startsWith(normalizedAllowed)
            : contentType === normalizedAllowed;
        })
      ) {
        throw new Error(
          "Unexpected external content type"
        );
      }

      const body = await readLimitedBody(
        response,
        maxBytes
      );

      return {
        finalUrl: url.toString(),
        status: response.status,
        contentType,
        headers: response.headers,
        body,
      };
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw new Error(
          "External resource request timed out"
        );
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("External resource request failed");
}
