import { prisma } from "@/lib/prisma";
import { buildFacebookCaption, publishFacebookPhoto } from "@/lib/facebook";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

async function generateAndStoreFacebookCard(postId: string) {
  const baseUrl =
    String(process.env.NEXT_PUBLIC_SITE_URL || "https://www.khelatv.com")
      .trim()
      .replace(/\/$/, "");

  const cardUrl =
    baseUrl +
    "/api/facebook/card/" +
    encodeURIComponent(postId) +
    "?publish=" +
    Date.now();

  const response = await fetch(cardUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      "Facebook Photo Card তৈরি করা যায়নি: HTTP " +
        response.status +
        (body ? " — " + body.slice(0, 300) : "")
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("image/")) {
    throw new Error("Facebook Photo Card থেকে image পাওয়া যায়নি।");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    throw new Error("Facebook Photo Card-এর image bytes পাওয়া যায়নি।");
  }

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary server credentials পাওয়া যায়নি।");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const uploadResult: UploadApiResponse = await new Promise(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "khela-tv/facebook-cards",
          resource_type: "image",
          format: "png",
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Facebook Card Cloudinary upload failed"));
            return;
          }
          resolve(result);
        }
      );

      stream.end(buffer);
    }
  );

  return uploadResult.secure_url;
}

export async function publishPostToFacebook(
  postId: string,
  options: { force?: boolean } = {}
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      categories: { select: { slug: true } },
    },
  });

  if (!post) throw new Error("Post not found");

  if (post.status !== "PUBLISHED") {
    return {
      attempted: false,
      published: false,
      reason: "not_published",
      error: "আগে Article Publish করতে হবে।",
    };
  }

  if (!options.force && !post.facebookAutoPost) {
    return { attempted: false, published: false, reason: "disabled" };
  }

  if (post.facebookStatus === "PUBLISHED" && post.facebookPostId) {
    return {
      attempted: false,
      published: true,
      postId: post.facebookPostId,
      reason: "already_published",
    };
  }

  const categorySlug = post.categories[0]?.slug || "sports";
  const articleUrl =
    "https://www.khelatv.com/" + categorySlug + "/" + post.id;

  const caption =
    post.facebookCaption?.trim() ||
    buildFacebookCaption({
      title: post.title,
      excerpt: post.excerpt,
      url: articleUrl,
      tags: post.tags,
    });

  let cardUrl = String(post.facebookImageUrl || "").trim();

  try {
    // Always create a real, publicly hosted Facebook card before publishing.
    // This avoids relying on a dynamic Next.js image URL inside Meta's fetcher.
    cardUrl = await generateAndStoreFacebookCard(postId);

    await prisma.post.update({
      where: { id: postId },
      data: {
        facebookImageUrl: cardUrl,
        facebookCaption: caption,
        facebookStatus: "READY",
        facebookError: null,
      },
    });

    const result = await publishFacebookPhoto({
      imageUrl: cardUrl,
      caption,
    });

    await prisma.post.update({
      where: { id: postId },
      data: {
        facebookStatus: "PUBLISHED",
        facebookPostId: result.postId,
        facebookPublishedAt: new Date(),
        facebookError: null,
      },
    });

    return {
      attempted: true,
      published: true,
      postId: result.postId,
      pageName: result.pageName,
      imageUrl: cardUrl,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Facebook publish failed";

    await prisma.post.update({
      where: { id: postId },
      data: {
        facebookStatus: "FAILED",
        facebookError: message,
      },
    });

    return {
      attempted: true,
      published: false,
      error: message,
      imageUrl: cardUrl,
    };
  }
}
