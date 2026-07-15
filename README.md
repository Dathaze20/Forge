# PostPilot

One-tap forensic blog post generator, powered by Gemini. Give it notes on a subject, pick a stance, and it forges a long-form biographical article plus YouTube and Medium metadata &mdash; entirely in your browser.

## How It Works

Everything runs client-side. There is no backend: your Gemini API key is entered once in Settings, saved only in your browser's local storage, and used to call Gemini directly. No files or keys are ever sent to any other server.

## Run Locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, tap the key icon, and paste a Gemini API key (get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).

## Build for Production

```bash
npm run build
```

The built files land in `dist/`, ready for static hosting.

## Deployment

This repo deploys to GitHub Pages automatically via `.github/workflows/deploy.yml` on every push to `main`. Enable it once under **Settings &gt; Pages &gt; Source: GitHub Actions** if it isn't already active.

## Mobile

Open the deployed URL in Chrome on Android and use **Add to Home Screen** to install it as a standalone app &mdash; it's a full PWA (installable icon, offline app shell, wake lock during generation, haptic feedback).

## Privacy

Your Gemini API key lives only in your browser's local storage. Notes and generated content are never sent anywhere except directly to Google's Gemini API.
