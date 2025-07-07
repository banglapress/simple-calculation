// src/components/editor/EditorDashboard.tsx

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

export default function EditorDashboard() {
  const [posts, setPosts] = useState([]);

  const fetchPosts = async () => {
    const res = await axios.get("/api/editor/posts");
    setPosts(res.data);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const publishPost = async (id: string) => {
    const confirmPublish = confirm("আপনি কি এই পোস্টটি প্রকাশ করতে চান?");
    if (!confirmPublish) return;
    await axios.patch(`/api/editor/posts?id=${id}`, { status: "PUBLISHED" });
    fetchPosts();
  };

  return (
    <div className="space-y-4">
      {posts.length === 0 && <p>📭 কোনো পোস্ট নেই</p>}
      {posts.map((post: any) => (
        <div key={post.id} className="border rounded p-4 bg-white shadow">
          <div className="text-lg font-bold">{post.title}</div>
          <div className="text-sm text-gray-500">
            {post.status} | {post.author?.name || "Unknown"} | {new Date(post.createdAt).toLocaleString("bn-BD")}
          </div>

          <div className="mt-2 flex gap-3">
            <Link
              href={`/dashboard/editor/edit/${post.id}`}
              className="text-blue-600 underline"
            >
              ✏️ এডিট করুন
            </Link>

            {post.status === "PENDING" && (
              <button
                onClick={() => publishPost(post.id)}
                className="text-green-600 underline"
              >
                ✅ প্রকাশ করুন
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
