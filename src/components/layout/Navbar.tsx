"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, User, X, ChevronDown, Search } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

type Subcategory = {
  id: number;
  name: string;
  slug: string;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  subcategories: Subcategory[];
};

export default function Navbar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    async function fetchCategories() {
      const res = await fetch("/api/public/categories");
      const data: Category[] = await res.json();
      setCategories(data);
    }
    fetchCategories();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/search?q=${encodeURIComponent(search)}`);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Desktop Nav */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <h1 className="font-[NotoSerifBengali] text-5xl font-bold text-red-600">
                খেলা টিভি
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex md:ml-10">
              <ul className="flex space-x-8">
                {categories.map((cat) => (
                  <li key={cat.id} className="relative group">
                    <button className="flex items-center text-gray-900 hover:text-red-600 px-3 py-2 text-sm font-medium">
                      {cat.name}
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </button>
                    <div className="absolute z-10 left-0 mt-2 w-48 rounded-md shadow-lg bg-gray-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="py-1">
                        {cat.subcategories.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/${cat.slug}/${sub.slug}`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Search and Auth */}
          <div className="flex items-center">
            {/* Search - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex ml-4">
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 w-64 border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Search size={18} />
                </div>
              </div>
            </form>

            {/* Auth - Desktop */}
            {status === "authenticated" ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="hidden md:flex items-center ml-4 space-x-2 p-2 rounded-md hover:bg-gray-100 focus:outline-none">
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {session.user?.name || session.user?.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="mt-2 w-48" align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 w-full text-left"
                    >
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {session.user?.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 w-full text-left"
                      >
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}

                    {session.user?.role === "REPORTER" && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/reporter"
                        className="block px-4 py-2 text-sm text-gray-700 w-full text-left"
                      >
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                   {session.user?.role === "EDITOR" && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/editor"
                        className="block px-4 py-2 text-sm text-gray-700 w-full text-left"
                      >
                        Editors Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 cursor-pointer"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="hidden md:flex items-center ml-4 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-50 overflow-y-auto pt-4 pb-6">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-4">
            <Link href="/" className="flex-shrink-0">
              <h1 className="font-[NotoSerifBengali] text-2xl font-bold text-red-600">
                খেলা টিভি
              </h1>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            >
              <X size={24} />
            </button>
          </div>

          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="mt-4 px-4">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-full border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search size={18} />
              </div>
            </div>
          </form>

          {/* Mobile Navigation */}
          <nav className="mt-6 px-4">
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="flex items-center justify-between w-full px-3 py-3 rounded-md text-base font-medium text-gray-900 hover:bg-gray-50"
                  >
                    <span>{cat.name}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transition-transform ${
                        expandedCategories.includes(cat.id) ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedCategories.includes(cat.id) && (
                    <ul className="pl-4 mt-1 space-y-1 bg-gray-50 rounded-md py-1">
                      {cat.subcategories.map((sub) => (
                        <li key={sub.id}>
                          <Link
                            href={`/${cat.slug}/${sub.slug}`}
                            className="block px-3 py-2 rounded-md text-base text-gray-600 hover:bg-gray-100"
                            onClick={() => setMobileOpen(false)}
                          >
                            {sub.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile Auth */}
          <div className="mt-6 px-4">
            {status === "authenticated" ? (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt="Profile"
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {session.user?.name || session.user?.email}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Link
                    href="/profile"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50"
                    onClick={() => setMobileOpen(false)}
                  >
                    Profile
                  </Link>
                  {session.user?.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50"
                      onClick={() => setMobileOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full px-4 py-2 text-center border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
