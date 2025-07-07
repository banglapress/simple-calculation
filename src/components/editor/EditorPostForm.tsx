// src/components/editor/EditorPostForm.tsx

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";

const LexicalEditor = dynamic(() => import("@/components/editor/LexicalEditor"), { ssr: false });

export default function EditorPostForm({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [reporters, setReporters] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([]);
  const [featureImageFile, setFeatureImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchData() {
      const [postRes, catRes, reporterRes] = await Promise.all([
        axios.get(`/api/editor/posts/${postId}`),
        axios.get("/api/admin/categories"),
        axios.get("/api/admin/reporters"),
      ]);

      const postData = postRes.data;

      setPost(postData);
      setSelectedCategories(postData.categories?.map((c: any) => c.id) || []);
      setSelectedSubcategories(postData.subcategories?.map((s: any) => s.id) || []);
      setCategories(catRes.data);
      setSubcategories(catRes.data.flatMap((c: any) => c.subcategories));
      setReporters(reporterRes.data);
      setLoading(false);
    }

    fetchData();
  }, [postId]);

  const handleImageUpload = async () => {
    if (!featureImageFile) return post.featureImage;

    const formData = new FormData();
    formData.append("file", featureImageFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data.url;
  };

  const handleUpdate = async (e: any) => {
    e.preventDefault();
    const uploadedImage = await handleImageUpload();

    await axios.put(`/api/editor/posts/${postId}`, {
      title: post.title,
      content: post.content,
      tags: post.tags,
      authorId: post.authorId,
      status: post.status,
      featureImage: uploadedImage,
      categoryIds: selectedCategories,
      subcategoryIds: selectedSubcategories,
    });

    setMessage("✅ পোস্ট আপডেট হয়েছে");
  };

  if (loading) return <p>⏳ লোড হচ্ছে...</p>;

  return (
    <form onSubmit={handleUpdate} className="space-y-4 bg-white p-4 rounded shadow">
      <input
        type="text"
        value={post.title}
        onChange={(e) => setPost({ ...post, title: e.target.value })}
        className="w-full border p-2 rounded"
        placeholder="শিরোনাম"
      />

      <LexicalEditor initialHtml={post.content} onChange={(val) => setPost({ ...post, content: val })} />

      <input
        type="text"
        value={post.tags || ""}
        onChange={(e) => setPost({ ...post, tags: e.target.value })}
        className="w-full border p-2 rounded"
        placeholder="ট্যাগ (কমা দিয়ে)"
      />

      <select
        value={post.authorId}
        onChange={(e) => setPost({ ...post, authorId: e.target.value })}
        className="w-full border p-2"
      >
        <option value="">-- রিপোর্টার নির্বাচন করুন --</option>
        {reporters.map((rep: any) => (
          <option key={rep.id} value={rep.id}>
            {rep.name}
          </option>
        ))}
      </select>

      <div>
        <p className="text-sm text-gray-500 mb-1">ফিচার ছবি:</p>
        {post.featureImage && (
          <img src={post.featureImage} className="max-w-xs mb-2 rounded shadow" />
        )}
        <input type="file" accept="image/*" onChange={(e) => setFeatureImageFile(e.target.files?.[0] || null)} />
      </div>

      <div>
        <label className="font-medium block mb-1">📂 ক্যাটাগরি:</label>
        {categories.map((cat: any) => (
          <label key={cat.id} className="block text-sm">
            <input
              type="checkbox"
              value={cat.id}
              checked={selectedCategories.includes(cat.id)}
              onChange={(e) => {
                const id = parseInt(e.target.value);
                setSelectedCategories((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
        {subcategories.map((sub: any) => (
          <label key={sub.id} className="block text-sm">
            <input
              type="checkbox"
              value={sub.id}
              checked={selectedSubcategories.includes(sub.id)}
              onChange={(e) => {
                const id = parseInt(e.target.value);
                setSelectedSubcategories((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                );
              }}
              className="mr-2"
            />
            {sub.name}
          </label>
        ))}
      </div>

      <select
        value={post.status}
        onChange={(e) => setPost({ ...post, status: e.target.value })}
        className="w-full border p-2"
      >
        <option value="DRAFT">Draft</option>
        <option value="PENDING">Pending</option>
        <option value="PUBLISHED">Published</option>
      </select>

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        💾 আপডেট করুন
      </button>

      {message && <p className="text-green-600">{message}</p>}
    </form>
  );
}
