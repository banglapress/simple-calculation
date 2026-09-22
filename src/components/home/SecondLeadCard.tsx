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

export default function SecondLeadCard({ post }: { post: Post }) {
  const cat = post.categories[0]?.slug || "category";
  const sub = post.subcategories[0]?.slug;
  const href = sub ? `/${cat}/${sub}/${post.id}` : `/${cat}/${post.id}`;

  return (
    <Link
      href={href}
      className="block rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
    >
      <Image
        src={post.featureImage}
        alt={post.title}
        width={500}
        height={350}
        sizes="(max-width: 768px) 100vw, 40vw"
        className="w-full h-[350px] object-cover hover:scale-105 transition-transform"
      />
      <div className="p-3">
        <h2 className="text-2xl font-[Cholontika] text-gray-800 mb-1">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-gray-600 text-sm font-[NotoSerifBengali]">
            {post.excerpt}...
          </p>
        )}
      </div>
    </Link>
  );
}
