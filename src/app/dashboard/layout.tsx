import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <div className="p-4 text-red-600">আপনি লগইন করেননি।</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-100 p-4">
        <h2 className="font-bold mb-4">ড্যাশবোর্ড</h2>
        <ul className="space-y-2 text-sm">
          {session.user.role === "REPORTER" && (
            <li><Link href="/dashboard/reporter">Reporter Panel</Link></li>
          )}
          {session.user.role === "EDITOR" && (
            <li><Link href="/dashboard/editor">Editor Panel</Link></li>
          )}
          {session.user.role === "ADMIN" && (
            <>
              <li><Link href="/dashboard/admin">Admin Panel</Link></li>
              <li><Link href="/dashboard/editor">Editor Panel</Link></li>
              <li><Link href="/dashboard/reporter">Reporter Panel</Link></li>
            </>
          )}
        </ul>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
