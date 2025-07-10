// src/components/layout/BreakingNews.tsx
"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState, useEffect } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BreakingNews() {
  const { data: news, error } = useSWR("/api/public/breaking", fetcher, {
    refreshInterval: 15000, // refresh every 15s
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
      }, 500); // Half of the flip duration
    }, 5000); // Change every 5 seconds

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
            isFlipping ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
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
          <div
            className={`absolute top-0 transition-all duration-500 ${
              isFlipping ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
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