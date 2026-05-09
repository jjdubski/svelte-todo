<script>
	import { fade, slide, scale } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { cubicOut, elasticOut } from 'svelte/easing';
	import Todo from '../lib/Todo.svelte';
	import Toast from '../lib/Toast.svelte';
	import StatsBar from '../lib/StatsBar.svelte';
	import SkeletonLoader from '../lib/SkeletonLoader.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		Sun,
		Moon,
		Plus,
		Search,
		Trash2,
		ChevronDown,
		ChevronUp,
		X,
		CheckSquare,
		Layers
	} from 'lucide-svelte';

	let nextId = $state(1);
	let isLoading = $state(true);

	let prefersReducedMotion = $state(false);
	function checkReducedMotion() {
		if (typeof window !== 'undefined') {
			prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		}
	}
	checkReducedMotion();

	function loadTodos() {
		try {
			const saved = localStorage.getItem('todos');
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed.length > 0) {
					nextId = Math.max(...parsed.map(t => t.id)) + 1;
				}
				return parsed;
			}
		} catch {}
		return [];
	}

	function saveTodos(t) {
		try {
			localStorage.setItem('todos', JSON.stringify(t));
		} catch {}
	}

	let todos = $state(loadTodos());
	isLoading = false;

	// $effect used here intentionally — saveTodos() writes to localStorage (a side effect)
	// and does NOT reassign any $state variable, making it safe per Svelte 5 best practices.
	$effect(() => {
		saveTodos(todos);
	});

	// Categories
	let categories = $state(['Work', 'Personal', 'Ideas']);

	let categoryColors = $state({
		Work: '#3b82f6',
		Personal: '#22c55e',
		Ideas: '#a855f7'
	});

	// Tags
	let availableTags = $state(['urgent', 'meeting', 'home', 'shopping', 'health']);
	let tagColors = $state({
		urgent: '#ef4444',
		meeting: '#f59e0b',
		home: '#06b6d4',
		shopping: '#ec4899',
		health: '#22c55e'
	});

	// Task templates with None option
	let templates = $state([
		{ name: 'None', title: '', description: '', dueDate: '', priority: 'medium', category: '', tags: [] },
		{ name: 'Meeting', title: 'Meeting with ', description: 'Discuss ', dueDate: '', priority: 'medium', category: 'Work', tags: ['meeting'] },
		{ name: 'Errand', title: '', description: 'Buy ', dueDate: '', priority: 'low', category: 'Personal', tags: ['shopping'] },
		{ name: 'Urgent', title: 'URGENT: ', description: '', dueDate: '', priority: 'high', category: 'Work', tags: ['urgent'] },
		{ name: 'Health', title: 'Workout: ', description: '', dueDate: '', priority: 'medium', category: 'Personal', tags: ['health'] }
	]);

	// Form state
	let newTitle = $state('');
	let newDescription = $state('');
	let newDueDate = $state('');
	let newPriority = $state('medium');
	let newCategory = $state('');
	let newTags = $state([]);
	let newCustomTag = $state('');
	let newRecurring = $state('');

	// Filter/Sort state
	let filterText = $state('');
	let filterStatus = $state('all');
	let filterCategory = $state('');
	let sortBy = $state('manual');

	// UI state
	let newCategoryName = $state('');
	let showAddCategory = $state(false);
	let showForm = $state(true);
	let selectedTemplate = $state('None');
	let selectedTodos = $state(new SvelteSet());
	let selectMode = $state(false);

	// Toast state
	let toast = $state({ show: false, message: '', type: 'success' });
	let lastDeletedTodo = $state(null);

	// Dark mode
	function getInitialDarkMode() {
		try {
			const saved = localStorage.getItem('darkMode');
			if (saved !== null) return JSON.parse(saved);
		} catch {}
		if (typeof window !== 'undefined') {
			return window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		return false;
	}

	let darkMode = $state(getInitialDarkMode());

	$effect(() => {
		document.documentElement.classList.toggle('dark', darkMode);
		document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
		try {
			localStorage.setItem('darkMode', JSON.stringify(darkMode));
		} catch {}
	});

	// Stats
	let stats = $derived.by(() => {
		const today = new Date().toISOString().split('T')[0];
		const active = todos.filter(t => !t.completed).length;
		const completed = todos.filter(t => t.completed).length;
		const overdue = todos.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;
		return { active, completed, overdue, total: todos.length };
	});

	// Todo operations
	function addTodo(title, description, dueDate, priority, category, tags, recurring, subtasks) {
		todos.push({
			id: nextId++,
			title,
			description,
			dueDate,
			priority,
			category,
			tags: tags || [],
			recurring,
			subtasks: subtasks?.filter(s => s.text.trim()) || [],
			completed: false,
			createdAt: new Date().toISOString()
		});
	}

	function add() {
		if (newTitle.trim()) {
			addTodo(newTitle.trim(), newDescription.trim(), newDueDate, newPriority, newCategory, newTags, newRecurring, newSubtasks);
			resetForm();
		}
	}

	function resetForm() {
		newTitle = '';
		newDescription = '';
		newDueDate = '';
		newPriority = 'medium';
		newCategory = '';
		newTags = [];
		newRecurring = '';
		newSubtasks = [];
		selectedTemplate = 'None';
	}

	function applyTemplate(template) {
		selectedTemplate = template.name;
		newTitle = template.title;
		newDescription = template.description;
		newDueDate = template.dueDate;
		newPriority = template.priority;
		newCategory = template.category;
		newTags = [...template.tags];
		newRecurring = '';
		newSubtasks = [];
	}

	$effect(() => {
		if (selectedTemplate !== 'None') {
			const t = templates.find(t => t.name === selectedTemplate);
			if (t) {
				const hasChanges =
					newTitle !== t.title ||
					newDescription !== t.description ||
					newDueDate !== t.dueDate ||
					newPriority !== t.priority ||
					newCategory !== t.category ||
					JSON.stringify(newTags) !== JSON.stringify(t.tags) ||
					newRecurring !== '' ||
					newSubtasks.some(s => s.text);
				if (hasChanges) {
					selectedTemplate = 'None';
				}
			}
		}
	});

	function addCustomTag() {
		const tag = newCustomTag.trim().toLowerCase();
		if (tag && !newTags.includes(tag)) {
			newTags = [...newTags, tag];
			if (!availableTags.includes(tag)) {
				availableTags = [...availableTags, tag];
				tagColors = { ...tagColors, [tag]: getRandomTagColor() };
			}
		}
		newCustomTag = '';
	}

	function getRandomTagColor() {
		const colors = ['#ef4444', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#f97316', '#8b5cf6', '#6366f1'];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	function updateTodo(id, updates) {
		const todo = todos.find(t => t.id === id);
		if (todo) {
			Object.assign(todo, updates);
		}
	}

	function deleteTodo(id) {
		const index = todos.findIndex(t => t.id === id);
		if (index !== -1) {
			const { id: _id, ...rest } = todos[index];
			lastDeletedTodo = { todo: { ...rest, id: _id }, index };
			todos = todos.filter(t => t.id !== id);
			toast = { show: true, message: 'Task deleted', type: 'info' };
			setTimeout(() => { toast = { ...toast, show: false }; }, 4000);
		}
	}

	function undoDelete() {
		if (lastDeletedTodo) {
			todos.splice(lastDeletedTodo.index, 0, lastDeletedTodo.todo);
			todos = [...todos];
			lastDeletedTodo = null;
			toast = { show: true, message: 'Task restored', type: 'success' };
			setTimeout(() => { toast = { ...toast, show: false }; }, 2000);
		}
	}

	function toggleTodo(id) {
		const todo = todos.find(t => t.id === id);
		if (todo) {
			const wasCompleted = todo.completed;
			todo.completed = !todo.completed;
			// When a recurring task is completed, create a new instance with an updated due date
			if (!wasCompleted && todo.completed && todo.recurring) {
				const newDueDate = getNextDueDate(todo.dueDate, todo.recurring);
				addTodo(
					todo.title,
					todo.description || '',
					newDueDate,
					todo.priority,
					todo.category || '',
					todo.tags || [],
					todo.recurring,
					todo.subtasks || []
				);
			}
		}
	}

	// Batch operations
	function toggleSelect(id) {
		if (selectedTodos.has(id)) {
			selectedTodos.delete(id);
		} else {
			selectedTodos.add(id);
		}
	}

	function selectAll() {
		selectedTodos = new SvelteSet(filteredTodos.map(t => t.id));
	}

	function deselectAll() {
		selectedTodos = new SvelteSet();
	}

	function deleteSelected() {
		todos = todos.filter(t => !selectedTodos.has(t.id));
		toast = { show: true, message: `${selectedTodos.size} tasks deleted`, type: 'info' };
		setTimeout(() => { toast = { ...toast, show: false }; }, 3000);
		selectedTodos = new SvelteSet();
		selectMode = false;
	}

	function completeSelected() {
		todos = todos.map(t => selectedTodos.has(t.id) ? { ...t, completed: true } : t);
		toast = { show: true, message: `${selectedTodos.size} tasks completed`, type: 'success' };
		setTimeout(() => { toast = { ...toast, show: false }; }, 2000);
		selectedTodos = new SvelteSet();
		selectMode = false;
	}

	// Category management
	function setFilterCategory(cat) {
		filterCategory = filterCategory === cat ? '' : cat;
	}

	function addCategory() {
		const name = newCategoryName.trim();
		if (name && !categories.includes(name)) {
			categories = [...categories, name];
			const colors = ['#ef4444', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#f97316', '#8b5cf6'];
			const used = Object.values(categoryColors);
			const avail = colors.find(c => !used.includes(c));
			categoryColors = { ...categoryColors, [name]: avail || '#64748b' };
			newCategoryName = '';
			showAddCategory = false;
		}
	}

	// Drag and drop — uses reactive state instead of direct DOM class manipulation
	let draggedId = $state(null);
	let dragOverId = $state(null);

	function handleDragStart(e, id) {
		draggedId = id;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', String(id));
	}

	function handleDragEnd() {
		draggedId = null;
		dragOverId = null;
	}

	function handleDragOver(e, id) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		if (draggedId !== id) {
			dragOverId = id;
		}
	}

	function handleDragLeave() {
		dragOverId = null;
	}

	function handleDrop(e, targetId) {
		e.preventDefault();
		dragOverId = null;
		if (draggedId === null || draggedId === targetId) return;
		const fromIdx = todos.findIndex(t => t.id === draggedId);
		const toIdx = todos.findIndex(t => t.id === targetId);
		if (fromIdx === -1 || toIdx === -1) return;
		const item = todos.splice(fromIdx, 1)[0];
		todos.splice(toIdx, 0, item);
		draggedId = null;
	}

	/** Compute next due date for recurring tasks */
	function getNextDueDate(currentDate, recurring) {
		if (!currentDate || !recurring) return '';
		const date = new Date(currentDate + 'T00:00:00');
		switch (recurring) {
			case 'daily': date.setDate(date.getDate() + 1); break;
			case 'weekly': date.setDate(date.getDate() + 7); break;
			case 'monthly': date.setMonth(date.getMonth() + 1); break;
		}
		return date.toISOString().split('T')[0];
	}

	// Subtask management
	function addSubtask() {
		newSubtasks = [...newSubtasks, { text: '', done: false }];
	}

	function removeSubtask(index) {
		newSubtasks = newSubtasks.filter((_, i) => i !== index);
	}

	// Keyboard shortcut
	function handleKeydown(e) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
			e.preventDefault();
			showForm = true;
			setTimeout(() => document.getElementById('title-input')?.focus(), 50);
		}
		if (e.key === 'Escape') {
			if (selectMode) {
				selectMode = false;
				selectedTodos = new SvelteSet();
			}
		}
	}

	// Filtered todos
	let filteredTodos = $derived.by(() => {
		let result = todos;
		if (filterText.trim()) {
			const q = filterText.toLowerCase();
			result = result.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
		}
		if (filterStatus === 'active') {
			result = result.filter(t => !t.completed);
		} else if (filterStatus === 'done') {
			result = result.filter(t => t.completed);
		}
		if (filterCategory) {
			result = result.filter(t => t.category === filterCategory);
		}
		if (sortBy === 'priority') {
			const order = { high: 0, medium: 1, low: 2 };
			result = [...result].sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1));
		} else if (sortBy === 'date') {
			result = [...result].sort((a, b) => {
				if (!a.dueDate && !b.dueDate) return 0;
				if (!a.dueDate) return 1;
				if (!b.dueDate) return -1;
				return new Date(a.dueDate) - new Date(b.dueDate);
			});
		}
		return result;
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-dvh flex justify-center p-8 sm:p-4" style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%); transition: background 0.3s;">
	<div class="w-full max-w-[900px] rounded-2xl border p-8 sm:p-5 sm:rounded-xl" style="background: var(--card-bg); box-shadow: 0 8px 32px var(--shadow); border-color: var(--border); transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;">
		<!-- Header -->
		<div class="flex items-center justify-center mb-6 relative">
			<h1 class="m-0 text-4xl font-light" style="color: var(--text-heading); font-family: 'Caveat', 'Brush Script MT', cursive; letter-spacing: 0.02em;">Todo List</h1>
			<button
				class="absolute right-0 flex items-center justify-center w-11 h-11 rounded-xl border cursor-pointer"
				style="background: var(--todo-bg); border-color: var(--border); color: var(--text-secondary); transition: all 0.2s;" data-btn="ghost"
				onclick={() => darkMode = !darkMode}
				aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if darkMode}
					<Sun size={20} />
				{:else}
					<Moon size={20} />
				{/if}
			</button>
		</div>

		<!-- Stats Bar -->
		<StatsBar {stats} />

		

		<!-- Add Form -->
		{#if showForm}
			<div class="mb-6" transition:slide={{ duration: prefersReducedMotion ? 0 : 300, easing: cubicOut }}>
				<!-- Templates Segmented Control -->
				<span class="block text-xs font-medium mb-2" style="color: var(--text-muted);">Choose a template</span>
				<div class="flex rounded-xl p-0.5 gap-0.5 mb-4" style="background: var(--input-bg); border: 1px solid var(--border);">
					{#each templates as template (template.name)}
						<button
							class="template-btn flex-1 px-3 py-2 border-none rounded-lg text-sm font-medium cursor-pointer"
							class:active={selectedTemplate === template.name}
							onclick={() => applyTemplate(template)}
						>
							{template.name}
						</button>
					{/each}
				</div>

				<input
					id="title-input"
					class="w-full rounded-xl p-3 mb-3 text-sm"
					style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text); transition: all 0.2s;"
					bind:value={newTitle}
					placeholder="What needs to be done?"
					onkeydown={(e) => e.key === 'Enter' && add()}
					autocomplete="off"
				/>
				<textarea
					class="w-full rounded-xl p-3 mb-3 text-sm min-h-[70px] resize-y"
					style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text); transition: all 0.2s;"
					bind:value={newDescription}
					placeholder="Add details..."
					rows="2"
				></textarea>
				<div class="flex gap-2 flex-wrap">
					<input type="date" class="flex-1 min-w-[100px] rounded-xl p-3 mb-3 text-sm" style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);" bind:value={newDueDate} aria-label="Due date" />
					<select class="flex-1 min-w-[100px] rounded-xl p-3 mb-3 text-sm" style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);" bind:value={newPriority} aria-label="Priority">
						<option value="high">High</option>
						<option value="medium">Medium</option>
						<option value="low">Low</option>
					</select>
					<select class="flex-1 min-w-[100px] rounded-xl p-3 mb-3 text-sm" style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);" bind:value={newCategory} aria-label="Category">
						<option value="">Category</option>
						{#each categories as cat (cat)}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
					<select class="flex-1 min-w-[100px] rounded-xl p-3 mb-3 text-sm" style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);" bind:value={newRecurring} aria-label="Recurring">
						<option value="">Repeat</option>
						<option value="daily">Daily</option>
						<option value="weekly">Weekly</option>
						<option value="monthly">Monthly</option>
					</select>
				</div>

				<!-- Tags selector - below form fields -->
				<div class="mb-3">
					<div class="flex flex-wrap gap-2 items-center mb-2">
						<span class="text-xs font-medium" style="color: var(--text-muted);">Tags:</span>
						{#each availableTags as tag (tag)}
							<button
								class="tag-btn px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer"
						style="--tag-color: {tagColors[tag]}; transition: all 0.2s;"
							class:selected={newTags.includes(tag)}
							onclick={() => newTags = newTags.includes(tag) ? newTags.filter(t => t !== tag) : [...newTags, tag]}
							type="button"
							data-btn="tag"
						>
							{tag}
						</button>
						{/each}
						{#each newTags.filter(t => !availableTags.includes(t)) as tag (tag)}
							<button
								class="tag-btn px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer"
								style="background: #6366f1; color: white; border-color: #6366f1;" data-btn="tag"
								onclick={() => newTags = newTags.filter(t => t !== tag)}
								type="button"
							>
								{tag} ×
							</button>
						{/each}
					</div>
					<div class="flex">
						<input
							type="text"
							class="tag-input-field flex-1 px-3 py-2 text-sm rounded-l-lg outline-none"
							style="border: 1px dashed var(--border); border-right: none; background: transparent; color: var(--text);"
							placeholder="Add custom tag..."
							bind:value={newCustomTag}
							onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
						/>
						<div class="tag-add-btn flex items-center px-3 py-2 text-sm rounded-r-lg cursor-pointer"
							style="border: 1px dashed var(--border); background: transparent; color: var(--text-muted); transition: all 0.2s;" data-btn="ghost"
							onclick={addCustomTag} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && addCustomTag()}>+</div>
					</div>
				</div>


				<button type="button" class="flex items-center w-full justify-center gap-1.5 flex-1 px-4 py-3.5 border-none rounded-xl font-semibold text-base cursor-pointer"
					style="background: var(--btn-primary); color: white; transition: all 0.2s;" data-btn="primary"
					onclick={add}>
					<Plus size={16} /> Add Task
				</button>
			</div>
		{:else}
			<button class="flex items-center justify-center gap-2 w-full p-4 rounded-xl border border-dashed cursor-pointer mb-6"
				style="border-color: var(--border); color: var(--text-muted); transition: all 0.2s;" data-btn="ghost"
				onclick={() => showForm = true}>
				<Plus size={18} /> Add a task
			</button>
		{/if}

		<!-- Filter Bar -->
		<div class="flex gap-2 mb-3 flex-wrap">
			<div class="flex items-center gap-2 flex-1 min-w-[160px] px-3 py-2.5 rounded-xl border" style="background: var(--input-bg); border-color: var(--border);">
				<Search size={16} style="color: var(--text-muted);" />
				<input class="flex-1 border-none bg-transparent text-sm p-0 m-0 outline-none" style="color: var(--text);" bind:value={filterText} placeholder="Search..." />
			</div>
			<select class="p-2.5 px-3 rounded-xl text-sm" style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text); cursor: pointer;" bind:value={filterStatus} aria-label="Filter by status">
				<option value="all">All</option>
				<option value="active">Active</option>
				<option value="done">Done</option>
			</select>
			<select class="p-2.5 px-3 rounded-xl text-sm" style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text); cursor: pointer;" bind:value={sortBy} aria-label="Sort by">
				<option value="manual">Sort</option>
				<option value="priority">Priority</option>
				<option value="date">Date</option>
			</select>
			<div class="relative">
				<button
					class="flex items-center justify-center w-10 h-10 rounded-xl border cursor-pointer"
					style="background: var(--input-bg); border-color: var(--border); color: var(--text-muted); transition: all 0.2s;" data-btn="ghost"
					class:active={selectMode}
					onclick={() => selectMode = !selectMode}
					aria-label="Toggle select mode"
				>
					{#if selectMode && selectedTodos.size > 0}
						<span class="text-sm font-semibold">{selectedTodos.size}</span>
					{:else}
						<CheckSquare size={18} />
					{/if}
				</button>
				{#if selectMode}
					<div class="absolute top-full right-0 mt-2 flex gap-1.5 p-2 rounded-xl border shadow-lg z-50 whitespace-nowrap" style="background: var(--card-bg); border-color: var(--border);" transition:slide={{ duration: prefersReducedMotion ? 0 : 150 }}>
						<button class="flex items-center gap-1 px-2.5 py-2 border-none rounded-lg text-xs font-medium cursor-pointer"
							style="background: var(--btn-save); color: white; transition: all 0.2s;" data-btn="save"
							onclick={completeSelected} disabled={selectedTodos.size === 0}>
							<CheckSquare size={14} /> Complete
						</button>
						<button class="flex items-center gap-1 px-2.5 py-2 border-none rounded-lg text-xs font-medium cursor-pointer"
							style="background: var(--btn-delete); color: white; transition: all 0.2s;" data-btn="delete"
							onclick={deleteSelected} disabled={selectedTodos.size === 0}>
							<Trash2 size={14} /> Delete
						</button>
						<button class="flex items-center gap-1 px-2.5 py-2 border-none rounded-lg text-xs font-medium cursor-pointer"
							style="background: var(--btn-cancel); color: white; transition: all 0.2s;" data-btn="cancel"
							onclick={() => { selectMode = false; selectedTodos = new SvelteSet(); }}>
							<X size={14} /> Cancel
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Categories -->
		<div class="flex gap-2 flex-wrap items-center mb-3 px-3 py-2.5 rounded-xl border" style="background: var(--todo-bg); border-color: var(--border); transition: background 0.3s, border-color 0.3s;">
			<button
				class="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer border-transparent"
				style="color: var(--text-secondary); transition: all 0.15s;" data-btn="ghost"
				class:active={filterCategory === ''}
				onclick={() => filterCategory = ''}
			>All</button>
			{#each categories as cat (cat)}
				<button
					class="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer border-transparent"
					style="color: var(--text-secondary); --cat-color: {categoryColors[cat]}; transition: all 0.15s;" data-btn="ghost"
					class:active={filterCategory === cat}
					onclick={() => setFilterCategory(cat)}
				>
					{cat}
				</button>
			{/each}
			{#if showAddCategory}
				<form class="flex gap-1 items-center" onsubmit={(e) => { e.preventDefault(); addCategory(); }}>
					<input class="w-[70px] px-2 py-1 text-xs rounded-md" style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);" bind:value={newCategoryName} placeholder="New" />
					<button type="submit" class="px-2 py-1 text-xs font-medium border-none rounded-md cursor-pointer" style="background: var(--btn-save); color: white;" data-btn="save">Add</button>
					<button type="button" class="px-2 py-1 text-xs font-medium border-none rounded-md cursor-pointer" style="background: var(--btn-cancel); color: white;" data-btn="cancel" onclick={() => showAddCategory = false}>X</button>
				</form>
			{:else}
				<button class="px-2 py-1 bg-none rounded-full border border-dashed text-xs cursor-pointer" style="border-color: var(--border-input); color: var(--text-muted); transition: all 0.15s;" data-btn="ghost" onclick={() => showAddCategory = true}>+</button>
			{/if}
		</div>

		<!-- Toggle form -->
		<button class="flex items-center justify-center w-full py-2 mb-3 border-none rounded-md cursor-pointer"
			style="background: transparent; color: var(--text-muted); transition: all 0.2s;" data-btn="ghost"
			onclick={() => showForm = !showForm} aria-label="Toggle add form">
			{#if showForm}
				<ChevronUp size={16} />
			{:else}
				<ChevronDown size={16} />
			{/if}
		</button>

		<!-- Todo List -->
		<div class="flex flex-col gap-2">
			{#if isLoading}
				<SkeletonLoader />
			{:else if filteredTodos.length === 0}
				<div class="flex flex-col items-center py-12 px-4" transition:fade={{ duration: prefersReducedMotion ? 0 : 300 }}>
					<div class="w-16 h-16 mb-4 flex items-center justify-center rounded-2xl" style="background: linear-gradient(135deg, var(--btn-primary) 0%, var(--btn-edit) 100%); color: white;">
						<Layers size={40} />
					</div>
					<h3 class="m-0 mb-2 text-lg font-semibold" style="color: var(--text-heading);">No tasks yet</h3>
					<p class="m-0 mb-6 text-sm" style="color: var(--text-muted);">Add a task to get started</p>
					<button class="flex items-center justify-center gap-1.5 flex-1 px-4 py-3.5 border-none rounded-xl font-semibold text-base cursor-pointer"
						style="background: var(--btn-primary); color: white; transition: all 0.2s; max-width: 280px;" data-btn="primary"
						onclick={() => showForm = true}>
						<Plus size={16} /> Add your first task
					</button>
				</div>
			{:else}
				{#each filteredTodos as todo (todo.id)}
					<div
						animate:flip={{ duration: prefersReducedMotion ? 0 : 300, easing: cubicOut }}
						transition:scale={{ duration: prefersReducedMotion ? 0 : 200, easing: elasticOut }}
					>
						<Todo
							{todo}
							{updateTodo}
							{deleteTodo}
							{toggleTodo}
							{categories}
							{categoryColors}
							{availableTags}
							{tagColors}
							{sortBy}
							{handleDragStart}
							{handleDragEnd}
							{handleDragOver}
							{handleDragLeave}
							{handleDrop}
							{draggedId}
							{dragOverId}
							{selectMode}
							{selectedTodos}
							{toggleSelect}
							{prefersReducedMotion}
						/>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Shortcut hint -->
		<div class="text-center mt-6 text-xs" style="color: var(--text-muted);">
			<kbd class="inline-block px-1.5 py-0.5 rounded text-[11px]" style="background: var(--todo-bg); border: 1px solid var(--border); font-family: inherit; margin: 0 2px;">Ctrl</kbd>+<kbd class="inline-block px-1.5 py-0.5 rounded text-[11px]" style="background: var(--todo-bg); border: 1px solid var(--border); font-family: inherit; margin: 0 2px;">N</kbd> quick add
		</div>
	</div>
</div>

<!-- Toast notification -->
{#if toast.show}
	<Toast message={toast.message} type={toast.type} {undoDelete} />
{/if}

<style>
	/* Tag button selected state — uses CSS variable from inline style */
	:global(.tag-btn.selected) {
		background: var(--tag-color) !important;
		color: white;
		border-color: var(--tag-color);
	}

	/* Tag input focus + adjacent sibling — needs CSS sibling selector */
	.tag-input-field:focus {
		border-color: var(--btn-primary);
	}

	:global(.tag-input-field:focus + .tag-add-btn) {
		border-color: var(--btn-primary);
		color: var(--btn-primary);
	}

	/* Template buttons */
	.template-btn {
		background: transparent;
		color: var(--text-secondary);
		transition: all 0.2s;
	}

	.template-btn:hover {
		background: var(--input-bg);
	}

	.template-btn.active {
		background: var(--btn-primary) !important;
		color: white !important;
		box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
	}

	/* Hover effects */
	:global(.tag-btn:hover) {
		filter: brightness(1.1);
	}

	[data-btn="primary"]:hover,
	[data-btn="save"]:hover,
	[data-btn="delete"]:hover,
	[data-btn="cancel"]:hover {
		filter: brightness(1.15);
	}

	[data-btn="ghost"]:hover {
		background: var(--todo-bg) !important;
		border-color: var(--text-muted) !important;
	}

	/* Reduce motion */
	@media (prefers-reduced-motion: reduce) {
		* {
			transition-duration: 0.01ms !important;
			animation-duration: 0.01ms !important;
		}
	}
</style>