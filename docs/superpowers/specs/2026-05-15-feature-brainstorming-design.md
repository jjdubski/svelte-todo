# Feature Brainstorming — Design & Execution Plan

**Date:** 2026-05-15
**Status:** Approved
**Repo:** jjdubski/svelte-tutorial
**Source:** Issue #24 (brainstorming), informed by all open issues (#15–#29)

---

## Overview

This document captures the output of a full brainstorming session (Issue #24) exploring the next wave of features for the svelte-todo app. The session covered 6 areas of core deepening — filtering/search UX, keyboard shortcuts, PWA enhancements, custom themes, UX polish, and data tools — then merged the results with the existing open issue backlog into a dependency-ordered execution plan.

**Scope: 10 existing open issues + 18 brainstormed features, organized into 5 phases.**

A significant feature (#23 — multiple user profiles) is deferred to a separate design cycle.

---

## Execution Strategy: Foundation-First

5 phases executed sequentially. Each phase is self-contained and independently testable. Quick wins come first for momentum; infrastructure (settings page) comes early since themes depend on it; the largest/costliest items come last.

```text
Phase 1: Quick Wins + Bug Fixes     (8 items · ~13hr)
Phase 2: Settings Infrastructure    (3 items · ~9hr)
Phase 3: Existing Feature Backlog   (2 parent issues · ~8hr)
Phase 4: Power Features             (2 items · ~11hr)
Phase 5: Polish + Finishing         (6 items · ~22hr)

Deferred: #23 Multiple Profiles     (separate design cycle)
```

---

## Phase 1: Quick Wins + Bug Fixes

### 1.1 #15 — Fix Triangle Animation (reopened)

**File:** `src/lib/components/NavBar.svelte`

**Current state:** Commit `7f7b51c` added `origin-center` to the SVG triangle, but user reports the fix didn't persist — the triangle still snaps back after animation.

**Proposed fix:** Investigate root cause. The SVG `<path>` uses coordinates `M1 1L5 7L9 1` within viewBox `0 0 10 8`. Rotation may fail because:
- `origin-center` maps to `50% 50%` of the SVG's bounding box, which may not match the visual center of the triangle
- Alternative: wrap the SVG in a `<span>` and apply `class:rotate-180` + `transform-origin: center` to the span instead
- Alternative 2: use a CSS `rotate` transition directly on the SVG's `transform` via Tailwind's `rotate-180`

**Verification:** Tap mobile nav toggle → triangle rotates 180° to face up and stays up while dropdown is open. Tap again → rotates back to down position.

### 1.2 #19 — Remove Broken Add Category

**File:** `src/lib/components/TodoFilters.svelte` (lines ~183–249)

**Changes:**
1. Remove the "Add category" button/input UI (the `+` button that triggers category creation)
2. Remove any associated store methods for adding categories (likely `addCategory` or similar)
3. Add an "Other" category to the existing category list as a catch-all for tasks that don't fit the main categories
4. Verify no console errors or dead code references remain

**Verification:** Category pills render correctly. "Other" appears as a selectable category. No broken UI elements.

### 1.3 #22 — Button Hover/Click Animations

**Scope:** Audit all interactive buttons across the app for missing animations.

**Pattern:** CSS transitions only (no JS animation libraries):
```css
/* Hover */
transition: transform 0.15s ease, box-shadow 0.15s ease;
hover:scale-105

/* Active/click */
active:scale-95

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  transition: none;
  transform: none;
}
```

**Verification:** Every button has consistent hover lift and click press. Animations are disabled when `prefers-reduced-motion` is set. No performance regression.

### 1.4 App Icons / Logo Redesign

**File:** `vite.config.js` (PWA manifest), `static/` directory

**Changes:**
1. Design a proper app icon (replace the generic "V" currently shown on iOS)
2. Generate icons at required sizes: 192x192, 512x512 (PNG), plus Apple touch icon sizes
3. Update `vite.config.js` PWA manifest icon entries
4. Add `apple-touch-icon` link to `app.html`
5. Add `maskable` icon variants for Android adaptive icons

**Verification:** Install app on iOS → icon shows the new logo, not "V". Same on Android/desktop.

### 1.5 Custom Install Prompt

**File:** New component `src/lib/components/InstallPrompt.svelte`

**Behavior:**
- Listen for `beforeinstallprompt` event on `window`
- If the event fires (browser supports install), show an in-app "Install App" button/banner
- If the user dismisses, track it to avoid re-prompting for 30 days
- If already installed (checked via `matchMedia('(display-mode: standalone)')`), hide the prompt
- Use a small banner at the bottom or a card in the header area (not a modal)

**State management:**
- Store in localStorage: `installPromptDismissedAt` timestamp
- Re-show after 30 days if dismissed
- Store in session if not applicable: `installPromptNotAvailable`

**Verification:** On a browser that supports PWA install, the banner appears. Clicking install triggers the native install dialog. Dismissing hides it for 30 days. Already-installed users never see it.

### 1.6 Mobile Haptic Feedback

**New file:** `src/lib/utils/haptics.js`

```js
/**
 * Trigger a short vibration if the Vibration API is available
 * and the user hasn't disabled vibrations in their system settings.
 * @param {number} [duration=10] - Vibration duration in ms
 */
export function lightTap(duration = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(duration);
  }
}
```

**Integration points:**
- Completing a todo (checkbox tap)
- Archiving a todo
- Board card drag complete (drop)
- Keyboard shortcut execution

**Verification:** On mobile devices with vibration support, each listed action produces a brief tactile feedback. No effect on desktop or devices without the Vibration API.

### 1.7 Floating Help Button (Cheat Sheet Foundation)

**New file:** `src/lib/components/HelpButton.svelte`

**Layout:**
- Fixed-position `?` floating button in the bottom-right corner of every page
- Circular, 40x40px, semi-transparent background, subtle shadow
- On click: opens a modal/overlay showing:
  - Keyboard shortcuts (populated later in Phase 4)
  - Multi-select instructions for board & archived pages (existing feature documentation)
  - Link to `/settings`

**State:**
- `showHelp = $state(false)` — toggles the overlay
- Click-outside or Escape closes the overlay

**Verification:** Floating `?` visible on all pages. Clicking opens the overlay. Content is accurate and links work.

### 1.8 #17 — StatsBar Loading Jitter

**Files:** `src/routes/board/+page.svelte`, `src/routes/stats/+page.svelte`, `src/routes/archived/+page.svelte`

**Root cause:** StatsBar loads asynchronously on each page independently, causing a brief flash/empty state during route transitions.

**Proposed approach:** As noted in the issue, the board, stats, and archived pages share the same layout structure (title + StatsBar + BackButton in the same positions). Extract a shared layout component to avoid re-mounting StatsBar on every navigation.

**New file:** `src/routes/(app)/+layout.svelte` — create a route group `(app)` that contains board, stats, and archived routes. The layout renders the shared header (title + StatsBar + BackButton) and `{@render children()}` for page content.
- Move the `board/`, `stats/`, and `archived/` page directories into the `(app)/` route group (i.e., `src/routes/(app)/board/`, `src/routes/(app)/stats/`, `src/routes/(app)/archived/`)
- Move the common header area (title + StatsBar + BackButton) into `(app)/+layout.svelte`
- Pages only provide their unique content below the shared area
- StatsBar persists across route transitions within the group
- The root `+layout.svelte` continues to render nav, theme, auth for all pages

**Verification:** Navigating between board, stats, and archived pages shows no visual jitter in the StatsBar. The bar content updates smoothly without intermediate empty state.

---

## Phase 2: Settings Infrastructure

### 2.1 Settings Route & Page

**New route:** `src/routes/settings/+page.svelte`

**Nav integration:** Add "Settings" entry to the mobile dropdown and desktop nav.

**Page sections:**

The settings page is organized into clearly separated sections, each collapsible:

1. **Theme** (see 2.2)
2. **Notifications** (see 2.3)
3. **Display** (font selection, density — populated in future)
4. **Data** (import/export buttons — already exist in header, could be moved here)

**Layout:**
- Centered card layout, max-width ~600px, matching app style
- Each section has a heading and divider
- Settings persist to localStorage and sync to MongoDB for authenticated users

### 2.2 Custom Themes

**State management:** `src/lib/state/themeStore.svelte.js`

```js
class ThemeStore {
  // Selected preset name or 'custom'
  themePreset = $state('default');
  
  // Custom overrides (only used when themePreset === 'custom')
  accentColor = $state('#3b82f6');
  bgColor = $state('#ffffff');
  cardColor = $state('#f8fafc');
  textColor = $state('#1e293b');
  borderColor = $state('#e2e8f0');
  
  // Font
  fontFamily = $state('system-ui'); // 'system-ui' | 'inter' | 'serif' | 'mono'
}
```

**Preset themes (5-10):**
- Default (current light/dark)
- Forest (green accents, warm background)
- Ocean (blue accents, cool background)
- Sunset (warm orange/red accents)
- Midnight (deep dark variant)
- Lavender (purple accents)
- Each preset defines a full CSS variable palette for light AND dark mode

**Integration:**
- Theme store applies CSS variable overrides on `<html>` via `style:` directives or a `<style>` tag
- Dark mode toggle continues to work independently (it flips the `.dark` class; theme presets define colors for both modes)
- Settings page shows a visual theme preview for each preset
- Accent color picker uses an HTML `<input type="color">`
- Full custom picker shows individual color inputs for each CSS variable

**Persistence:**
- Theme preferences saved to localStorage
- Synced to MongoDB user settings when signed in

### 2.3 Notification Preferences in Settings

**Settings page section:**
- Toggle: "Enable due date reminders" → controls the existing `requestNotificationPermission()` flow
- Toggle: "Remind me of overdue tasks" → controls whether overdue notifications fire
- Toggle: "Remind me of today's tasks" → controls today notifications
- These are in addition to the existing notification permission banner on `/tasks`

---

## Phase 3: Existing Feature Backlog

### 3.1 Template Improvements (#16 / #25 / #26 / #27)

**File:** `src/lib/state/todoStore.svelte.js` (lines 112–158) — templates are inline objects with `name`, `title`, `description`, `dueDate`, `priority`, `category`, `tags`.

**Changes:**
1. **#25** — At least one template uses bold (`**text**`), italic (`*text*`), and a URL (`[link](url)`)
2. **#26** — One template includes a bullet list using `-` syntax
3. **#27** — One template uses the "Ideas" category instead of its current category
4. Templates have more descriptive/engaging titles

### 3.2 Mobile Calendar Redesign (#18 / #28 / #29)

**Files:** `src/routes/calendar/+page.svelte`, new CSS for mobile

**Design (Apple Calendar-inspired):**
- Day cells remain square on mobile (no stretching into rectangles)
- Tasks shown as thin horizontal lines colored by tag color
  - Lines occupy the bottom portion of the cell (leaving the day number visible)
  - Multiple tasks → multiple stacked lines
  - Tasks without tags → grey default line
  - No lines → empty cell
- Grid gap reduced for tighter layout
- Tapping a day opens the existing `DayDetailModal` with full task details
- Desktop calendar layout remains unchanged

---

## Phase 4: Power Features

### 4.1 Advanced Query Syntax

**Files:** `src/lib/state/todoStore.svelte.js`, `src/lib/components/TodoFilters.svelte`, `src/lib/utils/queryParser.js` (new)

**Syntax tokens (all 6):**

| Token | Example | Maps to store property |
|-------|---------|----------------------|
| `tag:` | `tag:work tag:urgent` | `filterTags` (AND logic) |
| `priority:` | `priority:high` | `filterPriority` |
| `is:` | `is:active` | `filterStatus` |
| `due:` | `due:05-15-2026` or `due:overdue` | `filterDateFrom` / `filterDateTo` |
| `category:` | `category:Work` | `filterCategory` |
| `sort:` | `sort:priority` | `sortBy` |

**Token chip behavior:**
- As user types, `key:value` remains as plain text in the input
- When they hit **space** after a complete `key:value`, the token crystallizes into a colored chip (visually distinct from plain text)
- **Backspace** at the start of a chip removes the entire token (not character-by-character)
- Plain text (non-token portions) continues to fuzzy-match against title/description

**Parsing (`queryParser.js`):**
```js
/**
 * Parse search text into structured tokens and plain text.
 * Returns { tokens: [{key, value}], plainText: string }
 */
export function parseQuery(text) {}

/**
 * Detect if cursor is at a token boundary for backspace handling.
 */
export function isAtTokenBoundary(text, cursorPos) {}
```

**Bidirectional UI sync:**
- When tokens are added/removed in the search bar, the corresponding filter controls update:
  - `tag:work` → "Work" tag pill becomes selected
  - `priority:high` → priority dropdown switches to "High"
  - `category:Work` → category pill selects "Work"
- When filter controls are changed via the UI:
  - Selecting "Urgent" tag → `tag:urgent` appears in the search bar
  - Changing priority dropdown to "Low" → `priority:low` appears/appends
  - Removing a tag pill → corresponding token chip is removed from search bar

**Integration with `_computeFiltered()`:**
- The parser runs in the filter effect before calling `_computeFiltered()`
- Extracted tokens set the corresponding filter state on the store
- Plain text portion becomes the fuzzy search input
- This means the filter controls AND the search bar both drive the same underlying state

**Verification:**
- [ ] Typing `priority:high` filters to high-priority tasks
- [ ] Typing `tag:work tag:urgent` filters to tasks with both tags
- [ ] Typing `due:overdue` shows only overdue tasks
- [ ] Space after a token creates a chip; deleting the chip removes the filter
- [ ] Typing `meeting notes priority:high` fuzzy-matches "meeting notes" AND filters by high priority
- [ ] Changing the priority dropdown to "Low" adds `priority:low` to the search bar
- [ ] All 6 tokens work correctly

### 4.2 Keyboard Shortcuts

**New file:** `src/lib/utils/keyboardShortcuts.js`

**Architecture:**
- Centralized keyboard shortcut manager registered once in the root layout (`+layout.svelte`)
- Shortcuts are context-aware — they only fire when not focused on an input/textarea element
- A `ShortcutScope` pattern allows pages to register page-specific shortcuts alongside global ones

**Defined shortcuts:**

| Key | Scope | Action |
|-----|-------|--------|
| `q` | Global | Open quick-add dialog (compact modal from any page) |
| `/` | Global | Focus the search/filter bar |
| `Space` | Todo list | Toggle complete on focused/highlighted todo |
| `e` | Todo list | Open edit modal for selected todo |
| `a` | Todo list | Archive selected todo |
| `Ctrl+A` | Todo list | Select all visible todos |
| `Ctrl+Shift+A` | Todo list | Deselect all |
| `Shift+Space` | Todo list | Range select (already implemented on some pages) |
| `Ctrl+Z` | Global | Undo last action |
| `Ctrl+Shift+Z` | Global | Redo last action |
| `?` | Global | Open help overlay (also accessible via floating button) |

**Undo/Redo architecture:**
- Extend `TodoStore` with a history stack:
  - `_undoStack = $state([])` — array of { action, snapshot, timestamp }
  - `_redoStack = $state([])`
  - Push state snapshots before destructive actions (archive, delete, complete, move)
  - `undo()` pops from undo stack, pushes current to redo, restores snapshot
  - `redo()` pops from redo stack, pushes current to undo, restores snapshot
  - Max 50 entries per stack to bound memory
- The existing toast/undo pattern (which handles archive/complete/move) can feed into this generic stack

**Help overlay (cheat sheet):**
- Accessible via `?` key or floating button (from Phase 1)
- Shows all shortcuts grouped by category
- Also documents the multi-select flow (Ctrl/Cmd+Click, Shift+Click) for board and archived pages
- Includes a link to `/settings`

---

## Phase 5: Polish & Finishing

### 5.1 Page & Element Transitions

**Files:** `src/routes/+layout.svelte`, individual page components

**Approach:** Svelte `transition` directives and `{#key}` blocks.

- **Route-level:** Use SvelteKit's built-in page transition support with `transition:slide` or `transition:fade` on the route content wrapper
- **List items:** Use `transition:slide` on `{#each}` blocks for smooth add/remove animations
- **Modals:** Use `transition:scale` + `transition:fade` for open/close
- **Consistent timing:** All transitions use `duration: 200` with `easing: cubic-bezier(0.4, 0, 0.2, 1)`
- Respect `prefers-reduced-motion`

### 5.2 Drag & Drop Polish

**Files:** Board page drag logic

**Improvements:**
- Ghost image customization during drag (semi-transparent clone of the card)
- Drop zone highlighting (border/background change on valid drop targets)
- Smooth reorder animation on drop
- Touch drag support (the native HTML5 drag API has limited touch support — may need a lightweight touch-drag polyfill or custom touch handlers)

### 5.3 App Badge for Overdue Tasks

**File:** `src/lib/state/todoStore.svelte.js`

**Integration:**
- In the existing notification effect (which already computes overdue counts), add:
  ```js
  if ('setAppBadge' in navigator) {
    const overdueCount = this.overdueTasks.length;
    if (overdueCount > 0) {
      navigator.setAppBadge(overdueCount);
    } else {
      navigator.clearAppBadge();
    }
  }
  ```
- Only fires in production (not in test/development)
- Respects permission (Badge API requires no explicit permission on supported browsers)

### 5.4 Background Sync for Notifications

**New file:** `src/service-worker.js` — does not exist yet. Must be created with a `fetch` event listener and periodic sync registration. SvelteKit auto-detects this file at `src/service-worker.js` per its conventions; no config change needed.

**Architecture:**
- The existing notification system works when the app is open (fires on mount)
- Background sync requires a service worker that:
  1. Registers a periodic sync event (`periodicSync`) or uses the `sync` event for one-time reconnection
  2. Checks for overdue/today tasks against cached data
  3. Fires a notification if the app is not in focus
- Since todos are stored in MongoDB (not locally for the service worker), a simple approach:
  - Use `navigator.serviceWorker.ready` to register a periodic background sync
  - The sync event fetches `/api/todos/overdue` (or similar lightweight endpoint)
  - Compare with last-notified timestamp to avoid duplicate notifications
  - Fire `self.registration.showNotification()` for new overdue items

**Verification:** Close the app, wait for tasks to become overdue, reopen → notification fires. No duplicate notifications.

### 5.5 #21 — localStorage & Auth Test Coverage

**Files:** `src/lib/__tests__/` (new test file)

**Test scenarios:**
1. localStorage CRUD operations: read, write, delete, cache invalidation
2. Guest mode: data persists across page reloads in localStorage
3. Migration flow: guest data correctly moves to MongoDB on first sign-in
4. Edge cases: empty localStorage, corrupt/ malformed data, concurrent writes
5. Auth state switching: transitioning from guest to authenticated and back

**Verification:** All tests pass. Existing tests continue to pass.

### 5.6 #20 — Svelte 5 Runes Refactor

**Scope:** Audit every `.svelte` file and `.svelte.js`/`.svelte.ts` file for legacy Svelte 4 patterns.

**Checklist:**
- [ ] Replace `export let` with `$props()`
- [ ] Replace `let count = 0` (implicit reactivity) with `$state(0)`
- [ ] Replace `$:` assignments with `$derived()` or `$effect()` as appropriate
- [ ] Replace `on:click` with `onclick`
- [ ] Replace `<slot>` with `{#snippet}` / `{@render}`
- [ ] Replace stores with class-based `$state` stores (already done for TodoStore)
- [ ] Run full test suite after changes
- [ ] Run lint + format

---

## Issue Tree (Open Issues + New Work)

```text
Phase 1: Quick Wins + Bug Fixes
├── #15  Fix triangle animation (reopened)
├── #19  Remove broken Add Category + Other category
├── #22  Button hover/click animations
├── —    App icons/logo redesign
├── —    Custom install prompt
├── —    Mobile haptic feedback
├── —    Floating help button
└── #17  StatsBar jitter fix

Phase 2: Settings Infrastructure
├── —    /settings route + page
├── —    Custom themes (presets, accent, custom, fonts)
└── —    Notification preferences in settings

Phase 3: Existing Feature Backlog
├── #16  Update templates (parent)
│   ├── #25  Bold/italics/URL in templates
│   ├── #26  Bullet list in templates
│   └── #27  Ideas category in templates
└── #18  Mobile calendar redesign (parent)
    ├── #28  Apple Calendar-style layout
    └── #29  Colored tag lines

Phase 4: Power Features
├── —    Advanced query syntax (6 tokens, chips, bidirectional sync)
└── —    Keyboard shortcuts (global + context-aware)

Phase 5: Polish & Finishing
├── —    Page & element transitions
├── —    Drag & drop polish
├── —    App badge (overdue count)
├── —    Background sync for notifications
├── #21  localStorage & auth test coverage
└── #20  Svelte 5 runes refactor

Deferred (separate design cycle)
└── #23  Multiple user profiles
```

---

## Effort Summary

| Phase | Items | Est. Effort |
|-------|-------|-------------|
| Quick Wins + Bugs | 8 | ~13 hours |
| Settings Infrastructure | 3 | ~9 hours |
| Existing Feature Backlog | 2 parents (5 sub-issues) | ~8 hours |
| Power Features | 2 | ~11 hours |
| Polish & Finishing | 6 | ~22 hours |
| **Total** | **21** | **~63 hours** |

Effort estimates are rough order-of-magnitude. Each item will get a precise implementation plan when its phase begins.

---

## Files & Components Summary

### New Files
| File | Phase | Purpose |
|------|-------|---------|
| `src/lib/components/InstallPrompt.svelte` | 1 | Custom PWA install banner |
| `src/lib/utils/haptics.js` | 1 | Vibration API utility |
| `src/lib/components/HelpButton.svelte` | 1 | Floating `?` + cheat sheet overlay |
| `src/routes/settings/+page.svelte` | 2 | Settings page |
| `src/lib/state/themeStore.svelte.js` | 2 | Theme state management |
| `src/lib/utils/queryParser.js` | 4 | Query syntax tokenizer |
| `src/lib/utils/keyboardShortcuts.js` | 4 | Centralized shortcut manager |

### Modified Files
| File | Phase | Change |
|------|-------|--------|
| `src/lib/components/NavBar.svelte` | 1 | #15 triangle fix; add Settings nav link |
| `src/lib/components/TodoFilters.svelte` | 1, 4 | #19 remove add category; query syntax integration |
| Various `.svelte` files | 1 | #22 button animation CSS |
| `vite.config.js`, `static/` | 1 | New app icons |
| `src/routes/(app)/+layout.svelte` (new group) | 1 | #17 shared layout for board/stats/archived |
| `src/routes/board/+page.svelte` | 1, 5 | #17 shared layout; drag polish |
| `src/routes/stats/+page.svelte` | 1 | #17 shared layout |
| `src/routes/archived/+page.svelte` | 1 | #17 shared layout |
| `src/lib/state/todoStore.svelte.js` | 4, 5 | Query syntax; undo/redo; app badge; background sync |
| `src/routes/calendar/+page.svelte` | 3 | #28/#29 mobile calendar redesign |
| Template data files | 3 | #25/#26/#27 template improvements |
| `src/service-worker.js` (new if absent) | 5 | Background sync handler |
| `src/routes/+layout.svelte` | 4, 5 | Keyboard shortcut registration; page transitions |

---

## Verification Strategy

Each phase ends with:
1. All items in the phase pass their acceptance criteria
2. Full test suite passes (`npm run test`)
3. Lint and format clean (`npm run lint:fix`)
4. Build succeeds (`npm run build`)
5. E2E tests pass (`npm run test:e2e`)

Items from later phases that touch shared code (like the store) must verify they haven't broken earlier phase work.

---

## Deferred

**#23 — Multiple user profiles:** This is a significant feature involving auth state management, multi-account storage separation, and profile switching UI. It deserves its own brainstorming → design → plan → implementation cycle. Not included in this 5-phase execution plan.
