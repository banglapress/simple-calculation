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
