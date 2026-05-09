<script>
	import { getTodoStore } from '$lib/todoStore.svelte.js';
	import StatsBar from '$lib/StatsBar.svelte';
	import { Archive, RotateCcw, Trash2, Calendar } from 'lucide-svelte';

	const store = getTodoStore();
</script>

<div
	class="flex min-h-dvh justify-center p-8 sm:p-4"
	style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%); transition: background 0.3s;"
>
	<div
		class="w-full max-w-[900px] rounded-2xl border p-8 sm:rounded-xl sm:p-5 xl:max-w-[1100px] 2xl:max-w-[1300px]"
		style="background: var(--card-bg); box-shadow: 0 8px 32px var(--shadow); border-color: var(--border); transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;"
	>
		<StatsBar />
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold" style="color: var(--text-heading);">Archived Tasks</h2>
			<span class="text-sm" style="color: var(--text-muted);"
				>{store.archivedTodos.length} archived</span
			>
		</div>
		{#if store.archivedTodos.length === 0}
			<div class="flex flex-col items-center justify-center px-4 py-24">
				<Archive size={48} style="color: var(--text-muted); opacity: 0.4;" />
				<p class="mt-4 text-sm" style="color: var(--text-muted);">No archived tasks</p>
			</div>
		{:else}
			<div class="flex flex-col gap-2">
				{#each store.archivedTodos as todo (todo.id)}
					<div
						class="archived-card flex items-start gap-3 rounded-xl border p-3"
						style="background: var(--todo-bg); border-color: var(--border);"
					>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-1.5">
								<h3
									class="m-0 text-base leading-snug font-medium"
									style="color: var(--text-heading);"
								>
									{todo.title}
								</h3>
								{#if todo.priority}
									<span
										class="inline-block rounded px-1.5 py-0.5 text-xs font-bold tracking-wider text-white uppercase priority-{todo.priority}"
									>
										{todo.priority}
									</span>
								{/if}
								{#if todo.category && store.categories.includes(todo.category)}
									<span
										class="inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold text-white"
										style="background: {store.categoryColors[todo.category]};"
									>
										{todo.category}
									</span>
								{/if}
							</div>
							{#if todo.description}
								<p class="m-0 mt-0.5 text-sm" style="color: var(--text-secondary);">
									{todo.description}
								</p>
							{/if}
							{#if todo.tags && todo.tags.length > 0}
								<div class="mt-1 flex flex-wrap gap-1">
									{#each todo.tags as tag (tag)}
										<span
											class="inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold text-white"
											style="background: {store.tagColors[tag]};"
										>
											{tag}
										</span>
									{/each}
								</div>
							{/if}
							{#if todo.dueDate}
								<div class="mt-1 flex items-center gap-1 text-sm" style="color: var(--text-muted);">
									<Calendar size={12} />
									<span>{todo.dueDate}</span>
								</div>
							{/if}
						</div>
						<div class="flex shrink-0 flex-col gap-1.5">
							<button
								class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-1.5 text-xs font-semibold text-white"
								style="background: var(--btn-save);"
								data-btn="save"
								onclick={() => store.restoreTodo(todo.id)}
							>
								<RotateCcw size={12} /> Restore
							</button>
							<button
								class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-1.5 text-xs font-semibold text-white"
								style="background: var(--btn-delete);"
								data-btn="delete"
								onclick={() => store.permanentDeleteTodo(todo.id)}
							>
								<Trash2 size={12} /> Delete
							</button>
						</div>
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
