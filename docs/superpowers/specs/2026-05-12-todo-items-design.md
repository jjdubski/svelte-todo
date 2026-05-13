# TODO Items — Design

## Objective

Complete all 15 items in `TODO.md` across 5 work packages, implemented sequentially. Each package is self-contained, independently testable, and builds on the existing Svelte 5 / SvelteKit 2 SPA architecture.

## Package 1: Calendar Improvements (items 1, 2, 3)

### Item 1 — Arrow icon on "Back to Tasks"

**File:** `src/routes/calendar/+page.svelte`

Add `ArrowLeft` icon from `lucide-svelte` before "Back to Tasks" text, exactly matching the `Board` and `Stats` pages. One-line import + JSX change.

### Item 2 — Click-on-date modal

**File:** New `src/lib/components/DayDetailModal.svelte` + changes to `src/routes/calendar/+page.svelte`

**State:** A `selectedDate` string (`$state(null)`) in the calendar page. Clicking a day cell sets it to `yyyy-MM-dd`. Clicking backdrop or close clears it.

**Component (`DayDetailModal.svelte`):**

- Overlay centered modal, max-width ~500px, scroll if overflow
- Header: formatted date (e.g. "Wednesday, May 13, 2026") + close button
- Task list using `store.todos` filtered by `todo.dueDate === selectedDate`
- Each task shows: title, priority badge, tags, description preview, completion status
- Empty state: "No tasks for this day"
- Clicking a task navigates to `/tasks`
- Backdrop click closes the modal
- Styling: `var(--card-bg)`, `var(--border)`, consistent with app theme

### Item 3 — Hover tooltip on task pills

**File:** `src/routes/calendar/+page.svelte`

Each existing task pill (inside the calendar day cell) gets a styled tooltip on hover, replacing the current `title` attribute.

- Tooltip positioned above the pill, centered, with a downward arrow
- Content: title, priority badge, truncated description (~80 chars), tags (first 3)
- CSS-based hover with ~200ms delay
- `pointer-events: none` to avoid interaction issues
- On touch devices: tooltip doesn't fire (acceptable — click-to-modal is the primary interaction)

---

## Package 2: Mobile Navbar Redesign (items 4, 5)

### File: `src/lib/components/NavBar.svelte`

### Breakpoint

Below `sm` (640px) — the horizontal nav links collapse into a dropdown.

### Desktop (no change)

Existing horizontal links + auth button + theme toggle on the right.

### Mobile layout

```
┌──────────────────────────────────┐
│  ┌──────────┐    [Auth] [Theme]  │
│  │ Tasks  ▼ │                    │
│  └──────────┘                    │
│  ─────────────────────────────── │
│  (when open):                    │
│  ┌ Board ──────────────────┐     │
│  │ Calendar                 │     │
│  │ Analytics                │     │
│  │ Archived                 │     │
│  └──────────────────────────┘     │
└──────────────────────────────────┘
```

### Dropdown behavior

- Clickable `<div>` on the left (with ~8px left margin), shows current page name + animated SVG triangle
- Triangle points down when closed, up when open (CSS `transform: rotate(180deg)` transition)
- Clicking the div toggles the dropdown
- Dropdown lists remaining nav options (excluding current page), with current page highlighted differently
- Selecting an option closes the dropdown and navigates
- Click outside closes the dropdown (window click listener)
- Auth button stays on the right; theme toggle is next to it

### Implementation state

- `mobileMenuOpen = $state(false)` in the component
- SVG triangle ~10x8px inline SVG, CSS transition on rotation
- Dropdown rendered conditionally with `{#if mobileMenuOpen}`
- Existing right-side group (auth + theme) unchanged in markup position

---

## Package 3: Board Page Features (items 8, 9, 10)

### Item 8 — Archive toast on board page

**File:** `src/routes/+layout.svelte`

Add `<Toast />` component to the root layout so it renders on every page (it was previously only present on specific pages). The `store.deleteTodo()` method already calls `store.showToast()`, so this is the only change needed.

### Item 9 — Multi-selection with modifier keys

**File:** `src/routes/board/+page.svelte`

No "Select" toggle button. Selection is always available via keyboard modifiers on card click:

| Action                   | Behavior                                                                   |
| ------------------------ | -------------------------------------------------------------------------- |
| Click (no modifier)      | Selects that card, deselects all others                                    |
| Ctrl/Cmd+Click           | Toggles that card's selection without affecting others                     |
| Shift+Click              | Selects a continuous range from last-clicked to this card (across columns) |
| Click empty column space | Deselects all                                                              |

**Visual feedback:**

