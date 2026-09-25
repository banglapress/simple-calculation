import Link from "next/link";
import { getPublicCategories } from "@/lib/public-data";

export default async function Navbar() {
  const categories = (await getPublicCategories()).filter(
    (category) => category.showInNav
  );

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <details className="md:hidden relative">
              <summary className="list-none cursor-pointer p-2 text-2xl select-none">
                ☰
              </summary>
              <div className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto bg-white border-t p-4">
                <nav>
                  <ul className="space-y-1">
                    {categories.map((cat) => (
                      <li key={cat.id}>
                        {cat.subcategories.length > 0 ? (
                          <details>
                            <summary className="cursor-pointer px-3 py-3 rounded-md text-base font-medium text-gray-900 hover:bg-gray-50">
                              {cat.name}
                            </summary>
                            <ul className="pl-4 mt-1 space-y-1 bg-gray-50 rounded-md py-1">
                              <li>
                                <Link
                                  href={`/${cat.slug}`}
                                  className="block px-3 py-2 text-base text-gray-700"
                                >
                                  সব {cat.name}
                                </Link>
                              </li>
                              {cat.subcategories.map((sub) => (
                                <li key={sub.id}>
                                  <Link
                                    href={`/${cat.slug}/${sub.slug}`}
                                    className="block px-3 py-2 text-base text-gray-600 hover:bg-gray-100"
                                  >
                                    {sub.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : (
                          <Link
                            href={`/${cat.slug}`}
                            className="block px-3 py-3 rounded-md text-base font-medium text-gray-900 hover:bg-gray-50"
                          >
                            {cat.name}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>

                <Link
                  href="/login"
                  className="block mt-6 w-full px-4 py-2 text-center rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  Login
                </Link>
              </div>
            </details>

            <Link href="/" className="flex-shrink-0">
              <h1 className="font-[NotoSerifBengali] text-4xl font-bold text-red-600 leading-none">
                খেলা টিভি
              </h1>
            </Link>

            <nav className="hidden md:block md:ml-4 min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ul className="flex flex-nowrap items-center gap-1 whitespace-nowrap">
                {categories.map((cat) => (
                  <li key={cat.id} className="relative group shrink-0">
                    <Link
                      href={`/${cat.slug}`}
                      className="flex items-center text-gray-900 hover:text-red-600 px-2 py-2 text-sm font-medium whitespace-nowrap"
                    >
                      {cat.name}
                      {cat.subcategories.length > 0 && (
                        <span className="ml-1 text-[10px]">▼</span>
                      )}
                    </Link>

                    {cat.subcategories.length > 0 && (
                      <div className="absolute z-20 left-0 top-full mt-1 w-52 rounded-md shadow-lg bg-white border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                        <div className="py-1">
                          <Link
                            href={`/${cat.slug}`}
                            className="block px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                          >
                            সব {cat.name}
                          </Link>
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
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <form action="/search" method="get" className="flex">
              <label className="sr-only" htmlFor="site-search">
                Search
              </label>
              <input
                id="site-search"
                name="q"
                type="search"
                placeholder="Search..."
                className="w-56 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="submit"
                className="ml-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                খুঁজুন
              </button>
            </form>

            <Link
              href="/login"
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
