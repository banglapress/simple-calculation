"use client";

import { useEffect, useState, ChangeEvent } from "react";
import axios from "axios";

interface Subcategory {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories: Subcategory[];
}

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<number | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState("");
  const [editedSubcategoryName, setEditedSubcategoryName] = useState("");

  const fetchCategories = async () => {
    const res = await axios.get<Category[]>("/api/admin/categories");
    setCategories(res.data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("ক্যাটাগরি মুছে ফেলতে চান?")) return;
    await axios.delete(`/api/admin/categories?id=${id}`);
    fetchCategories();
  };

  const handleDeleteSubcategory = async (id: number) => {
    if (!confirm("সাবক্যাটাগরি মুছে ফেলতে চান?")) return;
    await axios.delete(`/api/admin/subcategories?id=${id}`);
    fetchCategories();
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat.id);
    setEditedCategoryName(cat.name);
  };

  const handleEditSubcategory = (sub: Subcategory) => {
    setEditingSubcategory(sub.id);
    setEditedSubcategoryName(sub.name);
  };

  const handleSaveCategory = async (id: number) => {
    await axios.patch(`/api/admin/categories?id=${id}`, { name: editedCategoryName });
    setEditingCategory(null);
    fetchCategories();
  };

  const handleSaveSubcategory = async (id: number) => {
    await axios.patch(`/api/admin/subcategories?id=${id}`, { name: editedSubcategoryName });
    setEditingSubcategory(null);
    fetchCategories();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">সকল ক্যাটাগরি</h2>
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.id} className="border p-3 rounded bg-white">
            <div className="flex justify-between items-center">
              <div className="flex gap-2 items-center">
                {editingCategory === cat.id ? (
                  <>
                    <input
                      className="border p-1"
                      value={editedCategoryName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedCategoryName(e.target.value)}
                    />
                    <button onClick={() => handleSaveCategory(cat.id)}>💾</button>
                  </>
                ) : (
                  <>
                    <strong>{cat.name}</strong>
                    <span className="text-sm text-gray-400">({cat.slug})</span>
                    <button onClick={() => handleEditCategory(cat)}>✏️</button>
                  </>
                )}
              </div>
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="text-red-600 text-sm"
              >
                🗑️
              </button>
            </div>

            {cat.subcategories.length > 0 && (
              <ul className="ml-4 mt-2 text-sm list-disc">
                {cat.subcategories.map((sub) => (
                  <li key={sub.id} className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      {editingSubcategory === sub.id ? (
                        <>
                          <input
                            className="border p-1"
                            value={editedSubcategoryName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedSubcategoryName(e.target.value)}
                          />
                          <button onClick={() => handleSaveSubcategory(sub.id)}>💾</button>
                        </>
                      ) : (
                        <>
                          {sub.name} <span className="text-gray-400">({sub.slug})</span>
                          <button onClick={() => handleEditSubcategory(sub)}>✏️</button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSubcategory(sub.id)}
                      className="text-red-600"
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
