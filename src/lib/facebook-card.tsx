import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

function loadFont() {
  const fontPath = path.join(process.cwd(), "public", "fonts", "NotoSerifBengali.ttf");
  return fs.readFileSync(fontPath);
}

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
  if (lines.length > 2) {
    lines[1] = lines[1].slice(0, 49) + "…";
  }

  return lines.slice(0, 2);
}

async function renderCard(input: {
  title: string;
  category?: string | null;
  featureImage: string;
}) {
  if (!input.featureImage.trim()) {
    throw new Error("Facebook photo card তৈরির জন্য feature image দরকার।");
  }

  const font = loadFont();
  const titleLines = splitTitle(input.title);

  const response = new ImageResponse(
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
          src={input.featureImage}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "1200px",
            height: "630px",
            objectFit: "cover",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.22) 36%, rgba(0,0,0,0.88) 100%)",
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
              padding: "7px 15px",
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
              padding: "7px 15px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.58)",
              color: "#ffffff",
              fontSize: 21,
              fontWeight: 600,
            }}
          >
            {cleanText(input.category || "খেলা", 30)}
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
            gap: 12,
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
                textShadow: "0 2px 10px rgba(0,0,0,0.55)",
              }}
            >
              {line}
            </div>
          ))}

          <div
            style={{
              display: "flex",
              height: 5,
              width: 110,
              background: "#ffffff",
              borderRadius: 10,
              marginTop: 4,
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

  return Buffer.from(await response.arrayBuffer());
}

function uploadBuffer(buffer: Buffer) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "khela-tv/facebook-cards",
        resource_type: "image",
        format: "png",
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary Facebook card upload failed"));
          return;
        }
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

export async function generateFacebookCard(input: {
  title: string;
  category?: string | null;
  featureImage: string;
}) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary is not configured.");
  }

  const buffer = await renderCard(input);
  const uploaded = await uploadBuffer(buffer);

  return uploaded.secure_url;
}
