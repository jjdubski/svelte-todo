<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { X, Check } from 'lucide-svelte';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';

	let { selectedDate, onclose } = $props();

	const store = getTodoStore();

	let filteredTasks = $derived(store.todos.filter((todo) => todo.dueDate === selectedDate));
	let formattedDate = $derived(
		selectedDate
			? new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
			: ''
	);

	function openTaskList() {
		onclose?.();
		goto(resolve('/tasks'));
	}
</script>

{#if selectedDate}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 bg-black/50 p-4" onclick={onclose}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="mx-auto mt-[10vh] w-full max-w-[500px] overflow-hidden rounded-xl border"
			style="background: var(--card-bg); border-color: var(--border);"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between border-b p-5" style="border-color: var(--border);">
				<h3 class="m-0 text-lg font-semibold" style="color: var(--text-heading);">{formattedDate}</h3>
				<button
					type="button"
					onclick={onclose}
					class="flex cursor-pointer items-center justify-center rounded-md border-0 p-1"
					style="background: transparent; color: var(--text-muted);"
					aria-label="Close"
				>
					<X size={18} />
				</button>
			</div>

			<div class="max-h-[70vh] overflow-y-auto p-5">
				{#if filteredTasks.length === 0}
					<p class="m-0 text-sm" style="color: var(--text-secondary);">No tasks for this day</p>
				{:else}
					<div class="flex flex-col gap-2">
						{#each filteredTasks as todo (todo.id)}
							<button
								type="button"
								onclick={openTaskList}
								class="w-full cursor-pointer rounded-lg border p-3 text-left transition-opacity hover:opacity-90"
								style="background: var(--todo-bg); border-color: var(--border);"
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<p
												class="m-0 truncate text-sm font-semibold"
												style="color: {todo.completed
													? 'var(--text-muted)'
													: 'var(--text-heading)'}; text-decoration: {todo.completed
													? 'line-through'
													: 'none'};"
											>
												{todo.title}
											</p>
											{#if todo.priority}
												<span
													class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
													style="background: {todo.priority === 'high'
														? 'var(--priority-high)'
														: todo.priority === 'low'
															? 'var(--priority-low)'
															: 'var(--priority-medium)'}"
												>
													{todo.priority}
												</span>
											{/if}
										</div>

										{#if todo.description}
											<p class="m-0 mt-1 text-xs" style="color: var(--text-secondary);">
												{todo.description.length > 80
													? `${todo.description.slice(0, 80)}...`
													: todo.description}
											</p>
										{/if}

										{#if todo.tags && todo.tags.length > 0}
											<div class="mt-1 flex flex-wrap gap-1">
												{#each todo.tags.slice(0, 3) as tag (tag)}
													<span
														class="rounded px-1.5 py-0.5 text-[10px] text-white"
														style="background: {store.tagColors[tag] || '#64748b'}"
													>
														{tag}
													</span>
												{/each}
											</div>
										{/if}
									</div>

									{#if todo.completed}
										<Check size={14} style="color: var(--btn-save);" />
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
