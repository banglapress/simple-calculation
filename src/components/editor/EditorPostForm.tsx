// src/components/editor/EditorPostForm.tsx

"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import Image from "next/image";

const LexicalEditor = dynamic(
  () => import("@/components/editor/LexicalEditor"),
  { ssr: false }
);

interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: number;
  name: string;
  slug: string;
}

interface Reporter {
  id: string;
  name: string;
}

interface Post {
  title: string;
  content: string;
  tags?: string;
  authorId?: string;
  status: string;
  featureImage?: string;
  galleryImages?: string | null;
  placement: string;
  isBreaking?: boolean;
  facebookCaption?: string | null;
  facebookImage?: string | null;
  facebookAutoPost?: boolean;
  facebookStatus?: string;
  facebookError?: string | null;
  deskStory?: {
    id: string;
    titleHint: string;
    status: string;
    sourceCount: number;
    relevanceScore: number | null;
    relevanceReason: string | null;
    warning: string | null;
    sources: Array<{
      title: string;
      url: string;
      feed?: { name: string } | null;
    }>;
  } | null;
  categories?: Category[];
  subcategories?: Subcategory[];
}

function parseGallery(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default function EditorPostForm({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>(
    []
  );
  const [featureImageFile, setFeatureImageFile] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [postRes, catRes, reporterRes] = await Promise.all([
        axios.get("/api/editor/posts/" + postId),
        axios.get("/api/admin/categories"),
        axios.get("/api/admin/reporters"),
      ]);

      const postData: Post = postRes.data;

      setPost(postData);
      setGalleryImages(parseGallery(postData.galleryImages));
      setSelectedCategories(postData.categories?.map((c) => c.id) || []);
      setSelectedSubcategories(postData.subcategories?.map((s) => s.id) || []);
      setCategories(catRes.data);
      setSubcategories(
        catRes.data.flatMap((c: Category) => c.subcategories)
      );
      setReporters(reporterRes.data);
      setLoading(false);
    }

    fetchData().catch((error) => {
      console.error(error);
      setMessage("❌ পোস্টের তথ্য লোড করা যায়নি");
      setLoading(false);
    });
  }, [postId]);

  const handleImageUpload = async () => {
    if (!featureImageFile) return post?.featureImage || "";

    const formData = new FormData();
    formData.append("file", featureImageFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Feature image upload failed");

    const data = await res.json();
    return data.url || "";
  };

  const handleGalleryUpload = async () => {
    if (!galleryFiles.length) return galleryImages;

    const uploaded = await Promise.all(
      galleryFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Gallery image upload failed");

        const data = await res.json();
        return data.url as string;
      })
    );

    return [...galleryImages, ...uploaded].slice(0, 20);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index)
    );
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!post) return;

    setSaving(true);
    setMessage("");

    try {
      const [uploadedImage, uploadedGallery] = await Promise.all([
        handleImageUpload(),
        handleGalleryUpload(),
      ]);

      await axios.put("/api/editor/posts/" + postId, {
        title: post.title,
        content: post.content,
        tags: post.tags,
        isBreaking: post.isBreaking,
        authorId: post.authorId,
        status: post.status,
        featureImage: uploadedImage,
        galleryImages: uploadedGallery,
        placement: post.placement,
        categoryIds: selectedCategories,
        subcategoryIds: selectedSubcategories,
        facebookCaption: post.facebookCaption || "",
        facebookAutoPost: Boolean(post.facebookAutoPost),
      });

      setGalleryImages(uploadedGallery);
      setGalleryFiles([]);
      setMessage("✅ পোস্ট আপডেট হয়েছে");
    } catch (error) {
      const responseMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setMessage("❌ " + (responseMessage || "পোস্ট আপডেট করা যায়নি"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !post) return <p>⏳ লোড হচ্ছে...</p>;

  return (
    <form
      onSubmit={handleUpdate}
      className="space-y-5 bg-white p-5 rounded-xl shadow-sm border"
    >
      <input
        type="text"
        value={post.title}
        onChange={(e) => setPost({ ...post, title: e.target.value })}
        className="w-full border p-3 rounded-lg"
        placeholder="শিরোনাম"
      />

      <LexicalEditor
        initialHtml={post.content}
        onChange={(val) => setPost({ ...post, content: val })}
      />

      <input
        type="text"
        value={post.tags || ""}
        onChange={(e) => setPost({ ...post, tags: e.target.value })}
        className="w-full border p-3 rounded-lg"
        placeholder="ট্যাগ (কমা দিয়ে)"
      />

      {post.deskStory && (
        <div className="border rounded-xl p-4 bg-purple-50 space-y-3">
          <div>
            <p className="font-semibold">🤖 AI Newsroom Research</p>
            <p className="text-xs text-gray-600 mt-1">
              Story: {post.deskStory.titleHint} · {post.deskStory.sourceCount} source · Relevance{" "}
              {post.deskStory.relevanceScore ?? "—"}/100
            </p>
          </div>

          {post.deskStory.warning && (
            <p className="text-sm text-orange-700">{post.deskStory.warning}</p>
          )}

          {post.deskStory.sources?.length > 0 && (
            <div className="space-y-1 text-xs">
              {post.deskStory.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-blue-700 underline"
                >
                  {(source.feed?.name ? source.feed.name + " — " : "") +
                    (source.title || source.url)}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border rounded-xl p-4 bg-blue-50 space-y-4">
        <div>
          <p className="font-semibold">📘 Facebook Publishing</p>
          <p className="text-xs text-gray-600 mt-1">
            Website-এর feature image আলাদা থাকবে। Facebook-এর জন্য KhelaTV-branded 1200×630 photo card তৈরি করা হবে।
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <textarea
              value={post.facebookCaption || ""}
              onChange={(e) =>
                setPost({ ...post, facebookCaption: e.target.value })
              }
              className="w-full min-h-28 border p-3 rounded-lg bg-white"
              placeholder="Facebook caption"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await axios.post(
                      "/api/editor/posts/" + postId + "/facebook-caption"
                    );
                    setPost({ ...post, facebookCaption: response.data.caption });
                  } catch (error) {
                    setMessage(
                      "❌ " +
                        (axios.isAxiosError(error)
                          ? error.response?.data?.message ||
                            "Facebook caption তৈরি করা যায়নি"
                          : "Facebook caption তৈরি করা যায়নি")
                    );
                  }
                }}
                className="border bg-white px-3 py-2 rounded-lg text-sm"
              >
                ✨ Caption তৈরি করুন
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    setMessage("⏳ Facebook photo card তৈরি হচ্ছে...");
                    const response = await axios.post(
                      "/api/editor/posts/" + postId + "/facebook-card"
                    );
                    setPost({
                      ...post,
                      facebookImage: response.data.facebookImage,
                      facebookStatus: response.data.facebookStatus,
                      facebookError: null,
                    });
                    setMessage("✅ Facebook photo card তৈরি হয়েছে");
                  } catch (error) {
                    setMessage(
                      "❌ " +
                        (axios.isAxiosError(error)
                          ? error.response?.data?.message ||
                            "Facebook photo card তৈরি করা যায়নি"
                          : "Facebook photo card তৈরি করা যায়নি")
                    );
                  }
                }}
                className="bg-white border px-3 py-2 rounded-lg text-sm"
              >
                🖼️ Photo Card তৈরি করুন
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await axios.post(
                      "/api/editor/posts/" + postId + "/facebook-publish"
                    );
                    if (response.data.published) {
                      setPost({
                        ...post,
                        facebookStatus: "PUBLISHED",
                        facebookError: null,
                      });
                      setMessage("✅ Facebook Page-এ পোস্ট হয়েছে");
                    } else {
                      setPost({
                        ...post,
                        facebookStatus: "FAILED",
                        facebookError:
                          response.data.error || "Facebook publish হয়নি",
                      });
                      setMessage(
                        "❌ " + (response.data.error || "Facebook publish হয়নি")
                      );
                    }
                  } catch (error) {
                    setMessage(
                      "❌ " +
                        (axios.isAxiosError(error)
                          ? error.response?.data?.message ||
                            "Facebook publish করা যায়নি"
                          : "Facebook publish করা যায়নি")
                    );
                  }
                }}
                disabled={post.status !== "PUBLISHED" || !post.facebookImage}
                className="bg-blue-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm"
              >
                📤 Facebook-এ এখনই Publish
              </button>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(post.facebookAutoPost)}
                  onChange={(e) =>
                    setPost({ ...post, facebookAutoPost: e.target.checked })
                  }
                />
                Website publish হলে Facebook-এ auto-post
              </label>
            </div>

            <p className="text-xs text-gray-600">
              Status: {post.facebookStatus || "NONE"}
              {post.status !== "PUBLISHED"
                ? " · Facebook-এ manual publish করতে আগে Website article Published করুন"
                : ""}
            </p>
          </div>

          <div className="border rounded-lg bg-white p-3">
            <p className="text-sm font-medium mb-2">Facebook Photo Card</p>
            {post.facebookImage ? (
              <Image
                src={post.facebookImage}
                alt="Facebook Photo Card"
                width={600}
                height={315}
                className="w-full rounded-lg shadow"
              />
            ) : (
              <div className="aspect-[1200/630] flex items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500 text-center p-4">
                Photo card এখনও তৈরি হয়নি।<br />
                আগে Feature Image যোগ করে “Photo Card তৈরি করুন” চাপুন।
              </div>
            )}
          </div>
        </div>

        {post.facebookError && (
          <p className="text-xs text-red-600">{post.facebookError}</p>
        )}
      </div>
          <button
            type="button"
            onClick={async () => {
              try {
                const response = await axios.post(
                  "/api/editor/posts/" + postId + "/facebook-caption"
                );
                setPost({ ...post, facebookCaption: response.data.caption });
              } catch (error) {
                setMessage(
                  "❌ " +
                    (axios.isAxiosError(error)
                      ? error.response?.data?.message ||
                        "Facebook caption তৈরি করা যায়নি"
                      : "Facebook caption তৈরি করা যায়নি")
                );
              }
            }}
            className="border bg-white px-3 py-2 rounded-lg text-sm"
          >
            ✨ Caption তৈরি করুন
          </button>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(post.facebookAutoPost)}
              onChange={(e) =>
                setPost({ ...post, facebookAutoPost: e.target.checked })
              }
            />
            Publish হলে Facebook-এ auto-post
          </label>

          <span className="text-xs text-gray-600">
            Status: {post.facebookStatus || "NONE"}
          </span>
        </div>

        {post.facebookError && (
          <p className="text-xs text-red-600">{post.facebookError}</p>
        )}
      </div>

      <select
        value={post.authorId || ""}
        onChange={(e) => setPost({ ...post, authorId: e.target.value })}
        className="w-full border p-3"
      >
        <option value="">-- রিপোর্টার নির্বাচন করুন --</option>
        {reporters.map((rep) => (
          <option key={rep.id} value={rep.id}>
            {rep.name}
          </option>
        ))}
      </select>

      <div>
        <p className="text-sm text-gray-500 mb-1">ফিচার ছবি:</p>
        {post.featureImage && (
          <Image
            src={post.featureImage}
            alt="Feature Image"
            width={300}
            height={200}
            className="mb-2 rounded shadow"
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFeatureImageFile(e.target.files?.[0] || null)
          }
        />
      </div>

      <div className="border rounded-xl p-4 bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <div>
            <p className="font-semibold">🖼️ পোস্টের ভেতরের একাধিক ছবি</p>
            <p className="text-xs text-gray-500">
              সর্বোচ্চ ২০টি ছবি যোগ করতে পারবেন। এগুলো article-এর ভেতরের
              &quot;আরও ছবি&quot; অংশে দেখাবে।
            </p>
          </div>
          <span className="text-xs text-gray-500">
            {galleryImages.length}/20
          </span>
        </div>

        {galleryImages.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            {galleryImages.map((src, index) => (
              <div key={src + index} className="relative border rounded-lg p-1 bg-white">
                <Image
                  src={src}
                  alt={"Gallery " + (index + 1)}
                  width={300}
                  height={200}
                  className="w-full aspect-video object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(index)}
                  className="absolute top-2 right-2 bg-black/70 text-white rounded px-2 py-1 text-xs"
                >
                  ✕ মুছুন
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setGalleryFiles(Array.from(e.target.files || []).slice(0, 20))
          }
        />

        {galleryFiles.length > 0 && (
          <p className="text-xs text-blue-700 mt-2">
            নতুন {galleryFiles.length}টি ছবি save করার সময় upload হবে।
          </p>
        )}
      </div>

      <div>
        <label className="font-medium block mb-1">📂 ক্যাটাগরি:</label>
        {categories.map((cat) => (
          <label key={cat.id} className="block text-sm">
            <input
              type="checkbox"
              value={cat.id}
              checked={selectedCategories.includes(cat.id)}
              onChange={(e) => {
                const id = parseInt(e.target.value);
                setSelectedCategories((prev) =>
                  prev.includes(id)
                    ? prev.filter((x) => x !== id)
                    : [...prev, id]
                );
              }}
              className="mr-2"
            />
            {cat.name}
          </label>
        ))}
      </div>

      <div>
        <label className="font-medium block mb-1">🧩 সাবক্যাটাগরি:</label>
        {subcategories.map((sub) => (
          <label key={sub.id} className="block text-sm">
            <input
              type="checkbox"
              value={sub.id}
              checked={selectedSubcategories.includes(sub.id)}
              onChange={(e) => {
                const id = parseInt(e.target.value);
                setSelectedSubcategories((prev) =>
                  prev.includes(id)
                    ? prev.filter((x) => x !== id)
                    : [...prev, id]
                );
              }}
              className="mr-2"
            />
            {sub.name}
          </label>
        ))}
      </div>

      <select
        value={post.placement || "NONE"}
        onChange={(e) => setPost({ ...post, placement: e.target.value })}
        className="w-full border p-3"
      >
        <option value="NONE">🟤 সাধারণ</option>
        <option value="LEAD">🔴 লিড</option>
        <option value="SECOND_LEAD">🟠 সেকেন্ড লিড</option>
        <option value="EDITORS_PICK">⭐ সম্পাদকের পছন্দ</option>
        <option value="TRENDING">🔥 ট্রেন্ডিং</option>
      </select>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(post.isBreaking)}
          onChange={(e) => setPost({ ...post, isBreaking: e.target.checked })}
        />
        🛑 ব্রেকিং নিউজ হিসেবে চিহ্নিত করুন
      </label>

      <select
        value={post.status}
        onChange={(e) => setPost({ ...post, status: e.target.value })}
        className="w-full border p-3"
      >
        <option value="DRAFT">Draft</option>
        <option value="PENDING">Pending</option>
        <option value="PUBLISHED">Published</option>
      </select>

      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg"
      >
        {saving ? "💾 সংরক্ষণ হচ্ছে..." : "💾 আপডেট করুন"}
      </button>

      {message && <p className="text-green-600">{message}</p>}
    </form>
  );
}
