<script>
	import { slide } from 'svelte/transition';
	import { Search, CheckSquare, Archive, X, Calendar, RotateCcw } from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import { lightTap } from '$lib/utils/haptics.js';

	const store = getTodoStore();

	let showDateFilter = $state(false);
	let searchInput = $state(null);

	// Auto-focus search input when triggered by keyboard shortcut
	$effect(() => {
		if (store.focusSearchRequested) {
			// Just reading the value creates a dependency
			searchInput?.focus();
		}
	});
</script>

<!-- Filter Bar -->
<div class="mb-3 flex flex-wrap gap-2">
	<div
		class="search-input-wrapper flex min-w-[160px] flex-1 items-center gap-2 rounded-xl border px-3 py-2.5"
		style="background: var(--input-bg); border-color: var(--border);"
	>
		<Search size={16} style="color: var(--text-muted);" aria-hidden="true" />
		<input
			bind:this={searchInput}
			class="m-0 flex-1 rounded-sm border-none bg-transparent p-0 text-sm sm:text-base"
			style="color: var(--text); outline: none;"
			bind:value={store.filterText}
			placeholder="Search…"
			aria-label="Search tasks"
			type="search"
		/>
	</div>
	<select
		class="rounded-xl p-2.5 px-3 text-sm sm:text-base"
		style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text); cursor: pointer;"
		bind:value={store.filterStatus}
		aria-label="Filter by status"
	>
		<option value="all">All</option>
		<option value="active">Active</option>
		<option value="done">Done</option>
	</select>
	<select
		class="rounded-xl p-2.5 px-3 text-sm sm:text-base"
		style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text); cursor: pointer;"
		bind:value={store.filterPriority}
		aria-label="Filter by priority"
	>
		<option value="all">Priority</option>
		<option value="high">High</option>
		<option value="medium">Medium</option>
		<option value="low">Low</option>
	</select>
	<select
		class="rounded-xl p-2.5 px-3 text-sm sm:text-base"
		style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text); cursor: pointer;"
		bind:value={store.sortBy}
		aria-label="Sort by"
	>
		<option value="manual">Sort</option>
		<option value="priority">Priority</option>
		<option value="date">Date</option>
		<option value="alpha-asc">A-Z</option>
		<option value="alpha-desc">Z-A</option>
		<option value="category">Category</option>
	</select>
	{#if store.activeFilterCount > 0}
		<button
			type="button"
			class="glow-btn flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border"
			style="background: var(--btn-delete); border-color: var(--btn-delete); color: white;"
			data-btn="delete"
			onclick={() => store.clearFilters()}
			aria-label="Clear all filters"
			title="Clear all filters"
		>
			<RotateCcw size={20} />
		</button>
	{/if}
	<div class="relative">
		<button
			type="button"
			class="glow-btn flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border"
			style="background: var(--input-bg); border-color: var(--border); color: var(--text-muted);"
			data-btn="ghost"
			class:active={store.selectMode}
			onclick={() => (store.selectMode = !store.selectMode)}
			aria-label="Toggle select mode"
		>
			{#if store.selectMode && store.selectedTodos.size > 0}
				<span class="text-sm font-semibold sm:text-base">{store.selectedTodos.size}</span>
			{:else}
				<CheckSquare size={20} />
			{/if}
		</button>
		{#if store.selectMode}
			<div
				class="absolute top-full right-0 z-50 mt-2 flex gap-1.5 rounded-xl border p-2 whitespace-nowrap shadow-lg"
				style="background: var(--card-bg); border-color: var(--border);"
				transition:slide={{ duration: store.prefersReducedMotion ? 0 : 150 }}
			>
				<button
					type="button"
					class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-2.5 py-2 text-xs font-medium sm:text-sm"
					style="background: var(--btn-save); color: white;"
					data-btn="save"
					onclick={() => {
						store.completeSelected();
						lightTap();
					}}
					disabled={store.selectedTodos.size === 0}
				>
					<CheckSquare size={14} /> Complete
				</button>
				<button
					type="button"
					class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-2.5 py-2 text-xs font-medium sm:text-sm"
					style="background: var(--btn-delete); color: white;"
					data-btn="delete"
					onclick={() => {
						store.archiveSelected();
						lightTap();
					}}
					disabled={store.selectedTodos.size === 0}
				>
					<Archive size={14} /> Archive
				</button>
				<button
					type="button"
					class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-2.5 py-2 text-xs font-medium sm:text-sm"
					style="background: var(--btn-cancel); color: white;"
					data-btn="cancel"
					onclick={() => {
						store.selectMode = false;
						store.selectedTodos = new SvelteSet();
					}}
				>
					<X size={14} /> Cancel
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Date Range Filter (collapsible) -->
<div class="mb-3">
	<button
		type="button"
		class="glow-btn flex cursor-pointer items-center gap-1.5 rounded-lg border-none px-3 py-1.5 text-xs font-medium sm:text-sm"
		style="color: var(--text-muted);"
		data-btn="ghost"
		onclick={() => (showDateFilter = !showDateFilter)}
	>
		<Calendar size={14} />
		{showDateFilter ? 'Hide' : 'Filter by date'}
		{#if store.filterDateFrom || store.filterDateTo}
			<span
				class="ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold text-white"
				style="background: var(--btn-primary);">active</span
			>
		{/if}
	</button>
	{#if showDateFilter}
		<div
			class="mt-2 flex flex-wrap items-center gap-2"
			transition:slide={{ duration: store.prefersReducedMotion ? 0 : 150 }}
		>
			<input
				type="date"
				class="rounded-xl p-2 px-3 text-sm sm:text-base"
				style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);"
				bind:value={store.filterDateFrom}
				aria-label="Date from"
			/>
			<span class="text-xs" style="color: var(--text-muted);">to</span>
			<input
				type="date"
				class="rounded-xl p-2 px-3 text-sm sm:text-base"
				style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);"
				bind:value={store.filterDateTo}
				aria-label="Date to"
			/>
			{#if store.filterDateFrom || store.filterDateTo}
				<button
					type="button"
					class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-2 py-1 text-xs font-medium sm:text-sm"
					style="color: var(--btn-delete);"
					data-btn="ghost"
					onclick={() => {
						store.filterDateFrom = '';
						store.filterDateTo = '';
					}}
				>
					<X size={12} /> Clear dates
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Categories -->
<div
	class="mb-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5"
	class:drag-active={store.draggedId !== null}
	style="background: var(--todo-bg); border-color: var(--border); transition: background 0.3s, border-color 0.3s;"
>
	<button
		type="button"
		class="glow-btn cursor-pointer rounded-full border-transparent px-3 py-1.5 text-sm font-medium sm:text-base"
		style="color: var(--text-secondary);"
		data-btn="ghost"
		class:active={store.filterCategory === ''}
		onclick={() => (store.filterCategory = '')}>All</button
	>
	{#each store.categories as cat (cat)}
		<button
			type="button"
			class="glow-btn cursor-pointer rounded-full border-transparent px-3 py-1.5 text-sm font-medium sm:text-base"
			style="color: var(--text-secondary); --cat-color: {store.categoryColors[cat]};"
			data-btn="ghost"
			data-pill="category"
			class:active={store.filterCategory === cat}
			class:drag-over={store.dragTargetPill === 'category' && store.dragTargetValue === cat}
			onclick={() => store.setFilterCategory(cat)}
			draggable={false}
			ondragover={(e) => store.handlePillDragOver(e, 'category', cat)}
			ondragleave={() => store.handlePillDragLeave()}
			ondrop={(e) => store.handlePillDrop(e, 'category', cat)}
		>
			{cat}
		</button>
	{/each}
</div>

<!-- Tag Filter Pills -->
{#if store.availableTags.length > 0}
	<div
		class="mb-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5"
		class:drag-active={store.draggedId !== null}
		style="background: var(--todo-bg); border-color: var(--border);"
	>
		<span class="mr-1 text-xs font-medium sm:text-sm" style="color: var(--text-muted);">Tags:</span>
		{#each store.availableTags as tag (tag)}
			<button
				class="glow-tag tag-filter-pill cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium sm:text-base"
				style="--tag-color: {store.tagColors[tag]};"
				class:selected={store.filterTags.includes(tag)}
				class:drag-over={store.dragTargetPill === 'tag' && store.dragTargetValue === tag}
				onclick={() => {
					store.filterTags = store.filterTags.includes(tag)
						? store.filterTags.filter((t) => t !== tag)
						: [...store.filterTags, tag];
				}}
				type="button"
				data-btn="tag"
				data-pill="tag"
				draggable={false}
				ondragover={(e) => store.handlePillDragOver(e, 'tag', tag)}
				ondragleave={() => store.handlePillDragLeave()}
				ondrop={(e) => store.handlePillDrop(e, 'tag', tag)}
			>
				{tag}
			</button>
		{/each}
		{#if store.filterTags.length > 0}
			<button
				type="button"
				class="glow-btn cursor-pointer rounded-full border-none px-2 py-1 text-xs font-medium sm:text-sm"
				style="color: var(--text-muted);"
				data-btn="ghost"
				onclick={() => (store.filterTags = [])}
			>
				<X size={12} /> Clear
			</button>
		{/if}
	</div>
{/if}

<style>
	.search-input-wrapper:focus-within {
		border-color: var(--btn-primary) !important;
		box-shadow: 0 0 0 1px var(--btn-primary);
	}

	button.active {
		background: var(--btn-primary) !important;
		color: white !important;
	}

	button[data-btn='ghost'].active {
		background: var(--btn-primary) !important;
		color: white !important;
	}

	[data-btn='ghost']:hover {
		background: var(--todo-bg) !important;
		border-color: var(--text-muted) !important;
	}

	.tag-filter-pill {
		background: transparent;
		color: var(--text-secondary);
		border-color: var(--border);
		transition:
			transform 0.2s,
			box-shadow 0.2s,
			border-color 0.2s,
			color 0.2s,
			background 0.2s;
	}

	.tag-filter-pill:hover {
		filter: brightness(1.1);
		border-color: var(--tag-color, #6366f1);
		color: var(--tag-color, #6366f1);
	}

	.tag-filter-pill.selected {
		background: var(--tag-color) !important;
		color: white;
		border-color: var(--tag-color);
	}

	/* ── Drag-to-assign pill feedback ── */

	/* When dragging, fade all pills */
	.drag-active [data-pill] {
		opacity: 0.45;
		transition:
			opacity 0.2s,
			transform 0.2s,
			box-shadow 0.2s,
			border-color 0.2s;
	}

	/* Highlight the pill being hovered during drag */
	.drag-active [data-pill].drag-over {
		opacity: 1;
		transform: scale(1.08);
		border-color: var(--btn-primary) !important;
		box-shadow:
			0 0 0 3px var(--btn-primary),
			0 0 20px rgba(37, 99, 235, 0.4);
	}

	/* Category pill drag-over */
	[data-btn='ghost'].drag-over {
		opacity: 1 !important;
		transform: scale(1.08);
		border-color: var(--btn-primary) !important;
		box-shadow:
			0 0 0 3px var(--btn-primary),
			0 0 20px rgba(37, 99, 235, 0.4);
		background: transparent !important;
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			transition-duration: 0.01ms !important;
			animation-duration: 0.01ms !important;
		}

		.drag-active [data-pill].drag-over {
			transform: none !important;
		}

		[data-btn='ghost'].drag-over {
			transform: none !important;
		}
	}
</style>
