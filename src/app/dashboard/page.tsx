import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);

  if (!session) return redirect("/login");

  switch (session.user.role) {
    case "ADMIN":
      return redirect("/dashboard/admin");
    case "EDITOR":
      return redirect("/dashboard/editor");
    case "REPORTER":
      return redirect("/dashboard/reporter");
    default:
      return redirect("/");
  }
}
