import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kealvi — Live Q&A",
  description: "Ask questions, vote, and run live polls",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-foreground">
        <header className="sticky top-0 z-10 border-b border-border/80 bg-white/90 backdrop-blur-lg">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-lg font-bold text-white shadow-lg shadow-primary/30">
                K
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight text-primary-dark">
                  Kealvi
                </p>
                <p className="text-xs font-medium text-muted">
                  Live Q&amp;A Platform
                </p>
              </div>
            </div>
            <span className="live-badge hidden sm:inline-flex">Online</span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border/80 bg-white/70 py-8 text-center text-sm text-muted">
          Kealvi · Next.js · Supabase · Gemini
        </footer>
      </body>
    </html>
  );
}
