import Link from "next/link";
import Image from "next/image";

interface Post {
  id: string;
  title: string;
  featureImage: string;
  excerpt?: string | null;
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
        sizes="(max-width: 768px) 100vw, 58vw"
        className="w-full h-[400px] object-cover hover:scale-105 transition-transform"
        priority
      />
      <div className="p-4">
        <h1 className="text-3xl font-[Cholontika] text-gray-800 mb-2">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="text-gray-600 text-sm font-[NotoSerifBengali]">
            {post.excerpt}...
          </p>
        )}
      </div>
    </Link>
  );
}
