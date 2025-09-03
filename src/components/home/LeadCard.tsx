import Link from "next/link";
import Image from "next/image";

interface Post {
  id: string;
  title: string;
  featureImage: string;
  content?: string;
  categories: { slug: string }[];
  subcategories: { slug: string }[];
}

export default function LeadCard({ post }: { post: Post }) {
  const cat = post.categories[0]?.slug || "category";
  const sub = post.subcategories[0]?.slug;
  const href = sub ? `/${cat}/${sub}/${post.id}` : `/${cat}/${post.id}`;

  return (
    <Link href={href} className="block rounded-xl overflow-hidden shadow-lg">
      <Image
        src={post.featureImage}
        alt={post.title}
        width={800}
        height={500}
        className="w-full h-[400px] object-cover hover:scale-105 transition-transform"
        priority
      />
      <div className="p-4">
        <h1 className="text-3xl font-bold font-[Cholontika] text-gray-800 mb-2">
          {post.title}
        </h1>
        {post.content && (
          <p className="text-gray-600 text-sm font-[NotoSerifBengali]">
            {post.content.replace(/<[^>]+>/g, "").slice(0, 160)}...
          </p>
        )}
      </div>
    </Link>
  );
}
