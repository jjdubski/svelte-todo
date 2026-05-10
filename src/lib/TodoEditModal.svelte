<script>
	import { fade, scale } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import { Tag, X } from 'lucide-svelte';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';

	/** @type {import('./state/todoStore.svelte.js').Todo} */
	let { todo } = $props();

	const store = getTodoStore();

	/* svelte-ignore state_referenced_locally */
	let editTitle = $state(todo.title);
	/* svelte-ignore state_referenced_locally */
	let editDescription = $state(todo.description || '');
	/* svelte-ignore state_referenced_locally */
	let editDueDate = $state(todo.dueDate || '');
	/* svelte-ignore state_referenced_locally */
	let editPriority = $state(todo.priority || 'medium');
	/* svelte-ignore state_referenced_locally */
	let editCategory = $state(todo.category || '');
	/* svelte-ignore state_referenced_locally */
	let editTags = $state([...(todo.tags || [])]);
	/* svelte-ignore state_referenced_locally */
	let editRecurring = $state(todo.recurring || '');
	/* svelte-ignore state_referenced_locally */
	let editSubtasks = $state(todo.subtasks ? [...todo.subtasks] : []);

	let titleInput;

	$effect(() => {
		titleInput?.focus();
	});

	$effect(() => {
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	function save() {
		store.updateTodo(todo.id, {
			title: editTitle,
			description: editDescription,
			dueDate: editDueDate,
			priority: editPriority,
			category: editCategory,
			tags: editTags,
			recurring: editRecurring,
			subtasks: editSubtasks.filter((s) => s.text.trim())
		});
		store.cancelEdit();
	}

	function cancel() {
		store.cancelEdit();
	}

	function toggleSubtask(index) {
		editSubtasks[index].done = !editSubtasks[index].done;
		editSubtasks = [...editSubtasks];
	}

	function addEditSubtask() {
		editSubtasks = [...editSubtasks, { text: '', done: false }];
	}

	function removeEditSubtask(index) {
		editSubtasks = editSubtasks.filter((_, i) => i !== index);
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 pt-[10vh] sm:p-6"
	style="background: rgba(0,0,0,0.5);"
	role="dialog"
	aria-modal="true"
	aria-label="Edit task"
	tabindex="-1"
	onclick={(e) => e.target === e.currentTarget && cancel()}
	onkeydown={(e) => e.key === 'Escape' && cancel()}
	in:fade={{ duration: store.prefersReducedMotion ? 0 : 150 }}
>
	<div
		class="w-full max-w-4xl rounded-xl border p-4 sm:p-5"
		style="background: var(--card-bg); border-color: var(--border); box-shadow: 0 20px 60px rgba(0,0,0,0.3);"
		in:scale={{ duration: store.prefersReducedMotion ? 0 : 200, easing: elasticOut }}
	>
		<form
			class="flex flex-col gap-3"
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<div class="flex items-center justify-between">
				<h2 class="m-0 text-base font-semibold" style="color: var(--text-heading);">Edit Task</h2>
				<button
					type="button"
					class="flex cursor-pointer items-center justify-center rounded-md border-none p-1"
					style="color: var(--text-muted); background: transparent;"
					onclick={cancel}
					aria-label="Close"
				>
					<X size={18} />
				</button>
			</div>

			<input
				bind:this={titleInput}
				bind:value={editTitle}
				placeholder="Title"
				class="w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base"
				aria-label="Edit title"
			/>
			<textarea
				bind:value={editDescription}
				placeholder="Description"
				rows="2"
				class="resize-vertical min-h-[60px] w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base"
				aria-label="Edit description"
			></textarea>
			<div class="flex flex-wrap gap-2">
				<input
					type="date"
					bind:value={editDueDate}
					aria-label="Due date"
					class="min-w-20 flex-1 rounded-lg border px-3 py-2.5 text-sm sm:text-base"
				/>
				<select
					bind:value={editPriority}
					aria-label="Priority"
					class="min-w-20 flex-1 rounded-lg border px-3 py-2.5 text-sm sm:text-base"
				>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>
				<select
					bind:value={editCategory}
					aria-label="Category"
					class="min-w-20 flex-1 rounded-lg border px-3 py-2.5 text-sm sm:text-base"
				>
					<option value="">No category</option>
					{#each store.categories as cat (cat)}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
				<select
					bind:value={editRecurring}
					aria-label="Recurring"
					class="min-w-20 flex-1 rounded-lg border px-3 py-2.5 text-sm sm:text-base"
				>
					<option value="">One-time</option>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
					<option value="monthly">Monthly</option>
				</select>
			</div>

			<div class="flex flex-wrap items-center gap-2" style="color: var(--text-muted);">
				<Tag size={14} />
				{#each store.availableTags as tag (tag)}
					<button
						type="button"
						class="tag-toggle cursor-pointer rounded-full border px-2 py-0.5 text-xs font-semibold sm:text-sm"
						class:selected={editTags.includes(tag)}
						style="--tag-color: {store.tagColors[tag]};"
						onclick={() =>
							(editTags = editTags.includes(tag)
								? editTags.filter((t) => t !== tag)
								: [...editTags, tag])}
					>
						{tag}
					</button>
				{/each}
			</div>

			<div class="subtasks-editor mt-1">
				<button
					type="button"
					class="text-btn cursor-pointer border-none bg-none p-1 text-sm sm:text-base"
					style="color: var(--btn-primary);"
					onclick={addEditSubtask}
				>
					+ Add subtask
				</button>
				{#each editSubtasks as subtask, i (i)}
					<div class="subtask-row-edit mt-1 flex items-center gap-2">
						<input
							type="checkbox"
							checked={subtask.done}
							class="h-4 w-4"
							onchange={() => toggleSubtask(i)}
							aria-label="Subtask {i + 1} done"
						/>
						<input
							type="text"
							bind:value={editSubtasks[i].text}
							placeholder="Subtask {i + 1}"
							class="flex-1 rounded-md border px-2 py-1.5 text-sm sm:text-base"
							aria-label="Subtask {i + 1} text"
						/>
						<button
							type="button"
							class="icon-btn tiny flex h-6 w-6 items-center justify-center rounded border-none p-0"
							onclick={() => removeEditSubtask(i)}
						>
							<X size={14} />
						</button>
					</div>
				{/each}
			</div>

			<div class="flex justify-end gap-2">
				<button
					type="button"
					onclick={cancel}
					class="glow-btn cursor-pointer rounded-md border-none px-4 py-2 font-medium"
					style="background: var(--btn-delete); color: white;"
				>
					Cancel
				</button>
				<button
					type="submit"
					class="glow-btn cursor-pointer rounded-md border-none px-4 py-2 font-medium"
					style="background: var(--btn-save); color: white;"
				>
					Save
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.tag-toggle {
		background: var(--input-bg);
		color: var(--text-secondary);
		border-color: var(--border-input);
		transition: all 0.2s;
	}

	.tag-toggle.selected {
		background: var(--tag-color) !important;
		color: white !important;
		border-color: var(--tag-color) !important;
	}

	.tag-toggle:hover {
		filter: brightness(1.1);
	}

	input,
	textarea,
	select {
		border: 1px solid var(--border-input);
		background: var(--input-bg);
		color: var(--text);
	}

	input:focus,
	textarea:focus,
	select:focus {
		outline: none;
		border-color: var(--btn-primary);
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
	}

	.subtask-row-edit input[type='text'] {
		border: 1px solid var(--border-input);
		background: var(--input-bg);
		color: var(--text);
	}

	.subtask-row-edit input[type='text']:focus {
		outline: none;
		border-color: var(--btn-primary);
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
	}

	.text-btn:hover {
		color: var(--btn-primary-hover) !important;
	}

	.icon-btn.tiny {
		background: var(--btn-delete);
		color: white;
	}

	.icon-btn.tiny:hover {
		background: var(--btn-delete-hover);
	}

	.subtask-row-edit input[type='checkbox'] {
		accent-color: var(--btn-save);
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			transition-duration: 0.01ms !important;
			animation-duration: 0.01ms !important;
		}
	}
</style>
