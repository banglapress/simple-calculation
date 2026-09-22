"use client";

import useSWR from "swr";
import Link from "next/link";
import { useEffect, useState } from "react";

const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch breaking news");
  }

  return res.json();
};

export default function BreakingNews() {
  const { data: news, error } = useSWR("/api/public/breaking", fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 60000,
    revalidateOnFocus: false,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (!news || news.length === 0) return;

    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % news.length);
        setIsFlipping(false);
      }, 500);
    }, 5000);

    return () => clearInterval(interval);
  }, [news]);

  if (error || !news || news.length === 0) return null;

  const currentPost = news[currentIndex];

  return (
    <div className="bg-red-600 text-white text-sm py-2 px-4 flex items-center">
      <span className="font-bold mr-4">🔴 ব্রেকিং:</span>
      <div className="relative h-6 overflow-hidden">
        <div
          className={`transition-all duration-500 ${
            isFlipping
              ? "opacity-0 -translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
        >
          <Link
            href={`/${currentPost.categories?.[0]?.slug}/${currentPost.subcategories?.[0]?.slug}/${currentPost.id}`}
            className="hover:underline whitespace-nowrap"
          >
            {currentPost.title}
          </Link>
        </div>

        {isFlipping && (
          <div className="absolute top-0 transition-all duration-500 opacity-100 translate-y-0">
            <Link
              href={`/${currentPost.categories?.[0]?.slug}/${currentPost.subcategories?.[0]?.slug}/${currentPost.id}`}
              className="hover:underline whitespace-nowrap"
            >
              {currentPost.title}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
