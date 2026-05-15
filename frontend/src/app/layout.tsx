import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, JetBrains_Mono } from "next/font/google";
import dynamic from "next/dynamic";

import "./globals.css";

/** Separate async chunk from root layout (smaller `layout.js`, fewer dev ChunkLoad timeouts). */
const NotesUpdatedToastHost = dynamic(() =>
  import("@/components/notes/notes-updated-toast-host").then((m) => m.NotesUpdatedToastHost),
);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Am I Cooked? | AI Resume Roast",
  description:
    "AI resume roast and interview prep: Cooked Score, bullet-level red flags with rewrites, and personalized interview questions from your actual bullets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-lc-bg font-sans antialiased">
        <ClerkProvider>
          {children}
          <NotesUpdatedToastHost />
        </ClerkProvider>
      </body>
    </html>
  );
}
