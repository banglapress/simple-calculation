import { prisma } from "@/lib/prisma";
import { fetchRSSFeed, filterRSSItems } from "@/lib/rss";
import { generateSportsArticle } from "@/lib/ai";
import { generateSportsResearch } from "@/lib/ai-research";
import { buildFacebookCaption } from "@/lib/facebook";

type RSSItem = {
  title: string;
  link: string;
  description: string;
  publishedAt: string | null;
  imageUrl: string | null;
};

function normalizeTitle(value: string) {
  return value
    .toLocaleLowerCase("bn-BD")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return new Set(
    normalizeTitle(value)
      .split(" ")
      .filter((token) => token.length >= 3)
  );
}

function titleSimilarity(a: string, b: string) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / Math.max(left.size, right.size);
}

async function logJob(input: {
  storyId?: string;
  stage: string;
  status: string;
  payload?: unknown;
  error?: string | null;
}) {
  await prisma.deskJob.create({
    data: {
      storyId: input.storyId,
      stage: input.stage,
      status: input.status,
      payload:
        input.payload === undefined
          ? undefined
          : JSON.parse(JSON.stringify(input.payload)),
      error: input.error || null,
      finishedAt: input.status === "running" ? null : new Date(),
    },
  });
}

async function findStoryForItem(item: RSSItem) {
  const recent = await prisma.deskStory.findMany({
    where: {
      status: {
        in: ["NEW", "RESEARCHING", "DRAFT", "REVIEW", "APPROVED"],
      },
      createdAt: {
        gte: new Date(Date.now() - 72 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      titleHint: true,
      categoryId: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });

  const normalized = normalizeTitle(item.title);
  let best: (typeof recent)[number] | null = null;
  let bestScore = 0;

  for (const story of recent) {
    const score = titleSimilarity(normalized, story.titleHint);
    if (score > bestScore) {
      bestScore = score;
      best = story;
    }
  }

  return bestScore >= 0.58 ? best : null;
}

async function queueItem(feed: {
  id: number;
  name: string;
  categoryId: number | null;
}, item: RSSItem) {
  const existingSource = await prisma.deskStorySource.findFirst({
    where: { url: item.link },
    select: { id: true, storyId: true },
  });

  if (existingSource) {
    return { storyId: existingSource.storyId, inserted: false, duplicate: true };
  }

  let story = await findStoryForItem(item);

  if (!story) {
    story = await prisma.deskStory.create({
      data: {
        titleHint: item.title,
        categoryId: feed.categoryId,
        status: "NEW",
        sourceCount: 0,
      },
      select: {
        id: true,
        titleHint: true,
        categoryId: true,
      },
    });
  } else if (!story.categoryId && feed.categoryId) {
    await prisma.deskStory.update({
      where: { id: story.id },
      data: { categoryId: feed.categoryId },
    });
  }

  const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;

  await prisma.deskStorySource.create({
    data: {
      storyId: story.id,
      feedId: feed.id,
      url: item.link,
      canonicalUrl: item.link,
      title: item.title,
      excerpt: item.description || null,
      rawText: item.description || null,
      imageUrl: item.imageUrl || null,
      publishedAt:
        publishedAt && !Number.isNaN(publishedAt.getTime())
          ? publishedAt
          : null,
      origin: "rss",
    },
  });

  const sourceCount = await prisma.deskStorySource.count({
    where: { storyId: story.id },
  });

  await prisma.deskStory.update({
    where: { id: story.id },
    data: {
      sourceCount,
      updatedAt: new Date(),
      warning: sourceCount < 2
        ? "একটি source পাওয়া গেছে। প্রকাশের আগে তথ্য যাচাই করুন।"
        : null,
    },
  });

  return { storyId: story.id, inserted: true, duplicate: false };
}

async function processStory(storyId: string) {
  const story = await prisma.deskStory.findUnique({
    where: { id: storyId },
    include: {
      category: true,
      sources: {
        include: {
          feed: true,
        },
        orderBy: { createdAt: "asc" },
      },
      post: true,
    },
  });

  if (!story) throw new Error("Story not found");

  await prisma.deskStory.update({
    where: { id: storyId },
    data: {
      status: "RESEARCHING",
      autoProcessingStartedAt: new Date(),
      autoAttempts: { increment: 1 },
      lastError: null,
      warning: null,
    },
  });

  const category = story.category;
  const categoryName = category?.name || "Sports";

  const sourcePackets = story.sources.map((source) => ({
    name: source.feed?.name || "RSS source",
    title: source.title,
    url: source.url,
    excerpt: source.excerpt,
    rawText: source.rawText,
  }));

  if (!sourcePackets.length) {
    await prisma.deskStory.update({
      where: { id: storyId },
      data: {
        status: "REVIEW",
        autoProcessingStartedAt: null,
        warning: "কোনো source পাওয়া যায়নি।",
      },
    });
    return { storyId, step: "review", reason: "no_source" };
  }

  try {
    const research = await generateSportsResearch({
      title: story.titleHint,
      categoryName,
      sources: sourcePackets,
    });

    const thresholdValues = story.sources
      .map((row) => row.feed?.minRelevance)
      .filter((value): value is number => typeof value === "number");
    const threshold = thresholdValues.length
      ? Math.min(...thresholdValues)
      : 60;

    await prisma.deskStory.update({
      where: { id: storyId },
      data: {
        researchStatus: "ready",
        researchPacket: research,
        relevanceScore: research.relevanceScore,
        relevanceReason: research.relevanceReason,
        articleWarnings: research.warnings,
        warning:
          research.relevanceScore < threshold
            ? "AI relevance threshold পূরণ হয়নি।"
            : research.warnings[0] || null,
      },
    });

    await logJob({
      storyId,
      stage: "research",
      status: research.relevanceScore < threshold ? "review" : "ok",
      payload: {
        score: research.relevanceScore,
        threshold,
        provider: "gemini",
        model: research.model,
      },
    });

    if (research.relevanceScore < threshold) {
      await prisma.deskStory.update({
        where: { id: storyId },
        data: {
          status: "REVIEW",
          autoProcessingStartedAt: null,
        },
      });
      return {
        storyId,
        step: "review",
        reason: "low_relevance",
        relevanceScore: research.relevanceScore,
        threshold,
      };
    }

    const sourceText = [
      "RESEARCH DOSSIER",
      JSON.stringify(research, null, 2),
      "",
      ...story.sources.map(
        (source, index) =>
          "[SOURCE " +
          (index + 1) +
          "] " +
          source.title +
          "\n" +
          String(source.rawText || source.excerpt || "").slice(0, 4500)
      ),
    ].join("\n\n");

    const article = await generateSportsArticle({
      title: story.titleHint,
      categoryName,
      sourceText,
      sourceUrls: story.sources.slice(0, 3).map((source) => source.url),
    });

    const publicCategorySlug = category?.slug || "news";
    const postUrl =
      "https://www.khelatv.com/" +
      publicCategorySlug +
      "/POST_ID_PENDING";
    const caption = buildFacebookCaption({
      title: article.title || story.titleHint,
      excerpt: article.excerpt,
      url: postUrl,
      tags: article.tags.join(","),
    });

    const post = story.post
      ? await prisma.post.update({
          where: { id: story.post.id },
          data: {
            title: article.title || story.titleHint,
            content: article.body_html || "",
            excerpt: article.excerpt || "",
            tags: article.tags.join(", "),
            sourceUrl: story.sources[0]?.url || null,
            status: "DRAFT",
            facebookCaption: caption,
            facebookAutoPost: true,
            facebookStatus: story.sources[0]?.imageUrl ? "READY" : "NONE",
            facebookError: null,
          },
        })
      : await prisma.post.create({
          data: {
            title: article.title || story.titleHint,
            content: article.body_html || "",
            excerpt: article.excerpt || "",
            featureImage: story.sources[0]?.imageUrl || "",
            sourceUrl: story.sources[0]?.url || null,
            tags: article.tags.join(", "),
            status: "DRAFT",
            placement: "NONE",
            isBreaking: false,
            facebookCaption: caption,
            facebookAutoPost: true,
            facebookStatus: "READY",
            ...(category
              ? {
                  categories: {
                    connect: [{ id: category.id }],
                  },
                }
              : {}),
          },
        });

    const finalCaption = buildFacebookCaption({
      title: post.title,
      excerpt: post.excerpt,
      url:
        "https://www.khelatv.com/" +
        publicCategorySlug +
        "/" +
        post.id,
      tags: post.tags,
    });

    const finalPost = await prisma.post.update({
      where: { id: post.id },
      data: {
        facebookCaption: finalCaption,
        facebookStatus: "READY",
      },
    });

    await prisma.deskStory.update({
      where: { id: storyId },
      data: {
        postId: finalPost.id,
        status: "DRAFT",
        articleStatus: "ready",
        articleWarnings: article.warnings,
        autoProcessingStartedAt: null,
        autoNextAttemptAt: null,
        autoFailureStage: null,
        lastError: null,
        warning:
          story.sources.length < 2
            ? "একটি source থেকে AI draft তৈরি হয়েছে। Editor review বাধ্যতামূলক।"
            : "AI draft তৈরি হয়েছে। Editor review বাধ্যতামূলক।",
      },
    });

    await logJob({
      storyId,
      stage: "article",
      status: "ok",
      payload: {
        postId: finalPost.id,
        sourceCount: story.sources.length,
        model: article.model,
        relevanceScore: research.relevanceScore,
      },
    });

    return {
      storyId,
      postId: finalPost.id,
      step: "draft",
      relevanceScore: research.relevanceScore,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI newsroom processing failed";

    await prisma.deskStory.update({
      where: { id: storyId },
      data: {
        status: "NEW",
        autoProcessingStartedAt: null,
        autoFailureStage: "processing",
        lastError: message,
        warning: "AI processing ব্যর্থ হয়েছে। আবার Run করলে retry হবে।",
      },
    });

    await logJob({
      storyId,
      stage: "processing",
      status: "failed",
      error: message,
    });

    return { storyId, step: "error", error: message };
  }
}

export async function ingestFeed(feedId?: number) {
  const where = feedId
    ? { id: feedId, enabled: true }
    : { enabled: true };

  const feeds = await prisma.newsFeed.findMany({
    where,
    orderBy: { id: "asc" },
    include: { category: true },
  });

  const results: Array<Record<string, unknown>> = [];

  for (const feed of feeds) {
    try {
      const rawItems = await fetchRSSFeed(feed.url);
      const filtered = filterRSSItems(
        rawItems,
        feed.includeKeywords,
        feed.excludeKeywords
      );

      let inserted = 0;
      let duplicates = 0;

      for (const item of filtered.items.slice(0, 30)) {
        const result = await queueItem(feed, item);
        if (result.inserted) inserted += 1;
        if (result.duplicate) duplicates += 1;
      }

      await logJob({
        stage: "ingest",
        status: "ok",
        payload: {
          feedId: feed.id,
          feedName: feed.name,
          fetched: rawItems.length,
          included: filtered.items.length,
          inserted,
          duplicates,
          excluded: filtered.excluded,
        },
      });

      results.push({
        feedId: feed.id,
        feedName: feed.name,
        fetched: rawItems.length,
        included: filtered.items.length,
        inserted,
        duplicates,
        excluded: filtered.excluded,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "RSS ingest failed";

      await logJob({
        stage: "ingest",
        status: "failed",
        error: message,
        payload: { feedId: feed.id, feedName: feed.name },
      });

      results.push({
        feedId: feed.id,
        feedName: feed.name,
        error: message,
      });
    }
  }

  return results;
}

export async function processDeskQueue(limit = 4, storyId?: string) {
  if (storyId) {
    return [await processStory(storyId)];
  }

  const stories = await prisma.deskStory.findMany({
    where: {
      status: "NEW",
      OR: [
        { autoNextAttemptAt: null },
        { autoNextAttemptAt: { lte: new Date() } },
      ],
    },
    orderBy: { updatedAt: "asc" },
    take: Math.min(Math.max(limit, 1), 8),
    select: { id: true },
  });

  const results: Array<Record<string, unknown>> = [];
  for (const story of stories) {
    results.push(await processStory(story.id));
  }
  return results;
}

export async function runNewsroom(limit = 4) {
  const ingest = await ingestFeed();
  const processed = await processDeskQueue(limit);

  return {
    ingest,
    processed,
    draftCount: processed.filter((row) => row.step === "draft").length,
    reviewCount: processed.filter((row) => row.step === "review").length,
    errorCount: processed.filter((row) => row.step === "error").length,
  };
}

export async function processOneStory(storyId: string) {
  await ingestFeed();
  return processStory(storyId);
}
