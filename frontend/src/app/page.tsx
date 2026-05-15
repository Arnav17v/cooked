import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Flame,
  Lock,
  MessageSquareText,
  Sparkles,
  Target,
} from "lucide-react";

import { HomeDashboardRedirect } from "@/components/home-dashboard-redirect";
import { MarketingNav } from "@/components/marketing-nav";

const pillars = [
  {
    icon: Target,
    title: "Cooked Score",
    body: "Brutal 0 to 100 plus a heat label. Built to screenshot. We slap your score on a share card so links look legit when you drop them somewhere.",
  },
  {
    icon: AlertTriangle,
    title: "Red flags + rewrites",
    body: "We point at the exact line, say what sucks, and give you a rewrite. Not that recycled \"add metrics\" advice every blog copies.",
  },
  {
    icon: MessageSquareText,
    title: "Interview questions",
    body: "10 to 15 questions that only work if you have actually read this resume. If ChatGPT could fake them without your file, we blew it.",
  },
];

const steps = [
  {
    step: "01",
    title: "Log in",
    body: "We attach roasts to your account so the daily limit actually means something. Sorry not sorry about the gate.",
  },
  {
    step: "02",
    title: "Paste or upload",
    body: "PDF or wall of text. Pick the role you are aiming at. Hit run.",
  },
  {
    step: "03",
    title: "Watch it finish",
    body: "Progress streams live. Grab your score, flags, questions, and a public link if you want to post the receipt.",
  },
];

const included = [
  "2 roasts per day, full stop",
  "A score worth screenshotting plus a real /share link",
  "Red flags that quote you + a rewrite each time",
  "10 to 15 interview questions tied to your bullets",
];

function DifficultyPill({ level }: { level: string }) {
  const styles: Record<string, string> = {
    Easy: "text-[#00b8a3] bg-[#00b8a3]/10",
    Medium: "text-[#ffc01e] bg-[#ffc01e]/10",
    Hard: "text-[#ef4743] bg-[#ef4743]/10",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        styles[level] ?? "text-lc-muted bg-white/5"
      }`}
    >
      {level}
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-lc-bg text-lc-text">
      <Suspense fallback={null}>
        <HomeDashboardRedirect />
      </Suspense>
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-lc-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,161,22,0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 md:pb-20 md:pt-20">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-lc-border bg-lc-surface px-3 py-1 text-[12px] font-medium text-lc-muted">
            <Sparkles className="h-3.5 w-3.5 text-lc-orange" />
            Free to use · fair daily limit · account required
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl lg:text-[3.25rem]">
            Your resume might be{" "}
            <span className="text-lc-orange">cooked</span>. Figure that out before they ask.
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-8 text-lc-muted md:text-[17px]">
            We built this because we kept lying to ourselves about bullet quality. You get a score you
            can screenshot, lines from your resume called out with fixes, and interview questions that
            actually trace back to what you wrote. If the run is slow, thin, or weird, we tell you instead
            of acting like nothing broke.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/roast"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-lc-orange px-6 py-3 text-[15px] font-semibold text-black hover:bg-lc-orangeHover"
            >
              Fine, let me in
              <Flame className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-lc-border bg-lc-surface px-6 py-3 text-[15px] font-semibold text-lc-text hover:bg-lc-elevated"
            >
              No account yet
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>
          <p className="mt-8 max-w-xl text-[13px] leading-6 text-lc-dim">
            Heavy usage days happen. So do sleepy servers. When quality slips, we surface it on the run,
            not after you have already trusted a bad answer.
          </p>

          {/* Static preview card - illustrative only */}
          <div className="mt-14 max-w-md overflow-hidden rounded-xl border border-lc-border bg-lc-surface opacity-90">
            <div className="flex items-center justify-between border-b border-lc-border bg-lc-header px-4 py-2.5 text-[12px]">
              <div className="flex items-center gap-2 text-lc-muted">
                <Code2 className="h-3.5 w-3.5 text-lc-orange" />
                <span className="font-medium">Preview only · sign in for yours</span>
              </div>
              <DifficultyPill level="Medium" />
            </div>
            <div className="p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-lc-dim">
                Cooked Score
              </p>
              <p className="mt-1 font-mono text-5xl font-semibold tabular-nums text-[#ffc01e]">
                68<span className="text-2xl text-lc-dim">/100</span>
              </p>
              <p className="mt-4 text-[13px] leading-relaxed text-lc-muted">
                Placeholder layout so you see what the card feels like. Sign in to upload and get your
                real score, flags, and questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-lc-orange">
            What you get
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Three things that actually help you prep.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-lc-muted">
            Not a career dashboard. Not a community. Just a blunt read on your resume, concrete fixes,
            and questions an interviewer could ask from your own bullets so you are not rehearsing
            generic fluff.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {pillars.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-lc-border bg-lc-surface p-6 transition-colors hover:border-lc-orange/35"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-lc-elevated text-lc-orange">
                <item.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="mt-5 text-[17px] font-semibold">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-7 text-lc-muted">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-lc-border bg-lc-header px-6 py-8 md:px-10">
          <h3 className="text-[15px] font-semibold text-lc-text">After you log in:</h3>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {included.map((line) => (
              <li key={line} className="flex gap-3 text-[14px] text-lc-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lc-easy" strokeWidth={2.25} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-lc-border bg-lc-header">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-lc-orange">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Three steps. One verdict.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="relative rounded-xl border border-lc-border bg-lc-surface p-6">
                <span className="font-mono text-[11px] font-semibold text-lc-orange">{s.step}</span>
                <h3 className="mt-3 text-[17px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-7 text-lc-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gated roast CTA */}
      <section id="roast" className="scroll-mt-20 border-b border-lc-border bg-lc-bg">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <div className="flex flex-col gap-8 rounded-xl border border-lc-border bg-lc-surface p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-lc-orange">
                <Lock className="h-5 w-5" strokeWidth={2} />
                <span className="text-[12px] font-semibold uppercase tracking-wider">
                  Account required
                </span>
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                The actual roast lives behind login.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-lc-muted">
                Paste or upload, watch progress stream in, grab your score and questions, copy a share
                link if you want receipts. You need an account so the daily limit stays real and the
                tool does not get blasted by bots.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-md border border-lc-border bg-lc-elevated px-6 py-3 text-[14px] font-semibold text-lc-text hover:bg-lc-border"
              >
                I already signed up
              </Link>
              <Link
                href="/roast"
                className="inline-flex items-center justify-center rounded-md bg-lc-orange px-6 py-3 text-[14px] font-semibold text-black hover:bg-lc-orangeHover"
              >
                Roast my resume
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-lc-border bg-lc-header px-5 py-14">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Still scrolling?
            </h2>
            <p className="mt-2 text-[14px] text-lc-muted">
              Costs $0. Caps at three roasts per day. Stop reading and go punch your resume.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-md border border-lc-border bg-lc-surface px-5 py-2.5 text-[14px] font-semibold text-lc-text hover:bg-lc-elevated"
            >
              Log in
            </Link>
            <Link
              href="/roast"
              className="inline-flex items-center justify-center rounded-md bg-lc-orange px-5 py-2.5 text-[14px] font-semibold text-black hover:bg-lc-orangeHover"
            >
              Open roast
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-lc-border px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-[12px] text-lc-dim md:flex-row">
          <p className="font-mono text-lc-muted">
            © {new Date().getFullYear()} am i cooked
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[12px]">
            <Link href="/sign-in" className="hover:text-lc-orange">
              Sign in
            </Link>
            <Link href="/sign-up" className="hover:text-lc-orange">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
