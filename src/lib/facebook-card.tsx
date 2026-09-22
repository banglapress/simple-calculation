import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

function siteOrigin() {
  return String(process.env.NEXTAUTH_URL || "https://www.khelatv.com")
    .trim()
    .replace(/\/+$/, "");
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

  const response = await fetch(siteOrigin() + "/api/facebook-card/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      category: input.category || "খেলা",
      featureImage: input.featureImage,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      "Facebook card renderer failed: " + message.slice(0, 300)
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const uploaded = await uploadBuffer(buffer);

  return uploaded.secure_url;
}
