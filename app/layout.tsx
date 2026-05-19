import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coffee Journal",
  description: "Track your coffee experiences",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-stone-50 text-stone-900 min-h-screen`}>
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
              <span>☕</span>
              <span>Coffee Journal</span>
            </Link>
            <Link
              href="/coffees/new"
              className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
            >
              + Add Coffee
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
