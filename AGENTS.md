# AGENTS.md — svelte-todo

Single-package Svelte 5 + SvelteKit 2 SPA. Plain JS (no TypeScript), JSDoc types.

## Commands

| Action              | Command                                  |
| ------------------- | ---------------------------------------- |
| Dev server          | `npm run dev` (port 5173)                |
| Build (static SPA)  | `npm run build` → `build/`               |
| Preview build       | `npm run preview` (port 4173)            |
| Unit tests (Vitest) | `npm run vitest` or `npm run test:watch` |
| E2E (Playwright)    | `npm run test:e2e`                       |
| Full test suite     | `npm run test` (Vitest → Playwright)     |
| Lint                | `npm run lint`                           |
| Auto-format         | `npm run format`                         |

## Architecture

- **SvelteKit adapter-static** (`svelte.config.js:17`): SPA fallback `index.html`. No SSR.
- **Svelte 5 runes** enforced project-wide (`svelte.config.js:7-14`).
- **Store pattern**: Class-based store in `src/lib/state/todoStore.svelte.js` exposed via `createContext/setContext/getContext`. Instantiated once in root `+layout.svelte`.
- **All data persisted to localStorage** — no backend, no database, no API calls.
- **Dark mode**: `.dark` class on `<html>` toggled by JS (not Tailwind media strategy). Zero-FOUC script in `app.html`.
- **Routing**: `+page.svelte` (main list), `/archived`, `/board`, `/calendar`, `/stats`.

## Tooling quirks

- **Prettier**: tabs, single quotes, no trailing commas, 100 print width. `prettier-plugin-svelte` + `prettier-plugin-tailwindcss` in plugins.
- **ESLint flat config** (`eslint.config.js`). Key overrides: `no-unused-vars` off, `svelte/no-at-html-tags` off (markdown rendering), `svelte/prefer-svelte-reactivity` off.
- **Husky pre-commit**: `npm run lint:fix` → `lint-staged` (runs Prettier on all files) → `npm run test`.
- **Playwright**: runs against production build (`npm run build && npm run preview`), not dev server.
- **.npmrc**: `engine-strict=true` — will fail if wrong Node version.
- **Tailwind v4**: configured via PostCSS (`@tailwindcss/postcss` plugin), no `tailwind.config.js` content used (v4 auto-detects).
- **PWA**: auto-registered via `vite-plugin-pwa` with `autoUpdate`.

## Testing

- Unit tests in `src/lib/__tests__/` — Vitest with `environment: 'node'`.
- E2E in `e2e/` — Playwright, single worker, 1 retry.
- Pre-commit hook runs full test suite (`npm run test`).
