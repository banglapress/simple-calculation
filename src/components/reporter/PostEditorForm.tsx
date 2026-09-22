// src/components/reporter/PostEditorForm.tsx

"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import axios from "axios";
import dynamic from "next/dynamic";

const LexicalEditor = dynamic(
  () => import("@/components/editor/LexicalEditor"),
  { ssr: false }
);

interface Subcategory {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  subcategories: Subcategory[];
}

type SubmissionStatus = "DRAFT" | "PENDING";

export default function PostEditorForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [featureImage, setFeatureImage] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subcategoryId, setSubcategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [message, setMessage] = useState("");
  const [submittingStatus, setSubmittingStatus] =
    useState<SubmissionStatus | null>(null);

  useEffect(() => {
    axios
      .get<Category[]>("/api/admin/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setMessage("❌ ক্যাটাগরি লোড করা যায়নি"));
  }, []);

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const selected = categories.find((c) => String(c.id) === id);
    setSubcategories(selected?.subcategories || []);
    setSubcategoryId("");
  };

  const handleImageUpload = async (): Promise<string | null> => {
    if (!featureImage) return null;

    const formData = new FormData();
    formData.append("file", featureImage);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Image upload failed");

    const data = await res.json();
    return data.url || null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const submissionStatus = formData.get("submissionStatus");

    if (
      submissionStatus !== "DRAFT" &&
      submissionStatus !== "PENDING"
    ) {
      setMessage("❌ পোস্টের status নির্বাচন করা যায়নি।");
      return;
    }

    setSubmittingStatus(submissionStatus);
    setMessage("");

    try {
      const uploadedUrl = await handleImageUpload();

      await axios.post("/api/posts", {
        title,
        content,
        categoryIds: categoryId ? [Number(categoryId)] : [],
        subcategoryIds: subcategoryId ? [Number(subcategoryId)] : [],
        tags,
        status: submissionStatus,
        featureImage: uploadedUrl || "",
      });

      setMessage(
        submissionStatus === "DRAFT"
          ? "✅ পোস্ট খসড়া হিসেবে সংরক্ষিত হয়েছে"
          : "✅ পোস্ট সম্পাদকের কাছে পাঠানো হয়েছে"
      );
    } catch (error) {
      const responseMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setMessage("❌ " + (responseMessage || "সমস্যা হয়েছে। আবার চেষ্টা করুন।"));
    } finally {
      setSubmittingStatus(null);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 bg-white p-5 rounded-xl shadow-sm border"
    >
      <input
        type="text"
        placeholder="শিরোনাম"
        className="w-full border p-3 rounded-lg"
        value={title}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
        required
      />

      <LexicalEditor onChange={setContent} />

      <div>
        <label className="block font-medium mb-2">📸 ফিচার ছবি</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFeatureImage(e.target.files?.[0] || null)
          }
        />
      </div>

      <div>
        <label className="block font-medium mb-2">📂 ক্যাটাগরি</label>
        <select
          value={categoryId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            handleCategoryChange(e.target.value)
          }
          className="w-full border p-3 rounded-lg"
          required
        >
          <option value="">-- ক্যাটাগরি নির্বাচন করুন --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          ক্যাটাগরি তৈরি বা পরিবর্তন করতে অ্যাডমিনের ক্যাটাগরি ম্যানেজার ব্যবহার করুন।
        </p>
      </div>

      <div>
        <label className="block font-medium mb-2">🧩 সাবক্যাটাগরি</label>
        <select
          value={subcategoryId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setSubcategoryId(e.target.value)
          }
          className="w-full border p-3 rounded-lg"
          disabled={!categoryId || subcategories.length === 0}
        >
          <option value="">
            {!categoryId
              ? "-- আগে ক্যাটাগরি নির্বাচন করুন --"
              : subcategories.length
              ? "-- সাবক্যাটাগরি নির্বাচন করুন --"
              : "-- এই ক্যাটাগরিতে সাবক্যাটাগরি নেই --"}
          </option>
          {subcategories.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        placeholder="ট্যাগ (কমা দিয়ে আলাদা করুন)"
        value={tags}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      <div className="flex gap-3">
        <button
          type="submit"
          name="submissionStatus"
          value="DRAFT"
          onClick={() => setSubmittingStatus("DRAFT")}
          disabled={submittingStatus !== null}
          className="bg-gray-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg"
        >
          {submittingStatus === "DRAFT"
            ? "সংরক্ষণ হচ্ছে..."
            : "খসড়া সংরক্ষণ"}
        </button>
        <button
          type="submit"
          name="submissionStatus"
          value="PENDING"
          onClick={() => setSubmittingStatus("PENDING")}
          disabled={submittingStatus !== null}
          className="bg-blue-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg"
        >
          {submittingStatus === "PENDING"
            ? "পাঠানো হচ্ছে..."
            : "সম্পাদকের জন্য পাঠান"}
        </button>
      </div>

      {message && <p className="text-sm text-gray-700">{message}</p>}
    </form>
  );
}
