// src/types/index.ts
export type Category = {
  id: number;
  name: string;
  slug: string;
};

export type Subcategory = {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
};

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
  categories: Category[];
  subcategories: Subcategory[];
  author?: {
    name: string;
  };
};