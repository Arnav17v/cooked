export const MARQUEE_ITEMS = [
  "Day-by-day prep",
  "Company-specific plans",
  "In-plan quizzes",
  "Study modules",
  "Interview timeline",
  "Resume-powered",
  "Cooked Score",
  "Red flag detection",
  "Personalized questions",
  "Quiz grading",
];

export type LandingFeature = {
  num: string;
  title: string;
  desc: string;
  tag: string;
  featured?: boolean;
};

export const FEATURES: LandingFeature[] = [
  {
    num: "01",
    title: "Interview prep plan",
    desc: "Company, role, interview date, and JD → a day-by-day timeline. Open each day in a focused player with notes, tasks, and quizzes.",
    tag: "Core product",
    featured: true,
  },
  {
    num: "02",
    title: "Daily study modules",
    desc: "Structured notes and tasks per day — generated when you open them, grounded in your resume and the role you're chasing.",
    tag: "Depth on demand",
  },
  {
    num: "03",
    title: "Quizzes inside the plan",
    desc: "Short quizzes tied to each day's focus. Score lands on the module — retake or drill weak spots before the real interview.",
    tag: "Practice",
  },
  {
    num: "04",
    title: "Resume roast + Cooked Score",
    desc: "One blunt pass on your resume powers everything: score, heat label, flags, and the bullets your prep plan references.",
    tag: "Foundation",
  },
  {
    num: "05",
    title: "Red flags + rewrites",
    desc: "Weak bullets flagged with the issue and a suggested rewrite — not vague advice.",
    tag: "Actionable",
  },
  {
    num: "06",
    title: "Share card",
    desc: "Screenshot-able score page with OG image when you want receipts.",
    tag: "Optional",
  },
];

export const STEPS = [
  {
    n: "01",
    title: "Roast your resume",
    desc: "Upload once. Get a Cooked Score, red flags, and rewrites — the blunt baseline your plan builds on.",
  },
  {
    n: "02",
    title: "Create your prep plan",
    desc: "Add company, role, interview date, and JD. We map days from today until interview day.",
  },
  {
    n: "03",
    title: "Work the plan daily",
    desc: "Open modules, take in-plan quizzes, catch up on backlog. Walk in knowing what to say.",
  },
];

export type LandingStat = {
  /** Primary line in the stat column (keep short; renders on one line). */
  value: string;
  label: string;
  desc: string;
  /** Optional rust accent word inside `value` (rendered after `valueLead`). */
  valueLead?: string;
  valueAccent?: string;
};

export const STATS: LandingStat[] = [
  {
    valueLead: "Day",
    valueAccent: "by day",
    value: "Day by day",
    label: "Prep structure",
    desc: "Timeline from today to interview — not a random question dump",
  },
  {
    valueLead: "3",
    valueAccent: "min",
    value: "3 min",
    label: "Module quizzes",
    desc: "Quick drills tied to each day's focus area",
  },
  {
    value: "0–100",
    label: "Cooked Score",
    desc: "Roast once — every module stays personalized to your bullets",
  },
];

export const HERO = {
  eyebrow: "AI Interview Prep",
  lines: ["Your interview is coming.", "Your prep shouldn't be random.", "Get a plan."],
  cookedWord: "ready",
  sub: "Build a day-by-day prep plan from your resume — notes, tasks, and quizzes for the company and role you're actually interviewing for.",
};

export const FOOTER_CTA = {
  eyebrow: "Interview on the calendar?",
  title: "Start your",
  titleAccent: "prep plan.",
  sub: "Free. Roast once to personalize. Account required.",
};

export const SECTIONS = {
  featuresEyebrow: "What you get",
  featuresTitle: "Everything you need",
  featuresTitleBreak: "to walk in prepared.",
  featuresSub: "Structured prep first — roast powers the personalization.",
  howEyebrow: "Process",
  howTitle: "From roast",
  howTitleBreak: "to interview-ready.",
  proofEyebrow: "The product",
  proofTitle: "Your prep plan,",
  proofTitleBreak: "one day at a time.",
  scoreEyebrow: "Powered by your roast",
  scoreTitle: "Cooked Score",
  scoreRoast:
    "Your bullets, scored bluntly — so every day of prep references what you actually wrote.",
};

export const META = {
  leftLines: ["Free prep planner", "account required", "roast included", "──────────────", "Built for", "real interviews."],
  rightQuote:
    "Stop cramming generic questions. Prep against your resume, your JD, and your interview date.",
};
