<script>
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import BackButton from '$lib/components/BackButton.svelte';
	import { handleSelectionClick, initSelection } from '$lib/utils/selection.js';
	import SelectionBar from '$lib/components/SelectionBar.svelte';
	import TodoEditModal from '$lib/components/TodoEditModal.svelte';
	import { Check, Clock, Archive } from 'lucide-svelte';
	import { localDateStr } from '$lib/utils/todoUtils.js';
	import { SvelteSet, SvelteDate } from 'svelte/reactivity';
	import { lightTap } from '$lib/utils/haptics.js';

	const store = getTodoStore();

	let editingTodo = $derived(store.todos.find((t) => t.id === store.editingTodoId));

	// Column groupings — derived from todo state
	let pendingTodos = $derived(store.todos.filter((t) => !t.completed && !(t.tags || []).includes('in-progress')));
	let inProgressTodos = $derived(store.todos.filter((t) => !t.completed && (t.tags || []).includes('in-progress')));
	let doneTodos = $derived(store.todos.filter((t) => t.completed));

	/** Reactive column definitions — recomputed when todo groupings change */
	let columns = $derived([
		{
			key: 'pending',
			label: 'Pending',
			icon: Clock,
			color: '#3b82f6',
			todos: pendingTodos,
			bgColor: 'rgba(59, 130, 246, 0.06)',
			borderColor: 'rgba(59, 130, 246, 0.2)'
		},
		{
			key: 'in-progress',
			label: 'In Progress',
			icon: Clock,
			color: '#f97316',
			todos: inProgressTodos,
			bgColor: 'rgba(249, 115, 22, 0.06)',
			borderColor: 'rgba(249, 115, 22, 0.2)'
		},
		{
			key: 'done',
			label: 'Done',
			icon: Check,
			color: '#22c55e',
			todos: doneTodos,
			bgColor: 'rgba(34, 197, 94, 0.06)',
			borderColor: 'rgba(34, 197, 94, 0.2)'
		}
	]);

	/** Track which column is being hovered for drop */
	let dropTargetColumn = $state(null);
	/** Track which card is being hovered for drop */
	let dropTargetCardId = $state(null);
	/** Track drop position relative to the hovered card ('before' or 'after') */
	let dropIndicatorPos = $state(null);
	let todosIndexMap = $state(null);
	const { lastClickedId: initialLastClickedId } = initSelection();
	let lastClickedId = $state(initialLastClickedId);

	function handleCardClick(e, todo) {
		if (e.target.closest('input[type="checkbox"]') || e.target.closest('button')) return;

		handleSelectionClick(e, todo, store, 'selectedTodos', {
			get lastClickedId() {
				return lastClickedId;
			},
			set lastClickedId(value) {
				lastClickedId = value;
			}
		});
	}

	function handleCardKeydown(e, todo) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleCardClick(e, todo);
		}
	}

	/**
	 * Handle dropping a card onto a column or another card.
	 * @param {string} columnKey
	 * @param {string|null} targetCardId
	 */
	function handleColumnDrop(columnKey, targetCardId = null) {
		const draggedId = store.draggedId;
		const indicator = dropIndicatorPos;

		store.draggedId = null;
		dropTargetColumn = null;
		dropTargetCardId = null;
		dropIndicatorPos = null;

		if (draggedId === null) return;
		const todo = store.todos.find((t) => t.id === draggedId);
		if (!todo) return;

		store.lastMovedTodos = [{ ...todo }];
		store.lastMovedStates = [{ completed: todo.completed, tags: [...(todo.tags || [])] }];
		todosIndexMap = null;

		// 1. First, update status/tags to place it in the right column
		if (columnKey === 'pending') {
			if (todo.completed) store.toggleTodo(todo.id);
			if ((todo.tags || []).includes('in-progress')) store.toggleTag(todo.id, 'in-progress');
		} else if (columnKey === 'in-progress') {
			if (todo.completed) store.toggleTodo(todo.id);
			if (!(todo.tags || []).includes('in-progress')) store.toggleTag(todo.id, 'in-progress');
		} else if (columnKey === 'done') {
			if (!todo.completed) store.toggleTodo(todo.id);
			if ((todo.tags || []).includes('in-progress')) store.toggleTag(todo.id, 'in-progress');
		}

		// 2. Second, adjust order in store.todos
		if (targetCardId !== null && draggedId !== targetCardId) {
			const fromIdx = store.todos.findIndex((t) => t.id === draggedId);
			let toIdx = store.todos.findIndex((t) => t.id === targetCardId);
			if (fromIdx !== -1 && toIdx !== -1) {
				const [item] = store.todos.splice(fromIdx, 1);
				if (fromIdx < toIdx) toIdx--; // Adjust for removal
				if (indicator === 'after') toIdx++;
				store.todos.splice(toIdx, 0, item);
			}
		}

		const columnLabels = { pending: 'Pending', 'in-progress': 'In Progress', done: 'Done' };
		const label = columnLabels[columnKey] || columnKey;
		store.showToast(`Moved task to '${label}'`, 'info');
		lightTap();
	}

	function formatDate(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00');
		const today = new SvelteDate();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new SvelteDate(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		if (date.getTime() === today.getTime()) return 'Today';
		if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function isOverdue(dateStr) {
		if (!dateStr) return false;
		const today = localDateStr(new Date());
		return dateStr < today;
	}

	function handleKeydown(e) {
		const tag = e.target?.tagName?.toLowerCase();
		const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
		if (isInput || e.target?.isContentEditable) return;

		// e — Edit the active (hovered/focused) task
		if (e.key === 'e' && store.activeTaskId != null) {
			e.preventDefault();
			store.startEdit(store.activeTaskId);
			return;
		}

		// a — Archive selected tasks, or the active task
		if (e.key === 'a') {
			e.preventDefault();
			if (store.selectedTodos.size > 0) {
				store.archiveSelected();
			} else if (store.activeTaskId != null) {
				store.deleteTodo(store.activeTaskId);
				store.activeTaskId = null;
			}
			return;
		}

		store.handleKeydown(e);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="mb-4 flex items-center justify-between gap-2">
	<h2 class="m-0 text-xl font-semibold sm:text-2xl" style="color: var(--text-heading);">Kanban Board</h2>
	<BackButton />
</div>

<div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
	{#each columns as col (col.key)}
		<div
			class="board-column flex flex-col rounded-xl border"
			role="region"
			aria-label={col.label + ' column'}
			style="background: {col.bgColor}; border-color: {dropTargetColumn === col.key && !dropTargetCardId
				? col.color
				: col.borderColor}; transition: border-color 0.2s;"
			ondragover={(e) => {
				e.preventDefault();
				e.dataTransfer.dropEffect = 'move';
				if (!dropTargetCardId) dropTargetColumn = col.key;
			}}
			ondragleave={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget)) {
					dropTargetColumn = null;
				}
			}}
			ondrop={(e) => {
				e.preventDefault();
				if (!dropTargetCardId) handleColumnDrop(col.key);
			}}
		>
			<!-- Column header -->
			<div
				class="flex items-center justify-between rounded-t-xl px-4 py-3"
				style="border-bottom: 2px solid {col.color};"
			>
				<div class="flex items-center gap-2">
					<col.icon size={16} style="color: {col.color};" />
					<h3 class="m-0 text-sm font-semibold sm:text-base" style="color: var(--text-heading);">
						{col.label}
					</h3>
				</div>
				<span
					class="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white sm:text-sm"
					style="background: {col.color};"
				>
					{col.todos.length}
				</span>
			</div>

			<!-- Column body -->
			<div
				class="flex flex-col gap-2 p-3"
				role="button"
				tabindex="0"
				onclick={(e) => {
					if (e.target === e.currentTarget) {
						store.selectedTodos = new SvelteSet();
						lastClickedId = null;
					}
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						store.selectedTodos = new SvelteSet();
						lastClickedId = null;
					}
				}}
			>
				{#if col.todos.length === 0}
					<div class="flex flex-col items-center px-2 py-8 text-center">
						<p class="m-0 text-sm sm:text-base" style="color: var(--text-muted);">No tasks</p>
					</div>
				{:else}
					{#each col.todos as todo (todo.id)}
						<div
							class="glow-card board-card flex items-start gap-2 rounded-xl border p-3"
							role="button"
							tabindex="0"
							class:dragging={store.draggedId === todo.id}
							class:drag-over={dropTargetCardId === todo.id}
							class:selected={store.selectedTodos.has(todo.id)}
							class:drag-indicator-before={dropTargetCardId === todo.id && dropIndicatorPos === 'before'}
							class:drag-indicator-after={dropTargetCardId === todo.id && dropIndicatorPos === 'after'}
							draggable="true"
							style="background: var(--todo-bg); border-color: var(--border);"
							onclick={(e) => handleCardClick(e, todo)}
							onkeydown={(e) => handleCardKeydown(e, todo)}
							onmouseenter={() => (store.activeTaskId = todo.id)}
							onmouseleave={(ev) => {
								if (document.activeElement !== ev.currentTarget) store.activeTaskId = null;
							}}
							onfocus={() => (store.activeTaskId = todo.id)}
							onblur={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget)) {
									store.activeTaskId = null;
								}
							}}
							ondragstart={(e) => {
								e.dataTransfer.effectAllowed = 'move';
								e.dataTransfer.setData('text/plain', String(todo.id));
								store.draggedId = todo.id;
								todosIndexMap = new Map(store.todos.map((t, i) => [t.id, i]));
							}}
							ondragend={() => {
								store.draggedId = null;
								dropTargetCardId = null;
								dropIndicatorPos = null;
								todosIndexMap = null;
							}}
							ondragover={(e) => {
								e.preventDefault();
								e.stopPropagation();
								e.dataTransfer.dropEffect = 'move';
								if (store.draggedId !== todo.id) {
									dropTargetCardId = todo.id;
									dropTargetColumn = col.key;

									const fromIdx = todosIndexMap?.get(store.draggedId) ?? -1;
									const toIdx = todosIndexMap?.get(todo.id) ?? -1;

									if (fromIdx !== -1 && toIdx !== -1) {
										dropIndicatorPos = fromIdx < toIdx ? 'after' : 'before';
									} else {
										const rect = e.currentTarget.getBoundingClientRect();
										const y = e.clientY - rect.top;
										dropIndicatorPos = y < rect.height / 2 ? 'before' : 'after';
									}
								}
							}}
							ondragleave={() => {
								if (dropTargetCardId === todo.id) {
									dropTargetCardId = null;
									dropIndicatorPos = null;
								}
							}}
							ondrop={(e) => {
								e.preventDefault();
								e.stopPropagation();
								handleColumnDrop(col.key, todo.id);
							}}
						>
							<!-- Checkbox -->
							<input
								type="checkbox"
								class="todo-check mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer"
								checked={todo.completed}
								onchange={() => {
									store.toggleTodo(todo.id);
									lightTap();
								}}
								aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
							/>

							<!-- Card body -->
							<div class="min-w-0 flex-1">
								<div class="flex items-start gap-1.5">
									<h4
										class="m-0 text-sm leading-snug font-medium sm:text-base"
										style="color: var(--text-heading);"
										class:line-through={todo.completed}
										class:opacity-60={todo.completed}
									>
										{todo.title}
									</h4>
								</div>

								<div class="mt-1 flex flex-wrap items-center gap-1.5">
									<!-- Priority badge -->
									<span
										class="inline-block rounded px-1.5 py-0.5 text-xs font-bold tracking-wider text-white uppercase"
										class:priority-high={todo.priority === 'high'}
										class:priority-medium={todo.priority === 'medium' || !todo.priority}
										class:priority-low={todo.priority === 'low'}
									>
										{todo.priority || 'medium'}
									</span>

									<!-- Tags (first 2) -->
									{#if todo.tags && todo.tags.length > 0}
										{#each todo.tags.slice(0, 2) as tag (tag)}
											<span
												class="inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold text-white"
												style="background: {store.tagColors[tag]};"
											>
												{tag}
											</span>
										{/each}
										{#if todo.tags.length > 2}
											<span class="text-xs" style="color: var(--text-muted);"
												>+{todo.tags.length - 2}</span
											>
										{/if}
									{/if}
								</div>

								<!-- Due date -->
								{#if todo.dueDate}
									<p
										class="m-0 mt-1 text-xs font-medium sm:text-sm"
										style="color: {isOverdue(todo.dueDate)
											? 'var(--priority-high)'
											: 'var(--text-muted)'};"
									>
										{formatDate(todo.dueDate)}
									</p>
								{/if}
							</div>

							<div class="flex items-center self-stretch">
								<button
									type="button"
									onclick={() => {
										store.deleteTodo(todo.id);
										lightTap();
									}}
									class="flex cursor-pointer items-center gap-0.5 rounded border-none p-0.5 text-xs"
									style="color: var(--text-muted);"
									aria-label="Archive task"
								>
									<Archive size={16} />
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/each}
</div>

<SelectionBar
	count={store.selectedTodos.size}
	actions={[
		{ label: 'Archive', onClick: () => store.archiveSelected(), style: 'var(--priority-high)' },
		{ label: 'Mark Done', onClick: () => store.completeSelected(), style: 'var(--btn-save)' }
	]}
	onCancel={() => {
		store.selectedTodos = new SvelteSet();
		lastClickedId = null;
	}}
/>

{#if editingTodo}
	<TodoEditModal todo={editingTodo} />
{/if}

<style>
	.board-card {
		transition:
			transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.25s ease,
			border-color 0.2s ease,
			opacity 0.2s ease;
		cursor: grab;
	}

	.board-card:hover {
		transform: translateY(-2px);
		border-color: var(--btn-primary);
		box-shadow: 0 6px 20px rgba(37, 99, 235, 0.12);
	}

	.board-card:active {
		cursor: grabbing;
	}

	.board-card.dragging {
		opacity: 0.35;
	}

	.board-card.drag-over {
		transform: scale(1.02);
		border-color: var(--btn-primary);
		box-shadow:
			0 12px 40px rgba(37, 99, 235, 0.2),
			0 0 0 2px rgba(37, 99, 235, 0.15);
	}

	.board-card.selected {
		border-color: var(--btn-primary) !important;
		box-shadow:
			0 0 0 2px var(--btn-primary),
			0 8px 24px rgba(37, 99, 235, 0.2);
	}

	.board-card.drag-indicator-before {
		border-top: 2px solid var(--btn-primary);
		box-shadow:
			0 -1px 0 0 var(--btn-primary),
			0 0 12px rgba(37, 99, 235, 0.4);
		animation: pulse-indicator-top 1.5s ease-in-out infinite;
	}

	.board-card.drag-indicator-after {
		border-bottom: 2px solid var(--btn-primary);
		box-shadow:
			0 1px 0 0 var(--btn-primary),
			0 0 12px rgba(37, 99, 235, 0.4);
		animation: pulse-indicator-bottom 1.5s ease-in-out infinite;
	}

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

	.line-through {
		text-decoration: line-through;
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

	.board-column {
		min-height: 200px;
	}

	@media (max-width: 480px) {
		.board-column {
			min-height: 150px;
		}
	}
</style>
