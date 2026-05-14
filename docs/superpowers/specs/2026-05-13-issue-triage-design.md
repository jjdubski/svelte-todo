# Issue Triage Design — 15 Open Issues Across 4 Work Packages

**Date:** 2026-05-13
**Status:** Approved
**Repo:** jjdubski/svelte-todo

## Overview

This spec covers 15 open issues on the svelte-todo repository, organized into 4 work
packages based on dependency relationships. Issues are tackled in dependency-first order:
Mobile Navigation → Archived Page → Calendar → UI Polish. Each package is completed
(sub-issues → parent closed) before the next begins.

## Full Issue Hierarchy

```bash
All Open Issues (15 issues)
├── #1  Increase gap between profile and theme icon              [Package A]
│
├── #2  Mobile navigation fixes                                  [Package B · parent]
│   ├── #8  Center dropdown nav for mobile                       [child of #2]
│   │   ├── #11 Center the mobile dropdown itself                [child of #8]
│   │   └── #13 Increase text size in mobile dropdown            [child of #8]
│   └── #15 Fix mobile nav triangle animation not staying up     [child of #2]
│
├── #3  Archived page improvements                               [Package C · parent]
│   ├── #7  Back to tasks button on archived page                [child of #3]
│   │   ├── #5  Investigate resolve vs navigation patterns       [child of #7 · SKIPPED]
│   │   └── #6  Refactor back button into shared component       [child of #7]
│   └── #9  Add meta + shift key selection to archived page      [child of #3]
│
└── #4  Calendar page issues                                     [Package D · parent]
    ├── #10 Make calendar page mobile-friendly                   [child of #4]
    ├── #12 Fix scroll bar behavior in calendar view             [child of #4]
    └── #14 Fix tooltip/hover effect cutoff in calendar squares  [child of #4]
```

## Execution Strategy

**Sequential Package Pipeline** — each package completed fully before starting the next:

1. **Package B: Mobile Navigation** (no external dependencies)
2. **Package C: Archived Page** (uses BackButton component from Package B context)
3. **Package D: Calendar** (independent)
4. **Package A: UI Polish** (standalone, simplest)

Issue #5 (investigation) is SKIPPED — standard `<a href>` links used instead per user
decision.

---

## Package B: Mobile Navigation Fixes

### B1: #13 — Increase text size in mobile dropdown

**File:** `src/lib/components/NavBar.svelte`

**Current code (line 105):**

```html
class="nav-link block rounded px-3 py-2 text-sm font-medium no-underline"
```

**Fix:** Add `max-sm:text-base` Tailwind class. On viewports below the `sm` breakpoint
(< 640px), font size increases from `text-sm` (14px) to `text-base` (16px). On very small
screens (< 400px), this improves readability since the dropdown occupies less horizontal
space.

Also apply to the trigger label span (line 81):

```html
<span class="text-sm font-medium max-sm:text-base">{currentPageLabel}</span>
```

**Verification:** Open mobile nav, confirm text is visibly larger on sub-400px viewports.
No layout overflow.

### B2: #11 — Center the mobile dropdown itself

**File:** `src/lib/components/NavBar.svelte`

**Trigger centering (line 66):**

- Change `<div class="relative flex sm:hidden">` to
  `<div class="relative flex justify-center sm:hidden">`
- This centers the trigger button (current page label + triangle) horizontally

**Dropdown centering (line 96):**

- Change `left-0` to `left-1/2 -translate-x-1/2`
- This centers the dropdown menu under the trigger, regardless of trigger width
- Keep `min-w-40` to prevent the dropdown from being too narrow

**Verification:** Open mobile nav on device-width viewport. Both trigger and dropdown
appear horizontally centered. Dropdown items are also centered.

### B3: #15 — Fix triangle animation not staying up

**File:** `src/lib/components/NavBar.svelte`

**Root cause analysis:**
The SVG triangle (lines 82-91) has `class:rotate-180={mobileMenuOpen}` and the
`rotate-180` CSS class exists in `<style>` (line 145):

```css
.rotate-180 {
    transform: rotate(180deg);
}
```

The SVG's `<path>` uses coordinates `M1 1L5 7L9 1` which draws a downward-pointing
triangle. Without an explicit `transform-origin`, the rotation pivot defaults to the
element's center, but the SVG viewBox `0 0 10 8` may cause the origin to be misaligned.

**Fix:** Add `origin-center` to the SVG element so rotation pivots correctly. Ensure the
transition targets `transform` (already on line 86: `transition-transform duration-200`).

**Alternative if origin-center doesn't resolve it:** Wrap the SVG in a `<span>` and apply
the rotation class to the span instead of the SVG directly. Spans have more predictable
transform behavior.

**Verification:** Tap mobile nav toggle. Triangle rotates 180° to point up. Stays up while
dropdown is open. Taps again → rotates back down.

---

## Package C: Archived Page Improvements

### C1: #6 — BackButton shared component

**New file:** `src/lib/components/BackButton.svelte`

