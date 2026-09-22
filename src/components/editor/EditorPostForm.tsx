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

async function loadCardImage(url: string) {
  const image = new window.Image();
  image.crossOrigin = "anonymous";
  image.src = url + (url.includes("?") ? "&" : "?") + "cb=" + Date.now();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Feature image browser-এ load হয়নি।"));
  });

  return image;
}

async function ensureCardFont() {
  try {
    const font = new FontFace(
      "KhelaTVNotoSerif",
      "url(/fonts/NotoSerifBengali.ttf)"
    );
    await font.load();
    document.fonts.add(font);
  } catch {
    // Browser can fall back to a Bengali-capable system font.
  }
}

function wrapCardTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  maxWidth: number,
  maxLines = 3
) {
  const words = title.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? current + " " + word : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }

  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length === maxLines && words.length > 0) {
    const last = lines[maxLines - 1] || "";
    if (last && !title.includes(last + " ")) {
      lines[maxLines - 1] = last.slice(0, Math.max(0, last.length - 1)) + "…";
    }
  }

  return lines;
}

async function buildFacebookCardFile(post: Post) {
  if (!post.featureImage?.trim()) {
    throw new Error("আগে Feature Image যোগ করুন।");
  }

  await ensureCardFont();
  const image = await loadCardImage(post.featureImage);

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas পাওয়া যায়নি।");

  const scale = Math.max(1200 / image.width, 630 / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (1200 - width) / 2;
  const y = (630 - height) / 2;

  ctx.drawImage(image, x, y, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, 630);
  gradient.addColorStop(0, "rgba(0,0,0,0.10)");
  gradient.addColorStop(0.42, "rgba(0,0,0,0.24)");
  gradient.addColorStop(1, "rgba(0,0,0,0.90)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(44, 34, 150, 48, 24);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.font = '700 25px "KhelaTVNotoSerif", "Noto Serif Bengali", sans-serif';
  ctx.fillText("KhelaTV", 64, 66);

  const category =
    post.categories?.[0]?.name ||
    "খেলা";

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  const categoryWidth = Math.min(
    250,
    Math.max(110, ctx.measureText(category).width + 34)
  );
  ctx.beginPath();
  ctx.roundRect(210, 34, categoryWidth, 48, 24);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = '600 22px "KhelaTVNotoSerif", "Noto Serif Bengali", sans-serif';
  ctx.fillText(category, 227, 65);

  ctx.fillStyle = "#ffffff";
  ctx.font = '700 48px "KhelaTVNotoSerif", "Noto Serif Bengali", sans-serif';

  const lines = wrapCardTitle(ctx, post.title, 1080, 3);
  const lineHeight = 58;
  const startY = 630 - 58 - lineHeight * (lines.length - 1) - 34;

  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 10;
  lines.forEach((line, index) => {
    ctx.fillText(line, 48, startY + index * lineHeight);
  });
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(48, 630 - 38, 110, 5);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("PNG তৈরি করা যায়নি")),
      "image/png",
      0.94
    )
  );

  return new File([blob], "facebook-card.png", { type: "image/png" });
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
                  if (!post) return;

                  try {
                    setMessage("⏳ Facebook photo card তৈরি হচ্ছে...");

                    const sourceResponse = await axios.post(
                      "/api/editor/posts/" + postId + "/facebook-source"
                    );

                    const preparedFeatureImage = sourceResponse.data.featureImage;

                    if (preparedFeatureImage !== post.featureImage) {
                      setPost({
                        ...post,
                        featureImage: preparedFeatureImage,
                      });
                    }

                    const cardPost = {
                      ...post,
                      featureImage: preparedFeatureImage,
                    };

                    const file = await buildFacebookCardFile(cardPost);
                    const formData = new FormData();
                    formData.append("file", file);

                    const uploadResponse = await fetch("/api/upload", {
                      method: "POST",
                      body: formData,
                    });

                    if (!uploadResponse.ok) {
                      throw new Error("Facebook card upload failed");
                    }

                    const uploadData = await uploadResponse.json();

                    const saveResponse = await axios.post(
                      "/api/editor/posts/" + postId + "/facebook-image",
                      { facebookImage: uploadData.url }
                    );

                    setPost({
                      ...cardPost,
                      facebookImage: saveResponse.data.facebookImage,
                      facebookStatus: "READY",
                      facebookError: null,
                    });

                    setMessage("✅ Facebook photo card তৈরি ও সংরক্ষণ হয়েছে");
                  } catch (error) {
                    setMessage(
                      "❌ " +
                        (axios.isAxiosError(error)
                          ? error.response?.data?.message ||
                            "Facebook photo card তৈরি করা যায়নি"
                          : error instanceof Error
                            ? error.message
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
