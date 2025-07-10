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
  id: number;
  name: string;
}

interface Post {
  title: string;
  content: string;
  tags?: string;
  authorId: number;
  status: string;
  featureImage?: string;
  placement: string;
    isBreaking?: boolean; // ✅ Add this line
  categories?: Category[];
  subcategories?: Subcategory[];
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
  const [message, setMessage] = useState("");


  useEffect(() => {
    async function fetchData() {
      const [postRes, catRes, reporterRes] = await Promise.all([
        axios.get(`/api/editor/posts/${postId}`),
        axios.get("/api/admin/categories"),
        axios.get("/api/admin/reporters"),
      ]);

      const postData: Post = postRes.data;

      setPost(postData);
      setSelectedCategories(postData.categories?.map((c) => c.id) || []);
      setSelectedSubcategories(postData.subcategories?.map((s) => s.id) || []);
      setCategories(catRes.data);
      setSubcategories(catRes.data.flatMap((c: Category) => c.subcategories));
      setReporters(reporterRes.data);
      setLoading(false);
    }

    fetchData();
  }, [postId]);

  const handleImageUpload = async () => {
    if (!featureImageFile) return post?.featureImage;

    const formData = new FormData();
    formData.append("file", featureImageFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data.url;
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!post) return;

    const uploadedImage = await handleImageUpload();

    await axios.put(`/api/editor/posts/${postId}`, {
      title: post.title,
      content: post.content,
      tags: post.tags,
      isBreaking: post.isBreaking,
      authorId: post.authorId,
      status: post.status,
      featureImage: uploadedImage,
      placement: post.placement,
      categoryIds: selectedCategories,
      subcategoryIds: selectedSubcategories,
    });

    setMessage("✅ পোস্ট আপডেট হয়েছে");
  };

  if (loading || !post) return <p>⏳ লোড হচ্ছে...</p>;

  return (
    <form
      onSubmit={handleUpdate}
      className="space-y-4 bg-white p-4 rounded shadow"
    >
      <input
        type="text"
        value={post.title}
        onChange={(e) => setPost({ ...post, title: e.target.value })}
        className="w-full border p-2 rounded"
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
        className="w-full border p-2 rounded"
        placeholder="ট্যাগ (কমা দিয়ে)"
      />

      <select
        value={post.authorId}
        onChange={(e) =>
          setPost({ ...post, authorId: parseInt(e.target.value) })
        }
        className="w-full border p-2"
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
        className="w-full border p-2"
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
          checked={post.isBreaking}
          onChange={(e) => setPost({ ...post, isBreaking: e.target.checked })}
        />
        🛑 ব্রেকিং নিউজ হিসেবে চিহ্নিত করুন
      </label>

      <select
        value={post.status}
        onChange={(e) => setPost({ ...post, status: e.target.value })}
        className="w-full border p-2"
      >
        <option value="DRAFT">Draft</option>
        <option value="PENDING">Pending</option>
        <option value="PUBLISHED">Published</option>
      </select>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        💾 আপডেট করুন
      </button>

      {message && <p className="text-green-600">{message}</p>}
    </form>
  );
}
