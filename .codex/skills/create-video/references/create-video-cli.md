# create-video CLI Reference

Snapshot checked from `create-video@4.0.472`, the npm `latest` version on 2026-06-05.

Package:

- Name: `create-video`
- Description: Create a new Remotion project
- Homepage: `https://remotion.dev/templates`
- Repository: `https://github.com/remotion-dev/remotion/tree/main/packages/create-video`
- Bin: `create-video`

Core command:

```bash
npx create-video@latest --yes --blank video
```

Useful flags:

- `--yes` or `-y`: skip prompts. Requires a template flag and directory.
- `--no-tailwind`: disable Tailwind for templates that support optional Tailwind.
- `--tmp`: supported by the CLI internals for temporary project resolution.
- Template flags: use `--<cliId>`.

Templates exposed by the current package:

| Flag | Template | Notes |
| --- | --- | --- |
| `--blank` | Blank | Empty canvas; good for custom motion graphics. |
| `--hello-world` | Hello World | Basic TypeScript animation playground. |
| `--next` | Next.js | Standalone SaaS video-generation app with Tailwind. |
| `--vercel` | Next.js Vercel Sandbox | On-demand render app using Vercel Sandbox. |
| `--next-no-tailwind` | Next.js no Tailwind | Standalone SaaS app without Tailwind. |
| `--next-pages-dir` | Next.js Pages dir | Legacy Pages Router SaaS app. |
| `--recorder` | Recorder | Screen/webcam recording tool. |
| `--prompt-to-motion-graphics` | Prompt to Motion Graphics SaaS Starter Kit | AI animation SaaS starter. |
| `--javascript` | Hello World JavaScript | Plain JS starter. |
| `--render-server` | Render Server | Express render server. |
| `--electron` | Electron | Desktop rendering app. |
| `--react-router` | React Router | SaaS app with React Router. |
| `--three` | React Three Fiber | Remotion plus React Three Fiber. |
| `--still` | Still images | Dynamic PNG/JPEG template. |
| `--audiogram` | Audiogram | Podcast/social waveform video. |
| `--music-visualization` | Music Visualization | Music waveform video. |
| `--prompt-to-video` | Prompt to Video | Uses OpenAI and ElevenLabs for generated media. |
| `--skia` | Skia | React Native Skia starter. |
| `--overlay` | Overlay | Overlays for video editing software. |
| `--code-hike` | Code Hike | Code animations. |
| `--stargazer` | Stargazer | Repo-stars celebration video. |
| `--tiktok` | TikTok | Animated captions; installs Whisper.cpp. |
| `--editor-starter` | Editor Starter | Paid template; CLI exits with purchase link. |

Package source details worth remembering:

- `select-template.js` parses template flags with `minimist`.
- `init.js` errors if `--yes` is used without a directory or without a template flag.
- `init.js` asks whether to continue inside an existing Git repo only when `--yes` is not set.
- `patch-package-json.js` aligns Remotion package versions to the latest detected Remotion version.
