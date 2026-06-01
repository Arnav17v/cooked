import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import dynamic from "next/dynamic";

import "./globals.css";

/** Separate async chunk from root layout (smaller `layout.js`, fewer dev ChunkLoad timeouts). */
const NotesUpdatedToastHost = dynamic(() =>
  import("@/components/notes/notes-updated-toast-host").then((m) => m.NotesUpdatedToastHost),
);
const LlmDevToastHost = dynamic(() =>
  import("@/components/dev/llm-dev-toast-host").then((m) => m.LlmDevToastHost),
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
  title: "Am I Cooked? | AI Interview Prep",
  description:
    "Day-by-day interview prep plans from your resume — study modules, in-plan quizzes, and a blunt Cooked Score roast to personalize every day until your interview.",
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
          <LlmDevToastHost />
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
