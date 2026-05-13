<script>
	import { slide } from 'svelte/transition';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import StatsBar from '$lib/components/StatsBar.svelte';
	import { Archive, RotateCcw, Trash2, Calendar, CheckSquare, Square, X } from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';

	const store = getTodoStore();
</script>

<svelte:window onkeydown={(e) => store.handleKeydown(e)} />

<div
	class="flex min-h-dvh justify-center p-4"
	style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%); transition: background 0.3s;"
>
	<div
		class="w-full max-w-[1080px] rounded-2xl border p-8 sm:rounded-xl sm:p-5 xl:max-w-[1100px] 2xl:max-w-[1300px]"
		style="background: var(--card-bg); box-shadow: 0 8px 32px var(--shadow); border-color: var(--border); transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;"
	>
		<StatsBar />
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold sm:text-xl" style="color: var(--text-heading);">Archived Tasks</h2>
			<span class="flex items-center gap-2">
				<div class="relative">
					<button
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
					{#if store.archivedSelectMode}
						<div
							class="absolute top-full right-0 z-50 mt-2 flex gap-1.5 rounded-xl border p-2 whitespace-nowrap shadow-lg"
							style="background: var(--card-bg); border-color: var(--border);"
							transition:slide={{ duration: store.prefersReducedMotion ? 0 : 150 }}
						>
							{#if store.selectedArchived.size === store.archivedTodos.length && store.archivedTodos.length > 0}
								<button
									class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-2.5 py-2 text-xs font-medium sm:text-sm"
									style="background: var(--input-bg); color: var(--text-heading);"
									onclick={() => store.deselectAllArchived()}
								>
									<Square size={14} /> Deselect All
								</button>
							{:else}
								<button
									class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-2.5 py-2 text-xs font-medium sm:text-sm"
									style="background: var(--input-bg); color: var(--text-heading);"
									onclick={() => store.selectAllArchived()}
								>
									<CheckSquare size={14} /> Select All
								</button>
							{/if}
							<button
								class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-2.5 py-2 text-xs font-medium sm:text-sm"
								style="background: var(--btn-save); color: white;"
								data-btn="save"
								onclick={() => store.restoreSelectedArchived()}
								disabled={store.selectedArchived.size === 0}
							>
								<RotateCcw size={14} /> Restore
							</button>
							<button
								class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-2.5 py-2 text-xs font-medium sm:text-sm"
								style="background: var(--btn-delete); color: white;"
								data-btn="delete"
								onclick={() => store.permanentDeleteSelectedArchived()}
								disabled={store.selectedArchived.size === 0}
							>
								<Trash2 size={14} /> Delete
							</button>
							<button
								class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-2.5 py-2 text-xs font-medium sm:text-sm"
								style="background: var(--btn-cancel); color: white;"
								data-btn="cancel"
								onclick={() => {
									store.archivedSelectMode = false;
									store.selectedArchived = new SvelteSet();
								}}
							>
								<X size={14} /> Cancel
							</button>
						</div>
					{/if}
				</div>
				<span class="text-sm sm:text-base" style="color: var(--text-muted);"
					>{store.archivedTodos.length} archived</span
				>
			</span>
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
						class:archived-card-selected={store.selectedArchived.has(todo.id)}
						style="background: var(--todo-bg); border-color: var(--border);"
					>
						{#if store.archivedSelectMode}
							<button
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
									class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-1.5 text-xs font-semibold text-white sm:text-sm"
									style="background: var(--btn-save);"
									data-btn="save"
									onclick={() => store.restoreTodo(todo.id)}
								>
									<RotateCcw size={12} /> Restore
								</button>
								<button
									class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-1.5 text-xs font-semibold text-white sm:text-sm"
									style="background: var(--btn-delete);"
									data-btn="delete"
									onclick={() => store.permanentDeleteTodo(todo.id)}
								>
									<Trash2 size={12} /> Delete
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

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
