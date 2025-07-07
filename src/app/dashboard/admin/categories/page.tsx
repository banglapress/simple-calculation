import CategoryForm from "@/components/admin/CategoryForm";
import CategoryList from "@/components/admin/CategoryList";
import SubcategoryForm from "@/components/admin/SubcategoryForm"; // ✅

export default function AdminCategoriesPage() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-xl font-bold mb-4">⚙️ ক্যাটাগরি ম্যানেজার</h1>
      <CategoryForm />
      <div className="mt-6">
        <SubcategoryForm /> {/* ✅ Subcategory Form */}
      </div>
      <div className="mt-8">
        <CategoryList />
      </div>
    </div>
  );
}
