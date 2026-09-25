import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import Provider from "@/components/SessionProvider";
import LogoutButton from "@/components/dashboard/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div className="p-4 text-red-600">আপনার session আর বৈধ নয়। আবার লগইন করুন।</div>;
  }

  return (
    <Provider session={session}>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="font-[NotoSerifBengali] text-2xl font-bold text-red-600">
              খেলা টিভি
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <span className="hidden text-gray-600 sm:inline">{session.user.email}</span>
              <Link href="/" className="text-gray-700 hover:text-red-600">
                সাইট দেখুন
              </Link>
              <div className="w-24">
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-57px)] flex-col md:flex-row">
          <aside className="w-full shrink-0 border-b bg-gray-100 p-3 md:w-64 md:border-b-0 md:p-4">
            <Link href="/dashboard" className="block mb-4">
              <h2 className="font-bold text-lg">ড্যাশবোর্ড</h2>
              <p className="text-xs text-gray-500 mt-1">খেলা টিভি</p>
            </Link>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm md:block md:space-y-2">
              {session.user.role === "REPORTER" && (
                <>
                  <li>
                    <Link href="/dashboard/reporter">Reporter Panel</Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/reporter/new"
                      className="font-medium text-blue-700"
                    >
                      ➕ নতুন পোস্ট
                    </Link>
                  </li>
                </>
              )}

              {session.user.role === "EDITOR" && (
                <>
                  <li>
                    <Link href="/dashboard/editor">Editor Panel</Link>
                  </li>
                  <li>
                    <Link href="/dashboard/admin/categories">
                      📂 ক্যাটাগরি ম্যানেজার
                    </Link>
                  </li>
                </>
              )}

              {session.user.role === "ADMIN" && (
                <>
                  <li>
                    <Link href="/dashboard/admin">Admin Panel</Link>
                  </li>
                  <li>
                    <Link href="/dashboard/admin/users">
                      👥 User Manager
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/admin/categories">
                      📂 ক্যাটাগরি ম্যানেজার
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/admin/ai">
                      🤖 AI Newsroom
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/editor">Editor Panel</Link>
                  </li>
                  <li>
                    <Link href="/dashboard/reporter">Reporter Panel</Link>
                  </li>
                </>
              )}
            </ul>
          </aside>

          <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6">{children}</main>
        </div>
      </div>
    </Provider>
  );
}
