// src/app/dashboard/reporter/new/page.tsx

import PostEditorForm from "@/components/reporter/PostEditorForm";

export default function CreatePostPage() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-xl font-bold mb-4">📝 নতুন পোস্ট লিখুন</h1>
      <PostEditorForm />
    </div>
  );
}
