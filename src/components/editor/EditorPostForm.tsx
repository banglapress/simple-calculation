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
  facebookImageUrl?: string | null;
  facebookImagePrompt?: string | null;
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
  const [featureImageBusy, setFeatureImageBusy] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [cardPreviewVersion, setCardPreviewVersion] = useState(() => Date.now());

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
    return post?.featureImage || "";
  };

  const handleFeatureImageChange = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !post) return;

    setFeatureImageBusy(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Feature image upload failed");
      }

      const data = await res.json();
      const url = String(data.url || "").trim();

      if (!url) {
        throw new Error("Cloudinary image URL পাওয়া যায়নি");
      }

      const response = await axios.put("/api/editor/posts/" + postId, {
        title: post.title,
        content: post.content,
        tags: post.tags,
        isBreaking: post.isBreaking,
        authorId: post.authorId,
        status: post.status,
        featureImage: url,
        galleryImages: parseGallery(post.galleryImages),
        placement: post.placement,
        categoryIds: selectedCategories,
        subcategoryIds: selectedSubcategories,
        facebookCaption: post.facebookCaption || "",
        facebookAutoPost: Boolean(post.facebookAutoPost),
      });

      const saved = response.data?.post;

      setPost({
        ...post,
        featureImage: saved?.featureImage || url,
        facebookImageUrl: saved?.facebookImageUrl || url,
        facebookStatus: saved?.facebookStatus || "READY",
        facebookError: null,
      });

      setCardPreviewVersion(Date.now());
      setMessage(
        "✅ ছবি আপলোড হয়েছে। এই ছবিই Article Cover এবং Facebook Card—দুই জায়গায় ব্যবহার হচ্ছে।"
      );
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message ||
              error.response?.data?.error ||
              "Feature Image upload করা যায়নি"
            : error instanceof Error
              ? error.message
              : "Feature Image upload করা যায়নি")
      );
    } finally {
      setFeatureImageBusy(false);
      e.target.value = "";
    }
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

  const publishToFacebook = async () => {
    if (!post) return;

    try {
      setMessage("⏳ Facebook Photo Card তৈরি করে Page-এ প্রকাশ করা হচ্ছে...");
      const response = await axios.post(
        "/api/editor/posts/" + postId + "/facebook"
      );
      setPost({
        ...post,
        facebookStatus: response.data.published ? "PUBLISHED" : "FAILED",
        facebookError: response.data.error || null,
      });

      if (response.data.published) {
        setMessage(
          "✅ Facebook-এ প্রকাশ হয়েছে" +
            (response.data.pageName ? " — " + response.data.pageName : "")
        );
      } else {
        setMessage(
          "❌ Facebook-এ প্রকাশ হয়নি: " +
            (response.data.error || "অজানা সমস্যা")
        );
      }
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.error ||
              error.response?.data?.message ||
              "Facebook publish failed"
            : "Facebook publish failed")
      );
    }
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

      const saveResponse = await axios.put("/api/editor/posts/" + postId, {
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
      if (saveResponse.data?.post) {
        setPost((current) =>
          current
            ? {
                ...current,
                featureImage: saveResponse.data.post.featureImage,
                facebookImageUrl: saveResponse.data.post.facebookImageUrl,
                facebookStatus: saveResponse.data.post.facebookStatus,
                facebookError: saveResponse.data.post.facebookError,
              }
            : current
        );
      }
      setCardPreviewVersion(Date.now());
      const facebookResult = saveResponse.data?.facebook;
      if (facebookResult?.published) {
        setMessage("✅ পোস্ট আপডেট হয়েছে এবং Facebook-এ প্রকাশ হয়েছে");
      } else if (facebookResult?.attempted && facebookResult?.error) {
        setMessage("✅ পোস্ট আপডেট হয়েছে · ❌ Facebook: " + facebookResult.error);
        setPost((current) =>
          current
            ? {
                ...current,
                facebookStatus: "FAILED",
                facebookError: facebookResult.error,
              }
            : current
        );
      } else {
        setMessage("✅ পোস্ট আপডেট হয়েছে");
      }
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
            Article-এর Feature Image-ই Facebook Card-এর মূল ছবি। তাই স্টক/অরিজিনাল ছবি আপলোড
            করলেই একই ছবি দুই জায়গায় ব্যবহার হবে। AI image চাইলে আলাদাভাবে তৈরি করা যাবে।
          </p>
        </div>

        {post.featureImage ? (
          <div className="border rounded-lg bg-white p-4 space-y-3">
            <div>
              <p className="font-semibold">📷 Article Feature Image</p>
              <p className="text-xs text-green-700 mt-1">
                এই ছবিই Article Cover এবং Facebook Card—দুই জায়গায় ব্যবহার হবে।
              </p>
            </div>
            <img
              src={post.featureImage}
              alt="Article Feature Image"
              className="w-full aspect-[4/5] object-cover rounded-lg"
            />
          </div>
        ) : null}

        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="px-3 py-2 text-xs font-medium text-gray-600 border-b flex items-center justify-between gap-2">
            <span>🖼️ Facebook Photo Card</span>
            {post.featureImage ? (
              <button
                type="button"
                onClick={() => setCardPreviewVersion(Date.now())}
                className="border px-3 py-1.5 rounded-lg text-xs bg-white"
              >
                🔄 Card রিফ্রেশ করুন
              </button>
            ) : null}
          </div>

          {post.featureImage ? (
            <img
              src={"/api/facebook/card/" + postId + "?preview=" + cardPreviewVersion}
              alt="Facebook Photo Card"
              className="w-full aspect-[4/5] object-cover"
            />
          ) : (
            <div className="p-6 text-sm text-gray-500">
              আগে Article-এর Feature Image আপলোড/সেট করুন। সেটিই Facebook Card-এর মূল ছবি হিসেবে ব্যবহৃত হবে।
            </div>
          )}
        </div>

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
                setMessage("✅ Facebook caption তৈরি হয়েছে");
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
            Article Publish হলে Facebook-এ auto-post
          </label>

          <span className="text-xs text-gray-600">
            Status: {post.facebookStatus || "NONE"}
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={publishToFacebook}
            disabled={post.status !== "PUBLISHED" || post.facebookStatus === "PUBLISHED"}
            className="bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {post.facebookStatus === "PUBLISHED"
              ? "✅ Facebook-এ প্রকাশিত"
              : "📘 Facebook-এ এখনই প্রকাশ করুন"}
          </button>

          {post.status !== "PUBLISHED" && (
            <span className="text-xs text-orange-700 self-center">
              Manual Facebook publish-এর আগে Article Publish করুন।
            </span>
          )}
        </div>

        {post.facebookError && (
          <p className="text-sm text-red-600">{post.facebookError}</p>
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

      <div className="border rounded-xl p-4 bg-gray-50">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold">📷 Feature Image</p>
            <p className="text-xs text-gray-500 mt-1">
              অরিজিনাল/স্টক ছবি আপলোড করুন। আপলোড হওয়া ছবিই Article Cover ও Facebook Card—দুই জায়গায় যাবে।
            </p>
          </div>
          <label className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm cursor-pointer">
            {featureImageBusy ? "⏳ আপলোড হচ্ছে..." : "🖼️ ছবি পরিবর্তন করুন"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={featureImageBusy}
              onChange={handleFeatureImageChange}
            />
          </label>
        </div>

        {post.featureImage ? (
          <div className="border rounded-lg overflow-hidden bg-white">
            <img
              src={post.featureImage}
              alt="Feature Image"
              className="w-full max-h-[520px] object-contain"
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            এখনো Feature Image দেওয়া হয়নি।
          </p>
        )}
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
