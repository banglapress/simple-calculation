import Link from "next/link";
import { getBreakingNews } from "@/lib/public-data";

export default async function BreakingNews() {
  const news = await getBreakingNews();

  if (!news.length) return null;

  return (
    <div className="bg-red-600 text-white text-sm py-2 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <span className="font-bold shrink-0">🔴 ব্রেকিং:</span>
        <div className="min-w-0 truncate">
          <Link
            href={
              news[0].subcategories?.[0]?.slug
                ? `/${news[0].categories?.[0]?.slug}/${news[0].subcategories[0].slug}/${news[0].id}`
                : `/${news[0].categories?.[0]?.slug}/${news[0].id}`
            }
            className="hover:underline"
          >
            {news[0].title}
          </Link>
        </div>
      </div>
    </div>
  );
}
