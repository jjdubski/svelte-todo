<script>
	import { slide } from 'svelte/transition';
	import {
		Edit2,
		Archive,
		X,
		ChevronDown,
		ChevronRight,
		Repeat,
		CheckSquare,
		Square
	} from 'lucide-svelte';
	import { getTodoStore } from '$lib/todoStore.svelte.js';
	import { renderMarkdown } from '$lib/markdown.js';

	/** @type {import('./todoStore.svelte.js').Todo} */
	let { todo } = $props();

	const store = getTodoStore();

	let showSubtasks = $state(false);
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
		const now = new Date();
		const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		return dateStr < today && !todo.completed;
	}

	function toggleSubtasksView() {
		showSubtasks = !showSubtasks;
	}

	let completedSubtasks = $derived(todo.subtasks?.filter((s) => s.done).length || 0);
	let totalSubtasks = $derived(todo.subtasks?.length || 0);
</script>

<div
	role="listitem"
	class="glow-card todo-card flex items-start gap-2 rounded-xl border p-3"
	class:completed={todo.completed}
	class:dragging={store.draggedId === todo.id}
	class:drag-over={store.dragOverId === todo.id}
	class:drag-indicator-before={store.dragOverId === todo.id && store.dragIndicatorPos === 'before'}
	class:drag-indicator-after={store.dragOverId === todo.id && store.dragIndicatorPos === 'after'}
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
					<h3 class="todo-title m-0 text-sm leading-snug font-medium sm:text-base">
						{todo.title}
					</h3>
					<span class="ml-auto flex shrink-0 items-center gap-1">
						<span
							class="priority-badge inline-block rounded px-2 py-1 text-xs font-bold tracking-wider text-white uppercase sm:text-sm priority-{todo.priority ||
								'medium'}"
						>
							{todo.priority || 'medium'}
						</span>
						{#if todo.category && store.categories.includes(todo.category)}
							<span
								class="category-badge inline-block rounded-full px-2 py-1 text-xs font-semibold text-white sm:text-sm"
								style="background: {store.categoryColors[todo.category]};"
							>
								{todo.category}
							</span>
						{/if}
						{#if todo.recurring}
							<span
								class="recurring-badge inline-flex h-6 w-8 items-center justify-center rounded-full"
								style="background: var(--btn-edit); color: white;"
								title="Recurring {todo.recurring}"
							>
								<Repeat size={20} />
							</span>
						{/if}
					</span>
				</div>

				{#if todo.description || (todo.tags && todo.tags.length > 0)}
					<div class="mt-1 ml-2 flex items-start gap-2" class:justify-end={!todo.description}>
						{#if todo.description}
							<div class="markdown-content min-w-0 flex-1 text-sm leading-relaxed sm:text-base">
								{@html renderMarkdown(todo.description)}
							</div>
						{:else}
							<div class="flex-1" style="color: var(--text-muted);">
								<p style="font-style: italic;">No details</p>
							</div>
						{/if}

						{#if todo.tags && todo.tags.length > 0}
							<div class="mt-1 flex shrink-0 flex-wrap gap-1">
								{#each todo.tags as tag (tag)}
									<span
										class="inline-block rounded-full px-2 py-1 text-xs font-semibold text-white sm:text-sm"
										style="background: {store.tagColors[tag]};"
									>
										{tag}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<div class="flex flex-wrap items-center gap-2">
					{#if totalSubtasks > 0}
						<button
							class="subtasks-preview inline-flex cursor-pointer items-center gap-0.5 border-none bg-none p-0.5 text-sm sm:text-base"
							onclick={toggleSubtasksView}
						>
							{#if showSubtasks}
								<ChevronDown size={14} />
							{:else}
								<ChevronRight size={14} />
							{/if}
							<span>{completedSubtasks}/{totalSubtasks}</span>
						</button>
					{/if}
					<button
						class="inline-flex cursor-pointer items-center gap-0.5 border-none bg-none p-0.5 text-sm sm:text-base"
						style="color: var(--text-muted);"
						onclick={() => (showAddSubtask = !showAddSubtask)}
					>
						+ Subtask
					</button>
					<span class="ml-auto flex items-center gap-1">
						{#if todo.dueDate}
							<span
								class="text-sm font-medium sm:text-base"
								style="color: {isOverdue(todo.dueDate)
									? 'var(--priority-high)'
									: 'var(--text-muted)'};"
							>
								{formatDate(todo.dueDate)}
							</span>
						{/if}
						<button
							onclick={() => store.startEdit(todo.id)}
							class="glow-btn mt-2 flex cursor-pointer items-center justify-center rounded-md border-0 p-1"
							style="color: var(--text-muted);"
							aria-label="Edit task"
						>
							<Edit2 size={16} />
						</button>
						<button
							onclick={() => store.deleteTodo(todo.id)}
							class="glow-btn mt-2 flex cursor-pointer items-center justify-center rounded-md border-0 p-1"
							style="color: var(--text-muted);"
							aria-label="Archive task"
						>
							<Archive size={16} />
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
								class="subtask-item flex items-center gap-1.5 py-0.5 text-sm sm:text-base"
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
							class="flex-1 rounded-md px-2 py-1 text-sm sm:text-base"
							style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);"
							bind:value={newSubtaskText}
							placeholder="Add a subtask…"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addInlineSubtask();
								}
							}}
							aria-label="New subtask text"
						/>
						<button
							class="cursor-pointer rounded-md border-none px-2 py-1 text-sm font-medium text-white sm:text-base"
							style="background: var(--btn-save);"
							onclick={addInlineSubtask}>Add</button
						>
						<button
							class="cursor-pointer rounded-md border-none px-2 py-1 text-xs font-medium text-white sm:text-sm"
							style="background: var(--btn-cancel);"
							onclick={() => {
								showAddSubtask = false;
								newSubtaskText = '';
							}}
						>
							<X size={14} />
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.todo-card {
		position: relative;
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

	/* Drag-over: scale-up + elevated shadow */
	.todo-card.drag-over {
		transform: scale(1.05);
		border-color: var(--btn-primary);
		box-shadow:
			0 12px 40px rgba(37, 99, 235, 0.2),
			0 0 0 2px rgba(37, 99, 235, 0.15);
	}

	/* Drop indicator: thin glowing line at top of the card */
	.todo-card.drag-indicator-before {
		border-top: 2px solid var(--btn-primary);
		box-shadow:
			0 -1px 0 0 var(--btn-primary),
			0 0 12px rgba(37, 99, 235, 0.4);
		animation: pulse-indicator-top 1.5s ease-in-out infinite;
	}

	/* Drop indicator: thin glowing line at bottom of the card */
	.todo-card.drag-indicator-after {
		border-bottom: 2px solid var(--btn-primary);
		box-shadow:
			0 1px 0 0 var(--btn-primary),
			0 0 12px rgba(37, 99, 235, 0.4);
		animation: pulse-indicator-bottom 1.5s ease-in-out infinite;
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
	.subtask-item input[type='checkbox'] {
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

	.subtasks-preview {
		color: var(--text-muted);
	}

	.subtasks-preview:hover {
		color: var(--text-secondary);
	}

	.todo-card [aria-label='Edit task']:hover,
	.todo-card [aria-label='Archive task']:hover {
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

	.subtask-item.done {
		text-decoration: line-through;
		opacity: 0.6;
	}

	:global(.subtasks-preview:focus-visible),
	:global(.select-check:focus-visible) {
		outline: 2px solid var(--btn-primary);
		outline-offset: 2px;
	}

	/* ── Drop indicator pulse animations ── */

	@keyframes pulse-indicator-top {
		0%,
		100% {
			border-top-color: var(--btn-primary);
			box-shadow:
				0 -1px 0 0 var(--btn-primary),
				0 0 8px rgba(37, 99, 235, 0.3);
		}
		50% {
			border-top-color: rgba(37, 99, 235, 0.4);
			box-shadow:
				0 -1px 0 0 rgba(37, 99, 235, 0.4),
				0 0 4px rgba(37, 99, 235, 0.1);
		}
	}

	@keyframes pulse-indicator-bottom {
		0%,
		100% {
			border-bottom-color: var(--btn-primary);
			box-shadow:
				0 1px 0 0 var(--btn-primary),
				0 0 8px rgba(37, 99, 235, 0.3);
		}
		50% {
			border-bottom-color: rgba(37, 99, 235, 0.4);
			box-shadow:
				0 1px 0 0 rgba(37, 99, 235, 0.4),
				0 0 4px rgba(37, 99, 235, 0.1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.todo-card.drag-over {
			transform: none;
		}

		.todo-card.drag-indicator-before,
		.todo-card.drag-indicator-after {
			animation-duration: 0.01ms !important;
		}
	}

	/* ── Markdown rendered content ── */
	:global(.markdown-content p) {
		margin: 0 0 0.25rem;
		color: var(--text);
	}

	:global(.markdown-content p:last-child) {
		margin-bottom: 0;
	}

	:global(.markdown-content a) {
		color: var(--btn-primary);
		text-decoration: underline;
	}

	:global(.markdown-content a:hover) {
		opacity: 0.85;
	}

	:global(.markdown-content code) {
		background: var(--input-bg);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
		font-size: 0.875em;
		color: var(--text);
		border: 1px solid var(--border);
	}

	:global(.markdown-content h2) {
		margin: 0.5rem 0 0.25rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-heading);
	}

	:global(.markdown-content ul) {
		margin: 0.25rem 0;
		padding-left: 1.25rem;
		list-style: disc;
	}

	:global(.markdown-content li) {
		margin: 0.125rem 0;
		color: var(--text);
	}

	:global(.markdown-content strong) {
		font-weight: 600;
		color: var(--text-heading);
	}

	:global(.markdown-content em) {
		font-style: italic;
	}
</style>
