<script>
	import { getTodoStore } from '$lib/todoStore.svelte.js';
	import StatsBar from '$lib/StatsBar.svelte';
	import { Check, Clock, ArrowLeft } from 'lucide-svelte';

	const store = getTodoStore();

	// Column groupings — derived from todo state
	let pendingTodos = $derived(
		store.todos.filter((t) => !t.completed && !(t.tags || []).includes('in-progress'))
	);
	let inProgressTodos = $derived(
		store.todos.filter((t) => !t.completed && (t.tags || []).includes('in-progress'))
	);
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
	let dropTarget = $state(null);

	/**
	 * Handle dropping a card onto a column.
	 * @param {string} columnKey
	 */
	function handleColumnDrop(columnKey) {
		dropTarget = null;
		if (store.draggedId === null) return;
		const todo = store.todos.find((t) => t.id === store.draggedId);
		if (!todo) return;
		store.draggedId = null;

		if (columnKey === 'pending') {
			// Move to Pending: remove in-progress tag, unmark completed
			if (todo.completed) {
				store.toggleTodo(todo.id);
			}
			if ((todo.tags || []).includes('in-progress')) {
				store.toggleTag(todo.id, 'in-progress');
			}
		} else if (columnKey === 'in-progress') {
			// Move to In Progress: add in-progress tag, unmark completed
			if (todo.completed) {
				store.toggleTodo(todo.id);
			}
			if (!(todo.tags || []).includes('in-progress')) {
				store.toggleTag(todo.id, 'in-progress');
			}
		} else if (columnKey === 'done') {
			// Move to Done: mark completed, remove in-progress tag
			if (!todo.completed) {
				store.toggleTodo(todo.id);
			}
			if ((todo.tags || []).includes('in-progress')) {
				store.toggleTag(todo.id, 'in-progress');
			}
		}
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
		return dateStr < today;
	}
</script>

<div
	class="flex min-h-dvh justify-center p-8 sm:p-4"
	style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%); transition: background 0.3s;"
>
	<div
		class="w-full max-w-[1200px] rounded-2xl border p-8 sm:rounded-xl sm:p-5 xl:max-w-[1400px] 2xl:max-w-[1600px]"
		style="background: var(--card-bg); box-shadow: 0 8px 32px var(--shadow); border-color: var(--border); transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;"
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="m-0 text-2xl font-semibold" style="color: var(--text-heading);">Kanban Board</h2>
			<a
				href="/"
				class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium no-underline transition-all hover:opacity-80"
				style="color: var(--btn-primary); background: var(--input-bg);"
			>
				<ArrowLeft size={14} /> Back to Tasks
			</a>
		</div>

		<StatsBar />

		<div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each columns as col (col.key)}
				<div
					class="board-column flex flex-col rounded-xl border"
					role="region"
					aria-label={col.label + ' column'}
					style="background: {col.bgColor}; border-color: {dropTarget === col.key
						? col.color
						: col.borderColor}; transition: border-color 0.2s;"
					ondragover={(e) => {
						e.preventDefault();
						e.dataTransfer.dropEffect = 'move';
						dropTarget = col.key;
					}}
					ondragleave={() => {
						dropTarget = null;
					}}
					ondrop={(e) => {
						e.preventDefault();
						handleColumnDrop(col.key);
					}}
				>
					<!-- Column header -->
					<div
						class="flex items-center justify-between rounded-t-xl px-4 py-3"
						style="border-bottom: 2px solid {col.color};"
					>
						<div class="flex items-center gap-2">
							<col.icon size={16} style="color: {col.color};" />
							<h3 class="m-0 text-sm font-semibold" style="color: var(--text-heading);">
								{col.label}
							</h3>
						</div>
						<span
							class="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white"
							style="background: {col.color};"
						>
							{col.todos.length}
						</span>
					</div>

					<!-- Column body -->
					<div class="flex flex-col gap-2 p-3">
						{#if col.todos.length === 0}
							<div class="flex flex-col items-center px-2 py-8 text-center">
								<p class="m-0 text-sm" style="color: var(--text-muted);">No tasks</p>
							</div>
						{:else}
							{#each col.todos as todo (todo.id)}
								<div
									class="glow-card board-card flex items-start gap-2 rounded-xl border p-3"
									role="listitem"
									class:dragging={store.draggedId === todo.id}
									draggable="true"
									style="background: var(--todo-bg); border-color: var(--border);"
									ondragstart={(e) => {
										e.dataTransfer.effectAllowed = 'move';
										e.dataTransfer.setData('text/plain', String(todo.id));
										store.draggedId = todo.id;
									}}
									ondragend={() => {
										store.draggedId = null;
									}}
								>
									<!-- Checkbox -->
									<input
										type="checkbox"
										class="todo-check mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer"
										checked={todo.completed}
										onchange={() => store.toggleTodo(todo.id)}
										aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
									/>

									<!-- Card body -->
									<div class="min-w-0 flex-1">
										<div class="flex items-start gap-1.5">
											<h4
												class="m-0 text-sm leading-snug font-medium"
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
												class="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase"
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
														class="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
														style="background: {store.tagColors[tag]};"
													>
														{tag}
													</span>
												{/each}
												{#if todo.tags.length > 2}
													<span class="text-[10px]" style="color: var(--text-muted);"
														>+{todo.tags.length - 2}</span
													>
												{/if}
											{/if}
										</div>

										<!-- Due date -->
										{#if todo.dueDate}
											<p
												class="m-0 mt-1 text-xs font-medium"
												style="color: {isOverdue(todo.dueDate)
													? 'var(--priority-high)'
													: 'var(--text-muted)'};"
											>
												{formatDate(todo.dueDate)}
											</p>
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

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
