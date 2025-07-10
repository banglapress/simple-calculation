// src/app/dashboard/editor/page.tsx

import EditorDashboard from "@/components/editor/EditorDashboard";

export default function EditorPage() {
  return (
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-xl font-bold mb-4">🧾 সম্পাদক প্যানেল</h1>
      <EditorDashboard />

        <div className="border p-4 rounded bg-white shadow-sm">
        <h2 className="font-bold mb-2">👤 প্রোফাইল</h2>
        
        <p>ভূমিকা: editor</p>
        <form
          action="/api/auth/signout"
          method="POST"
          className="mt-3"
        >
          <button
            type="submit"
            className="text-red-600 underline text-sm"
          >
            🚪 লগআউট করুন
          </button>
        </form>
      </div>
    </div>
  );
}
