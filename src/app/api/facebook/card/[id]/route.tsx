import { ImageResponse } from "next/og";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const size = { width: 1080, height: 1350 };
let cachedFont: ArrayBuffer | null = null;

async function getBanglaFont() {
  if (cachedFont) return cachedFont;

  try {
    // Use a real TTF font with full Unicode Bengali glyphs.
    // Satori/next-og can consume TTF directly and performs Bengali shaping
    // from the Unicode text in the JSX.
    const fontResponse = await fetch(
      "https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansBengali/NotoSansBengali-Bold.ttf",
      { cache: "force-cache" }
    );

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

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.khelatv.com";

  return base + (image.startsWith("/") ? image : "/" + image);
}

async function loadImageDataUrl(url: string) {
  if (!url) return "";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KhelaTV-Facebook-Card/1.0; +https://www.khelatv.com)",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      cache: "no-store",
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      categories: {
        select: { name: true },
      },
    },
  });

  if (!post) {
    return new Response("Post not found", { status: 404 });
  }

  if (post.status !== "PUBLISHED") {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    if (!role || !["EDITOR", "ADMIN"].includes(role)) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const title = String(post.title || "").trim();
  const support = String(post.excerpt || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  const categoryName = post.categories[0]?.name || "Sports";
  // The article feature image is the single source of truth for the Facebook card.
  const sourceImage = absoluteImageUrl(post.featureImage);
  const imageUrl = await loadImageDataUrl(sourceImage);
  const font = await getBanglaFont();

  return new ImageResponse(
    <div lang="bn"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f0e8",
        color: "#17130f",
        fontFamily: "Noto Sans Bengali",
      }}
    >
      <div
        style={{
          height: 96,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          background: "#111827",
          color: "white",
          fontSize: 30,
          fontWeight: 700,
        }}
      >
        <div>KhelaTV</div>
        <div style={{ opacity: 0.85, fontSize: 22 }}>SPORTS NEWS</div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: 790,
          display: "flex",
          overflow: "hidden",
          background: "#0f172a",
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
              background: "linear-gradient(135deg,#111827,#1d4ed8)",
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg,rgba(0,0,0,0.02) 45%,rgba(0,0,0,0.62) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 42,
            bottom: 34,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            color: "white",
            textShadow: "0 3px 12px rgba(0,0,0,0.65)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 50,
              lineHeight: 1.05,
              fontWeight: 700,
            }}
          >
            খেলা টিভি
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 6,
              fontFamily: "Arial",
              fontSize: 24,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            khelatv.com
          </div>
        </div>
      </div>

      <div
        style={{
          height: 464,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          padding: "38px 54px 34px",
          background: "#f5f0e8",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 16,
            fontSize: 24,
            color: "#b42318",
            fontWeight: 700,
          }}
        >
          {categoryName}
        </div>

        <div
          style={{
            display: "flex",
            maxWidth: 970,
            fontSize:
              title.length > 90 ? 48 : title.length > 60 ? 54 : 60,
            lineHeight: 1.16,
            fontWeight: 700,
          }}
        >
          {title}
        </div>

        {support ? (
          <div
            style={{
              display: "flex",
              maxWidth: 940,
              marginTop: 20,
              fontSize: 28,
              lineHeight: 1.3,
              color: "#5b5147",
            }}
          >
            {support}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: 20,
            color: "#7c7064",
          }}
        >
          www.khelatv.com
        </div>
      </div>

      <div
        style={{
          height: 18,
          width: "100%",
          display: "flex",
          background: "#b42318",
        }}
      />
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
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        "Content-Language": "bn",
      },
    }
  );
}
