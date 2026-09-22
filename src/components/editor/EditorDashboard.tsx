// src/components/editor/EditorDashboard.tsx

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

// --------------------
// Define Post type
// --------------------
interface DeskStory {
  id: string;
  titleHint: string;
  status: string;
  sourceCount: number;
  relevanceScore: number | null;
  relevanceReason: string | null;
  warning: string | null;
  sources?: Array<{
    title: string | null;
    url: string;
    feed?: { name: string } | null;
  }>;
}

interface Post {
  id: string;
  title: string;
  status: "DRAFT" | "PENDING" | "PUBLISHED";
  createdAt: string;
  facebookAutoPost?: boolean;
  facebookStatus?: string;
  facebookError?: string | null;
  author?: {
    name: string;
  };
  deskStory?: DeskStory | null;
}

export default function EditorDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const aiPosts = posts.filter((post) => Boolean(post.deskStory));

  const fetchPosts = async () => {
    const res = await axios.get<Post[]>("/api/editor/posts");
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
    <div className="space-y-6">
      <section className="border rounded-xl p-5 bg-white shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-lg font-bold">🤖 AI Newsroom Queue</h2>
            <p className="text-sm text-gray-600">
              RSS → Story → Research → AI Draft → Editor Review
            </p>
          </div>
          <span className="text-sm font-medium">{aiPosts.length}টি AI পোস্ট</span>
        </div>

        {aiPosts.length === 0 ? (
          <p className="text-sm text-gray-500 mt-4">
            এখনো AI-generated story এখানে নেই।
          </p>
        ) : (
          <div className="space-y-3 mt-4">
            {aiPosts.map((post) => (
              <div key={post.id} className="border rounded-lg p-4">
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                    {post.deskStory?.status || "AI"}
                  </span>
                  <span className="bg-gray-100 px-2 py-1 rounded-full">
                    {post.deskStory?.sourceCount || 0} source
                  </span>
                  {post.deskStory?.relevanceScore != null && (
                    <span className="text-purple-700">
                      Relevance {post.deskStory.relevanceScore}/100
                    </span>
                  )}
                </div>

                <h3 className="font-semibold mt-2">{post.title}</h3>

                {post.deskStory?.warning && (
                  <p className="text-xs text-orange-700 mt-1">
                    {post.deskStory.warning}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 mt-3">
                  <Link
                    href={"/dashboard/editor/edit/" + post.id}
                    className="text-blue-600 underline text-sm"
                  >
                    ✏️ Draft Edit করুন
                  </Link>

                  {post.status !== "PUBLISHED" && (
                    <button
                      type="button"
                      onClick={() => publishPost(post.id)}
                      className="text-green-700 underline text-sm"
                    >
                      ✅ Publish
                    </button>
                  )}
                </div>

                {post.facebookAutoPost && (
                  <p className="text-xs text-gray-500 mt-2">
                    Facebook: {post.facebookStatus || "READY"}
                    {post.facebookError ? " · " + post.facebookError : ""}
                  </p>
                )}

                {post.deskStory?.sources?.length ? (
                  <div className="mt-3 space-y-1 text-xs">
                    {post.deskStory.sources.slice(0, 3).map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-blue-600 hover:underline"
                      >
                        {(source.feed?.name ? source.feed.name + " — " : "") +
                          (source.title || source.url)}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">🗂 সব পোস্ট</h2>
        {posts.length === 0 && <p>📭 কোনো পোস্ট নেই</p>}

        {posts.map((post) => (
        <div key={post.id} className="border rounded p-4 bg-white shadow">
          <div className="text-lg font-bold">{post.title}</div>

          <div className="text-sm text-gray-500">
            {post.status} | {post.author?.name || "Unknown"} |{" "}
            {new Date(post.createdAt).toLocaleString("bn-BD")}
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
      </section>
    </div>
  );
}
