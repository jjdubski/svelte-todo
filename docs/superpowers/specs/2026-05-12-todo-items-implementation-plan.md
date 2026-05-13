# TODO Items — Implementation Plan

## Package 1: Calendar Improvements (Items 1, 2, 3)

### Item 1 — ArrowLeft icon on "Back to Tasks"

**File:** `src/routes/calendar/+page.svelte`

**Changes:**

1. Add `ArrowLeft` to the lucide-svelte import on line 3:

   ```svelte
   import {(ChevronLeft, ChevronRight, Check, ArrowLeft)} from 'lucide-svelte';
   ```

2. In the `<a href="/">` element (lines 83-89), add `<ArrowLeft size={14} />` before the "Back to Tasks" text, matching the pattern used in `src/routes/stats/+page.svelte:59` and `src/routes/board/+page.svelte:136`:

   ```svelte
   <ArrowLeft size={14} /> Back to Tasks
   ```

**Verify:**

- `npm run dev` — navigate to `/calendar`, confirm arrow icon appears before "Back to Tasks"
- `npm run lint` — no errors

---

### Item 2 — DayDetailModal component

**File:** New `src/lib/components/DayDetailModal.svelte`

**Changes — create the component:**

- `<script>` block with `let { selectedDate, onclose } = $props()`
- Import `getTodoStore` from `$lib/state/todoStore.svelte.js`
- Import `Check` from `lucide-svelte`
- Get store via `const store = getTodoStore()`
- Compute `filteredTasks = $derived(store.todos.filter(t => t.dueDate === selectedDate))`
- Compute formatted header date: derive from `selectedDate` using `new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })`
- Template:
  - `{#if selectedDate}` wrapper
  - Overlay `<div>` with fixed position, inset-0, z-50, semi-transparent black background, `onclick={onclose}` (backdrop click)
  - Inner modal `<div>` centered, max-width 500px, scroll on overflow, styled with `var(--card-bg)`, `var(--border)`, rounded-xl, p-5
  - Header row: formatted date (bold heading) + close button ("×" or `X` icon from lucide-svelte) calling `onclose`
  - `{#each filteredTasks as todo (todo.id)}`:
    - Row with title, priority badge (span with class matching priority), tags (first 3), description preview (truncated ~80 chars), completion status (checkmark if `todo.completed`)
    - Clicking the row calls `goto('/tasks')` (or uses an `<a href="/">` tag) — use `import { goto } from '$app/navigation'`
  - `{#if filteredTasks.length === 0}`: "No tasks for this day" message
- No backdrop close on inner modal click (`onclick` stops propagation)

**File:** `src/routes/calendar/+page.svelte`

**Changes:**

1. Add import for `DayDetailModal`:

   ```svelte
   import DayDetailModal from '$lib/components/DayDetailModal.svelte';
   ```

2. Add `selectedDate` state variable:

   ```svelte
   let selectedDate = $state(null);
   ```

3. On each day cell `<div>` (the one with `class="flex aspect-square..."` around line 120), add `onclick={() => (selectedDate = format(new Date(currentYearNum, currentDate.getMonth(), day), 'yyyy-MM-dd'))}` (reuse the dateStr from the existing `getTasksForDay` call)
4. Add the modal at the bottom of the template (after the closing `</div>` of the grid):

   ```svelte
   <DayDetailModal {selectedDate} onclose={() => (selectedDate = null)} />
   ```

**Verify:**

- Click a day cell with tasks → modal opens showing tasks for that date
- Click backdrop → modal closes
- Click close button → modal closes
- Click empty day → modal shows "No tasks for this day"
- `npm run lint` — no errors

---

### Item 3 — Hover tooltip on task pills

**File:** `src/routes/calendar/+page.svelte`

**Changes:**

