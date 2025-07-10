// src/components/reporter/PostEditorForm.tsx

"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import axios from "axios";
import dynamic from "next/dynamic";

const LexicalEditor = dynamic(() => import("@/components/editor/LexicalEditor"), { ssr: false });


interface Subcategory {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  subcategories: Subcategory[];
}

export default function PostEditorForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // Later to be replaced with Lexical
  const [featureImage, setFeatureImage] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subcategoryId, setSubcategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PENDING">("DRAFT");
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios.get<Category[]>("/api/admin/categories").then((res) => {
      setCategories(res.data);
    });
  }, []);

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const selected = categories.find((c) => String(c.id) === id);
    setSubcategories(selected?.subcategories || []);
    setSubcategoryId(""); // Reset subcategory
  };

  const handleImageUpload = async (): Promise<string | null> => {
    if (!featureImage) return null;

    const formData = new FormData();
    formData.append("file", featureImage);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data.url || null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const uploadedUrl = await handleImageUpload();

    try {
      await axios.post("/api/posts", {
        title,
        content,
        categoryId,
        subcategoryId,
        tags,
        status,
        featureImage: uploadedUrl || "",
      });

      setMessage("✅ পোস্ট সংরক্ষিত হয়েছে");
    } catch {
      setMessage("❌ সমস্যা হয়েছে");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-4 rounded shadow"
    >
      <input
        type="text"
        placeholder="শিরোনাম"
        className="w-full border p-2 rounded"
        value={title}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
      />

      <LexicalEditor onChange={setContent} />

      <div>
        <label>📸 ফিচার ছবি:</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFeatureImage(e.target.files?.[0] || null)
          }
        />
      </div>

      <select
        value={categoryId}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          handleCategoryChange(e.target.value)
        }
        className="w-full border p-2"
      >
        <option value="">-- ক্যাটাগরি নির্বাচন করুন --</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      {subcategories.length > 0 && (
        <select
          value={subcategoryId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setSubcategoryId(e.target.value)
          }
          className="w-full border p-2"
        >
          <option value="">-- সাবক্যাটাগরি --</option>
          {subcategories.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
      )}

      <input
        type="text"
        placeholder="ট্যাগ (কমা দিয়ে আলাদা করুন)"
        value={tags}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <div className="flex gap-4">
        <button
          type="submit"
          onClick={() => setStatus("DRAFT")}
          className="bg-gray-600 text-white px-4 py-2 rounded"
        >
          খসড়া সংরক্ষণ
        </button>
        <button
          type="submit"
          onClick={() => setStatus("PENDING")}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          সম্পাদকের জন্য পাঠান
        </button>
      </div>

      {message && <p className="text-green-600">{message}</p>}
    </form>
  );
}
