import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import dynamic from "next/dynamic";
import { Analytics } from "@vercel/analytics/next";

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

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-lc-bg font-sans antialiased">
        <ClerkProvider>
          {children}
          <NotesUpdatedToastHost />
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