1. Remove `title={task.title}` from the task pill `<div>` (line 140)
2. Replace the pill structure to include a tooltip element. Wrap the pill content in a container `<div>` with `class="relative group"`:

   ```svelte
   <div class="group relative">
   	<!-- existing pill div without title attribute -->
   	<div class="flex items-center gap-1 ...">...</div>
   	<!-- tooltip -->
   	<div
   		class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 rounded-lg border px-2 py-1 text-xs shadow-lg group-hover:block"
   		style="background: var(--card-bg); border-color: var(--border); white-space: nowrap;"
   	>
   		<div class="flex items-center gap-1.5">
   			<span class="font-semibold" style="color: var(--text-heading);">{task.title}</span>
   			{#if task.priority}
   				<span
   					class="rounded px-1 text-[10px] font-bold text-white uppercase"
   					style="background: {task.priority === 'high'
   						? 'var(--priority-high)'
   						: task.priority === 'low'
   							? 'var(--priority-low)'
   							: 'var(--priority-medium)'}"
   				>
   					{task.priority}
   				</span>
   			{/if}
   		</div>
   		{#if task.description}
   			<p class="m-0 mt-0.5 max-w-[200px] truncate" style="color: var(--text-secondary);">
   				{task.description.slice(0, 80)}
   			</p>
   		{/if}
   		{#if task.tags && task.tags.length > 0}
   			<div class="mt-0.5 flex gap-1">
   				{#each task.tags.slice(0, 3) as tag (tag)}
   					<span
   						class="rounded px-1 text-[10px] text-white"
   						style="background: {store.tagColors[tag] || '#64748b'}">{tag}</span
   					>
   				{/each}
   			</div>
   		{/if}
   		<!-- downward arrow -->
   		<div
   			class="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b"
   			style="background: var(--card-bg); border-color: var(--border);"
   		></div>
   	</div>
   </div>
   ```

3. Add CSS at the bottom of the `<style>` block:
   - `.group:hover .group-hover\\:block { display: block !important; }` (since Tailwind v4, confirm utility works or use plain CSS)
   - Alternative: use a plain CSS approach with `.tooltip-container { position: relative; }` and `.tooltip-container:hover .tooltip { display: block; }` with 200ms transition delay using `transition-delay: 200ms;` on visibility

**Verify:**

- Hover over a task pill → tooltip appears after ~200ms with title, priority badge, description, tags
- Tooltip is above the pill, centered, with downward arrow
- `pointer-events: none` prevents interaction issues
- `npm run lint` — no errors

---

## Package 2: Mobile Navbar Redesign (Items 4, 5)

### Item 4 — Collapse nav into dropdown on mobile

**File:** `src/lib/components/NavBar.svelte`

**Changes:**

1. Add state variable:

   ```svelte
   let mobileMenuOpen = $state(false); let currentPageLabel = $derived(links.find(l => l.href ===
   $page.url.pathname)?.label || 'Tasks');
   ```

2. Add click-outside handler. Use a window click listener via `onclick` on the nav element that checks if the click target is outside the dropdown area, or use `use:clickOutside` action. Simplest approach: an `onclick` handler on the window running in `$effect`:

   ```svelte
   $effect(() => {
     if (mobileMenuOpen) {
       const handler = (e) => {
         if (!e.target.closest('.mobile-nav-toggle') && !e.target.closest('.mobile-nav-dropdown')) {
           mobileMenuOpen = false;
         }
       };
       window.addEventListener('click', handler);
       return () => window.removeEventListener('click', handler);
     }
   });
   ```

