"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type Feed = {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
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

export default function AINewsroom() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [activeFeed, setActiveFeed] = useState<Feed | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState("");
  const [loadingFeed, setLoadingFeed] = useState<number | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);

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
    if (!name.trim() || !url.trim()) return;

    try {
      await axios.post("/api/admin/ai/feeds", { name, url });
      setName("");
      setUrl("");
      setMessage("✅ RSS source যোগ হয়েছে");
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

  const fetchFeed = async (feed: Feed) => {
    setLoadingFeed(feed.id);
    setMessage("");

    try {
      const response = await axios.put("/api/admin/ai/feeds", {
        id: feed.id,
      });
      setActiveFeed(feed);
      setItems(response.data.items || []);
      setMessage(
        "✅ " + feed.name + " থেকে " + (response.data.items?.length || 0) + "টি item পাওয়া গেছে"
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
      });

      setMessage(
        "✅ AI draft তৈরি হয়েছে: " +
          response.data.post.title +
          " — এখন Editor Panel থেকে edit করুন।"
      );
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message || "AI draft তৈরি হয়নি"
            : "AI draft তৈরি হয়নি")
      );
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
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">🤖 AI Newsroom</h1>
        <p className="text-sm text-gray-600 mt-1">
          RSS feed আনুন, item নির্বাচন করুন, Gemini দিয়ে draft বানান।
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
        <button
          type="button"
          onClick={addFeed}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + RSS Source যোগ করুন
        </button>
      </section>

      <section className="border rounded-xl bg-white p-5">
        <h2 className="font-bold mb-3">আপনার RSS Sources</h2>
        {feeds.length === 0 ? (
          <p className="text-sm text-gray-500">এখনও কোনো RSS source যোগ হয়নি।</p>
        ) : (
          <div className="space-y-2">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{feed.name}</p>
                  <p className="text-xs text-gray-500 break-all">{feed.url}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fetchFeed(feed)}
                    disabled={loadingFeed === feed.id}
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
            ))}
          </div>
        )}
      </section>

      {activeFeed && (
        <section className="border rounded-xl bg-white p-5 space-y-4">
          <div className="flex flex-wrap justify-between gap-3 items-center">
            <div>
              <h2 className="font-bold">
                📰 {activeFeed.name} — RSS Items
              </h2>
              <p className="text-xs text-gray-500">
                একটি item থেকে AI draft করতে category নির্বাচন করুন।
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
                      ? "🤖 Draft তৈরি হচ্ছে..."
                      : "🤖 AI Draft তৈরি করুন"}
                  </button>
                </div>
              </article>
            ))}

            {items.length === 0 && (
              <p className="text-sm text-gray-500">
                এই feed থেকে item পাওয়া যায়নি।
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
