export const MARQUEE_ITEMS = [
  "Interview prep",
  "Resume Score",
  "AI Insights",
  "Day-by-day plans",
  "Practice questions",
  "In-plan quizzes",
  "Job Match scoring",
  "ATS check",
  "In-depth review",
  "Company-specific",
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
    title: "Resume Score",
    desc: "Multi-dimensional diagnostic: ATS, Content, Writing, and Job Match. You see what to fix before you interview.",
    tag: "Diagnostic",
    featured: true,
  },
  {
    num: "02",
    title: "AI Insights",
    desc: "Specific callouts on your exact bullets, each with a suggested rewrite or prep action. No generic resume advice.",
    tag: "Actionable",
  },
  {
    num: "03",
    title: "AI In-Depth Review",
    desc: "Longer narrative on strengths, risks, story gaps, and where to focus your prep time before the real interview.",
    tag: "Depth",
  },
  {
    num: "04",
    title: "Interview prep plan",
    desc: "Company, role, and JD become a day-by-day timeline with notes, tasks, and quizzes tied to your gaps.",
    tag: "Core product",
  },
  {
    num: "05",
    title: "Practice questions",
    desc: "10+ questions pulled from your bullets and gaps. If ChatGPT could have written them, we regenerate.",
    tag: "Practice",
  },
  {
    num: "06",
    title: "Shareable score",
    desc: "Public score link and OG image with a professional breakdown and no private resume preview.",
    tag: "Optional",
  },
];

export const STEPS = [
  {
    n: "01",
    title: "Upload resume",
    body: "Paste text or add a PDF. The diagnostic starts from the actual bullets.",
  },
  {
    n: "02",
    title: "Pick a target",
    body: "Choose the role you want so the score can judge interview fit.",
  },
  {
    n: "03",
    title: "Read the score",
    body: "See ATS, Content, Writing, and Job Match with specific AI Insights.",
  },
  {
    n: "04",
    title: "Start prep",
    body: "Turn gaps into questions, notes, quizzes, and a day-by-day plan.",
  },
];

export type LandingStat = {
  value: string;
  label: string;
  desc: string;
  valueLead?: string;
  valueAccent?: string;
};

export const STATS: LandingStat[] = [
  {
    valueLead: "4",
    valueAccent: "dimensions",
    value: "4 dimensions",
    label: "Resume Score",
    desc: "ATS, Content, Writing, Job Match. Not just one number",
  },
  {
    valueLead: "Day",
    valueAccent: "by day",
    value: "Day by day",
    label: "Prep structure",
    desc: "Timeline with modules and quizzes, not a random question dump",
  },
  {
    valueLead: "3",
    valueAccent: "min",
    value: "3 min",
    label: "To first score",
    desc: "Upload, pick role, get your diagnostic report",
  },
];

export const HERO = {
  eyebrow: "AI Interview Prep",
  lines: [
    "Prep for your next interview",
    "using your own resume.",
  ],
  sub: "Get a multi-dimensional Resume Score and AI Insights. Then, practice custom questions built directly from your bullet points.",
};

export const FOOTER_CTA = {
  eyebrow: "Interview on the calendar?",
  title: "Start",
  titleAccent: "interview prep.",
  sub: "Free. Score your resume to personalize. Account required.",
};

export const SECTIONS = {
  featuresEyebrow: "What you get",
  featuresTitle: "Everything you need",
  featuresTitleBreak: "to walk in prepared.",
  featuresSub: "Interview prep first. Your Resume Score powers every module.",
  howEyebrow: "Process",
  howTitle: "From score",
  howTitleBreak: "to interview-ready.",
  proofEyebrow: "The product",
  proofTitle: "Your day-by-day",
  proofTitleBreak: "interview plan.",
  proofSub:
    "Paste the JD and resume. Each day opens notes, tasks, and quizzes tied to your gaps and target role.",
  planNotesEyebrow: "Resume-specific notes",
  planNotesTitle: "Notes built from your bullets",
  planNotesSub:
    "Every note starts with a line from your resume and your JD: talking points, rewrites, and interview traps for that story, not generic prep.",
  scoreEyebrow: "Sample diagnostic",
  scoreTitle: "Resume Score",
  scoreRoast:
    "Multi-dimensional breakdown plus AI Insights, the same engine that powers your prep plan.",
};

export const META = {
  leftLines: [
    "Free interview prep",
    "account required",
    "Resume Score included",
    "--------------",
    "Built for",
    "real interviews.",
  ],
  rightQuote:
    "Stop cramming generic questions. Prep against your resume, your JD, and the gaps your score surfaces.",
};