3. Restructure the template:
   - Keep the existing `<nav>` wrapper and conditional rendering (`{#if $page.url.pathname !== '/'}`)
   - Wrap the nav content: left side (desktop links → mobile dropdown toggle), right side (auth + theme unchanged)
   - **Desktop (`hidden sm:flex`):** Move the existing `<div class="flex gap-1">` with links into a `div class="hidden sm:flex gap-1"`
   - **Mobile (`flex sm:hidden`):** Add a new div:

     ```svelte
     <div class="flex items-center gap-1 sm:hidden" style="margin-left: 8px;">
     	<div
     		class="mobile-nav-toggle flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium"
     		style="color: var(--text-heading);"
     		onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
     		role="button"
     		tabindex="0"
     		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (mobileMenuOpen = !mobileMenuOpen)}
     	>
     		<span>{currentPageLabel}</span>
     		<!-- SVG triangle, 10x8px -->
     		<svg
     			width="10"
     			height="8"
     			viewBox="0 0 10 8"
     			fill="currentColor"
     			class="transition-transform duration-200"
     			class:rotate-180={mobileMenuOpen}
     		>
     			<path d="M5 8L0 0h10z" />
     		</svg>
     	</div>
     </div>
     ```

   - **Dropdown (`{#if mobileMenuOpen}`):**

     ```svelte
     {#if mobileMenuOpen}
     	<div
     		class="mobile-nav-dropdown absolute top-full left-0 z-50 mt-1 w-48 rounded-xl border p-1 shadow-lg"
     		style="background: var(--card-bg); border-color: var(--border);"
     	>
     		{#each links.filter((l) => l.href !== $page.url.pathname) as link (link.href)}
     			<a
     				href={link.href}
     				class="block rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors hover:opacity-80"
     				style="color: var(--text-secondary);"
     				onclick={() => (mobileMenuOpen = false)}
     			>
     				{link.label}
     			</a>
     		{/each}
     	</div>
     {/if}
     ```

   - The right-side group (auth + theme) stays unchanged as `<div class="absolute right-4 flex items-center gap-2">`

4. Add CSS for the rotate transition on the SVG triangle:

   ```svelte
   .rotate-180 {
     transform: rotate(180deg);
   }
   ```

5. Make sure the nav has `position: relative` so the dropdown positions correctly.

**Verify:**

- On desktop (>640px): navbar looks identical to before (horizontal links)
- On mobile (<640px): shows current page name + triangle, clicking toggles dropdown
- Dropdown excludes current page, clicking an option navigates and closes
- Clicking outside closes the dropdown
- Auth button and theme toggle remain on the right
- `npm run lint` — no errors

---

## Package 3: Board Page Features (Items 8, 9, 10)

### Item 8 — Add Toast to root layout

**File:** `src/routes/+layout.svelte`

**Changes:**

1. Add import:

   ```svelte
   import Toast from '$lib/components/Toast.svelte';
   ```

