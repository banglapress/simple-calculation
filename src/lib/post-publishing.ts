import { prisma } from "@/lib/prisma";
import { buildFacebookCaption, publishFacebookPhoto } from "@/lib/facebook";

export async function publishPostToFacebook(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      categories: {
        select: { slug: true },
      },
    },
  });

  if (!post) throw new Error("Post not found");
  if (post.status !== "PUBLISHED") {
    return { attempted: false, published: false, reason: "not_published" };
  }
  if (!post.facebookAutoPost) {
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

  if (!post.featureImage?.trim()) {
    const message = "Facebook auto-post skipped: আগে feature image যোগ করুন।";
    await prisma.post.update({
      where: { id: postId },
      data: {
        facebookStatus: "FAILED",
        facebookError: message,
      },
    });
    return { attempted: true, published: false, error: message };
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

  await prisma.post.update({
    where: { id: postId },
    data: {
      facebookCaption: caption,
      facebookStatus: "READY",
      facebookError: null,
    },
  });

  try {
    const result = await publishFacebookPhoto({
      imageUrl: post.featureImage,
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

    return { attempted: true, published: false, error: message };
  }
}
