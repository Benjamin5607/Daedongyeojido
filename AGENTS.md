<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Single Next.js 16 (Turbopack) app named `daedongyeojido` — a Korean travel places directory. UI reads static JSON from `src/data/`, so the web app runs fully with no database, API keys, or external services.
- Dev server: `npm run dev` (serves http://localhost:3000). Standard scripts in `package.json`: `lint`, `build`, `start`.
- `npm run lint` currently reports pre-existing errors/warnings in `scraper/*.js` and `scripts/*.mjs` (e.g. `no-require-imports`); these are unrelated to app runtime.
- The `scraper/` (`crawl`, `scrape`) pipeline enriches crawled places via NVIDIA NIM (with local fallback) and auto-attaches photos. Requires `NVIDIA_API_KEY` for LLM enrichment; photos are fetched even when LLM is unavailable.
- No automated test suite exists.
