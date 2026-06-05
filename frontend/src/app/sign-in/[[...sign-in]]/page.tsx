import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Flame } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-lc-bg text-lc-text">
      <header className="border-b border-lc-border bg-lc-header/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lc-text">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-lc-orange text-black">
              <Flame className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="text-[15px]">get uncooked</span>
          </Link>
          <Link
            href="/sign-up"
            className="text-[13px] font-medium text-lc-orange hover:underline"
          >
            Create account
          </Link>
        </div>
      </header>
      <div className="flex justify-center px-4 py-12">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/roast"
          appearance={{
            variables: {
              colorPrimary: "#ffa116",
              colorBackground: "#1a1a1a",
              colorInputBackground: "#262626",
              colorText: "#e8e8e8",
              colorTextSecondary: "#8f8f8f",
              borderRadius: "0.5rem",
            },
            elements: {
              card: "border border-lc-border bg-lc-surface shadow-none",
              headerTitle: "text-lc-text",
              headerSubtitle: "text-lc-muted",
              socialButtonsBlockButton:
                "border-lc-border bg-lc-elevated text-lc-text hover:bg-lc-border",
              formButtonPrimary: "bg-lc-orange text-black hover:bg-lc-orangeHover",
              footerActionLink: "text-lc-orange",
            },
          }}
        />
      </div>
    </div>
  );
}
