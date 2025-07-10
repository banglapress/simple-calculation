// src/app/dashboard/editor/edit/[id]/page.tsx

import EditorPostForm from "@/components/editor/EditorPostForm";

export default function EditPostPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-xl font-bold mb-4">✏️ পোস্ট এডিট করুন</h1>
      <EditorPostForm postId={params.id} />
    </div>
  );
}
