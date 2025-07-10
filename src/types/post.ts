// src/types/post.ts
export type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featureImage: string;
  status: string;
  placement?: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
  authorId: string | null;
  categories: {
    id: number;
    name: string;
    slug: string;
  }[];
  subcategories: {
    id: number;
    name: string;
    slug: string;
    categoryId: number;
  }[];
  author?: {
    name: string;
  };
};