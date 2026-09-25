import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const HOME_REVALIDATE_SECONDS = 60;
const CATEGORY_REVALIDATE_SECONDS = 3600;

const HOME_CATEGORY_SLUGS = [
  "football",
  "cricket",
  "hockey",
  "athletics",
  "othersports",
  "sports-tech",
  "sports-culture",
] as const;

type HomeCategorySlug = (typeof HOME_CATEGORY_SLUGS)[number];

const publicPostCardSelect = {
  id: true,
  title: true,
  featureImage: true,
  excerpt: true,
  placement: true,
  categories: { select: { slug: true, name: true } },
  subcategories: { select: { slug: true, name: true } },
} as const;

const getCachedCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        showInNav: true,
        navOrder: true,
        subcategories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: [{ navOrder: "asc" }, { id: "asc" }],
    }),
  ["public-categories"],
  {
    revalidate: CATEGORY_REVALIDATE_SECONDS,
    tags: ["public-categories"],
  }
);

export function getPublicCategories() {
  return getCachedCategories();
}

export function invalidatePublicCategoriesCache() {
  revalidateTag("public-categories");
  revalidateTag("public-category-v2");
}

const getCachedCategoryPage = (slug: string) =>
  unstable_cache(
    async () =>
      prisma.category.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          subcategories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
            orderBy: { id: "asc" },
          },
        },
      }),
    ["public-category-v2", slug],
    {
      revalidate: CATEGORY_REVALIDATE_SECONDS,
      tags: ["public-category-v2"],
    }
  )();

export function getPublicCategoryBySlug(slug: string) {
  return getCachedCategoryPage(slug);
}

const getCachedCategoryPosts = (slug: string) =>
  unstable_cache(
    async () =>
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { categories: { some: { slug } } },
            { subcategories: { some: { category: { slug } } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: publicPostCardSelect,
      }),
    ["public-category-posts", slug],
    { revalidate: HOME_REVALIDATE_SECONDS }
  )();

export function getPublicCategoryPosts(slug: string) {
  return getCachedCategoryPosts(slug);
}

const getCachedSubcategoryPage = (categorySlug: string, subcategorySlug: string) =>
  unstable_cache(
    async () =>
      prisma.subcategory.findFirst({
        where: {
          slug: subcategorySlug,
          category: { slug: categorySlug },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
    ["public-subcategory", categorySlug, subcategorySlug],
    { revalidate: CATEGORY_REVALIDATE_SECONDS }
  )();

export function getPublicSubcategoryBySlug(
  categorySlug: string,
  subcategorySlug: string
) {
  return getCachedSubcategoryPage(categorySlug, subcategorySlug);
}

const getCachedSubcategoryPosts = (
  categorySlug: string,
  subcategorySlug: string
) =>
  unstable_cache(
    async () =>
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          subcategories: {
            some: {
              slug: subcategorySlug,
              category: { slug: categorySlug },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: publicPostCardSelect,
      }),
    ["public-subcategory-posts", categorySlug, subcategorySlug],
    { revalidate: HOME_REVALIDATE_SECONDS }
  )();

export function getPublicSubcategoryPosts(
  categorySlug: string,
  subcategorySlug: string
) {
  return getCachedSubcategoryPosts(categorySlug, subcategorySlug);
}

const getCachedHomePlacementPosts = unstable_cache(
  async () =>
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        placement: {
          in: ["LEAD", "SECOND_LEAD", "EDITORS_PICK", "TRENDING"],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: publicPostCardSelect,
    }),
  ["home-placement-posts"],
  {
    revalidate: HOME_REVALIDATE_SECONDS,
  }
);

export function getHomePlacementPosts() {
  return getCachedHomePlacementPosts();
}

const getCachedHomeCategoryPosts = unstable_cache(
  async () =>
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        categories: {
          some: {
            slug: { in: [...HOME_CATEGORY_SLUGS] },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: publicPostCardSelect,
    }),
  ["home-category-posts-all"],
  {
    revalidate: HOME_REVALIDATE_SECONDS,
  }
);

export async function getHomeCategoryPosts() {
  const posts = await getCachedHomeCategoryPosts();
  const grouped = Object.fromEntries(
    HOME_CATEGORY_SLUGS.map((slug) => [slug, [] as typeof posts])
  ) as Record<HomeCategorySlug, typeof posts>;

  for (const post of posts) {
    for (const category of post.categories) {
      if (!(category.slug in grouped)) continue;
      if (grouped[category.slug as HomeCategorySlug].length >= 4) continue;
      grouped[category.slug as HomeCategorySlug].push(post);
    }
  }

  return grouped;
}

const publicPostSelect = {
  id: true,
  title: true,
  content: true,
  featureImage: true,
  galleryImages: true,
  tags: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true,
    },
  },
  categories: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  subcategories: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

function getCachedPublicPost(id: string) {
  return unstable_cache(
    async () =>
      prisma.post.findUnique({
        where: { id },
        select: publicPostSelect,
      }),
    ["public-post", id],
    {
      revalidate: HOME_REVALIDATE_SECONDS,
    }
  )();
}

export function getPublicPostById(id: string) {
  return getCachedPublicPost(id);
}

const getCachedPlacementSidebarPosts = unstable_cache(
  async () =>
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        placement: { in: ["EDITORS_PICK", "TRENDING"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        featureImage: true,
        placement: true,
        categories: { select: { slug: true } },
        subcategories: { select: { slug: true } },
      },
    }),
  ["public-placement-sidebar-posts"],
  {
    revalidate: HOME_REVALIDATE_SECONDS,
  }
);

export function getPlacementSidebarPosts() {
  return getCachedPlacementSidebarPosts();
}

const getCachedBreakingNews = unstable_cache(
  async () =>
    prisma.post.findMany({
      where: { isBreaking: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        categories: { select: { slug: true } },
        subcategories: { select: { slug: true } },
      },
    }),
  ["public-breaking-news"],
  {
    revalidate: HOME_REVALIDATE_SECONDS,
  }
);

export function getBreakingNews() {
  return getCachedBreakingNews();
}

const getCachedLiveScore = unstable_cache(
  async () =>
    prisma.liveScore.findUnique({
      where: { id: "default" },
    }),
  ["public-live-score"],
  {
    revalidate: 15,
  }
);

export function getLiveScore() {
  return getCachedLiveScore();
}

function getCachedRelatedPosts(categoryId: number, postId: string) {
  return unstable_cache(
    async () =>
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          categories: { some: { id: categoryId } },
          id: { not: postId },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          featureImage: true,
          categories: { select: { slug: true } },
          subcategories: { select: { slug: true } },
        },
      }),
    ["public-related-posts", String(categoryId), postId],
    {
      revalidate: HOME_REVALIDATE_SECONDS,
    }
  )();
}

export function getRelatedPosts(categoryId: number, postId: string) {
  return getCachedRelatedPosts(categoryId, postId);
}
