// src/app/dashboard/editor/edit/[id]/page.tsx

import EditorPostForm from "@/components/editor/EditorPostForm";

export default function EditPostPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">✏️ পোস্ট এডিট করুন</h1>
        <p className="text-sm text-slate-500 mt-1">
          মূল লেখা মাঝখানে, প্রকাশনা ও অন্যান্য সেটিংস ডান পাশে।
        </p>
      </div>
      <EditorPostForm postId={params.id} />
    </div>
  );
}
