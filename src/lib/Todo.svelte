<script>
	import { slide } from 'svelte/transition';
	import { scale } from 'svelte/transition';
	import { elasticOut, cubicOut } from 'svelte/easing';
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

	let {
		todo,
		updateTodo,
		deleteTodo,
		toggleTodo,
		categories,
		categoryColors,
		availableTags,
		tagColors,
		sortBy,
		handleDragStart,
		handleDragEnd,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		draggedId = null,
		dragOverId = null,
		selectMode = false,
		selectedTodos = new Set(),
		toggleSelect,
		prefersReducedMotion = false
	} = $props();

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
		updateTodo(todo.id, { subtasks });
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
		updateTodo(todo.id, {
			title: editTitle,
			description: editDescription,
			dueDate: editDueDate,
			priority: editPriority,
			category: editCategory,
			tags: editTags,
			recurring: editRecurring,
			subtasks: editSubtasks.filter(s => s.text.trim())
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

	let completedSubtasks = $derived(todo.subtasks?.filter(s => s.done).length || 0);
	let totalSubtasks = $derived(todo.subtasks?.length || 0);
</script>

<svelte:window onkeydown={(e) => editing && e.key === 'Escape' && cancel()} />

{#if editing}
	<form class="todo-edit flex flex-col gap-2 rounded-xl p-3.5" transition:scale={{ duration: prefersReducedMotion ? 0 : 200, easing: elasticOut }}>
		<input bind:value={editTitle} placeholder="Title" class="w-full px-3 py-2.5 rounded-lg border text-base" />
		<textarea bind:value={editDescription} placeholder="Description" rows="2" class="w-full px-3 py-2.5 rounded-lg border text-base min-h-[60px] resize-vertical"></textarea>
		<div class="form-inline flex gap-2 flex-wrap">
			<input type="date" bind:value={editDueDate} aria-label="Due date" class="flex-1 min-w-20 px-3 py-2.5 rounded-lg border text-base" />
			<select bind:value={editPriority} aria-label="Priority" class="flex-1 min-w-20 px-3 py-2.5 rounded-lg border text-base">
				<option value="high">High</option>
				<option value="medium">Medium</option>
				<option value="low">Low</option>
			</select>
			<select bind:value={editCategory} aria-label="Category" class="flex-1 min-w-20 px-3 py-2.5 rounded-lg border text-base">
				<option value="">No category</option>
				{#each categories as cat (cat)}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
			<select bind:value={editRecurring} aria-label="Recurring" class="flex-1 min-w-20 px-3 py-2.5 rounded-lg border text-base">
				<option value="">One-time</option>
				<option value="daily">Daily</option>
				<option value="weekly">Weekly</option>
				<option value="monthly">Monthly</option>
			</select>
		</div>

		<div class="tags-editor flex items-center gap-2 flex-wrap">
			<Tag size={14} />
			{#each availableTags as tag (tag)}
				<button
					type="button"
					class="tag-toggle px-2 py-0.5 rounded-full text-xs font-semibold border cursor-pointer"
					class:selected={editTags.includes(tag)}
					style="--tag-color: {tagColors[tag]}"
					onclick={() => editTags = editTags.includes(tag) ? editTags.filter(t => t !== tag) : [...editTags, tag]}
				>
					{tag}
				</button>
			{/each}
		</div>

		<div class="subtasks-editor mt-1">
			<button type="button" class="text-btn bg-none border-none text-sm cursor-pointer p-1" onclick={addEditSubtask}>
				+ Add subtask
			</button>
			{#each editSubtasks as subtask, i (i)}
				<div class="subtask-row-edit flex items-center gap-2 mt-1">
					<input
						type="checkbox"
						checked={subtask.done}
						class="w-4 h-4"
						onchange={() => toggleSubtask(i)}
					/>
					<input
						type="text"
						bind:value={editSubtasks[i].text}
						placeholder="Subtask {i + 1}"
						class="flex-1 px-2 py-1.5 text-sm rounded-md border"
					/>
					<button type="button" class="icon-btn tiny w-6 h-6 flex items-center justify-center border-none rounded p-0" onclick={() => removeEditSubtask(i)}>
						<X size={12} />
					</button>
				</div>
			{/each}
		</div>

		<div class="todo-edit-actions flex gap-2 justify-end">
			<button type="button" onclick={cancel} class="btn btn-cancel px-4 py-2 font-medium border-none rounded-md cursor-pointer">Cancel</button>
			<button type="button" onclick={save} class="btn btn-save px-4 py-2 font-medium border-none rounded-md cursor-pointer">Save</button>
		</div>
	</form>
{:else}
	<div
		role="listitem"
		class="todo-card flex gap-2 items-start rounded-xl border p-3"
		class:completed={todo.completed}
		class:dragging={draggedId === todo.id}
		class:drag-over={dragOverId === todo.id}
		draggable={sortBy === 'manual'}
		ondragstart={(e) => handleDragStart(e, todo.id)}
		ondragend={handleDragEnd}
		ondragover={(e) => handleDragOver(e, todo.id)}
		ondragleave={handleDragLeave}
		ondrop={(e) => handleDrop(e, todo.id)}
	>
		{#if selectMode}
			<button
				class="select-check flex items-center justify-center bg-none border-none cursor-pointer p-0.5 rounded shrink-0 self-start mt-0.5"
				onclick={() => toggleSelect(todo.id)}
				aria-label={selectedTodos.has(todo.id) ? 'Deselect' : 'Select'}
			>
				{#if selectedTodos.has(todo.id)}
					<CheckSquare size={18} />
				{:else}
					<Square size={18} />
				{/if}
			</button>
		{/if}

		{#if sortBy === 'manual' && !selectMode}
			<div class="drag-handle cursor-grab flex flex-col gap-[2px] p-[0.25rem_0.1rem_0.25rem_0] shrink-0 select-none self-start mt-1" aria-label="Drag to reorder">
				<span></span><span></span><span></span>
			</div>
		{/if}

		<div class="todo-body flex-1 min-w-0">
			<div class="flex items-start gap-2">
				<input
					type="checkbox"
					class="todo-check w-[18px] h-[18px] cursor-pointer shrink-0 mt-0.5"
					checked={todo.completed}
					onchange={() => toggleTodo(todo.id)}
					aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
				/>
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-1.5 flex-wrap">
						<h3 class="todo-title m-0 text-base font-medium leading-snug">{todo.title}</h3>
						<span class="flex gap-1 items-center shrink-0 ml-auto">
							<span class="priority-badge inline-block px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider text-white priority-{todo.priority || 'medium'}">
								{todo.priority || 'medium'}
							</span>
							{#if todo.category && categories.includes(todo.category)}
<span class="category-badge inline-block px-1.5 py-0.5 rounded-full text-xs font-semibold text-white" style="background: {categoryColors[todo.category]};">
									{todo.category}
								</span>
							{/if}
							{#if todo.recurring}
								<span class="recurring-badge inline-flex items-center justify-center w-4 h-4 rounded-full" style="background: var(--btn-edit); color: white;" title="Recurring {todo.recurring}">
									<Repeat size={10} />
								</span>
							{/if}
						</span>
					</div>

					{#if todo.description}
						<p class="todo-desc m-0 text-sm leading-relaxed mt-0.5" style="color: var(--text-muted);">{todo.description}</p>
					{/if}

					{#if todo.tags && todo.tags.length > 0}
						<div class="flex flex-wrap gap-1 mt-1">
							{#each todo.tags as tag (tag)}
								<span class="inline-block px-1.5 py-0.5 rounded-full text-xs font-semibold text-white" style="background: {tagColors[tag]};">
									{tag}
								</span>
							{/each}
						</div>
					{/if}

					<div class="flex items-center gap-2 mt-1 flex-wrap">
						{#if totalSubtasks > 0}
							<button class="subtasks-preview inline-flex items-center gap-0.5 bg-none border-none text-sm cursor-pointer p-0.5" onclick={toggleSubtasksView}>
								{#if showSubtasks}
									<ChevronDown size={12} />
								{:else}
									<ChevronRight size={12} />
								{/if}
								<span>{completedSubtasks}/{totalSubtasks}</span>
							</button>
						{/if}
						<button
							class="inline-flex items-center gap-0.5 bg-none border-none text-sm cursor-pointer p-0.5"
							style="color: var(--text-muted);"
							onclick={() => showAddSubtask = !showAddSubtask}
						>
							+ Subtask
						</button>
						<span class="flex items-center gap-1 ml-auto">
							{#if todo.dueDate}
								<span class="text-sm font-medium" style="color: {isOverdue(todo.dueDate) ? 'var(--priority-high)' : 'var(--text-muted)'};">
									{formatDate(todo.dueDate)}
								</span>
							{/if}
							<button onclick={startEdit} class="flex items-center justify-center border-0 rounded-md p-1 cursor-pointer" style="color: var(--text-muted);" aria-label="Edit task">
								<Edit2 size={13} />
							</button>
							<button onclick={() => deleteTodo(todo.id)} class="flex items-center justify-center border-0 rounded-md p-1 cursor-pointer" style="color: var(--text-muted);" aria-label="Delete task">
								<Trash2 size={13} />
							</button>
						</span>
					</div>

					{#if showSubtasks && todo.subtasks && todo.subtasks.length > 0}
						<div class="flex flex-col gap-0.5 pl-3 border-l-2 mt-1" transition:slide={{ duration: prefersReducedMotion ? 0 : 150 }} style="border-color: var(--border);">
							{#each todo.subtasks as subtask, i (i)}
								<div class="subtask-item flex items-center gap-1.5 text-sm py-0.5" class:done={subtask.done}>
									<input
										type="checkbox"
										checked={subtask.done}
										class="w-[13px] h-[13px]"
										onchange={() => {
											subtask.done = !subtask.done;
											updateTodo(todo.id, { subtasks: todo.subtasks });
										}}
									/>
									<span style="color: var(--text-secondary);">{subtask.text}</span>
								</div>
							{/each}
						</div>
					{/if}

					{#if showAddSubtask}
						<div class="flex gap-1.5 items-center mt-1" transition:slide={{ duration: prefersReducedMotion ? 0 : 100 }}>
							<input
								type="text"
								class="flex-1 px-2 py-1 text-sm rounded-md"
								style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);"
								bind:value={newSubtaskText}
								placeholder="Add a subtask..."
								onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInlineSubtask(); } }}
							/>
							<button
								class="px-2 py-1 text-sm font-medium border-none rounded-md cursor-pointer text-white"
								style="background: var(--btn-save);"
								onclick={addInlineSubtask}
							>Add</button>
							<button
								class="px-2 py-1 text-xs font-medium border-none rounded-md cursor-pointer text-white"
								style="background: var(--btn-cancel);"
								onclick={() => { showAddSubtask = false; newSubtaskText = ''; }}
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
		transition: all 0.2s;
	}

	.todo-card:hover {
		border-color: var(--text-muted);
		box-shadow: 0 2px 8px var(--shadow);
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
	.subtask-item input[type="checkbox"],
	.subtask-row-edit input[type="checkbox"] {
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
	.subtask-row-edit input[type="text"] {
		border: 1px solid var(--border-input);
		background: var(--input-bg);
		color: var(--text);
	}

	.todo-edit input:focus,
	.todo-edit textarea:focus,
	.todo-edit select:focus,
	.subtask-row-edit input[type="text"]:focus {
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

	.todo-card [aria-label="Edit task"]:hover,
	.todo-card [aria-label="Delete task"]:hover {
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
