# One Click Blog Maker / Forge

A mobile-first AI drafting tool that turns research notes into a structured, long-form article draft using Google Gemini — entirely in your browser, with no backend.

This project started as a personal tool called **One Click Blog Maker**. The codebase and repository are now named **Forge**, and the live app currently runs under a personal author branding, **Abel Arroyo** (the name shown in the app header, browser tab, and home-screen icon). All three names refer to the same application.

## Live App

**[dathaze20.github.io/Forge](https://dathaze20.github.io/Forge/)** — deploys automatically to GitHub Pages on every push to `main` via the official GitHub Pages actions (see [CI / Deployment](#ci--deployment)). If Pages is not yet enabled for this repository, turn it on once under **Settings → Pages → Source: GitHub Actions**.

## What It Does

Writing a long-form article from scratch is slow. This app takes a pile of research notes — facts, quotes, dates, links, loose ideas — and turns them into a full structured draft in one step, so the starting point for editing is a complete piece instead of a blank page.

The output is not a finished, publish-ready article. It's a draft: a long-form piece built to a fixed structure and voice that the user reviews, fact-checks, and continues working with afterward.

## Workflow

1. **Notes in.** The user pastes or types raw research notes into a single input field (there's no separate subject/title field — the notes themselves are the source material).
2. **Pick a stance.** A two-way toggle lets the user frame the piece as broadly favorable (**For It**) or broadly critical (**Against**) of its subject.
3. **The app builds the request.** `services/geminiService.ts` assembles a large, fixed system prompt (structure, voice, length, and fact-accuracy rules) plus a user message containing the notes, the chosen stance, and the current date.
4. **Gemini generates.** The request streams to Google's Gemini API using the user's own API key.
5. **A structured draft comes back.** The app renders the streamed text live, then presents the finished draft — title, subtitle, and labeled sections — for the user to copy and continue working with.

## Features

Verified against the current source:

- **Notes input** — a single large textarea with a live byte counter and a "smart paste" button that reads directly from the clipboard.
- **Stance control** — For It / Against toggle that shapes the framing of the generated piece.
- **One-tap generation** — a single Generate action; disabled until notes are present, and prompts for an API key first if none is set.
- **Streaming output** — the draft renders token-by-token as Gemini generates it, with a live text preview.
- **Progress indicator** — a word-count-based progress bar during generation, plus status messages ("Connecting...", "Retrying...", etc.) reflecting what's actually happening.
- **Cancellation** — generation can be cancelled mid-stream, returning to the input screen.
- **Automatic retry and model fallback** — the app tries a small ordered list of Gemini models and retries transient failures with backoff (see [Generation Pipeline](#generation-pipeline)); this happens automatically, not as a user-facing "regenerate" button.
- **Copy to clipboard** — a one-tap Copy control on the finished draft.
- **Draft stats** — word count and an estimated read time are shown alongside the finished draft.
- **Settings panel** — add, save, or clear the Gemini API key.
- **API key validation and error handling** — checks for a key before generating, and surfaces specific error messages for an invalid key, a rate/quota limit, or a general failure.
- **Mobile-first, installable PWA** — see [Mobile-First Design](#mobile-first-design) below.

Not present in the current codebase: a separate subject/title field, user-facing writing-style or structure controls, Gemini model selection, saved generation history, draft persistence across reloads, or export to a file.

## Generation Pipeline

`services/geminiService.ts` owns the entire request. Two things worth knowing about how it works under the hood:

- **Fixed voice and structure.** The article's voice, its five labeled sections, its title and subtitle format, its length target, and its fact-accuracy rules are all defined in one large built-in system prompt. None of this is user-configurable from the UI — the stance toggle is the only editorial control exposed to the user.
- **Resilient model calls.** The app tries a short ordered list of Gemini models. A rate-limit response switches immediately to the next model instead of retrying the one that's busy; other transient failures (server overload, etc.) retry the same model a few times with exponential backoff; an invalid-API-key error stops immediately rather than retrying, since it will fail identically on every model.

## Mobile-First Design

The UI is built around a phone-sized viewport (`max-w-lg`, safe-area insets for notches and home indicators) and is a fully installable Progressive Web App:

- **Installable** — a web app manifest with standard and maskable icons lets the app be added to a phone's home screen as a standalone app.
- **Offline app shell** — a service worker caches the static shell so the app still opens without a network connection (live generation still requires one, since it calls Gemini directly).
- **Screen Wake Lock** — the screen is kept on for the duration of a generation, since long-form output can take a while to stream in.
- **Haptic feedback** — short vibration patterns confirm key actions (submitting, cancelling, copying, errors) on devices that support it.

## Privacy & API Key Handling

There is no backend and no server component in this repository. Precisely what happens to your data:

- **API key** — entered once in Settings, stored only in the browser's `localStorage` on that device, and attached only to requests made directly to Google's Gemini API.
- **Notes and generated content** — your notes are sent to Google's Gemini API as part of the generation request (they have to be, for Gemini to write from them). They are not sent to, or stored on, any server operated by this app. Once generated, the draft exists only in the browser tab's memory for that session — it is not saved anywhere automatically, so closing or reloading the tab loses it unless it was copied out first.
- **No hidden telemetry** — the app makes exactly two kinds of network calls: fetching its own static assets, and calling Google's Gemini API with the key and content described above.

## Technical Architecture

- **`App.tsx`** — top-level state machine (idle / generating / complete), wake lock and haptics, and the settings panel toggle.
- **`components/`** — presentational pieces: the notes input, the live-generating view, the finished-draft view, the settings panel, the copy button, and the logo.
- **`services/geminiService.ts`** — the only place that talks to Gemini: builds the system prompt and request, manages retries and model fallback, and streams results back via a callback.
- **`lib/apiKey.ts`** — thin wrapper around reading/writing the API key in `localStorage`.
- **`types.ts`** — shared types (generation state, sentiment, streamed result shape).
- **PWA layer** — `public/manifest.webmanifest` and `public/sw.js` provide installability and the offline app shell.

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 (+ PostCSS/Autoprefixer) |
| AI SDK | `@google/genai` (calls Gemini directly from the browser) |
| Animation | Motion |
| Icons | Lucide React |
| Fonts | Self-hosted via Fontsource (Inter, JetBrains Mono, Syncopate) |

## Running Locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, tap the key icon, and paste a Gemini API key (get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).

## Production Build

```bash
npm run build
```

This runs a full TypeScript type check (`tsc --noEmit`) before invoking `vite build`, so a build fails fast on type errors rather than shipping them. Output lands in `dist/`, ready for static hosting.

## CI / Deployment

`.github/workflows/deploy.yml` runs on every push to `main`:

1. Checks out the repo and sets up Node.js 22.
2. `npm install`
3. `npm run build`
4. Uploads `dist/` and deploys it to GitHub Pages via the official `actions/deploy-pages` action.

This workflow does not run on pull requests, and it does not run a separate test suite or linter beyond the type check that's already part of `npm run build`.

## Testing / Code Quality

This project currently has **no automated test suite** — there is no `test` script in `package.json`.

The `npm run lint` script is `tsc --noEmit`: TypeScript type checking, not ESLint. There is no ESLint dependency in this project, so "lint" here means type safety, not style/quality linting.

## Known Limitations

- No draft or notes history — nothing is persisted across a reload except the saved API key.
- No export beyond copy-to-clipboard (no file download, no PDF/Markdown export).
- The article's voice, section structure, and length target are fixed in the built-in prompt and are not user-configurable.
- No automated tests, and no CI checks run on pull requests — a push straight to `main` goes straight to a live production deploy.
- Generation is limited by the user's own Gemini API quota and key permissions.

## Screenshots / Demo

No screenshots are currently committed to the repository. Based on the actual UI, the three most representative captures would be:

1. **The notes screen** — the input textarea with the byte counter and the For It / Against stance toggle.
2. **The finished draft screen** — a generated article with its stats row (word count, read time) and the Copy control.
3. **The Settings panel** — the API key entry screen, since it's central to how the app is set up and how it explains its own privacy model.

## License

This repository does not currently include a `LICENSE` file. No open-source license is granted, and the source should not be treated as available for unrestricted reuse.
