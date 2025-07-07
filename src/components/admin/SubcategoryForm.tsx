"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import axios from "axios";

type Category = {
  id: number;
  name: string;
};

export default function SubcategoryForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios.get("/api/admin/categories").then((res) => {
      setCategories(res.data);
    });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await axios.post("/api/admin/subcategories", { name, slug, categoryId });
      setMessage("✅ সাবক্যাটাগরি যোগ হয়েছে");
      setName("");
      setSlug("");
    } catch {
      setMessage("❌ সাবক্যাটাগরি যোগ করা যায়নি");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border p-4 rounded bg-gray-50"
    >
      <h2 className="text-lg font-semibold">সাবক্যাটাগরি যোগ করুন</h2>
      <select
        value={categoryId}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value)}
        className="w-full border p-2 rounded"
        required
      >
        <option value="">-- ক্যাটাগরি নির্বাচন করুন --</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="সাবক্যাটাগরি নাম (উদা: প্রিমিয়ার লিগ)"
        value={name}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <input
        type="text"
        placeholder="Slug (উদা: premier-league)"
        value={slug}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSlug(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        সাবক্যাটাগরি যোগ করুন
      </button>
      {message && <p className="text-sm mt-2">{message}</p>}
    </form>
  );
}
