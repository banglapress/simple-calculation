import { prisma } from "@/lib/prisma";
import { buildFacebookCaption, publishFacebookPhoto } from "@/lib/facebook";

export async function publishPostToFacebook(
  postId: string,
  options: { force?: boolean } = {}
) {
  void options;
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

  const cardUrl = String(post.facebookImageUrl || "").trim();

  if (!cardUrl) {
    const message =
      "Facebook Photo Card তৈরি করা হয়নি। আগে Feature Image ব্যবহার করে Photo Card তৈরি করতে হবে।";
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
    };
  }

  try {
    await prisma.post.update({
      where: { id: postId },
      data: {
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
