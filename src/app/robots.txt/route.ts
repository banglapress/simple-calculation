// src/app/robots.txt/route.ts

import { NextResponse } from "next/server";

export function GET() {
  const content = `
User-agent: *
Allow: /
Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml
`;

  return new NextResponse(content.trim(), {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
