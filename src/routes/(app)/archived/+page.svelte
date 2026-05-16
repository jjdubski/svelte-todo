<script>
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import BackButton from '$lib/components/BackButton.svelte';
	import { handleSelectionClick, initSelection } from '$lib/utils/selection.js';
	import SelectionBar from '$lib/components/SelectionBar.svelte';
	import { Archive, RotateCcw, Trash2, Calendar, CheckSquare, Square } from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { lightTap } from '$lib/utils/haptics.js';

	const store = getTodoStore();
	const selectionState = initSelection();
	let lastClickedId = $state(selectionState.lastClickedId);

	function handleArchivedCardClick(e, todo) {
		if (e.target.closest('button')) return;

		handleSelectionClick(e, todo, store, 'selectedArchived', {
			get lastClickedId() {
				return lastClickedId;
			},
			set lastClickedId(value) {
				lastClickedId = value;
			}
		});
	}

	function handleArchivedCardKeydown(e, todo) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleArchivedCardClick(e, todo);
		}
	}
</script>

<svelte:window onkeydown={(e) => store.handleKeydown(e)} />

<div class="mb-4 flex items-center justify-between gap-2">
	<h2 class="m-0 text-lg font-semibold sm:text-xl" style="color: var(--text-heading);">Archived Tasks</h2>
	<BackButton />
</div>

<div class="mb-4 flex items-center justify-between">
	<span class="text-sm sm:text-base" style="color: var(--text-muted);">{store.archivedTodos.length} archived</span>
	<button
		type="button"
		class="glow-btn flex h-9 cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-1.5 text-xs font-semibold sm:text-sm"
		style="background: var(--input-bg); border: 1px solid var(--border); color: var(--text-muted);"
		class:active={store.archivedSelectMode}
		onclick={() => (store.archivedSelectMode = !store.archivedSelectMode)}
	>
		{#if store.archivedSelectMode && store.selectedArchived.size > 0}
			<span>{store.selectedArchived.size}</span>
		{:else}
			<CheckSquare size={14} />
		{/if}
	</button>
</div>
{#if store.archivedTodos.length === 0}
	<div class="flex flex-col items-center justify-center px-4 py-24">
		<Archive size={48} style="color: var(--text-muted); opacity: 0.4;" />
		<p class="mt-4 text-sm sm:text-base" style="color: var(--text-muted);">No archived tasks</p>
	</div>
{:else}
	<div class="flex flex-col gap-2">
		{#each store.archivedTodos as todo (todo.id)}
			<div
				class="archived-card flex items-stretch gap-3 rounded-xl border p-3"
				role="button"
				tabindex="0"
				class:archived-card-selected={store.selectedArchived.has(todo.id)}
				style="background: var(--todo-bg); border-color: var(--border);"
				onclick={(e) => handleArchivedCardClick(e, todo)}
				onkeydown={(e) => handleArchivedCardKeydown(e, todo)}
			>
				{#if store.archivedSelectMode}
					<button
						type="button"
						class="flex shrink-0 cursor-pointer items-center justify-center self-start rounded border-none bg-none p-0.5"
						style="color: var(--text-muted);"
						onclick={() => store.toggleArchivedSelect(todo.id)}
						aria-label={store.selectedArchived.has(todo.id) ? 'Deselect' : 'Select'}
					>
						{#if store.selectedArchived.has(todo.id)}
							<CheckSquare size={18} />
						{:else}
							<Square size={18} />
						{/if}
					</button>
				{/if}
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-1.5">
						<h3
							class="m-0 text-sm leading-snug font-medium sm:text-base"
							style="color: var(--text-heading);"
						>
							{todo.title}
						</h3>
						{#if todo.priority}
							<span
								class="inline-block rounded px-1.5 py-0.5 text-xs font-bold tracking-wider text-white uppercase priority-{todo.priority} sm:text-sm"
							>
								{todo.priority}
							</span>
						{/if}
						{#if todo.category && store.categories.includes(todo.category)}
							<span
								class="inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold text-white sm:text-sm"
								style="background: {store.categoryColors[todo.category]};"
							>
								{todo.category}
							</span>
						{/if}
					</div>
					{#if todo.description}
						<p class="m-0 mt-0.5 text-sm sm:text-base" style="color: var(--text-secondary);">
							{todo.description}
						</p>
					{/if}
					{#if todo.tags && todo.tags.length > 0}
						<div class="mt-1 flex flex-wrap gap-1">
							{#each todo.tags as tag (tag)}
								<span
									class="inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold text-white sm:text-sm"
									style="background: {store.tagColors[tag]};"
								>
									{tag}
								</span>
							{/each}
						</div>
					{/if}
					{#if todo.dueDate}
						<div
							class="mt-1 flex items-center gap-1 text-sm sm:text-base"
							style="color: var(--text-muted);"
						>
							<Calendar size={12} />
							<span>{todo.dueDate}</span>
						</div>
					{/if}
				</div>
				{#if !store.archivedSelectMode}
					<div class="flex shrink-0 flex-col justify-around">
						<button
							type="button"
							class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-1.5 text-xs font-semibold text-white sm:text-sm"
							style="background: var(--btn-save);"
							data-btn="save"
							onclick={() => {
								store.restoreTodo(todo.id);
								lightTap();
							}}
						>
							<RotateCcw size={12} /> Restore
						</button>
						<button
							type="button"
							class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-1.5 text-xs font-semibold text-white sm:text-sm"
							style="background: var(--btn-delete);"
							data-btn="delete"
							onclick={() => {
								store.permanentDeleteTodo(todo.id);
								lightTap();
							}}
						>
							<Trash2 size={12} /> Delete
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<SelectionBar
	count={store.selectedArchived.size}
	actions={[
		{ label: 'Restore', onClick: () => store.restoreSelectedArchived(), style: 'var(--btn-save)' },
		{ label: 'Delete', onClick: () => store.permanentDeleteSelectedArchived(), style: 'var(--btn-delete)' }
	]}
	onCancel={() => {
		store.archivedSelectMode = false;
		store.selectedArchived = new SvelteSet();
		lastClickedId = null;
	}}
/>

<style>
	.archived-card {
		transition:
			transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.3s ease,
			border-color 0.3s ease;
	}

	.archived-card:hover {
		transform: translateY(-2px);
		border-color: var(--border-input);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
	}

	.archived-card-selected {
		border-color: var(--btn-primary) !important;
		box-shadow: 0 0 0 1px var(--btn-primary);
	}

	button.active {
		background: var(--btn-primary) !important;
		color: white !important;
		border-color: var(--btn-primary) !important;
	}

	.priority-high {
		background: var(--priority-high);
	}

	.priority-medium {
		background: var(--priority-medium);
		color: #1e293b;
	}

	.priority-low {
		background: var(--priority-low);
		color: #1e293b;
	}
</style>
