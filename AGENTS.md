# AGENTS.md — svelte-todo

Single-package Svelte 5 + SvelteKit 2 SPA. Plain JS (no TypeScript), JSDoc types.

## Commands

| Action              | Command                                  |
| ------------------- | ---------------------------------------- |
| Dev server          | `npm run dev` (port 5173)                |
| Build (Vercel)      | `npm run build` → `build/`               |
| Preview build       | `npm run preview` (port 4173)            |
| Unit tests (Vitest) | `npm run vitest` or `npm run test:watch` |
| E2E (Playwright)    | `npm run test:e2e`                       |
| Full test suite     | `npm run test` (Vitest → Playwright)     |
| Lint                | `npm run lint`                           |
| Auto-format         | `npm run format`                         |

## Architecture

- **Svelte 5 runes** enforced project-wide (`svelte.config.js:7-14`).
- **Adapter**: `@sveltejs/adapter-vercel`. SSR disabled globally (`+layout.js: ssr=false`). Most pages prerender (`+page.js: prerender=true`). Server routes handle API + auth.
- **SSR only for API/auth**: All pages are client-rendered; server route endpoints (`/api/todos/*`, `/auth/*`) are the only server-side code.
- **Auth**: Auth.js with Google + Apple OAuth. Guest mode persists to localStorage. `src/lib/server/auth.js` handles the Auth.js hooks. `src/lib/state/authStore.svelte.js` manages client-side auth state via context.
- **Backend**: MongoDB via Mongoose (`src/lib/server/db.js`). User settings and todos stored per-user. `src/lib/server/todoService.js` handles all CRUD.
- **Data flow**: localStorage as client cache + sync to MongoDB when signed in. Guest users get localStorage only. `MigrationDialog` component moves guest data to MongoDB on first sign-in.
- **Store pattern**: Class-based stores in `src/lib/state/` exposed via `createContext/setContext/getContext`. `TodoStore` references `AuthStore` for conditional API sync.
- **Routes**: `/` (login/landing), `/tasks` (main todo list — accepts URL query params `?title=&desc=&due=&priority=` for quick add), `/archived`, `/board`, `/calendar`, `/stats`.
- **Dark mode**: `.dark` class on `<html>` toggled by JS (not Tailwind media strategy). Zero-FOUC script in `app.html`.
- **Env vars required** (`src/lib/server/auth.js`, `src/lib/server/db.js`): `STORAGE_MONGODB_URI`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Apple OAuth keys are optional. `PUBLIC_APPLE_ENABLED` defaults to `'false'` in `vite.config.js`.

## Tooling quirks

- **Prettier**: tabs, single quotes, no trailing commas, 100 print width. `prettier-plugin-svelte` + `prettier-plugin-tailwindcss`.
- **ESLint flat config** (`eslint.config.js`). Key overrides: `no-unused-vars` off, `svelte/no-at-html-tags` off (markdown rendering), `svelte/prefer-svelte-reactivity` off.
- **Husky pre-commit**: `npm run lint:fix` → `lint-staged` (Prettier on all files) → `npm run test`.
- **Playwright**: runs against production build (`npm run build && npm run preview`), not dev server.
- **.npmrc**: `engine-strict=true` — will fail if wrong Node version.
- **Tailwind v4** via `@tailwindcss/postcss`. Existing `tailwind.config.js` is vestigial (v4 auto-detects classes).
- **PWA**: auto-registered via `vite-plugin-pwa` with `autoUpdate`.
- **Env defaults**: `vite.config.js` sets defaults for optional public env vars so `$env/static/public` doesn't fail at build time.
- **CI workflow** (`.github/workflows/start`) is a GitHub starter template — does NOT run tests or build.

## Testing

- Unit tests in `src/lib/__tests__/` — Vitest with `environment: 'node'`.
- E2E in `e2e/` — Playwright, single worker, 1 retry.
- Pre-commit hook runs full test suite (`npm run test`).
