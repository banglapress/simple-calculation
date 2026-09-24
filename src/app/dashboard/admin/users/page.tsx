"use client";

import { useEffect, useState } from "react";

type Role = "READER" | "REPORTER" | "EDITOR" | "ADMIN";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: string;
  _count?: { posts: number };
};

const roleLabels: Record<Role, string> = {
  READER: "Reader",
  REPORTER: "Reporter",
  EDITOR: "Editor",
  ADMIN: "Admin",
};

export default function UserManagerPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("REPORTER");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "User list পাওয়া যায়নি");
      setUsers(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "User list পাওয়া যায়নি");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.message || "User তৈরি করা যায়নি");
      return;
    }

    setMessage("✅ User তৈরি হয়েছে");
    setName("");
    setEmail("");
    setPassword("");
    setRole("REPORTER");
    loadUsers();
  };

  const updateRole = async (id: string, nextRole: Role) => {
    setMessage("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: nextRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message || "Role পরিবর্তন করা যায়নি");
      return;
    }
    setUsers((current) =>
      current.map((user) => (user.id === id ? { ...user, role: data.role } : user))
    );
  };

  const resetPassword = async (user: User) => {
    const nextPassword = window.prompt(
      "নতুন password দিন (কমপক্ষে ৮ অক্ষর):\n" + user.email
    );
    if (!nextPassword) return;

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, password: nextPassword }),
    });
    const data = await res.json();
    setMessage(res.ok ? "✅ Password পরিবর্তন হয়েছে" : data.message || "Password পরিবর্তন করা যায়নি");
  };

  const deleteUser = async (user: User) => {
    if (!window.confirm("এই user মুছে ফেলবেন?\n" + user.email)) return;

    const res = await fetch("/api/admin/users?id=" + encodeURIComponent(user.id), {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message || "User মুছে ফেলা যায়নি");
      return;
    }
    setMessage("✅ User মুছে ফেলা হয়েছে");
    loadUsers();
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div>
        <p className="text-sm text-gray-500">Admin Panel</p>
        <h1 className="text-2xl font-bold">👥 User Manager</h1>
        <p className="text-sm text-gray-600 mt-1">
          Reporter, Editor এবং Admin role শুধু Admin-ই নিয়ন্ত্রণ করতে পারবেন।
        </p>
      </div>

      <form onSubmit={createUser} className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="text-lg font-semibold">নতুন User তৈরি করুন</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <input className="border rounded-md p-2" placeholder="নাম" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="border rounded-md p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="border rounded-md p-2" type="password" placeholder="Password (৮+ অক্ষর)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <select className="border rounded-md p-2" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button className="rounded-md bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700" type="submit">
          User তৈরি করুন
        </button>
        {message && <p className="text-sm">{message}</p>}
      </form>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">সকল User</h2>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-gray-500">লোড হচ্ছে...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">নাম</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Posts</th>
                <th className="p-3">কাজ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-3 font-medium">{user.name || "—"}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <select
                      className="border rounded p-1"
                      value={user.role}
                      onChange={(e) => updateRole(user.id, e.target.value as Role)}
                    >
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">{user._count?.posts ?? 0}</td>
                  <td className="p-3 whitespace-nowrap space-x-2">
                    <button className="text-blue-700 hover:underline" onClick={() => resetPassword(user)}>
                      Password
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => deleteUser(user)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
