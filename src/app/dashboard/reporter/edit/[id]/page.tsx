import PostEditorForm from "@/components/reporter/PostEditorForm";

export default function EditReporterPostPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-xl font-bold mb-4">✏️ পোস্ট সম্পাদনা</h1>
      <PostEditorForm postId={params.id} />
    </div>
  );
}