2. Add `<Toast />` in the template, after `</main>` or before `</body>`-equivalent area, e.g.:

   ```svelte
   <NavBar />
   <main id="main-content">
   	{@render children()}
   </main>
   <Toast />
   <MigrationDialog />
   ```

   (Ordering relative to MigrationDialog doesn't matter since Toast is fixed-positioned.)

**Verify:**

- Archive a task from any page → Toast appears at bottom
- `npm run lint` — no errors

---

### Item 9 — Multi-selection with modifier keys

**File:** `src/routes/board/+page.svelte`

**Changes:**

1. Add to `<script>`:

   ```svelte
   let lastClickedIdx = $state(-1);

   function handleCardClick(e, todo, index) {
     if (e.ctrlKey || e.metaKey) {
       // Toggle this card without affecting others
       store.toggleSelect(todo.id);
       lastClickedIdx = index;
     } else if (e.shiftKey && lastClickedIdx !== -1) {
       // Select range from lastClickedIdx to this index across all filtered todos
       const allTodos = store.todos;
       const start = Math.min(lastClickedIdx, index);
       const end = Math.max(lastClickedIdx, index);
       for (let i = start; i <= end; i++) {
         store.selectedTodos.add(allTodos[i].id);
       }
       // Trigger reactivity by reassigning
       store.selectedTodos = new SvelteSet(store.selectedTodos);
     } else {
       // Single select: deselect all others, select this one
       store.selectedTodos = new SvelteSet([todo.id]);
       lastClickedIdx = index;
     }
   }
   ```

   Note: Need to import `SvelteSet` at the top:

   ```svelte
   import {SvelteSet} from 'svelte/reactivity';
   ```

   Actually, looking more carefully: the index used for `lastClickedIdx` should be the index in `store.todos`, not within the column. But shift-click spanning columns means we need a global index. Let me reconsider. The simpler approach: track `lastClickedId` (the todo id) rather than index, and find the index in the flat `store.todos` array when shift-clicking. This way shift+click works across columns correctly.

   ```svelte
   let lastClickedId = $state(null);

   function handleCardClick(e, todo) {
     if (e.ctrlKey || e.metaKey) {
       store.toggleSelect(todo.id);
       lastClickedId = todo.id;
     } else if (e.shiftKey && lastClickedId !== null) {
       const allTodos = store.todos;
       const lastIdx = allTodos.findIndex(t => t.id === lastClickedId);
       const currentIdx = allTodos.findIndex(t => t.id === todo.id);
       if (lastIdx !== -1 && currentIdx !== -1) {
         const start = Math.min(lastIdx, currentIdx);
         const end = Math.max(lastIdx, currentIdx);
         for (let i = start; i <= end; i++) {
           store.selectedTodos.add(allTodos[i].id);
         }
         store.selectedTodos = new SvelteSet(store.selectedTodos);
       }
     } else {
       store.selectedTodos = new SvelteSet([todo.id]);
       lastClickedId = todo.id;
     }
   }
   ```

2. Add `onclick` handler to the card `<div>` (the `.board-card` div):

   ```svelte
   onclick={(e) => handleCardClick(e, todo)}
   ```

   **Important:** This must not interfere with drag-and-drop. Since drag uses `ondragstart` and the native DnD API, clicks and drags are separate events — a click won't fire after a drag. However, we need to avoid firing `onclick` during a drag. Add a guard:

   ```svelte
   let justDragged = $state(false);
   ```

   Set `justDragged = true` in `ondragstart` and reset it after a short timeout. In `handleCardClick`, early-return if `justDragged`.

   Simpler approach: For the drag-and-drop case, the native drag events already prevent click events from firing (the browser doesn't fire `click` after a drag sequence). So no guard needed — test and verify.

3. Add `class:selected` to the card div:

   ```svelte
   class:selected={store.selectedTodos.has(todo.id)}
   ```

4. Add CSS for `.board-card.selected`:

   ```svelte
   .board-card.selected {
     border-color: var(--btn-primary) !important;
     box-shadow: 0 0 0 2px var(--btn-primary),
                 0 8px 24px rgba(37, 99, 235, 0.2);
   }
   ```

5. Add floating batch action bar at the bottom of the page template (inside the outer container, after the grid, before closing `</div>` tags):

   ```svelte
   {#if store.selectedTodos.size > 0}
   	<div class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
   		<div
   			class="flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg"
   			style="background: var(--card-bg); border-color: var(--border);"
   		>
   			<span class="text-sm font-medium" style="color: var(--text-heading);">
   				{store.selectedTodos.size} selected
   			</span>
   			<button
   				onclick={() => store.archiveSelected()}
   				class="cursor-pointer rounded-lg border-none px-3 py-1.5 text-xs font-semibold text-white"
   				style="background: var(--priority-high);"
   			>
   				Archive
   			</button>
   			<button
   				onclick={() => store.completeSelected()}
   				class="cursor-pointer rounded-lg border-none px-3 py-1.5 text-xs font-semibold text-white"
   				style="background: var(--btn-save);"
   			>
   				Mark Done
   			</button>
   			<button
   				onclick={() => {
   					store.selectedTodos = new SvelteSet();
   					lastClickedId = null;
   				}}
   				class="cursor-pointer rounded-lg border-none px-3 py-1.5 text-xs font-semibold"
   				style="background: var(--input-bg); color: var(--text-heading);"
   			>
   				Cancel
   			</button>
   		</div>
   	</div>
   {/if}
   ```

6. Add `onclick` handler on empty column areas to deselect all. On the column body div (the one with `class="flex flex-col gap-2 p-3"`), add:

   ```svelte
   onclick={() => {
   	if (col.todos.length === 0) {
   		store.selectedTodos = new SvelteSet();
   		lastClickedId = null;
   	}
   }}
   ```

   For non-empty columns, clicking empty space won't hit a card, so we can add a click handler on the column body that deselects if the target is the column body itself:

   ```svelte
   onclick={(e) => {
   	if (e.target === e.currentTarget) {
   		store.selectedTodos = new SvelteSet();
   		lastClickedId = null;
   	}
   }}
   ```

**Verify:**

- Click a card → selects it (blue border), deselects others
- Ctrl/Cmd+click → toggles selection of that card
- Shift+click → selects range from last clicked to this one (across columns)
- Click empty column space → deselects all
- Batch action bar appears with count, Archive, Mark Done, Cancel
- Drag-and-drop still works independently
- `npm run lint` — no errors

---

### Item 10 — Board move toast with undo

**File:** `src/lib/state/todoStore.svelte.js`

**Changes:**

1. Add two new state variables after `lastCompletedTodos` (around line 183):

   ```svelte
   /** @type {Todo[]} */
   lastMovedTodos = $state([]);
   /** @type {Array<{completed: boolean, tags: string[]}>} */
   lastMovedStates = $state([]);
   ```

2. Add `undoMove()` method after `undoComplete()` (after line 836):
   ```
   undoMove() {
     if (this.lastMovedTodos.length > 0) {
       for (let i = 0; i < this.lastMovedTodos.length; i++) {
         const todo = this.lastMovedTodos[i];
         const state = this.lastMovedStates[i];
         const current = this.todos.find((t) => t.id === todo.id);
         if (current) {
           current.completed = state.completed;
           current.tags = state.tags;
           this._syncUpdate(todo.id, { completed: state.completed, tags: state.tags });
         }
       }
       const count = this.lastMovedTodos.length;
       this.lastMovedTodos = [];
       this.lastMovedStates = [];
       this.showToast(`${count} task${count > 1 ? 's' : ''} move undone`, 'success');
     }
   }
   ```

**File:** `src/routes/board/+page.svelte`

**Changes:**

1. In `handleColumnDrop()`, before mutating the todo, save its pre-move state:
   - At the start of `handleColumnDrop`, after the early returns and before any mutations, capture the pre-move state of the dragged todo:
     ```
     if (draggedId !== null) {
       const todo = store.todos.find((t) => t.id === draggedId);
       if (todo) {
         store.lastMovedTodos = [todo];
         store.lastMovedStates = [{ completed: todo.completed, tags: [...(todo.tags || [])] }];
       }
     }
     ```
   - Note: The existing `handleColumnDrop` already looks up the todo after the early return. Restructure so the pre-move capture happens before mutations.

2. After the column/tag mutations and reorder, if the move was successful, call `store.showToast()` with the appropriate message:
   - After the column logic (step 1 in the existing code), determine column label from `columnKey`:
     ```
     const columnLabels = { pending: 'Pending', 'in-progress': 'In Progress', done: 'Done' };
     const label = columnLabels[columnKey] || columnKey;
     store.showToast(`Moved task to '${label}'`, 'info');
     ```

**File:** `src/lib/components/Toast.svelte`

**Changes:**

1. Update the Undo button condition (line 36) to also check `lastMovedTodos`:
   ```
   {#if store.toast.type === 'info' && (store.lastArchivedTodos.length > 0 || store.lastCompletedTodos.length > 0 || store.lastMovedTodos.length > 0)}
   ```
2. Update the `onclick` handler to also handle `lastMovedTodos`:
   ```
   onclick={() => {
     if (store.lastArchivedTodos.length > 0) store.undoArchive();
     else if (store.lastCompletedTodos.length > 0) store.undoComplete();
     else if (store.lastMovedTodos.length > 0) store.undoMove();
   }}
   ```

**Verify:**

- Drag a card between columns → toast shows "Moved task to 'In Progress'"
- Click Undo on the toast → task reverts to its original column/state
- Toast dismisses normally after timeout
- `npm run lint` — no errors

---

## Package 4: Stats & Archiving Fixes (Items 6, 7)

### Item 6 — Completion rate includes archived todos

**File:** `src/routes/stats/+page.svelte`

**Changes:**

1. Replace the `completedPct` derivation (lines 24-26) with:
   ```
   let completedPct = $derived.by(() => {
     const allTodos = [...store.todos, ...store.archivedTodos];
     const total = allTodos.length;
     const completed = allTodos.filter((t) => t.completed).length;
     return total > 0 ? Math.round((completed / total) * 100) : 0;
   });
   ```
2. The text on line 84 says `{store.stats.total} total tasks` — this should remain as-is (it reflects the StatsBar's active-only count). The completion rate card's description can optionally be updated, but per spec it's fine.

**Verify:**

- Archive a completed todo → completion rate doesn't decrease
- Archive an incomplete todo → total in completion rate card increases, rate adjusts
- `npm run lint` — no errors

---

### Item 7 — Category breakdown sums to 100%

**File:** `src/routes/stats/+page.svelte`

**Changes:**

1. Add a new derived after the existing `priorityTotal` (after line 39):

   ```svelte
   let categoryTotal = $derived(Object.values(store.categoryBreakdown).reduce((sum, c) => sum + c, 0));
   ```

2. On line 298, change the `pct` computation from:

   ```svelte
   {@const pct = store.stats.total > 0 ? Math.round((count / store.stats.total) * 100) : 0}
   ```

   to:

   ```svelte
   {@const pct = categoryTotal > 0 ? Math.round((count / categoryTotal) * 100) : 0}
   ```

**Verify:**

- With 2 Work + 1 Health tasks → shows 67% + 33% = 100% (rather than e.g. 67% + 33% if there are 0 other high-priority tasks, etc.)
- Edge case: zero categories → `categoryTotal` is 0, `pct` evaluates to 0 (no division by zero)
- `npm run lint` — no errors

---

## Package 5: Error Pages (Item 11)

### Item 11 — Create +error.svelte

**File:** New `src/routes/+error.svelte`

**Changes — create the component:**

- Use the SvelteKit error page convention — receives `$page.status` and `$page.error` from the `page` store
- `<script>` block:

  ```svelte
  import {page} from '$app/stores';
  ```

- Template:
  - Outer div: `flex min-h-dvh items-center justify-center p-4` with the same gradient `background` as other pages
  - Card div: centered, max-width 420px, rounded-2xl, border, p-8, using `var(--card-bg)`, `var(--border)`, `var(--shadow)`
  - Large status code number (e.g. `<h1 class="text-6xl font-bold">{$page.status}</h1>` styled with `var(--btn-primary)` color)
  - Contextual message via `{#if}` chain:

    ```svelte
    {#if $page.status === 404}
    	<p>Page not found — the link you followed may be broken</p>
    {:else if $page.status === 403}
    	<p>You don't have access to this page</p>
    {:else if $page.status >= 500}
    	<p>Server error — something went wrong on our end</p>
    {:else}
    	<p>Something went wrong, try again later!</p>
    {/if}
    ```

  - If `$page.error?.message` exists and differs from the contextual message, show it as secondary text
  - "Back to Tasks" link at the bottom: `<a href="/" class="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium no-underline text-white" style="background: var(--btn-primary);">Back to Tasks</a>`

- No `<NavBar />` is rendered on error pages (the `+layout.svelte` still renders NavBar — check if SvelteKit's error page replaces the layout. In SvelteKit, `+error.svelte` within the same directory as `+layout.svelte` renders _inside_ the layout. Actually, a root `+error.svelte` at `src/routes/+error.svelte` renders inside the root layout, which includes NavBar. Per the design doc requirement "No nav bar rendered on error pages", we should handle this.)

  To ensure no NavBar on error pages, we could either:
  - Not render NavBar in the layout when on an error page (requires reading `$page.status` in the layout)
  - Or the error page can conditionally hide NavBar via CSS
  - Best approach: In `+layout.svelte`, wrap `<NavBar />` so it doesn't show on error pages. This requires reading `$page.status`:

    ```svelte
    import {page} from '$app/stores';
    ```

    Then:

    ```svelte
    {#if !$page.error}
    	<NavBar />
    {/if}
    ```

    This is a small additional change to `+layout.svelte`.

- **Additional change in `src/routes/+layout.svelte`:**
  1. Add import: `import { page } from '$app/stores';`
  2. Wrap `<NavBar />` with `{#if !$page.error}` conditional

**Verify:**

- Navigate to `/nonexistent` → 404 page shows with message "Page not found — the link you followed may be broken"
- No nav bar on the error page
- "Back to Tasks" link works
- `npm run lint` — no errors
