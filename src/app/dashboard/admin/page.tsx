import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div>
        <p className="text-sm text-gray-500">Admin Panel</p>
        <h1 className="text-2xl font-bold">👑 অ্যাডমিন প্যানেল</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/admin/ai"
          className="block rounded-xl border bg-white p-5 hover:shadow-md transition"
        >
          <p className="text-2xl mb-2">🤖</p>
          <h2 className="font-bold text-lg">AI Newsroom</h2>
          <p className="text-sm text-gray-600 mt-1">
            RSS feed কল করুন, source item দেখুন এবং Gemini দিয়ে AI draft তৈরি করুন।
          </p>
        </Link>

        <Link
          href="/dashboard/admin/categories"
          className="block rounded-xl border bg-white p-5 hover:shadow-md transition"
        >
          <p className="text-2xl mb-2">📂</p>
          <h2 className="font-bold text-lg">ক্যাটাগরি ম্যানেজার</h2>
          <p className="text-sm text-gray-600 mt-1">
            Category ও subcategory তৈরি, পরিবর্তন এবং মুছুন।
          </p>
        </Link>
      </div>
    </div>
  );
}
