import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NavProgress from "@/components/NavProgress";

export const metadata: Metadata = {
  title: { default: "Full-Swing Tennis Academy | Book a lesson", template: "%s | Full-Swing Tennis Academy" },
  description: "Book private tennis lessons and group sessions at St Francis Bay Tennis Club.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className="flex min-h-screen flex-col">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
