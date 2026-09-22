import { ImageResponse } from "next/og";

export const runtime = "edge";

function cleanText(value: string, max = 180) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function splitTitle(value: string) {
  const title = cleanText(value, 125);
  if (title.length <= 52) return [title];

  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? current + " " + word : word;
    if (next.length > 52 && current) {
      lines.push(current);
      current = word;
      if (lines.length === 2) break;
    } else {
      current = next;
    }
  }

  if (lines.length < 2 && current) lines.push(current);
  if (lines.length > 2) lines[1] = lines[1].slice(0, 49) + "…";

  return lines.slice(0, 2);
}

function allowedImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      category?: string;
      featureImage?: string;
    };

    const title = cleanText(String(body.title || "KhelaTV"));
    const category = cleanText(String(body.category || "খেলা"), 30);
    const featureImage = String(body.featureImage || "").trim();

    if (!featureImage || !allowedImageUrl(featureImage)) {
      return new Response("Invalid feature image URL", { status: 400 });
    }

    const fontResponse = await fetch(
      new URL("/fonts/NotoSerifBengali.ttf", req.url).toString()
    );

    if (!fontResponse.ok) {
      return new Response("Bangla font could not be loaded", { status: 500 });
    }

    const font = await fontResponse.arrayBuffer();
    const titleLines = splitTitle(title);

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            position: "relative",
            overflow: "hidden",
            background: "#111827",
            color: "#ffffff",
            fontFamily: "NotoSerifBengali",
          }}
        >
          <img
            src={featureImage}
            alt=""
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "1200px",
              height: "630px",
              objectFit: "cover",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "1200px",
              height: "630px",
              display: "flex",
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.25) 38%, rgba(0,0,0,0.90) 100%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 34,
              left: 44,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "7px 16px",
                borderRadius: 999,
                background: "#ffffff",
                color: "#111827",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              KhelaTV
            </div>
            <div
              style={{
                display: "flex",
                padding: "7px 16px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.62)",
                color: "#ffffff",
                fontSize: 21,
                fontWeight: 600,
              }}
            >
              {category}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 48,
              right: 48,
              bottom: 42,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {titleLines.map((line) => (
              <div
                key={line}
                style={{
                  display: "flex",
                  fontSize: titleLines.length === 1 ? 52 : 46,
                  lineHeight: 1.16,
                  fontWeight: 700,
                  textShadow: "0 2px 10px rgba(0,0,0,0.60)",
                }}
              >
                {line}
              </div>
            ))}

            <div
              style={{
                display: "flex",
                width: 110,
                height: 5,
                background: "#ffffff",
                borderRadius: 10,
                marginTop: 6,
              }}
            />
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "NotoSerifBengali",
            data: font,
            weight: 700,
            style: "normal",
          },
        ],
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Facebook card render failed";
    return new Response(message, { status: 500 });
  }
}
