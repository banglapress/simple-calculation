"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";

type Feed = {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  includeKeywords: string | null;
  excludeKeywords: string | null;
  minRelevance: number;
  categoryId: number | null;
  category?: { id: number; name: string; slug: string } | null;
};

type FeedItem = {
  title: string;
  link: string;
  description: string;
  publishedAt: string | null;
};

type Category = {
  id: number;
  name: string;
};

type Story = {
  id: string;
  titleHint: string;
  status: string;
  sourceCount: number;
  relevanceScore: number | null;
  relevanceReason: string | null;
  warning: string | null;
  lastError: string | null;
  category?: { id: number; name: string; slug: string } | null;
  post?: {
    id: string;
    title: string;
    status: string;
    facebookStatus: string;
  } | null;
  sources?: Array<{
    title: string;
    url: string;
    feed?: { name: string } | null;
  }>;
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "নতুন",
  RESEARCHING: "Researching",
  DRAFT: "Draft",
  REVIEW: "Editor Review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};

export default function AINewsroom() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [includeKeywords, setIncludeKeywords] = useState("");
  const [excludeKeywords, setExcludeKeywords] = useState("");
  const [minRelevance, setMinRelevance] = useState(60);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [activeFeedId, setActiveFeedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState<number | null>(null);
  const [savingRules, setSavingRules] = useState<number | null>(null);
  const [processingStory, setProcessingStory] = useState<string | null>(null);

  async function load() {
    const [feedRes, catRes, storyRes] = await Promise.all([
      axios.get<Feed[]>("/api/admin/ai/feeds"),
      axios.get<Category[]>("/api/admin/categories"),
      axios.get<Story[]>("/api/admin/ai/stories"),
    ]);
    setFeeds(feedRes.data);
    setCategories(catRes.data);
    setStories(storyRes.data);
  }

  useEffect(() => {
    load().catch(() => setMessage("❌ AI Newsroom data লোড করা যায়নি"));
  }, []);

  async function addFeed() {
    if (!name.trim() || !url.trim()) {
      setMessage("❌ Source name এবং RSS URL দিন।");
      return;
    }

    try {
      await axios.post("/api/admin/ai/feeds", {
        name,
        url,
        categoryId: categoryId ? Number(categoryId) : null,
        includeKeywords,
        excludeKeywords,
        minRelevance,
      });
      setName("");
      setUrl("");
      setCategoryId("");
      setIncludeKeywords("");
      setExcludeKeywords("");
      setMinRelevance(60);
      setMessage("✅ RSS source ও newsroom rules যোগ হয়েছে");
      await load();
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "RSS source যোগ করা যায়নি"
            : "RSS source যোগ করা যায়নি")
      );
    }
  }

  async function saveRules(feed: Feed) {
    setSavingRules(feed.id);
    try {
      await axios.patch("/api/admin/ai/feeds?id=" + feed.id, {
        categoryId: feed.categoryId,
        includeKeywords: feed.includeKeywords || "",
        excludeKeywords: feed.excludeKeywords || "",
        minRelevance: feed.minRelevance,
      });
      setMessage("✅ " + feed.name + " rules সংরক্ষণ হয়েছে");
      await load();
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "Rules save করা যায়নি"
            : "Rules save করা যায়নি")
      );
    } finally {
      setSavingRules(null);
    }
  }

  function patchFeed(
    id: number,
    patch: Partial<Pick<Feed, "categoryId" | "includeKeywords" | "excludeKeywords" | "minRelevance">>
  ) {
    setFeeds((current) =>
      current.map((feed) => (feed.id === id ? { ...feed, ...patch } : feed))
    );
  }

  async function runNewsroom() {
    setRunning(true);
    setMessage("");

    try {
      const response = await axios.post("/api/admin/ai/run", { limit: 4 });
      setMessage(
        "✅ Newsroom run শেষ। " +
          response.data.draftCount +
          "টি draft, " +
          response.data.reviewCount +
          "টি review, " +
          response.data.errorCount +
          "টি error।"
      );
      await load();
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "Newsroom run failed"
            : "Newsroom run failed")
      );
    } finally {
      setRunning(false);
    }
  }

  async function fetchFeed(feed: Feed) {
    setLoadingFeed(feed.id);
    setActiveFeedId(feed.id);
    setItems([]);
    try {
      const response = await axios.put("/api/admin/ai/feeds", { id: feed.id });
      setItems(response.data.items || []);
      const stats = response.data.stats;
      setMessage(
        "✅ " +
          feed.name +
          ": " +
          stats.included +
          "টি item রাখা হয়েছে, " +
          stats.excluded +
          "টি filter হয়েছে।"
      );
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "RSS fetch failed"
            : "RSS fetch failed")
      );
    } finally {
      setLoadingFeed(null);
    }
  }

  async function createDraft(item: FeedItem, feed: Feed) {
    if (!feed.categoryId) {
      setMessage("❌ আগে এই RSS source-এর category সেট করুন।");
      return;
    }

    try {
      const response = await axios.post("/api/admin/ai/draft", {
        title: item.title,
        url: item.link,
        description: item.description,
        categoryId: feed.categoryId,
        feedId: feed.id,
      });

      setMessage(
        "✅ Story → Research → AI Draft সম্পন্ন। " +
          (response.data.post?.title || "") +
          " এখন Editor Panel-এর AI queue-তে আছে।"
      );
      await load();
    } catch (error) {
      const data = axios.isAxiosError(error) ? error.response?.data : null;
      setMessage(
        "❌ " +
          (data?.message || "AI draft তৈরি হয়নি") +
          (data?.relevanceScore
            ? " Relevance: " + data.relevanceScore + "/100"
            : "")
      );
      await load();
    }
  }

  async function processStory(story: Story) {
    setProcessingStory(story.id);
    try {
      const response = await axios.post("/api/admin/ai/stories/" + story.id + "/run");
      setMessage(
        response.data.step === "draft"
          ? "✅ Story-এর draft তৈরি হয়েছে। Editor queue-তে পাওয়া যাবে।"
          : "⏭️ Story status: " + (response.data.step || "review")
      );
      await load();
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "Story process failed"
            : "Story process failed")
      );
    } finally {
      setProcessingStory(null);
    }
  }

  async function deleteFeed(id: number) {
    if (!confirm("এই RSS source মুছে ফেলবেন?")) return;
    await axios.delete("/api/admin/ai/feeds?id=" + id);
    await load();
  }

  async function toggleFeed(feed: Feed) {
    await axios.patch("/api/admin/ai/feeds?id=" + feed.id, {
      enabled: !feed.enabled,
    });
    await load();
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap justify-between gap-3 items-start">
        <div>
          <h1 className="text-2xl font-bold">🤖 KhelaTV AI Newsroom</h1>
          <p className="text-sm text-gray-600 mt-1">
            RSS → Filter → Story Cluster → Research → AI Draft → Editor Queue → Facebook
          </p>
        </div>
        <button
          type="button"
          onClick={runNewsroom}
          disabled={running}
          className="bg-purple-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-medium"
        >
          {running ? "⏳ Newsroom চলছে..." : "▶️ Run Newsroom Now"}
        </button>
      </div>

      <section className="border rounded-xl bg-white p-5 space-y-4">
        <h2 className="font-bold">📡 RSS Source যোগ করুন</h2>

        <div className="grid md:grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="যেমন ESPNcricinfo"
            className="border rounded-lg p-3"
          />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/rss.xml"
            className="border rounded-lg p-3"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="border rounded-lg p-3"
          >
            <option value="">-- Default category --</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <textarea
            value={includeKeywords}
            onChange={(event) => setIncludeKeywords(event.target.value)}
            placeholder={"Include keywords\nBangladesh\nCricket\nBPL"}
            className="border rounded-lg p-3 min-h-24"
          />

          <textarea
            value={excludeKeywords}
            onChange={(event) => setExcludeKeywords(event.target.value)}
            placeholder={"Exclude keywords\nbetting\nfantasy\nhoroscope"}
            className="border rounded-lg p-3 min-h-24"
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm">
            Minimum AI relevance
            <input
              type="number"
              min={0}
              max={100}
              value={minRelevance}
              onChange={(event) =>
                setMinRelevance(
                  Math.min(100, Math.max(0, Number(event.target.value) || 0))
                )
              }
              className="ml-2 w-20 border rounded-lg p-2"
            />
          </label>
          <span className="text-xs text-gray-500">
            সাধারণ sports feed-এর জন্য 60 দিয়ে শুরু করুন।
          </span>
        </div>

        <button
          type="button"
          onClick={addFeed}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + Source যোগ করুন
        </button>
      </section>

      <section className="border rounded-xl bg-white p-5">
        <h2 className="font-bold mb-4">📚 Sources & Rules</h2>

        <div className="space-y-4">
          {feeds.map((feed) => (
            <div key={feed.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{feed.name}</p>
                  <p className="text-xs text-gray-500 break-all">{feed.url}</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleFeed(feed)}
                    className="border px-3 py-2 rounded-lg text-sm"
                  >
                    {feed.enabled ? "⏸️ বন্ধ" : "▶️ চালু"}
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchFeed(feed)}
                    disabled={loadingFeed === feed.id || !feed.enabled}
                    className="bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"
                  >
                    {loadingFeed === feed.id ? "কল হচ্ছে..." : "📡 Preview RSS"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFeed(feed.id)}
                    className="text-red-600 border px-3 py-2 rounded-lg text-sm"
                  >
                    মুছুন
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-4 gap-3">
                <select
                  value={feed.categoryId ? String(feed.categoryId) : ""}
                  onChange={(event) =>
                    patchFeed(feed.id, {
                      categoryId: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  className="border rounded-lg p-3"
                >
                  <option value="">-- Category --</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <textarea
                  value={feed.includeKeywords || ""}
                  onChange={(event) =>
                    patchFeed(feed.id, { includeKeywords: event.target.value })
                  }
                  placeholder="Include keywords"
                  className="border rounded-lg p-3 min-h-24 text-sm"
                />

                <textarea
                  value={feed.excludeKeywords || ""}
                  onChange={(event) =>
                    patchFeed(feed.id, { excludeKeywords: event.target.value })
                  }
                  placeholder="Exclude keywords"
                  className="border rounded-lg p-3 min-h-24 text-sm"
                />

                <div className="border rounded-lg p-3">
                  <label className="text-sm font-medium">Minimum relevance</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={feed.minRelevance}
                    onChange={(event) =>
                      patchFeed(feed.id, {
                        minRelevance: Math.min(
                          100,
                          Math.max(0, Number(event.target.value) || 0)
                        ),
                      })
                    }
                    className="mt-2 w-full border rounded-lg p-2"
                  />
                  <button
                    type="button"
                    onClick={() => saveRules(feed)}
                    disabled={savingRules === feed.id}
                    className="mt-2 w-full bg-slate-800 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"
                  >
                    {savingRules === feed.id ? "সংরক্ষণ..." : "💾 Rules Save"}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {feeds.length === 0 && (
            <p className="text-sm text-gray-500">কোনো RSS source যোগ করা হয়নি।</p>
          )}
        </div>
      </section>

      {activeFeedId && (
        <section className="border rounded-xl bg-white p-5">
          <h2 className="font-bold mb-3">📰 Filtered RSS Preview</h2>
          <div className="space-y-3">
            {items.map((item) => {
              const feed = feeds.find((row) => row.id === activeFeedId);
              if (!feed) return null;
              return (
                <article key={item.link} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.description ? (
                    <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                  ) : null}
                  <div className="flex gap-3 mt-3">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline text-sm"
                    >
                      Source
                    </a>
                    <button
                      type="button"
                      onClick={() => createDraft(item, feed)}
                      className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      🤖 Story → AI Draft
                    </button>
                  </div>
                </article>
              );
            })}

            {!items.length && (
              <p className="text-sm text-gray-500">
                Preview করতে কোনো source-এর RSS Preview চাপুন।
              </p>
            )}
          </div>
        </section>
      )}

      <section className="border rounded-xl bg-white p-5">
        <div className="flex flex-wrap justify-between gap-3 items-center mb-4">
          <div>
            <h2 className="font-bold">🧠 Story Monitor</h2>
            <p className="text-xs text-gray-500">
              Connect-style story queue: source → research → draft → editor review.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="border px-3 py-2 rounded-lg text-sm"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="space-y-3">
          {stories.map((story) => (
            <div key={story.id} className="border rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {STATUS_LABELS[story.status] || story.status}
                </span>
                <span className="text-xs text-gray-500">
                  {story.sourceCount} source
                </span>
                {story.relevanceScore !== null && (
                  <span className="text-xs text-purple-700">
                    AI {story.relevanceScore}/100
                  </span>
                )}
                {story.post?.facebookStatus === "PUBLISHED" && (
                  <span className="text-xs text-blue-700">FB published</span>
                )}
              </div>

              <h3 className="font-semibold mt-2">{story.titleHint}</h3>

              {story.warning && (
                <p className="text-xs text-orange-700 mt-1">{story.warning}</p>
              )}
              {story.lastError && (
                <p className="text-xs text-red-600 mt-1">{story.lastError}</p>
              )}

              <div className="flex flex-wrap gap-3 mt-3">
                {story.post?.id && (
                  <Link
                    href={"/dashboard/editor/edit/" + story.post.id}
                    className="text-blue-600 underline text-sm"
                  >
                    ✏️ Editor Draft
                  </Link>
                )}
                {["NEW", "REVIEW"].includes(story.status) && (
                  <button
                    type="button"
                    onClick={() => processStory(story)}
                    disabled={processingStory === story.id}
                    className="border px-3 py-2 rounded-lg text-sm"
                  >
                    {processingStory === story.id
                      ? "প্রসেস হচ্ছে..."
                      : "🤖 Process Story"}
                  </button>
                )}
              </div>
            </div>
          ))}

          {!stories.length && (
            <p className="text-sm text-gray-500">
              এখনো কোনো story queue হয়নি। Run Newsroom Now চাপুন।
            </p>
          )}
        </div>
      </section>

      {message && (
        <div className="rounded-lg border bg-white p-4 text-sm whitespace-pre-line">
          {message}
        </div>
      )}
    </div>
  );
}
