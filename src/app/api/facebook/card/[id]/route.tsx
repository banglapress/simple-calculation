import { ImageResponse } from "next/og";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const size = { width: 1200, height: 630 };
let cachedFont: ArrayBuffer | null = null;

async function getBanglaFont() {
  if (cachedFont) return cachedFont;
  try {
    const cssResponse = await fetch(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@700&display=swap",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        },
        cache: "force-cache",
      }
    );
    if (!cssResponse.ok) return null;
    const css = await cssResponse.text();
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/i);
    if (!match?.[1]) return null;
    const fontResponse = await fetch(match[1].replace(/['"]/g, ""), {
      cache: "force-cache",
    });
    if (!fontResponse.ok) return null;
    cachedFont = await fontResponse.arrayBuffer();
    return cachedFont;
  } catch {
    return null;
  }
}

function absoluteImageUrl(value: string | null | undefined) {
  const image = String(value || "").trim();
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.khelatv.com";
  return base + (image.startsWith("/") ? image : "/" + image);
}

async function loadImageDataUrl(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KhelaTV-Facebook-Card/1.0; +https://www.khelatv.com)",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      cache: "force-cache",
    });

    if (!response.ok) return "";

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > 7 * 1024 * 1024) return "";

    return (
      "data:" +
      contentType.split(";")[0] +
      ";base64," +
      Buffer.from(buffer).toString("base64")
    );
  } catch {
    return "";
  }
}

export async function GET(
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: { categories: { select: { name: true } } },
  });

  if (!post) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
          color: "white",
          fontSize: 56,
          fontWeight: 700,
        }}
      >
        KhelaTV
      </div>,
      { ...size }
    );
  }

  if (post.status !== "PUBLISHED") {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !["EDITOR", "ADMIN"].includes(session.user.role)) {
      return new Response("Not found", { status: 404 });
    }
  }

  const font = await getBanglaFont();
  const sourceImageUrl =
    absoluteImageUrl(post.facebookImageUrl) ||
    absoluteImageUrl(post.featureImage);
  const imageUrl = sourceImageUrl
    ? await loadImageDataUrl(sourceImageUrl)
    : "";
  const categoryName = post.categories[0]?.name || "খেলা";
  const title = post.title.trim().slice(0, 180);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0f172a",
        color: "white",
        fontFamily: "Noto Sans Bengali",
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(135deg, #111827 0%, #1d4ed8 50%, #0f172a 100%)",
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.28) 35%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 34,
          left: 42,
          display: "flex",
          alignItems: "center",
          padding: "10px 18px",
          borderRadius: 12,
          background: "rgba(15,23,42,0.88)",
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        KhelaTV
      </div>

      <div
        style={{
          position: "absolute",
          left: 48,
          right: 48,
          bottom: 38,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            marginBottom: 14,
            padding: "7px 14px",
            borderRadius: 10,
            background: "#ef4444",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          {categoryName}
        </div>

        <div
          style={{
            display: "flex",
            maxWidth: "1080px",
            fontSize: title.length > 90 ? 46 : title.length > 60 ? 54 : 62,
            lineHeight: 1.18,
            fontWeight: 700,
            textShadow: "0 3px 12px rgba(0,0,0,0.7)",
          }}
        >
          {title}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: font
        ? [
            {
              name: "Noto Sans Bengali",
              data: font,
              weight: 700,
              style: "normal",
            },
          ]
        : undefined,
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
