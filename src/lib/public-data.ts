import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const HOME_REVALIDATE_SECONDS = 60;
const CATEGORY_REVALIDATE_SECONDS = 3600;

type HomeCategorySlug =
  | "football"
  | "cricket"
  | "hockey"
  | "athletics"
  | "othersports"
  | "sports-tech"
  | "sports-culture";

const publicPostCardSelect = {
  id: true,
  title: true,
  featureImage: true,
  content: true,
  placement: true,
  categories: { select: { slug: true } },
  subcategories: { select: { slug: true } },
} as const;

const getCachedCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
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
      orderBy: { id: "asc" },
    }),
  ["public-categories"],
  {
    revalidate: CATEGORY_REVALIDATE_SECONDS,
  }
);

export function getPublicCategories() {
  return getCachedCategories();
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

function getCachedHomeCategoryPosts(slug: string) {
  return unstable_cache(
    async () =>
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          categories: { some: { slug } },
        },
        orderBy: { updatedAt: "desc" },
        take: 4,
        select: publicPostCardSelect,
      }),
    ["home-category-posts", slug],
    {
      revalidate: HOME_REVALIDATE_SECONDS,
    }
  )();
}

export function getHomeCategoryPosts(slug: HomeCategorySlug) {
  return getCachedHomeCategoryPosts(slug);
}

const publicPostSelect = {
  id: true,
  title: true,
  content: true,
  featureImage: true,
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

function getCachedPlacementSidebarPosts() {
  return unstable_cache(
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
}

export function getPlacementSidebarPosts() {
  return getCachedPlacementSidebarPosts();
}
