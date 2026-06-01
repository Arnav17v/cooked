# Interview prep plan — notes module guidelines

These rules apply to every **`notes`** module `content` field in the prep planner.
Write for a candidate preparing for a **specific company, role, and JD** — not generic Wikipedia summaries.

## Audience and goal

- Help the candidate **learn, recall, and explain** topics under interview pressure.
- Tie content to the **job description** and **resume** wherever relevant.
- Do not invent company internals, team names, metrics, or fake URLs.
- Second-person coach voice ("you"): direct, practical, skimmable.

---

## 1. Overall structure (every notes module)

Each notes module is a self-contained study doc. Follow this skeleton:

### 1.1 Title

- Open with a clear, descriptive title as **H1**: `# Title`
- The title must reflect this module's topic (not the day number alone).

### 1.2 Introduction

- 2–4 sentences after the title.
- State **scope** (what this module covers) and **purpose** (why it matters for this interview).
- Reference at least one JD keyword or requirement.

### 1.3 Main content

- Organize into logical **H2** (`##`) sections and **H3** (`###`) subsections.
- Max **3–4 heading levels** deep (`#` → `##` → `###` only).
- Flow **general → specific** within each section.

### 1.4 Conclusion

- End with an **H2** section: `## Conclusion` or `## Key takeaways`
- Summarize the main points in a short bullet list or numbered list.
- Reinforce what the candidate should be able to explain in 60 seconds.

---

## 2. Formatting conventions

Use Markdown inside the JSON string (no HTML tags, no outer markdown fences).

### 2.1 Markdown elements

| Element | Syntax |
|---------|--------|
| H1 title | `# Title` |
| Section | `## Section` |
| Subsection | `### Subsection` |
| Bold | `**emphasis**` |
| Italics | `*terminology*` |
| Unordered list | `- item` |
| Ordered list | `1. step` |
| Inline code | `` `identifier` `` |
| Code block | triple backticks on own lines |

### 2.2 Spacing

- Single blank line between paragraphs and list items.
- Double blank line before each new **H2** section.

### 2.3 Tables

Use Markdown tables when comparing options, tradeoffs, or terminology:

```
| Term | Meaning | Interview angle |
|------|---------|-----------------|
| ... | ... | ... |
```

---

## 3. Content organization

### 3.1 Hierarchical structure

- Lead with concepts, then drill into details, then interview application.
- Include **concrete examples** (code snippets, scenarios, command examples) for technical topics.

### 3.2 Definitions and terminology

- Define important terms on first use.
- Add a `## Glossary` or `### Key terms` subsection when the topic is jargon-heavy.

### 3.3 Examples and illustrations

- Technical topics: code snippets, config examples, CLI commands where helpful.
- Conceptual topics: analogies and real-world scenarios tied to the JD.
- Procedural topics: numbered steps; include common pitfalls.

### 3.4 Summaries within sections

- After complex **H2** sections, add a brief **Key takeaways** bullet list (3–5 items).

---

## 4. Special features

### 4.1 Admonitions

Highlight critical interview intel with blockquotes:

```
> **Tip:** Practical advice for answering well.
> **Warning:** Common trap or anti-pattern.
> **Note:** Clarifying context.
> **Example:** Concrete scenario.
```

Use sparingly (1–3 per module).

### 4.2 Cross-references

- Refer to other sections in the same module when useful: "See **Glossary** above."
- Do not reference other days' modules (they may not exist yet).

### 4.3 Interview-specific footer (required)

After the Conclusion, add these exact ALL CAPS headers on their own lines:

```
IF PUSHED
<2–4 lines: follow-up questions interviewers ask when answers are vague>

5-MIN RECAP
<3–5 bullet lines: minimum to remember if they skim once>
```

---

## 5. Adapting to topic type

### 5.1 Technical topics

- Include relevant code, commands, or config examples.
- Explain acronyms and name **real** RFCs, whitepapers, or official docs when they genuinely help (e.g. OAuth 2.0 RFC 6749) — no fabricated citations.
- Connect stack choices to JD requirements.

### 5.2 Conceptual topics

- Use analogies; explain tradeoffs (CAP, consistency vs availability, etc.).
- Describe relationships in prose or simple ASCII flow when helpful.

### 5.3 Procedural topics

- Numbered steps for processes (debugging, deployment, OAuth flow).
- Add troubleshooting tips and "what interviewers listen for."

---

## 6. Quality bar

### 6.1 Depth

- **Minimum 25 lines** per notes module (including headings, lists, tables, admonitions).
- Thin notes (a paragraph or two) are a failure — expand with definitions, tradeoffs, and interview angles.

### 6.2 Audience awareness

- Match depth to experience level (fresher → fundamentals first; senior → tradeoffs and system angles).
- Explain concepts the JD assumes but the resume may not demonstrate.

### 6.3 Readability

- Clear, concise sentences; break long paragraphs into chunks.
- No filler, no generic motivational coaching.

### 6.4 Anti-patterns (never do)

- Vague one-liners ("understand distributed systems")
- Wikipedia dumps with no interview angle
- Fake LeetCode URLs or invented problem names
- STAR behavioral scripts in notes modules (those belong in **task** modules)
- Repeating the day's `focus_area` without adding depth

---

## 7. Good vs bad example

**Bad (too thin, no structure):**
```
## Python GIL
The GIL prevents true parallelism in threads. Consider multiprocessing for CPU-bound work.
```

**Good (follows sections 1–4):**
```
# Python concurrency for backend interviews

You need to pick the right concurrency model when the JD mentions high-throughput APIs or batch jobs. This module covers CPython's GIL and when threads, async, or processes actually help.

## Why the GIL matters

### What it does
- **GIL** = Global Interpreter Lock: one thread runs Python bytecode at a time in CPython
- *I/O-bound* work still benefits from threads (GIL released during I/O)

### JD tie-in
- "Scalable REST APIs" → often **async** + non-blocking I/O
- "Data pipelines" → **multiprocessing** or worker pools for CPU-heavy steps

| Model | Best for | Watch out |
|-------|----------|-----------|
| Threads | I/O-bound, blocking calls | CPU-bound → no speedup |
| asyncio | Many concurrent I/O connections | CPU work blocks the loop |
| Multiprocessing | CPU-bound parallelism | Overhead, serialization cost |

> **Warning:** Don't say "threads are always bad in Python" — interviewers want nuance.

## Glossary

- **asyncio** — event loop; cooperative multitasking for I/O
- **multiprocessing** — separate interpreters; bypasses GIL for CPU work

## Conclusion

## Key takeaways
- GIL limits CPU parallelism in threads
- Match model to workload: I/O → threads/async; CPU → processes
- Always tie your answer to what the JD's system actually does

IF PUSHED
"Why not threads for CPU work?" → GIL; use processes or native extensions
"When is async enough?" → I/O-bound, many connections, minimal CPU in coroutines

5-MIN RECAP
- GIL = one bytecode executor at a time in CPython
- I/O-bound → threads or async; CPU-bound → multiprocessing
- Name tradeoffs, not buzzwords
```
