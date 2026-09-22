"use client";

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

type FeedStats = {
  total: number;
  included: number;
  excluded: number;
};

export default function AINewsroom() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [includeKeywords, setIncludeKeywords] = useState("");
  const [excludeKeywords, setExcludeKeywords] = useState("");
  const [minRelevance, setMinRelevance] = useState(60);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [activeFeed, setActiveFeed] = useState<Feed | null>(null);
  const [feedStats, setFeedStats] = useState<FeedStats | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState("");
  const [loadingFeed, setLoadingFeed] = useState<number | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [savingRules, setSavingRules] = useState<number | null>(null);

  const load = async () => {
    const [feedsRes, catsRes] = await Promise.all([
      axios.get<Feed[]>("/api/admin/ai/feeds"),
      axios.get<Category[]>("/api/admin/categories"),
    ]);
    setFeeds(feedsRes.data);
    setCategories(catsRes.data);
  };

  useEffect(() => {
    load().catch(() => setMessage("❌ AI Newsroom data লোড করা যায়নি"));
  }, []);

  const addFeed = async () => {
    if (!name.trim() || !url.trim()) {
      setMessage("❌ Source name এবং RSS URL দিন।");
      return;
    }

    try {
      await axios.post("/api/admin/ai/feeds", {
        name,
        url,
        includeKeywords,
        excludeKeywords,
        minRelevance,
      });

      setName("");
      setUrl("");
      setIncludeKeywords("");
      setExcludeKeywords("");
      setMinRelevance(60);
      setMessage("✅ RSS source ও filter rules যোগ হয়েছে");
      await load();
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "RSS source যোগ করা যায়নি"
            : "RSS source যোগ করা যায়নি")
      );
    }
  };

  const updateFeedLocal = (
    id: number,
    patch: Partial<Pick<Feed, "includeKeywords" | "excludeKeywords" | "minRelevance">>
  ) => {
    setFeeds((current) =>
      current.map((feed) => (feed.id === id ? { ...feed, ...patch } : feed))
    );

    if (activeFeed?.id === id) {
      setActiveFeed((current) => (current ? { ...current, ...patch } : current));
    }
  };

  const saveRules = async (feed: Feed) => {
    setSavingRules(feed.id);
    setMessage("");

    try {
      const response = await axios.patch(
        "/api/admin/ai/feeds?id=" + feed.id,
        {
          includeKeywords: feed.includeKeywords || "",
          excludeKeywords: feed.excludeKeywords || "",
          minRelevance: feed.minRelevance,
        }
      );

      updateFeedLocal(feed.id, {
        includeKeywords: response.data.includeKeywords,
        excludeKeywords: response.data.excludeKeywords,
        minRelevance: response.data.minRelevance,
      });

      setMessage("✅ " + feed.name + " এর filter rules সংরক্ষণ হয়েছে");
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "Filter rules save করা যায়নি"
            : "Filter rules save করা যায়নি")
      );
    } finally {
      setSavingRules(null);
    }
  };

  const toggleFeed = async (feed: Feed) => {
    try {
      const response = await axios.patch(
        "/api/admin/ai/feeds?id=" + feed.id,
        { enabled: !feed.enabled }
      );
      updateFeedLocal(feed.id, { enabled: response.data.enabled } as never);
      setMessage(
        response.data.enabled
          ? "✅ " + feed.name + " চালু হয়েছে"
          : "⏸️ " + feed.name + " বন্ধ করা হয়েছে"
      );
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "Feed status বদলানো যায়নি"
            : "Feed status বদলানো যায়নি")
      );
    }
  };

  const fetchFeed = async (feed: Feed) => {
    setLoadingFeed(feed.id);
    setMessage("");

    try {
      const response = await axios.put("/api/admin/ai/feeds", {
        id: feed.id,
      });

      setActiveFeed(response.data.feed);
      setItems(response.data.items || []);
      setFeedStats(response.data.stats || null);

      const stats = response.data.stats;
      setMessage(
        "✅ " +
          feed.name +
          " থেকে " +
          (stats?.total || 0) +
          "টি item এসেছে; filter-এর পরে " +
          (stats?.included || 0) +
          "টি রাখা হয়েছে" +
          (stats?.excluded
            ? " (" + stats.excluded + "টি বাদ)"
            : "")
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
  };

  const createDraft = async (item: FeedItem) => {
    if (!categoryId) {
      setMessage("❌ আগে category নির্বাচন করুন");
      return;
    }

    setDrafting(item.link);
    setMessage("");

    try {
      const response = await axios.post("/api/admin/ai/draft", {
        title: item.title,
        url: item.link,
        description: item.description,
        categoryId: Number(categoryId),
        feedId: activeFeed?.id,
      });

      setMessage(
        "✅ AI draft তৈরি হয়েছে। Relevance " +
          response.data.relevanceScore +
          "/100 — " +
          response.data.post.title +
          "। এখন Editor Panel থেকে edit করুন।"
      );
    } catch (error) {
      const data = axios.isAxiosError(error) ? error.response?.data : null;
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        setMessage(
          "⏭️ AI relevance " +
            data?.relevanceScore +
            "/100 — draft তৈরি করা হয়নি। " +
            (data?.relevanceReason || "")
        );
      } else {
        setMessage(
          "❌ " +
            (axios.isAxiosError(error)
              ? data?.message || "AI draft তৈরি হয়নি"
              : "AI draft তৈরি হয়নি")
        );
      }
    } finally {
      setDrafting(null);
    }
  };

  const deleteFeed = async (id: number) => {
    if (!confirm("এই RSS source মুছে ফেলবেন?")) return;

    await axios.delete("/api/admin/ai/feeds?id=" + id);
    await load();

    if (activeFeed?.id === id) {
      setActiveFeed(null);
      setItems([]);
      setFeedStats(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">🤖 AI Newsroom</h1>
        <p className="text-sm text-gray-600 mt-1">
          RSS → keyword filter → duplicate check → AI relevance → draft।
          Draft প্রথমে DRAFT থাকবে; homepage position Editor সেট করবেন।
        </p>
      </div>

      <section className="border rounded-xl bg-white p-5 space-y-4">
        <h2 className="font-bold">📡 RSS Feed যোগ করুন</h2>

        <div className="grid md:grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Source name, যেমন BBC Sport"
            className="border rounded-lg p-3"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/rss.xml"
            className="border rounded-lg p-3"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <textarea
            value={includeKeywords}
            onChange={(e) => setIncludeKeywords(e.target.value)}
            placeholder={"Include keywords — প্রতি লাইনে একটি\nBangladesh\nCricket\nBPL"}
            className="border rounded-lg p-3 min-h-28"
          />
          <textarea
            value={excludeKeywords}
            onChange={(e) => setExcludeKeywords(e.target.value)}
            placeholder={"Exclude keywords — প্রতি লাইনে একটি\nbetting\nfantasy\nhoroscope"}
            className="border rounded-lg p-3 min-h-28"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">
            Minimum AI relevance:
            <input
              type="number"
              min={0}
              max={100}
              value={minRelevance}
              onChange={(e) =>
                setMinRelevance(
                  Math.min(100, Math.max(0, Number(e.target.value) || 0))
                )
              }
              className="ml-2 w-20 border rounded-lg p-2"
            />
          </label>
          <span className="text-xs text-gray-500">
            60 দিয়ে শুরু করা নিরাপদ। বেশি দিলে শুধু বেশি প্রাসঙ্গিক খবর যাবে।
          </span>
        </div>

        <button
          type="button"
          onClick={addFeed}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + RSS Source ও Filter যোগ করুন
        </button>
      </section>

      <section className="border rounded-xl bg-white p-5">
        <h2 className="font-bold mb-3">আপনার RSS Sources</h2>

        {feeds.length === 0 ? (
          <p className="text-sm text-gray-500">
            এখনও কোনো RSS source যোগ হয়নি।
          </p>
        ) : (
          <div className="space-y-3">
            {feeds.map((feed) => (
              <div key={feed.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{feed.name}</p>
                      <span
                        className={
                          feed.enabled
                            ? "text-xs px-2 py-1 rounded-full bg-green-100 text-green-700"
                            : "text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                        }
                      >
                        {feed.enabled ? "চালু" : "বন্ধ"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 break-all mt-1">
                      {feed.url}
                    </p>
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
                      {loadingFeed === feed.id ? "কল হচ্ছে..." : "📡 RSS কল করুন"}
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

                <div className="grid lg:grid-cols-3 gap-3">
                  <textarea
                    value={feed.includeKeywords || ""}
                    onChange={(e) =>
                      updateFeedLocal(feed.id, {
                        includeKeywords: e.target.value,
                      })
                    }
                    placeholder="Include keywords"
                    className="border rounded-lg p-3 min-h-24 text-sm"
                  />
                  <textarea
                    value={feed.excludeKeywords || ""}
                    onChange={(e) =>
                      updateFeedLocal(feed.id, {
                        excludeKeywords: e.target.value,
                      })
                    }
                    placeholder="Exclude keywords"
                    className="border rounded-lg p-3 min-h-24 text-sm"
                  />
                  <div className="border rounded-lg p-3">
                    <label className="text-sm font-medium">
                      Minimum AI relevance
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={feed.minRelevance}
                      onChange={(e) =>
                        updateFeedLocal(feed.id, {
                          minRelevance: Math.min(
                            100,
                            Math.max(0, Number(e.target.value) || 0)
                          ),
                        })
                      }
                      className="mt-2 w-full border rounded-lg p-2"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Include ফাঁকা থাকলে সব item থাকবে, শুধু exclude বাদ যাবে।
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-3 flex-wrap">
                  <p className="text-xs text-gray-500">
                    Include = যেকোনো keyword মিললে রাখবে · Exclude = মিললে বাদ
                  </p>
                  <button
                    type="button"
                    onClick={() => saveRules(feed)}
                    disabled={savingRules === feed.id}
                    className="bg-slate-800 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"
                  >
                    {savingRules === feed.id
                      ? "সংরক্ষণ হচ্ছে..."
                      : "💾 Filter Rules Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {activeFeed && (
        <section className="border rounded-xl bg-white p-5 space-y-4">
          <div className="flex flex-wrap justify-between gap-3 items-center">
            <div>
              <h2 className="font-bold">
                📰 {activeFeed.name} — Filtered RSS Items
              </h2>
              <p className="text-xs text-gray-500">
                Keyword rules পার হওয়ার পর item এখানে এসেছে। AI draft-এর আগে duplicate check হবে।
              </p>
            </div>

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border p-2 rounded-lg"
            >
              <option value="">-- Draft category --</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {feedStats && (
            <div className="rounded-lg bg-gray-50 border p-3 text-sm">
              RSS item: <strong>{feedStats.total}</strong> · রাখা হয়েছে:{" "}
              <strong>{feedStats.included}</strong> · filter-এ বাদ:{" "}
              <strong>{feedStats.excluded}</strong> · AI threshold:{" "}
              <strong>{activeFeed.minRelevance}/100</strong>
            </div>
          )}

          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.link} className="border rounded-lg p-4">
                <h3 className="font-semibold">{item.title}</h3>

                {item.publishedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.publishedAt).toLocaleString("bn-BD")}
                  </p>
                )}

                {item.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {item.description}
                  </p>
                )}

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
                    onClick={() => createDraft(item)}
                    disabled={drafting === item.link}
                    className="bg-purple-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"
                  >
                    {drafting === item.link
                      ? "🤖 Relevance + Draft..."
                      : "🤖 AI Draft তৈরি করুন"}
                  </button>
                </div>
              </article>
            ))}

            {items.length === 0 && (
              <p className="text-sm text-gray-500">
                Filter-এর পরে কোনো item নেই।
              </p>
            )}
          </div>
        </section>
      )}

      {message && (
        <div className="rounded-lg border bg-white p-4 text-sm whitespace-pre-line">
          {message}
        </div>
      )}
    </div>
  );
}
