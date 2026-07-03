<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Single Next.js 16 (Turbopack) app named `daedongyeojido` — a Korean travel places directory. UI reads static JSON from `src/data/`, so the web app runs fully with no database, API keys, or external services.
- Dev server: `npm run dev` (serves http://localhost:3000). Standard scripts in `package.json`: `lint`, `build`, `start`.
- `npm run lint` currently reports pre-existing errors/warnings in `scraper/*.js` and `scripts/*.mjs` (e.g. `no-require-imports`); these are unrelated to app runtime.
- The `scraper/` (`crawl`, `scrape`) and `scripts/` (`seed`, `repair-labels`) utilities are optional data-generation tools; they use Playwright and the NVIDIA NIM API and require `NVIDIA_API_KEY`. They are not needed to run or develop the web app.
- No automated test suite exists.