- Selected cards get a highlighted border (matching `.archived-card-selected` pattern — blue border + glow)
- Floating batch action bar appears at bottom when ≥1 card selected:
  - `"{n} selected"` count
  - **Archive** button → `store.archiveSelected()`
  - **Mark Done** button → `store.completeSelected()`
  - **Cancel** button → deselects all

**Drag-and-drop:** Still works independently — drag starts on `dragstart` event, not `click`.

**Implementation:** Wire `onclick` handlers on card bodies to check `e.ctrlKey || e.metaKey` and `e.shiftKey`. Reuses existing `store.selectedTodos` (SvelteSet), `store.toggleSelect(id)`, `store.archiveSelected()`, `store.completeSelected()`.

### Item 10 — Board move toast with undo

**File:** `src/routes/board/+page.svelte` and `src/lib/state/todoStore.svelte.js`

**Toast on column drop:** After `handleColumnDrop()` completes, call `store.showToast()` with the move message:

- Singular: "Moved task to 'In Progress'"
- Plural (batch): "Moved 3 tasks to 'Done'"

**Undo:** Track the pre-move state of each moved todo so the user can revert.

- Add `lastMovedTodos = $state([])` and `lastMovedStates = $state([])` to the store
  - `lastMovedTodos`: the todo objects before the move
  - `lastMovedStates`: the pre-move `{completed, tags}` for each
- New method `undoMove()` that restores each todo's pre-move `completed` and `tags` values
- Call `undoMove()` from the existing Undo button in `<Toast>`, which already checks for `lastArchivedTodos` / `lastCompletedTodos` patterns — extend it to also check `lastMovedTodos`

**Toast component changes:**

- `<Toast>` already has an Undo button conditional on `lastArchivedTodos.length > 0 || lastCompletedTodos.length > 0`
- Extend condition to also check `lastMovedTodos.length > 0`
- When `lastMovedTodos` is the source, the Undo button calls `store.undoMove()` instead

---

## Package 4: Stats & Archiving Fixes (items 6, 7)

### File: `src/routes/stats/+page.svelte`

No store changes needed — both fixes are local derived computations on the stats page.

### Item 6 — Completion rate includes archived todos

Replace the current `completedPct` derivation:

```javascript
// Before
let completedPct = $derived(store.stats.total > 0 ? Math.round((store.stats.completed / store.stats.total) * 100) : 0);

// After
let completedPct = $derived.by(() => {
	const allTodos = [...store.todos, ...store.archivedTodos];
	const total = allTodos.length;
	const completed = allTodos.filter((t) => t.completed).length;
	return total > 0 ? Math.round((completed / total) * 100) : 0;
});
```

Effect: Archiving a completed todo still counts it as completed. Archiving an incomplete todo still counts in the total. The StatsBar component (showing active-only counts) is unchanged.

### Item 7 — Category breakdown always sums to 100%

Replace the denominator used for category percentages:

```javascript
// Add this derived
let categoryTotal = $derived(Object.values(store.categoryBreakdown).reduce((sum, c) => sum + c, 0));
```

Then in template change:

```
// Before
{@const pct = store.stats.total > 0 ? Math.round((count / store.stats.total) * 100) : 0}

// After
{@const pct = categoryTotal > 0 ? Math.round((count / categoryTotal) * 100) : 0}
```

Effect: With 2 work + 1 health, you get 67% + 33% = 100%. Works correctly regardless of archive status.

---

## Package 5: Error Pages (item 11)

### File: New `src/routes/+error.svelte`

SvelteKit's default error page is replaced with a single `+error.svelte` that provides context-aware messaging.

### Layout

- Centered card with gradient background (matching app style)
- Status code displayed prominently (large text)
- Contextual message based on `$page.status`:

| Status | Message                                                |
| ------ | ------------------------------------------------------ |
| 404    | "Page not found — the link you followed may be broken" |
| 403    | "You don't have access to this page"                   |
| 500    | "Server error — something went wrong on our end"       |
| Other  | "Something went wrong, try again later!"               |

- "Back to Tasks" link (styled as a button) at the bottom
- No nav bar rendered on error pages

### Implementation

- Read `$page.status` and `$page.error.message` from SvelteKit's page store
- `{#if}` chain for the 4 status categories, with the "other" fallback
- Styling: CSS variables (`--card-bg`, `--border`, etc.), same dark mode support

---

## Implementation Order

1. **Package 1: Calendar Improvements** — 3 small changes, one new component
2. **Package 2: Mobile Navbar** — self-contained UI change in one file
3. **Package 3: Board Features** — multi-file, new interaction patterns
4. **Package 4: Stats Fixes** — two derived computations, one file
5. **Package 5: Error Pages** — one new file

Each package is implemented, committed, and verified (via the full test suite) before the next begins.
