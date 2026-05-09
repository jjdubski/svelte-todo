<script>
	import { slide } from 'svelte/transition';
	import { scale } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import {
		GripVertical,
		Edit2,
		Trash2,
		Check,
		X,
		ChevronDown,
		ChevronRight,
		Repeat,
		Tag,
		CheckSquare,
		Square
	} from 'lucide-svelte';
	import { getTodoStore } from '$lib/todoStore.svelte.js';

	/** @type {import('./todoStore.svelte.js').Todo} */
	let { todo } = $props();

	const store = getTodoStore();

	let editing = $state(false);
	let editTitle = $state('');
	let editDescription = $state('');
	let editDueDate = $state('');
	let editPriority = $state('');
	let editCategory = $state('');
	let editTags = $state([]);
	let editRecurring = $state('');
	let showSubtasks = $state(false);
	let editSubtasks = $state([]);
	let showAddSubtask = $state(false);
	let newSubtaskText = $state('');

	function addInlineSubtask() {
		const text = newSubtaskText.trim();
		if (!text) return;
		const subtasks = [...(todo.subtasks || []), { text, done: false }];
		store.updateTodo(todo.id, { subtasks });
		newSubtaskText = '';
		showSubtasks = true;
	}

	function formatDate(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00');
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		if (date.getTime() === today.getTime()) return 'Today';
		if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function isOverdue(dateStr) {
		if (!dateStr) return false;
		const today = new Date().toISOString().split('T')[0];
		return dateStr < today && !todo.completed;
	}

	function startEdit() {
		editing = true;
		editTitle = todo.title;
		editDescription = todo.description || '';
		editDueDate = todo.dueDate || '';
		editPriority = todo.priority || 'medium';
		editCategory = todo.category || '';
		editTags = [...(todo.tags || [])];
		editRecurring = todo.recurring || '';
		editSubtasks = todo.subtasks ? [...todo.subtasks] : [];
	}

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
		editing = false;
	}

	function cancel() {
		editing = false;
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

	function toggleSubtasksView() {
		showSubtasks = !showSubtasks;
	}

	let completedSubtasks = $derived(todo.subtasks?.filter((s) => s.done).length || 0);
	let totalSubtasks = $derived(todo.subtasks?.length || 0);
</script>

<svelte:window onkeydown={(e) => editing && e.key === 'Escape' && cancel()} />

{#if editing}
	<form
		class="todo-edit flex flex-col gap-2 rounded-xl p-3.5"
		transition:scale={{ duration: store.prefersReducedMotion ? 0 : 200, easing: elasticOut }}
	>
		<input
			bind:value={editTitle}
			placeholder="Title"
			class="w-full rounded-lg border px-3 py-2.5 text-base"
		/>
		<textarea
			bind:value={editDescription}
			placeholder="Description"
			rows="2"
			class="resize-vertical min-h-[60px] w-full rounded-lg border px-3 py-2.5 text-base"
		></textarea>
		<div class="form-inline flex flex-wrap gap-2">
			<input
				type="date"
				bind:value={editDueDate}
				aria-label="Due date"
				class="min-w-20 flex-1 rounded-lg border px-3 py-2.5 text-base"
			/>
			<select
				bind:value={editPriority}
				aria-label="Priority"
				class="min-w-20 flex-1 rounded-lg border px-3 py-2.5 text-base"
			>
				<option value="high">High</option>
				<option value="medium">Medium</option>
				<option value="low">Low</option>
			</select>
			<select
				bind:value={editCategory}
				aria-label="Category"
				class="min-w-20 flex-1 rounded-lg border px-3 py-2.5 text-base"
			>
				<option value="">No category</option>
				{#each store.categories as cat (cat)}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
			<select
				bind:value={editRecurring}
				aria-label="Recurring"
				class="min-w-20 flex-1 rounded-lg border px-3 py-2.5 text-base"
			>
				<option value="">One-time</option>
				<option value="daily">Daily</option>
				<option value="weekly">Weekly</option>
				<option value="monthly">Monthly</option>
			</select>
		</div>

		<div class="tags-editor flex flex-wrap items-center gap-2">
			<Tag size={14} />
			{#each store.availableTags as tag (tag)}
				<button
					type="button"
					class="glow-tag tag-toggle cursor-pointer rounded-full border px-2 py-0.5 text-xs font-semibold"
					class:selected={editTags.includes(tag)}
					style="--tag-color: {store.tagColors[tag]}"
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
				class="text-btn cursor-pointer border-none bg-none p-1 text-sm"
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
					/>
					<input
						type="text"
						bind:value={editSubtasks[i].text}
						placeholder="Subtask {i + 1}"
						class="flex-1 rounded-md border px-2 py-1.5 text-sm"
					/>
					<button
						type="button"
						class="icon-btn tiny flex h-6 w-6 items-center justify-center rounded border-none p-0"
						onclick={() => removeEditSubtask(i)}
					>
						<X size={12} />
					</button>
				</div>
			{/each}
		</div>

		<div class="todo-edit-actions flex justify-end gap-2">
			<button
				type="button"
				onclick={cancel}
				class="glow-btn btn btn-cancel cursor-pointer rounded-md border-none px-4 py-2 font-medium"
				>Cancel</button
			>
			<button
				type="button"
				onclick={save}
				class="glow-btn btn btn-save cursor-pointer rounded-md border-none px-4 py-2 font-medium"
				>Save</button
			>
		</div>
	</form>
{:else}
	<div
		role="listitem"
		class="glow-card todo-card flex items-start gap-2 rounded-xl border p-3"
		class:completed={todo.completed}
		class:dragging={store.draggedId === todo.id}
		class:drag-over={store.dragOverId === todo.id}
		draggable={store.sortBy === 'manual'}
		ondragstart={(e) => store.handleDragStart(e, todo.id)}
		ondragend={() => store.handleDragEnd()}
		ondragover={(e) => store.handleDragOver(e, todo.id)}
		ondragleave={() => store.handleDragLeave()}
		ondrop={(e) => store.handleDrop(e, todo.id)}
	>
		{#if store.selectMode}
			<button
				class="select-check mt-0.5 flex shrink-0 cursor-pointer items-center justify-center self-start rounded border-none bg-none p-0.5"
				onclick={() => store.toggleSelect(todo.id)}
				aria-label={store.selectedTodos.has(todo.id) ? 'Deselect' : 'Select'}
			>
				{#if store.selectedTodos.has(todo.id)}
					<CheckSquare size={18} />
				{:else}
					<Square size={18} />
				{/if}
			</button>
		{/if}

		{#if store.sortBy === 'manual' && !store.selectMode}
			<div
				class="drag-handle mt-1 flex shrink-0 cursor-grab flex-col gap-[2px] self-start p-[0.25rem_0.1rem_0.25rem_0] select-none"
				aria-label="Drag to reorder"
			>
				<span></span><span></span><span></span>
			</div>
		{/if}

		<div class="todo-body min-w-0 flex-1">
			<div class="flex items-start gap-2">
				<input
					type="checkbox"
					class="todo-check mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer"
					checked={todo.completed}
					onchange={() => store.toggleTodo(todo.id)}
					aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
				/>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-1.5">
						<h3 class="todo-title m-0 text-base leading-snug font-medium">{todo.title}</h3>
						<span class="ml-auto flex shrink-0 items-center gap-1">
							<span
								class="priority-badge inline-block rounded px-1.5 py-0.5 text-xs font-bold tracking-wider text-white uppercase priority-{todo.priority ||
									'medium'}"
							>
								{todo.priority || 'medium'}
							</span>
							{#if todo.category && store.categories.includes(todo.category)}
								<span
									class="category-badge inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold text-white"
									style="background: {store.categoryColors[todo.category]};"
								>
									{todo.category}
								</span>
							{/if}
							{#if todo.recurring}
								<span
									class="recurring-badge inline-flex h-4 w-4 items-center justify-center rounded-full"
									style="background: var(--btn-edit); color: white;"
									title="Recurring {todo.recurring}"
								>
									<Repeat size={10} />
								</span>
							{/if}
						</span>
					</div>

					{#if todo.description}
						<p
							class="todo-desc m-0 mt-0.5 text-sm leading-relaxed"
							style="color: var(--text-muted);"
						>
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

					<div class="mt-1 flex flex-wrap items-center gap-2">
						{#if totalSubtasks > 0}
							<button
								class="subtasks-preview inline-flex cursor-pointer items-center gap-0.5 border-none bg-none p-0.5 text-sm"
								onclick={toggleSubtasksView}
							>
								{#if showSubtasks}
									<ChevronDown size={12} />
								{:else}
									<ChevronRight size={12} />
								{/if}
								<span>{completedSubtasks}/{totalSubtasks}</span>
							</button>
						{/if}
						<button
							class="inline-flex cursor-pointer items-center gap-0.5 border-none bg-none p-0.5 text-sm"
							style="color: var(--text-muted);"
							onclick={() => (showAddSubtask = !showAddSubtask)}
						>
							+ Subtask
						</button>
						<span class="ml-auto flex items-center gap-1">
							{#if todo.dueDate}
								<span
									class="text-sm font-medium"
									style="color: {isOverdue(todo.dueDate)
										? 'var(--priority-high)'
										: 'var(--text-muted)'};"
								>
									{formatDate(todo.dueDate)}
								</span>
							{/if}
							<button
								onclick={startEdit}
								class="glow-btn flex cursor-pointer items-center justify-center rounded-md border-0 p-1"
								style="color: var(--text-muted);"
								aria-label="Edit task"
							>
								<Edit2 size={13} />
							</button>
							<button
								onclick={() => store.deleteTodo(todo.id)}
								class="glow-btn flex cursor-pointer items-center justify-center rounded-md border-0 p-1"
								style="color: var(--text-muted);"
								aria-label="Delete task"
							>
								<Trash2 size={13} />
							</button>
						</span>
					</div>

					{#if showSubtasks && todo.subtasks && todo.subtasks.length > 0}
						<div
							class="mt-1 flex flex-col gap-0.5 border-l-2 pl-3"
							transition:slide={{ duration: store.prefersReducedMotion ? 0 : 150 }}
							style="border-color: var(--border);"
						>
							{#each todo.subtasks as subtask, i (i)}
								<div
									class="subtask-item flex items-center gap-1.5 py-0.5 text-sm"
									class:done={subtask.done}
								>
									<input
										type="checkbox"
										checked={subtask.done}
										class="h-[13px] w-[13px]"
										onchange={() => {
											subtask.done = !subtask.done;
											store.updateTodo(todo.id, { subtasks: todo.subtasks });
										}}
									/>
									<span style="color: var(--text-secondary);">{subtask.text}</span>
								</div>
							{/each}
						</div>
					{/if}

					{#if showAddSubtask}
						<div
							class="mt-1 flex items-center gap-1.5"
							transition:slide={{ duration: store.prefersReducedMotion ? 0 : 100 }}
						>
							<input
								type="text"
								class="flex-1 rounded-md px-2 py-1 text-sm"
								style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);"
								bind:value={newSubtaskText}
								placeholder="Add a subtask..."
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										addInlineSubtask();
									}
								}}
							/>
							<button
								class="cursor-pointer rounded-md border-none px-2 py-1 text-sm font-medium text-white"
								style="background: var(--btn-save);"
								onclick={addInlineSubtask}>Add</button
							>
							<button
								class="cursor-pointer rounded-md border-none px-2 py-1 text-xs font-medium text-white"
								style="background: var(--btn-cancel);"
								onclick={() => {
									showAddSubtask = false;
									newSubtaskText = '';
								}}
							>
								<X size={12} />
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.todo-card {
		border: 1px solid var(--border);
		background: var(--todo-bg);
		transition:
			transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.3s ease,
			border-color 0.3s ease;
	}

	.todo-card:hover {
		transform: translateY(-2px);
		border-color: var(--btn-primary);
		box-shadow: 0 8px 30px rgba(37, 99, 235, 0.12);
	}

	.todo-card.dragging {
		opacity: 0.35;
	}

	.todo-card.drag-over {
		border-color: var(--btn-primary);
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
	}

	.todo-card.completed .todo-title {
		text-decoration: line-through;
		color: var(--completed-text);
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.drag-handle span {
		display: block;
		width: 14px;
		height: 2px;
		background: var(--drag-handle);
		border-radius: 2px;
	}

	.todo-check,
	.subtask-item input[type='checkbox'],
	.subtask-row-edit input[type='checkbox'] {
		accent-color: var(--btn-save);
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

	.todo-edit {
		border: 1px solid var(--border);
		background: var(--todo-bg);
	}

	.todo-edit input,
	.todo-edit textarea,
	.todo-edit select,
	.subtask-row-edit input[type='text'] {
		border: 1px solid var(--border-input);
		background: var(--input-bg);
		color: var(--text);
	}

	.todo-edit input:focus,
	.todo-edit textarea:focus,
	.todo-edit select:focus,
	.subtask-row-edit input[type='text']:focus {
		outline: none;
		border-color: var(--btn-primary);
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
	}

	.tags-editor {
		color: var(--text-muted);
	}

	.tag-toggle {
		background: var(--input-bg);
		color: var(--text-secondary);
		border-color: var(--border-input);
	}

	.tag-toggle.selected {
		background: var(--tag-color);
		color: white;
		border-color: var(--tag-color);
	}

	.text-btn {
		color: var(--btn-primary);
	}

	.icon-btn.tiny {
		background: var(--btn-delete);
		color: white;
	}

	.btn-save {
		background: var(--btn-save);
	}

	.btn-save:hover {
		background: var(--btn-save-hover);
	}

	.btn-cancel {
		background: var(--btn-cancel);
	}

	.btn-cancel:hover {
		background: var(--btn-cancel-hover);
	}

	.subtasks-preview {
		color: var(--text-muted);
	}

	.subtasks-preview:hover {
		color: var(--text-secondary);
	}

	.todo-card [aria-label='Edit task']:hover,
	.todo-card [aria-label='Delete task']:hover {
		background: var(--todo-bg);
		color: var(--text-heading) !important;
	}

	.select-check {
		color: var(--text-muted);
	}

	.select-check:hover {
		color: var(--btn-primary);
		background: var(--input-bg);
	}

	.tag-toggle:hover {
		filter: brightness(1.1);
	}

	.text-btn:hover {
		color: var(--btn-primary-hover);
	}

	.icon-btn.tiny:hover {
		background: var(--btn-delete-hover);
	}

	.subtask-item.done {
		text-decoration: line-through;
		opacity: 0.6;
	}

	:global(.tag-toggle:focus-visible),
	:global(.subtasks-preview:focus-visible),
	:global(.btn:focus-visible),
	:global(.text-btn:focus-visible),
	:global(.icon-btn:focus-visible),
	:global(.select-check:focus-visible) {
		outline: 2px solid var(--btn-primary);
		outline-offset: 2px;
	}

	@media (max-width: 480px) {
		.todo-edit .form-inline {
			flex-direction: column;
		}
	}
</style>
