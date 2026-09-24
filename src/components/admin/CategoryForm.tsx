"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import axios from "axios";

export default function CategoryForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await axios.post("/api/admin/categories", { name, slug: slug.trim() });
      setMessage("✅ ক্যাটাগরি যোগ হয়েছে");
      setName("");
      setSlug("");
    } catch {
      setMessage("❌ ক্যাটাগরি যোগ করা যায়নি");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border p-4 rounded bg-gray-50"
    >
      <h2 className="text-lg font-semibold">নতুন ক্যাটাগরি যোগ করুন</h2>
      <input
        type="text"
        placeholder="ক্যাটাগরি নাম (উদা: ফুটবল)"
        value={name}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        required
        className="w-full border p-2 rounded"
      />
      <input
        type="text"
        placeholder="English Slug (উদা: football, swimming)"
        value={slug}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSlug(e.target.value)}
        required
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        title="শুধু English ছোট হাতের অক্ষর, সংখ্যা এবং hyphen ব্যবহার করুন"
        className="w-full border p-2 rounded"
      />
      <p className="text-xs text-gray-500 -mt-2">
        URL-এ ব্যবহারের জন্য English slug দিন। যেমন: সাঁতার → swimming
      </p>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        ক্যাটাগরি যোগ করুন
      </button>
      {message && <p className="text-sm mt-2">{message}</p>}
    </form>
  );
}
