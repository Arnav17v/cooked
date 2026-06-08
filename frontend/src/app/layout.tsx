import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import dynamic from "next/dynamic";

import { SITE_URL } from "@/lib/site-url";

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
  metadataBase: new URL(SITE_URL),
  title: "Get Uncooked | AI Interview Prep",
  description:
    "Interview prep built from your resume — multi-dimensional Resume Score, AI Insights, day-by-day prep plans, and practice questions.",
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
