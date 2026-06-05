import type {CSSProperties, ReactNode} from "react";
import {
	AbsoluteFill,
	Audio,
	Easing,
	interpolate,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from "remotion";

type ScreenMode =
	| "hook"
	| "landing"
	| "upload"
	| "jd"
	| "generate"
	| "plan"
	| "quiz"
	| "critique"
	| "score";

const ORANGE = "#ffa116";
const GREEN = "#22c55e";
const RED = "#ef4444";
const TEXT = "#f5f5f4";
const MUTED = "#a8a29e";
const BORDER = "#2a2a2a";
const DURATION_IN_FRAMES = 1620;
const FPS = 30;

const captions = [
	{
		start: 0,
		end: 96,
		text: "Interview in 5 days. Don't know where to start.",
		emphasis: "5 days",
	},
	{
		start: 96,
		end: 228,
		text: "Got an interview in 5 days and no idea what to study?",
		emphasis: "what to study",
	},
	{
		start: 228,
		end: 390,
		text: "Paste the job description. Upload your resume.",
		emphasis: "job description",
	},
	{
		start: 390,
		end: 660,
		text: "We build you a day by day prep plan specific to that company, that role, your actual background.",
		emphasis: "your actual background",
	},
	{
		start: 660,
		end: 850,
		text: "Not generic LeetCode grind. Not random YouTube tutorials.",
		emphasis: "Not generic",
	},
	{
		start: 850,
		end: 1185,
		text: "Exactly what you need to study. Day by day. Question by question.",
		emphasis: "Day by day",
	},
	{
		start: 1185,
		end: 1455,
		text: "Walk in ready.",
		emphasis: "ready",
	},
	{
		start: 1455,
		end: DURATION_IN_FRAMES,
		text: "getuncooked.pro — free to try.",
		emphasis: "free",
	},
];

const planDays = [
	{
		day: "Day 1",
		title: "System design fundamentals",
		detail: "APIs, queues, consistency, rate limits",
	},
	{
		day: "Day 2",
		title: "Behavioral questions from your projects",
		detail: "ownership, conflict, launch tradeoffs",
	},
	{
		day: "Day 3",
		title: "Payments backend deep dive",
		detail: "idempotency, retries, reconciliation",
	},
	{
		day: "Day 4",
		title: "Resume-based mock interview",
		detail: "questions pulled from your bullets",
	},
	{
		day: "Day 5",
		title: "Weak spots and final polish",
		detail: "tight answers, crisp stories, confidence",
	},
];

const jdLines = [
	"Razorpay · Software Development Engineer",
	"Build scalable payment products used by millions of merchants.",
	"Strong backend fundamentals, APIs, distributed systems, ownership.",
	"Design reliable systems with monitoring, testing, and business context.",
];

const resumeBullets = [
	"Built fraud-detection pipeline that reduced false positives by 18%",
	"Scaled checkout service from 12k to 40k requests/minute",
	"Led migration from cron jobs to event-driven workers",
];

const clamp = (value: number, min: number, max: number) => {
	return Math.min(Math.max(value, min), max);
};

const fade = (frame: number, start: number, end: number) => {
	return interpolate(frame, [start, start + 12, end - 12, end], [0, 1, 1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
};

const pop = (frame: number, start: number) => {
	return spring({
		frame: frame - start,
		fps: FPS,
		config: {
			damping: 17,
			mass: 0.85,
			stiffness: 140,
		},
	});
};

const screenModeForFrame = (frame: number): ScreenMode => {
	if (frame < 95) return "hook";
	if (frame < 230) return "landing";
	if (frame < 355) return "upload";
	if (frame < 520) return "jd";
	if (frame < 660) return "generate";
	if (frame < 1010) return "plan";
	if (frame < 1220) return "quiz";
	if (frame < 1450) return "critique";
	return "score";
};

const panelStyle: CSSProperties = {
	background: "rgba(16, 16, 16, 0.94)",
	border: `2px solid ${BORDER}`,
	borderRadius: 28,
	boxShadow: "0 28px 90px rgba(0, 0, 0, 0.42)",
};

const SmallLabel = ({children}: {children: ReactNode}) => {
	return (
		<div
			style={{
				color: MUTED,
				fontFamily: "Inter, system-ui, sans-serif",
				fontSize: 24,
				fontWeight: 700,
				textTransform: "uppercase",
			}}
		>
			{children}
		</div>
	);
};

const Pill = ({
	children,
	tone = "neutral",
}: {
	children: ReactNode;
	tone?: "neutral" | "orange" | "green" | "red";
}) => {
	const color =
		tone === "orange" ? ORANGE : tone === "green" ? GREEN : tone === "red" ? RED : MUTED;
	return (
		<div
			style={{
				display: "inline-flex",
				alignItems: "center",
				border: `1px solid ${color}`,
				borderRadius: 999,
				color,
				fontFamily: "JetBrains Mono, SFMono-Regular, Menlo, monospace",
				fontSize: 22,
				fontWeight: 700,
				padding: "8px 14px",
			}}
		>
			{children}
		</div>
	);
};

const Cursor = ({mode}: {mode: ScreenMode}) => {
	const frame = useCurrentFrame();
	const points: Record<ScreenMode, [number, number]> = {
		hook: [500, 990],
		landing: [545, 790],
		upload: [505, 915],
		jd: [620, 730],
		generate: [760, 1135],
		plan: [790, 1150],
		quiz: [770, 860],
		critique: [760, 1290],
		score: [785, 1010],
	};
	const [x, y] = points[mode];
	const tap = mode === "generate" ? Math.sin(frame * 0.42) : 0;
	return (
		<div
			style={{
				position: "absolute",
				left: x + tap * 8,
				top: y + tap * 8,
				width: 0,
				height: 0,
				borderLeft: "24px solid white",
				borderTop: "16px solid transparent",
				borderBottom: "16px solid transparent",
				filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
				transform: "rotate(-18deg)",
				zIndex: 30,
			}}
		/>
	);
};

const BrowserFrame = ({children}: {children: ReactNode}) => {
	return (
		<div
			style={{
				...panelStyle,
				position: "absolute",
				left: 52,
				top: 184,
				width: 976,
				height: 1234,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					alignItems: "center",
					background: "#101010",
					borderBottom: `1px solid ${BORDER}`,
					display: "flex",
					gap: 14,
					height: 78,
					padding: "0 24px",
				}}
			>
				<div style={{display: "flex", gap: 9}}>
					{["#ef4444", "#eab308", "#22c55e"].map((color) => (
						<div
							key={color}
							style={{
								background: color,
								borderRadius: 999,
								height: 16,
								width: 16,
							}}
						/>
					))}
				</div>
				<div
					style={{
						background: "#0a0a0a",
						border: `1px solid ${BORDER}`,
						borderRadius: 999,
						color: "#d6d3d1",
						flex: 1,
						fontFamily: "JetBrains Mono, SFMono-Regular, Menlo, monospace",
						fontSize: 22,
						fontWeight: 700,
						padding: "12px 22px",
					}}
				>
					getuncooked.pro
				</div>
			</div>
			<div style={{height: 1156, position: "relative"}}>{children}</div>
		</div>
	);
};

const Header = () => {
	const frame = useCurrentFrame();
	const seconds = Math.floor(frame / FPS)
		.toString()
		.padStart(2, "0");
	return (
		<div
			style={{
				alignItems: "center",
				display: "flex",
				justifyContent: "space-between",
				left: 52,
				position: "absolute",
				right: 52,
				top: 48,
				zIndex: 40,
			}}
		>
			<div style={{alignItems: "center", display: "flex", gap: 14}}>
				<div
					style={{
						background: RED,
						borderRadius: 999,
						height: 14,
						width: 14,
					}}
				/>
				<Pill tone="red">REC 00:{seconds}</Pill>
			</div>
			<Pill tone="orange">interview prep in public</Pill>
		</div>
	);
};

const FaceCam = () => {
	const frame = useCurrentFrame();
	const wobble = Math.sin(frame * 0.035) * 4;
	return (
		<div
			style={{
				...panelStyle,
				background: "linear-gradient(145deg, #1f1b16, #0b0b0b)",
				height: 292,
				position: "absolute",
				right: 52,
				top: 136,
				transform: `translateY(${wobble}px)`,
				width: 236,
				zIndex: 45,
			}}
		>
			<div
				style={{
					background:
						"radial-gradient(circle at 70% 18%, rgba(255,161,22,0.55), transparent 19%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent)",
					borderRadius: 24,
					height: "100%",
					overflow: "hidden",
					position: "relative",
				}}
			>
				<div
					style={{
						background: "rgba(255,161,22,0.28)",
						borderRadius: "50% 50% 38% 38%",
						height: 66,
						left: 84,
						position: "absolute",
						top: 94,
						width: 66,
					}}
				/>
				<div
					style={{
						background: "rgba(245,245,244,0.11)",
						borderRadius: "44px 44px 18px 18px",
						height: 92,
						left: 62,
						position: "absolute",
						top: 158,
						width: 112,
					}}
				/>
				<div
					style={{
						bottom: 14,
						color: "#e7e5e4",
						fontFamily: "JetBrains Mono, SFMono-Regular, Menlo, monospace",
						fontSize: 17,
						fontWeight: 800,
						left: 16,
						position: "absolute",
					}}
				>
					face cam
				</div>
			</div>
		</div>
	);
};

const HookScreen = () => {
	const frame = useCurrentFrame();
	const scale = interpolate(frame, [0, 30, 90], [0.92, 1, 1.04], {
		extrapolateRight: "clamp",
	});
	return (
		<AbsoluteFill
			style={{
				alignItems: "center",
				background:
					"radial-gradient(circle at 50% 42%, rgba(255,161,22,0.18), transparent 36%), #090909",
				justifyContent: "center",
				padding: 72,
				transform: `scale(${scale})`,
			}}
		>
			<div
				style={{
					color: TEXT,
					fontFamily: "Inter, system-ui, sans-serif",
					fontSize: 94,
					fontWeight: 900,
					lineHeight: 1.02,
					textAlign: "center",
				}}
			>
				Interview in <span style={{color: ORANGE}}>5 days</span>.
				<br />
				Don't know where to start.
			</div>
		</AbsoluteFill>
	);
};

const LandingScreen = () => (
	<BrowserFrame>
		<div style={{padding: 58}}>
			<SmallLabel>Get Uncooked</SmallLabel>
			<div
				style={{
					color: TEXT,
					fontFamily: "Inter, system-ui, sans-serif",
					fontSize: 82,
					fontWeight: 900,
					lineHeight: 1,
					marginTop: 34,
					width: 760,
				}}
			>
				Interview prep built from your resume.
			</div>
			<div
				style={{
					color: MUTED,
					fontFamily: "Inter, system-ui, sans-serif",
					fontSize: 34,
					fontWeight: 600,
					lineHeight: 1.28,
					marginTop: 32,
					width: 710,
				}}
			>
				Upload your resume, paste the role, and get a focused prep path.
			</div>
			<div style={{display: "flex", gap: 18, marginTop: 48}}>
				<div
					style={{
						background: ORANGE,
						borderRadius: 14,
						color: "#111",
						fontFamily: "Inter, system-ui, sans-serif",
						fontSize: 29,
						fontWeight: 900,
						padding: "20px 26px",
					}}
				>
					Start prep
				</div>
				<div
					style={{
						border: `1px solid ${BORDER}`,
						borderRadius: 14,
						color: TEXT,
						fontFamily: "Inter, system-ui, sans-serif",
						fontSize: 29,
						fontWeight: 800,
						padding: "20px 26px",
					}}
				>
					See demo
				</div>
			</div>
			<MiniScoreCard />
		</div>
	</BrowserFrame>
);

const MiniScoreCard = () => (
	<div
		style={{
			background: "#0c0c0c",
			border: `1px solid ${BORDER}`,
			borderRadius: 24,
			bottom: 54,
			left: 58,
			padding: 28,
			position: "absolute",
			right: 58,
		}}
	>
		<div style={{alignItems: "center", display: "flex", justifyContent: "space-between"}}>
			<div>
				<SmallLabel>Resume Score</SmallLabel>
				<div
					style={{
						color: TEXT,
						fontFamily: "Inter, system-ui, sans-serif",
						fontSize: 44,
						fontWeight: 900,
						marginTop: 8,
					}}
				>
					54/100 → focused plan
				</div>
			</div>
			<Pill tone="orange">AI Insights</Pill>
		</div>
	</div>
);

const UploadScreen = () => {
	const frame = useCurrentFrame();
	const progress = interpolate(frame, [250, 330], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	return (
		<BrowserFrame>
			<div style={{padding: 52}}>
				<SmallLabel>Step 1</SmallLabel>
				<div
					style={{
						color: TEXT,
						fontFamily: "Inter, system-ui, sans-serif",
						fontSize: 56,
						fontWeight: 900,
						marginTop: 18,
					}}
				>
					Upload resume
				</div>
				<div
					style={{
						border: `2px dashed ${ORANGE}`,
						borderRadius: 24,
						marginTop: 42,
						padding: 42,
					}}
				>
					<div style={{color: TEXT, fontFamily: "Inter, Arial, sans-serif", fontSize: 38, fontWeight: 900}}>
						Arnav_Verma_resume.pdf
					</div>
					<div style={{color: MUTED, fontFamily: "Inter, Arial, sans-serif", fontSize: 28, marginTop: 14}}>
						Parsing projects, metrics, and interview hooks...
					</div>
					<div
						style={{
							background: "#252525",
							borderRadius: 999,
							height: 16,
							marginTop: 32,
							overflow: "hidden",
						}}
					>
						<div
							style={{
								background: ORANGE,
								borderRadius: 999,
								height: "100%",
								width: `${progress * 100}%`,
							}}
						/>
					</div>
				</div>
				<div style={{display: "grid", gap: 18, marginTop: 36}}>
					{resumeBullets.map((bullet, index) => (
						<div
							key={bullet}
							style={{
								background: "#111",
								border: `1px solid ${BORDER}`,
								borderRadius: 18,
								color: index === 0 ? TEXT : MUTED,
								fontFamily: "Inter, Arial, sans-serif",
								fontSize: 26,
								fontWeight: 700,
								padding: 22,
							}}
						>
							{bullet}
						</div>
					))}
				</div>
			</div>
		</BrowserFrame>
	);
};

const JdScreen = () => {
	const frame = useCurrentFrame();
	const text = jdLines.join("\n");
	const typedLength = Math.floor(
		interpolate(frame, [355, 500], [0, text.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);
	return (
		<BrowserFrame>
			<div style={{padding: 52}}>
				<SmallLabel>Step 2</SmallLabel>
				<div
					style={{
						color: TEXT,
						fontFamily: "Inter, Arial, sans-serif",
						fontSize: 52,
						fontWeight: 900,
						marginTop: 18,
					}}
				>
					Paste the JD
				</div>
				<div
					style={{
						background: "#0d0d0d",
						border: `1px solid ${BORDER}`,
						borderRadius: 22,
						color: "#e7e5e4",
						fontFamily: "JetBrains Mono, SFMono-Regular, Menlo, monospace",
						fontSize: 30,
						fontWeight: 700,
						lineHeight: 1.38,
						marginTop: 40,
						minHeight: 420,
						padding: 32,
						whiteSpace: "pre-wrap",
					}}
				>
					{text.slice(0, typedLength)}
					<span style={{color: ORANGE}}>|</span>
				</div>
				<div style={{display: "flex", gap: 14, marginTop: 36}}>
					<Pill tone="orange">backend</Pill>
					<Pill>distributed systems</Pill>
					<Pill>ownership</Pill>
				</div>
			</div>
		</BrowserFrame>
	);
};

const GenerateScreen = () => {
	const frame = useCurrentFrame();
	const steps = ["Resume parsed", "JD matched", "Plan generated", "Quiz ready"];
	return (
		<BrowserFrame>
			<div style={{padding: 52}}>
				<SmallLabel>Step 3</SmallLabel>
				<div
					style={{
						color: TEXT,
						fontFamily: "Inter, Arial, sans-serif",
						fontSize: 56,
						fontWeight: 900,
						marginTop: 18,
					}}
				>
					Generate prep plan
				</div>
				<div
					style={{
						background: ORANGE,
						borderRadius: 18,
						color: "#111",
						fontFamily: "Inter, Arial, sans-serif",
						fontSize: 36,
						fontWeight: 900,
						marginTop: 44,
						padding: "24px 32px",
						textAlign: "center",
						transform: `scale(${1 + Math.max(0, Math.sin(frame * 0.3)) * 0.02})`,
					}}
				>
					Generate
				</div>
				<div style={{display: "grid", gap: 18, marginTop: 44}}>
					{steps.map((step, index) => {
						const active = frame > 560 + index * 25;
						return (
							<div
								key={step}
								style={{
									alignItems: "center",
									background: "#111",
									border: `1px solid ${active ? ORANGE : BORDER}`,
									borderRadius: 18,
									color: active ? TEXT : MUTED,
									display: "flex",
									fontFamily: "Inter, Arial, sans-serif",
									fontSize: 30,
									fontWeight: 800,
									gap: 18,
									padding: 24,
								}}
							>
								<div
									style={{
										background: active ? GREEN : "#2b2b2b",
										borderRadius: 999,
										height: 22,
										width: 22,
									}}
								/>
								{step}
							</div>
						);
					})}
				</div>
			</div>
		</BrowserFrame>
	);
};

const PlanScreen = () => {
	const frame = useCurrentFrame();
	return (
		<BrowserFrame>
			<div style={{padding: 42}}>
				<div style={{alignItems: "center", display: "flex", justifyContent: "space-between"}}>
					<div>
						<SmallLabel>Your 5-day plan</SmallLabel>
						<div
							style={{
								color: TEXT,
								fontFamily: "Inter, Arial, sans-serif",
								fontSize: 46,
								fontWeight: 900,
								marginTop: 10,
							}}
						>
							Razorpay SDE prep
						</div>
					</div>
					<Pill tone="green">company-specific</Pill>
				</div>
				<div style={{display: "grid", gap: 18, marginTop: 30}}>
					{planDays.map((item, index) => {
						const start = 690 + index * 56;
						const shown = pop(frame, start);
						return (
							<div
								key={item.day}
								style={{
									background:
										index === 0
											? "linear-gradient(135deg, rgba(255,161,22,0.18), #111)"
											: "#111",
									border: `1px solid ${index === 0 ? ORANGE : BORDER}`,
									borderRadius: 20,
									opacity: clamp(shown, 0, 1),
									padding: 24,
									transform: `translateY(${(1 - shown) * 32}px)`,
								}}
							>
								<div style={{alignItems: "center", display: "flex", gap: 16}}>
									<Pill tone={index === 0 ? "orange" : "neutral"}>{item.day}</Pill>
									<div
										style={{
											color: TEXT,
											fontFamily: "Inter, Arial, sans-serif",
											fontSize: 31,
											fontWeight: 900,
										}}
									>
										{item.title}
									</div>
								</div>
								<div
									style={{
										color: MUTED,
										fontFamily: "Inter, Arial, sans-serif",
										fontSize: 24,
										fontWeight: 700,
										marginTop: 14,
									}}
								>
									{item.detail}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</BrowserFrame>
	);
};

const QuizScreen = () => (
	<BrowserFrame>
		<div style={{padding: 48}}>
			<SmallLabel>Quiz session</SmallLabel>
			<div
				style={{
					color: TEXT,
					fontFamily: "Inter, Arial, sans-serif",
					fontSize: 48,
					fontWeight: 900,
					lineHeight: 1.05,
					marginTop: 18,
				}}
			>
				Question pulled from your resume
			</div>
			<div
				style={{
					background: "#0d0d0d",
					border: `1px solid ${ORANGE}`,
					borderRadius: 24,
					color: TEXT,
					fontFamily: "Inter, Arial, sans-serif",
					fontSize: 35,
					fontWeight: 850,
					lineHeight: 1.2,
					marginTop: 38,
					padding: 32,
				}}
			>
				Your resume mentions a fraud-detection pipeline that cut false positives by
				18%. How would you redesign it for Razorpay-scale payments?
			</div>
			<div style={{display: "flex", gap: 14, marginTop: 24}}>
				<Pill tone="orange">source: fraud pipeline bullet</Pill>
				<Pill>system design</Pill>
			</div>
			<div
				style={{
					background: "#111",
					border: `1px solid ${BORDER}`,
					borderRadius: 22,
					color: MUTED,
					fontFamily: "Inter, Arial, sans-serif",
					fontSize: 27,
					fontWeight: 700,
					lineHeight: 1.35,
					marginTop: 38,
					minHeight: 220,
					padding: 28,
				}}
			>
				Start with ingestion, risk scoring, retries, and merchant-level rate limits...
			</div>
		</div>
	</BrowserFrame>
);

const CritiqueScreen = () => {
	const frame = useCurrentFrame();
	const typed =
		"I'd partition by merchant, make scoring idempotent, add a retry queue, and track latency SLOs for checkout-critical paths.";
	const shown = Math.floor(
		interpolate(frame, [1230, 1340], [0, typed.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);
	return (
		<BrowserFrame>
			<div style={{padding: 44}}>
				<SmallLabel>AI critique</SmallLabel>
				<div
					style={{
						background: "#111",
						border: `1px solid ${BORDER}`,
						borderRadius: 22,
						color: TEXT,
						fontFamily: "Inter, Arial, sans-serif",
						fontSize: 30,
						fontWeight: 750,
						lineHeight: 1.32,
						marginTop: 28,
						minHeight: 210,
						padding: 28,
					}}
				>
					{typed.slice(0, shown)}
					<span style={{color: ORANGE}}>|</span>
				</div>
				<div style={{display: "grid", gap: 18, marginTop: 28}}>
					<FeedbackCard
						tone="green"
						title="Strong"
						body="Connects your resume project to payment-scale reliability."
					/>
					<FeedbackCard
						tone="orange"
						title="Tighten"
						body="Name idempotency keys, reconciliation jobs, and latency budgets."
					/>
					<FeedbackCard
						tone="red"
						title="Prep next"
						body="Be ready to explain exactly what changed after false positives dropped."
					/>
				</div>
			</div>
		</BrowserFrame>
	);
};

const FeedbackCard = ({
	body,
	title,
	tone,
}: {
	body: string;
	title: string;
	tone: "green" | "orange" | "red";
}) => {
	const color = tone === "green" ? GREEN : tone === "orange" ? ORANGE : RED;
	return (
		<div
			style={{
				background: "#111",
				border: `1px solid ${color}`,
				borderRadius: 20,
				padding: 24,
			}}
		>
			<div
				style={{
					color,
					fontFamily: "JetBrains Mono, SFMono-Regular, Menlo, monospace",
					fontSize: 22,
					fontWeight: 900,
					textTransform: "uppercase",
				}}
			>
				{title}
			</div>
			<div
				style={{
					color: TEXT,
					fontFamily: "Inter, Arial, sans-serif",
					fontSize: 28,
					fontWeight: 750,
					lineHeight: 1.25,
					marginTop: 10,
				}}
			>
				{body}
			</div>
		</div>
	);
};

const ScoreScreen = () => {
	const frame = useCurrentFrame();
	const value = Math.round(
		interpolate(frame, [1450, 1560], [54, 82], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
			easing: Easing.out(Easing.cubic),
		}),
	);
	return (
		<BrowserFrame>
			<div
				style={{
					alignItems: "center",
					display: "flex",
					flexDirection: "column",
					height: "100%",
					justifyContent: "center",
					padding: 52,
				}}
			>
				<SmallLabel>Prep readiness</SmallLabel>
				<div
					style={{
						color: TEXT,
						fontFamily: "Inter, Arial, sans-serif",
						fontSize: 126,
						fontWeight: 950,
						lineHeight: 1,
						marginTop: 24,
					}}
				>
					{value}
					<span style={{color: MUTED, fontSize: 54}}>/100</span>
				</div>
				<div
					style={{
						background: "#262626",
						borderRadius: 999,
						height: 24,
						marginTop: 36,
						overflow: "hidden",
						width: 680,
					}}
				>
					<div
						style={{
							background: `linear-gradient(90deg, ${ORANGE}, ${GREEN})`,
							borderRadius: 999,
							height: "100%",
							width: `${value}%`,
						}}
					/>
				</div>
				<div
					style={{
						color: MUTED,
						fontFamily: "Inter, Arial, sans-serif",
						fontSize: 30,
						fontWeight: 750,
						lineHeight: 1.25,
						marginTop: 42,
						textAlign: "center",
						width: 650,
					}}
				>
					Plan done. Weak spots tagged. Questions practiced.
				</div>
				<div
					style={{
						color: ORANGE,
						fontFamily: "Inter, Arial, sans-serif",
						fontSize: 54,
						fontWeight: 950,
						marginTop: 72,
					}}
				>
					getuncooked.pro
				</div>
				<div style={{marginTop: 18}}>
					<Pill tone="green">free to try</Pill>
				</div>
			</div>
		</BrowserFrame>
	);
};

const CurrentScreen = () => {
	const frame = useCurrentFrame();
	const mode = screenModeForFrame(frame);
	if (mode === "hook") return <HookScreen />;
	if (mode === "landing") return <LandingScreen />;
	if (mode === "upload") return <UploadScreen />;
	if (mode === "jd") return <JdScreen />;
	if (mode === "generate") return <GenerateScreen />;
	if (mode === "plan") return <PlanScreen />;
	if (mode === "quiz") return <QuizScreen />;
	if (mode === "critique") return <CritiqueScreen />;
	return <ScoreScreen />;
};

const Caption = () => {
	const frame = useCurrentFrame();
	const active = captions.find((caption) => frame >= caption.start && frame < caption.end);
	if (!active) return null;
	const opacity = fade(frame, active.start, active.end);
	const parts = active.text.split(active.emphasis);
	return (
		<div
			style={{
				background: "rgba(7, 7, 7, 0.84)",
				border: `1px solid ${BORDER}`,
				borderRadius: 26,
				bottom: 126,
				color: TEXT,
				fontFamily: "Inter, system-ui, sans-serif",
				fontSize: active.text.length > 72 ? 42 : 48,
				fontWeight: 900,
				left: 52,
				lineHeight: 1.13,
				opacity,
				padding: "28px 34px",
				position: "absolute",
				right: 52,
				textAlign: "center",
				zIndex: 60,
			}}
		>
			{parts[0]}
			<span style={{color: ORANGE}}>{active.emphasis}</span>
			{parts[1]}
		</div>
	);
};

const Progress = () => {
	const frame = useCurrentFrame();
	const width = interpolate(frame, [0, DURATION_IN_FRAMES], [0, 100], {
		extrapolateRight: "clamp",
	});
	return (
		<div
			style={{
				background: "rgba(255,255,255,0.08)",
				bottom: 58,
				height: 10,
				left: 52,
				position: "absolute",
				right: 52,
				zIndex: 70,
			}}
		>
			<div
				style={{
					background: ORANGE,
					height: "100%",
					width: `${width}%`,
				}}
			/>
		</div>
	);
};

const Grain = () => {
	return (
		<AbsoluteFill
			style={{
				backgroundImage:
					"linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
				backgroundSize: "18px 18px",
				mixBlendMode: "screen",
				opacity: 0.2,
				pointerEvents: "none",
			}}
		/>
	);
};

export const MyComposition = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const mode = screenModeForFrame(frame);
	const entry = spring({
		frame,
		fps,
		config: {
			damping: 22,
			stiffness: 90,
		},
	});
	return (
		<AbsoluteFill
			style={{
				background:
					"radial-gradient(circle at 20% 10%, rgba(255,161,22,0.2), transparent 28%), radial-gradient(circle at 85% 88%, rgba(34,197,94,0.12), transparent 30%), #080808",
				color: TEXT,
				fontFamily: "Inter, system-ui, sans-serif",
				overflow: "hidden",
				transform: `scale(${0.985 + entry * 0.015})`,
			}}
		>
			<Audio src={staticFile("lofi-bed.mp3")} volume={0.16} />
			<CurrentScreen />
			{mode !== "hook" ? (
				<>
					<Header />
					<FaceCam />
					<Cursor mode={mode} />
				</>
			) : null}
			<Caption />
			<Progress />
			<Grain />
		</AbsoluteFill>
	);
};

export const VIDEO_DURATION_IN_FRAMES = DURATION_IN_FRAMES;
