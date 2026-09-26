// src/components/editor/EditorDashboard.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";

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
  categories?: Array<{
    name: string;
    slug: string;
  }>;
  deskStory?: DeskStory | null;
}

type Tab = "PENDING" | "DRAFT" | "PUBLISHED" | "ALL" | "AI";

const tabLabels: Record<Tab, string> = {
  PENDING: "⏳ পেন্ডিং",
  DRAFT: "📝 খসড়া",
  PUBLISHED: "✅ প্রকাশিত",
  ALL: "🗂 সব পোস্ট",
  AI: "🤖 AI নিউজ",
};

export default function EditorDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("PENDING");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await axios.get<Post[]>("/api/editor/posts");
      setPosts(Array.isArray(res.data) ? res.data : []);
      setMessage("");
    } catch (error) {
      setMessage(
        axios.isAxiosError(error)
          ? error.response?.data?.message || "পোস্ট লোড করা যায়নি"
          : "পোস্ট লোড করা যায়নি"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const counts = useMemo(
    () => ({
      PENDING: posts.filter((post) => post.status === "PENDING").length,
      DRAFT: posts.filter((post) => post.status === "DRAFT").length,
      PUBLISHED: posts.filter((post) => post.status === "PUBLISHED").length,
      ALL: posts.length,
      AI: posts.filter((post) => Boolean(post.deskStory)).length,
    }),
    [posts]
  );

  const visiblePosts = useMemo(() => {
    const filtered =
      activeTab === "ALL"
        ? posts
        : activeTab === "AI"
        ? posts.filter((post) => Boolean(post.deskStory))
        : posts.filter((post) => post.status === activeTab);

    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [activeTab, posts]);

  const publishPost = async (id: string) => {
    const confirmPublish = confirm("আপনি কি এই পোস্টটি প্রকাশ করতে চান?");
    if (!confirmPublish) return;

    try {
      const response = await axios.patch(`/api/editor/posts?id=${id}`, {
        status: "PUBLISHED",
      });

      if (response.data?.facebook?.published) {
        alert("✅ Article প্রকাশিত এবং Facebook-এও প্রকাশ হয়েছে");
      } else if (
        response.data?.facebook?.attempted &&
        response.data?.facebook?.error
      ) {
        alert(
          "✅ Article প্রকাশিত হয়েছে।\n❌ Facebook: " +
            response.data.facebook.error
        );
      }

      await fetchPosts();
    } catch (error) {
      alert(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "Publish failed"
            : "Publish failed")
      );
    }
  };

  const deletePost = async (id: string, title: string) => {
    const confirmed = confirm(
      `আপনি কি এই পোস্টটি স্থায়ীভাবে মুছে ফেলতে চান?\\n\\n"${title}"\\n\\nএই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।`
    );
    if (!confirmed) return;

    try {
      await axios.delete("/api/editor/posts/" + id);
      alert("✅ পোস্টটি মুছে ফেলা হয়েছে");
      await fetchPosts();
    } catch (error) {
      alert(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "পোস্ট মুছে ফেলা যায়নি"
            : "পোস্ট মুছে ফেলা যায়নি")
      );
    }
  };

  const publishFacebook = async (id: string) => {
    try {
      const response = await axios.post(
        "/api/editor/posts/" + id + "/facebook"
      );

      if (response.data?.published) {
        alert("✅ Facebook-এ প্রকাশ হয়েছে");
      } else {
        alert(
          "❌ Facebook-এ প্রকাশ হয়নি: " +
            (response.data?.error || "অজানা সমস্যা")
        );
      }

      await fetchPosts();
    } catch (error) {
      alert(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.error ||
              error.response?.data?.message ||
              "Facebook publish failed"
            : "Facebook publish failed")
      );
    }
  };

  return (
    <div className="space-y-5">
      <section className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">🧾 সম্পাদকীয় নিউজ ডেস্ক</h2>
              <p className="text-sm text-gray-500 mt-1">
                রিপোর্টারের পাঠানো খবর আগে পেন্ডিং ট্যাবে, প্রকাশিত খবর আলাদা ট্যাবে থাকবে।
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPosts}
              disabled={loading}
              className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "লোড হচ্ছে..." : "↻ রিফ্রেশ"}
            </button>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="flex flex-wrap gap-2 border-b">
            {(Object.keys(tabLabels) as Tab[]).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={
                    "px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition " +
                    (active
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100")
                  }
                >
                  {tabLabels[tab]}
                  <span className="ml-2 text-xs opacity-80">
                    {counts[tab]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {message && (
          <div className="m-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
            {message}
          </div>
        )}

        <div className="p-4">
          {loading ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              পোস্ট লোড হচ্ছে...
            </p>
          ) : visiblePosts.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="space-y-3">
              {visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPublish={publishPost}
                  onPublishFacebook={publishFacebook}
                  onDelete={deletePost}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PostCard({
  post,
  onPublish,
  onPublishFacebook,
}: {
  post: Post;
  onPublish: (id: string) => void;
  onPublishFacebook: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <article className="border rounded-xl bg-white p-4 hover:border-slate-300 transition">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <StatusBadge status={post.status} />
            {post.deskStory && (
              <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full text-xs">
                🤖 AI
              </span>
            )}
            {post.facebookStatus === "PUBLISHED" && (
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                📘 Facebook
              </span>
            )}
          </div>

          <h3 className="font-semibold text-lg leading-7">{post.title}</h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-2">
            <span>
              👤 {post.author?.name || "অজানা রিপোর্টার"}
            </span>
            <span>🕒 {new Date(post.createdAt).toLocaleString("bn-BD")}</span>
            {post.categories?.map((category) => (
              <span key={category.slug} className="bg-gray-100 px-2 py-1 rounded-full">
                {category.name}
              </span>
            ))}
          </div>

          {post.deskStory?.warning && (
            <p className="text-xs text-orange-700 mt-2">
              ⚠️ {post.deskStory.warning}
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

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={"/dashboard/editor/edit/" + post.id}
            className="rounded-lg border px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
          >
            ✏️ এডিট
          </Link>

          <button
            type="button"
            onClick={() => onDelete(post.id, post.title)}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            🗑️ ডিলিট
          </button>

          {post.status === "PENDING" && (
            <button
              type="button"
              onClick={() => onPublish(post.id)}
              className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
            >
              ✅ প্রকাশ
            </button>
          )}

          {post.status === "PUBLISHED" &&
            post.facebookStatus !== "PUBLISHED" && (
              <button
                type="button"
                onClick={() => onPublishFacebook(post.id)}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                📘 Facebook
              </button>
            )}
        </div>
      </div>

      {post.facebookAutoPost && (
        <p className="text-xs text-gray-500 mt-3 pt-3 border-t">
          Facebook: {post.facebookStatus || "READY"}
          {post.facebookError ? " · " + post.facebookError : ""}
        </p>
      )}
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: "DRAFT" | "PENDING" | "PUBLISHED";
}) {
  const config = {
    DRAFT: "bg-gray-100 text-gray-700",
    PENDING: "bg-amber-100 text-amber-800",
    PUBLISHED: "bg-green-100 text-green-800",
  } as const;

  const labels = {
    DRAFT: "📝 খসড়া",
    PENDING: "⏳ পেন্ডিং",
    PUBLISHED: "✅ প্রকাশিত",
  } as const;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config[status]}`}>
      {labels[status]}
    </span>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const text = {
    PENDING: "এখনো কোনো পেন্ডিং নিউজ নেই।",
    DRAFT: "এখনো কোনো খসড়া নেই।",
    PUBLISHED: "এখনো কোনো প্রকাশিত পোস্ট নেই।",
    ALL: "কোনো পোস্ট পাওয়া যায়নি।",
    AI: "এখনো কোনো AI পোস্ট নেই।",
  } as const;

  return (
    <div className="py-12 text-center text-sm text-gray-500">
      {text[tab]}
    </div>
  );
}
