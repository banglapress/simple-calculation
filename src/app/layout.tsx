import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "খেলা টিভি",
  description: "বাংলাদেশ এবং বিশ্ব ক্রীড়ার সর্বশেষ সংবাদ",
  icons: {
    icon: "/icon.ico",
    shortcut: "/icon.ico",
    apple: "/icon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <body className="antialiased bg-white text-gray-800">{children}</body>
    </html>
  );
}
