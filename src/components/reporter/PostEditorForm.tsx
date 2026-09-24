// src/components/reporter/PostEditorForm.tsx

"use client";

import { useState, useEffect, ChangeEvent } from "react";
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
type Placement =
  | "NONE"
  | "LEAD"
  | "SECOND_LEAD"
  | "EDITORS_PICK"
  | "TRENDING";

export default function PostEditorForm({ postId }: { postId?: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editorInitialHtml, setEditorInitialHtml] = useState("");
  const [featureImage, setFeatureImage] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [tags, setTags] = useState("");
  const [placement, setPlacement] = useState<Placement>("NONE");
  const [isBreaking, setIsBreaking] = useState(false);
  const [message, setMessage] = useState("");
  const [submittingStatus, setSubmittingStatus] =
    useState<SubmissionStatus | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [sourceUrls, setSourceUrls] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const categoryResponse = await axios.get<Category[]>(
          "/api/admin/categories"
        );

        if (cancelled) return;
        setCategories(categoryResponse.data);

        if (!postId) return;

        const postResponse = await axios.get("/api/posts/" + postId);
        if (cancelled) return;

        const existingPost = postResponse.data;

        setTitle(String(existingPost.title || ""));
        setContent(String(existingPost.content || ""));
        setEditorInitialHtml(String(existingPost.content || ""));
        setTags(String(existingPost.tags || ""));
        setPlacement(existingPost.placement || "NONE");
        setIsBreaking(Boolean(existingPost.isBreaking));

        const existingCategoryId =
          existingPost.categories?.[0]?.id != null
            ? String(existingPost.categories[0].id)
            : "";
        const existingSubcategoryId =
          existingPost.subcategories?.[0]?.id != null
            ? String(existingPost.subcategories[0].id)
            : "";

        setCategoryId(existingCategoryId);

        const selected = categoryResponse.data.find(
          (category) => String(category.id) === existingCategoryId
        );
        setSubcategories(selected?.subcategories || []);
        setSubcategoryId(existingSubcategoryId);
      } catch (error) {
        const responseMessage = axios.isAxiosError(error)
          ? error.response?.data?.message
          : null;
        setMessage(
          "❌ " + (responseMessage || "পোস্ট লোড করা যায়নি")
        );
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const selectedCategory = categories.find(
    (category) => String(category.id) === categoryId
  );

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const selected = categories.find((category) => String(category.id) === id);
    setSubcategories(selected?.subcategories || []);
    setSubcategoryId("");
  };

  const handleAiDraft = async () => {
    if (!sourceText.trim() && !sourceUrls.trim()) {
      setAiMessage("❌ AI draft-এর জন্য source text অথবা source URL দিন।");
      return;
    }

    setAiLoading(true);
    setAiMessage("");

    try {
      const response = await axios.post("/api/ai/generate-article", {
        title,
        categoryName: selectedCategory?.name || "Sports",
        sourceText,
        sourceUrls: sourceUrls
          .split(/\r?\n/)
          .map((url) => url.trim())
          .filter(Boolean),
      });

      const data = response.data;

      if (data.title) setTitle(data.title);
      if (data.body_html) {
        setContent(data.body_html);
        setEditorInitialHtml(data.body_html);
      }
      if (Array.isArray(data.tags)) setTags(data.tags.join(", "));

      const warnings = Array.isArray(data.warnings) ? data.warnings : [];
      setAiMessage(
        warnings.length
          ? "✅ AI draft তৈরি হয়েছে। " + warnings.join(" ")
          : "✅ AI draft তৈরি হয়েছে। প্রকাশের আগে অবশ্যই তথ্য যাচাই করুন।"
      );
    } catch (error) {
      const responseMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setAiMessage(
        "❌ " + (responseMessage || "AI draft তৈরি করা যায়নি।")
      );
    } finally {
      setAiLoading(false);
    }
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

  const handleSubmit = async (submissionStatus: SubmissionStatus) => {
    setSubmittingStatus(submissionStatus);
    setMessage("");

    try {
      const uploadedUrl = await handleImageUpload();

      const payload = {
        title,
        content,
        categoryIds: categoryId ? [Number(categoryId)] : [],
        subcategoryIds: subcategoryId ? [Number(subcategoryId)] : [],
        tags,
        status: submissionStatus,
        featureImage: uploadedUrl || "",
        placement,
        isBreaking,
      };

      const response = postId
        ? await axios.put("/api/posts/" + postId, payload)
        : await axios.post("/api/posts", payload);

      const savedPostId = response.data?.id || postId;

      if (!savedPostId) {
        throw new Error("Server did not return a saved post ID");
      }

      if (!postId) {
        setMessage(
          submissionStatus === "DRAFT"
            ? "✅ পোস্টের খসড়া সংরক্ষিত হয়েছে"
            : "✅ পোস্টটি সম্পাদকের কাছে পাঠানো হয়েছে"
        );

        window.setTimeout(() => {
          window.location.assign("/dashboard/reporter/edit/" + savedPostId);
        }, 300);
        return;
      }

      setMessage(
        submissionStatus === "DRAFT"
          ? "✅ পোস্টের খসড়া সংরক্ষিত হয়েছে"
          : "✅ পোস্টটি সম্পাদকের কাছে পাঠানো হয়েছে"
      );
    } catch (error) {
      const responseMessage = axios.isAxiosError(error)
        ? error.response?.data?.message ||
          error.response?.data?.detail ||
          (error.response?.status
            ? "সার্ভার ত্রুটি (" + error.response.status + ")"
            : null)
        : error instanceof Error
        ? error.message
        : null;

      setMessage(
        "❌ " + (responseMessage || "সমস্যা হয়েছে। আবার চেষ্টা করুন।")
      );
    } finally {
      setSubmittingStatus(null);
    }
  };


  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-5 bg-white p-5 rounded-xl shadow-sm border"
    >
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
        <div>
          <h2 className="font-bold text-blue-900">🤖 AI নিউজরুম সহকারী</h2>
          <p className="text-sm text-blue-800 mt-1">
            নিজের source text পেস্ট করুন অথবা সর্বোচ্চ ৩টি source URL দিন।
            AI সেখান থেকে একটি সম্পাদনাযোগ্য বাংলা draft বানাবে।
          </p>
        </div>

        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Source material এখানে পেস্ট করুন..."
          className="w-full min-h-28 border p-3 rounded-lg bg-white"
        />

        <textarea
          value={sourceUrls}
          onChange={(e) => setSourceUrls(e.target.value)}
          placeholder={"Source URL — প্রতি লাইনে একটি URL\nhttps://example.com/news/..." }
          className="w-full min-h-20 border p-3 rounded-lg bg-white"
        />

        <button
          type="button"
          onClick={handleAiDraft}
          disabled={aiLoading}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg"
        >
          {aiLoading ? "🤖 AI draft তৈরি হচ্ছে..." : "🤖 AI দিয়ে draft তৈরি করুন"}
        </button>

        {aiMessage && (
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {aiMessage}
          </p>
        )}
      </div>

      <input
        type="text"
        placeholder="শিরোনাম"
        className="w-full border p-3 rounded-lg"
        value={title}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
        required
      />

      <LexicalEditor
        initialHtml={editorInitialHtml}
        onChange={setContent}
      />

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

      <div>
        <label className="block font-medium mb-2">
          📍 হোমপেইজ পজিশন
        </label>
        <select
          value={placement}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setPlacement(e.target.value as Placement)
          }
          className="w-full border p-3 rounded-lg"
        >
          <option value="NONE">⚪ সাধারণ — কোনো বিশেষ পজিশন নয়</option>
          <option value="LEAD">🔴 Lead — প্রধান খবর</option>
          <option value="SECOND_LEAD">🟠 Second Lead — দ্বিতীয় প্রধান খবর</option>
          <option value="EDITORS_PICK">⭐ Editor&apos;s Pick — নির্বাচিত</option>
          <option value="TRENDING">🔥 Trending — ট্রেন্ডিং</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          এগুলো হোমপেইজের নির্দিষ্ট জায়গায় কনটেন্ট দেখানোর জন্য ব্যবহার হবে।
        </p>
      </div>

      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={isBreaking}
          onChange={(e) => setIsBreaking(e.target.checked)}
        />
        🛑 ব্রেকিং নিউজ হিসেবে চিহ্নিত করুন
      </label>

      <input
        type="text"
        placeholder="ট্যাগ (কমা দিয়ে আলাদা করুন)"
        value={tags}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleSubmit("DRAFT")}
          disabled={submittingStatus !== null}
          className="bg-gray-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg"
        >
          {submittingStatus === "DRAFT"
            ? "সংরক্ষণ হচ্ছে..."
            : "খসড়া সংরক্ষণ"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("PENDING")}
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