```svelte
<script>
    let { href = '/tasks', label = 'Back to Tasks' } = $props();
</script>

<a href={href}
   class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5
          text-sm font-medium no-underline transition-all hover:opacity-80 sm:text-base"
   style="color: var(--btn-primary); background: var(--input-bg);">
    <ArrowLeft size={14} />
    {label}
</a>
```

Matches the existing inline back-button styling on the calendar page (lines 80-87)
and board page (lines 165-171).

**Usage across pages:**

- `archived/+page.svelte` — newly added (see C2)
- `board/+page.svelte` — replace inline `<a>` with `<BackButton />`
- `calendar/+page.svelte` — replace inline `<a>` with `<BackButton />`

**Verification:** All three pages show consistent back buttons with the same styling.
All links navigate correctly.

### C2: #7 — Back to tasks button on archived page

**File:** `src/routes/archived/+page.svelte`

**Layout restructure (matching board page pattern):**

```html
<!-- Row 1: Title + Back button (ABOVE StatsBar) -->
<div class="mb-4 flex items-center justify-between gap-2">
    <h2 class="m-0 text-lg font-semibold sm:text-xl" style="color: var(--text-heading);">
        Archived Tasks
    </h2>
    <BackButton />
</div>

<StatsBar />

<!-- Row 2: Count + selection toggle -->
<div class="mb-4 flex items-center justify-between">
    <span class="text-sm sm:text-base" style="color: var(--text-muted);">
        {store.archivedTodos.length} archived
    </span>
    <!-- Select mode toggle button (existing, stays) -->
</div>
```

**Verification:** Archived page header matches board page layout — title left, back
button right, StatsBar below. Navigation works.

### C3: #9 — Meta+shift selection + shared utility + bottom bar

**New file:** `src/lib/utils/selection.js`

Shared selection logic extracted from `board/+page.svelte`:

```js
/**
 * Initialize selection state for a page.
 * Returns { lastClickedId } state reference.
 */
export function initSelection() {
    return { lastClickedId: null };
}

/**
 * Unified click handler for keyboard-powered multi-selection.
 * Supports meta/ctrl-click (toggle), shift-click (range select),
 * and regular click (single select).
 *
 * @param {MouseEvent} e
 * @param {object} todo - The clicked todo item
 * @param {object} store - TodoStore instance
 * @param {string} selectionKey - 'selectedTodos' or 'selectedArchived'
 * @param {object} lastClickedState - { lastClickedId } from initSelection()
 */
export function handleSelectionClick(e, todo, store, selectionKey, lastClickedState) {
    const selectSet = store[selectionKey];
    const allTodos = selectionKey === 'selectedTodos' ? store.todos : store.archivedTodos;

    if (e.ctrlKey || e.metaKey) {
        // Toggle individual item
        if (selectSet.has(todo.id)) {
            selectSet.delete(todo.id);
        } else {
            selectSet.add(todo.id);
        }
        store[selectionKey] = new SvelteSet(selectSet);
        lastClickedState.lastClickedId = todo.id;
    } else if (e.shiftKey && lastClickedState.lastClickedId !== null) {
        // Range select
        const lastIdx = allTodos.findIndex((t) => t.id === lastClickedState.lastClickedId);
        const currentIdx = allTodos.findIndex((t) => t.id === todo.id);
        if (lastIdx !== -1 && currentIdx !== -1) {
            const start = Math.min(lastIdx, currentIdx);
            const end = Math.max(lastIdx, currentIdx);
            for (let i = start; i <= end; i++) {
                selectSet.add(allTodos[i].id);
            }
            store[selectionKey] = new SvelteSet(selectSet);
        }
    } else {
        // Single select
        store[selectionKey] = new SvelteSet([todo.id]);
        lastClickedState.lastClickedId = todo.id;
    }
}

/**
 * Clear selection and reset state.
 */
export function clearSelection(store, selectionKey, lastClickedState) {
    store[selectionKey] = new SvelteSet();
    if (lastClickedState) lastClickedState.lastClickedId = null;
}
```

**Changes to `archived/+page.svelte`:**

1. Import and use `handleSelectionClick` on archived card clicks (replacing current
   `toggleArchivedSelect` call for click handling)
2. Add `lastClickedId = $state(null)` state
3. Replace top-right select mode dropdown (Restore/Delete/Cancel) with a **fixed bottom
   action bar** matching board page pattern:

```svelte
{#if store.selectedArchived.size > 0}
    <div class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <div class="flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg"
             style="background: var(--card-bg); border-color: var(--border);">
            <span class="text-sm font-medium" style="color: var(--text-heading);">
                {store.selectedArchived.size} selected
            </span>
            <button onclick={() => store.restoreSelectedArchived()}
                    class="cursor-pointer rounded-lg border-none px-3 py-1.5
                           text-xs font-semibold text-white"
                    style="background: var(--btn-save);">
                Restore
            </button>
            <button onclick={() => store.permanentDeleteSelectedArchived()}
                    class="cursor-pointer rounded-lg border-none px-3 py-1.5
                           text-xs font-semibold text-white"
                    style="background: var(--btn-delete);">
                Delete
            </button>
            <button onclick={() => {
                    store.archivedSelectMode = false;
                    store.selectedArchived = new SvelteSet();
                    lastClickedId = null;
                }}
                    class="cursor-pointer rounded-lg border-none px-3 py-1.5
                           text-xs font-semibold"
                    style="background: var(--input-bg); color: var(--text-heading);">
                Cancel
            </button>
        </div>
    </div>
{/if}
```

