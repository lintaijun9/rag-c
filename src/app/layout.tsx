import type { Metadata } from "next";
import "./globals.css";
import { Providers, AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "Gemini RAG File Search",
  description: "Google Gemini File Search Store Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
