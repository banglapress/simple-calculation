// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Provider from "@/components/SessionProvider";
import Head from "next/head";

export const metadata: Metadata = {
  title: "খেলা টিভি",
  description: "বাংলাদেশ এবং বিশ্ব ক্রীড়ার সর্বশেষ সংবাদ",
  icons: {
    icon: "/icon.ico", 
    shortcut: "/icon.ico",
    apple: "/icon.ico", 
  },
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="bn">
       <Head>
        <link rel="icon" href="/icon.ico" />
      </Head>
      <body className="antialiased bg-white text-gray-800">
        <Provider session={session}>
          {children}
        </Provider>
      </body>
    </html>
  );
}