4. Keep the `archivedSelectMode` toggle as an alternative UI entry point (it auto-enables
   click-based checkbox selection). The keyboard selection works regardless.

**Changes to `board/+page.svelte`:**

1. Replace inline `handleCardClick` with imported `handleSelectionClick`
2. Replace inline `lastClickedId` with `initSelection()`

**Verification:**

- [ ] Meta/Ctrl+Click on archived card toggles individual selection
- [ ] Shift+Click selects range between clicks
- [ ] Regular click selects single, deselects others
- [ ] Bottom action bar appears when items selected with Restore, Delete, Cancel
- [ ] Board page still works identically with shared utility
- [ ] Existing `archivedSelectMode` checkbox mode still works

---

## Package D: Calendar Page Issues

### D1: #14 — Fix tooltip/hover cutoff (Portal approach)

**New file:** `src/lib/components/Tooltip.svelte`

Portal-style tooltip that renders at document body level:

```svelte
<script>
    let { targetEl, title, description, priority, tags, tagColors } = $props();
    // On mount, position tooltip based on targetEl bounding rect
    // Update position on scroll/resize via ResizeObserver/scroll listener
</script>

<!-- Rendered at document level via svelte:body or portal pattern -->
<div class="tooltip-portal" style="position: fixed; ...">
    <!-- same visual content as current tooltip -->
</div>
```

**Integration:** Replace inline `.tooltip-container` / `.tooltip` divs in
`calendar/+page.svelte` with the new `Tooltip` component.

**Verification:** Hover over tasks in calendar squares. Tooltip renders fully above
the square, never clipped. Tooltip properly positioned relative to the task row.
Arrow indicator points to the correct location.

### D2: #12 — Remove scroll, clip/truncate

**File:** `src/routes/calendar/+page.svelte`

**Changes:**

1. Remove `overflow-y-auto` from day squares (line 119)
2. Add `truncate` to individual task title spans (line 147) — already has `.truncate`
3. Tasks beyond visible square area are naturally clipped by `aspect-square` bounds

Full task list for a day is always accessible via clicking the day → `DayDetailModal`.

**Verification:** No scrollbars appear inside calendar day squares. Task content exceeds
square bounds visually clips. Clicking a day still opens the detail modal with all tasks.

### D3: #10 — Mobile-friendly calendar

**File:** `src/routes/calendar/+page.svelte`

**Responsive improvements:**

1. **Grid gap:** Already minimal (`gap-px` on mobile → `gap-1` on desktop). No change.
2. **Touch targets:** Day squares already `aspect-square` — good tap target. Month nav
   buttons already have `p-1` padding. No change.
3. **Task titles:** Already use `truncate` class (line 147). On small screens this
   naturally clips long titles with ellipsis. Content always accessible via tap →
   DayDetailModal. No custom dot indicator needed — truncation + modal is sufficient.
4. **Weekday headers:** Already showing single-letter on mobile. No change.
5. **Back button:** Use BackButton component from Package C. Replace existing inline back
   button.
6. **Overall layout:** Already uses `p-4` on mobile, `rounded-2xl` → `rounded-xl` etc.
   The container reflows properly.

**Verification:** Calendar page renders without horizontal scroll on 320px viewport.
Day squares are tappable. Task dots visible. Details accessible via tap. Back button
matches other pages.

---

## Package A: UI Polish

### A1: #1 — Increase gap between profile and theme icon

**File:** `src/lib/components/NavBar.svelte` (line 114)

**Change:** `gap-2` → `gap-3`

```html
<div class="absolute right-4 flex items-center gap-3">
```

Increases spacing from 8px to 12px between the AuthButton and the dark mode toggle.
Consistent across all screen sizes.

**Verification:** Visual gap between profile button and sun/moon icon is noticeably
larger. Not excessive. Consistent on mobile and desktop.

## Files Changed Summary

| File                                   | Change                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `src/lib/components/NavBar.svelte`     | #13 (text size), #11 (centering), #15 (triangle), #1 (gap)                   |
| `src/lib/components/BackButton.svelte` | **NEW** — shared back button component                                       |
| `src/lib/components/Tooltip.svelte`    | **NEW** — portal-style tooltip component                                     |
| `src/lib/utils/selection.js`           | **NEW** — shared selection logic utility                                     |
| `src/routes/archived/+page.svelte`     | #7 (layout), #9 (selection + bottom bar)                                     |
| `src/routes/board/+page.svelte`        | #9 (refactor to shared utility), #6 (use BackButton)                         |
| `src/routes/calendar/+page.svelte`     | #14 (tooltip portal), #12 (remove scroll), #10 (mobile), #6 (use BackButton) |

**Total:** 4 new files, 4 existing files modified across ~15 issues.
