import { createContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { storageGet, storageSet } from '$lib/scripts/storage.js';
import {
	localDateStr,
	fuzzyMatch,
	computeStats,
	computeStreak,
	computeCompletionsByDay,
	computePriorityDistribution,
	computeCategoryBreakdown,
	computeOverdueTasks,
	computeUpcomingDue,
	getNextDueDate,
	getRandomTagColor
} from '$lib/utils/todoUtils.js';

/**
 * @typedef {Object} Todo
 * @property {number} id
 * @property {string} title
 * @property {string} [description]
 * @property {string} [dueDate]
 * @property {string} [priority]
 * @property {string} [category]
 * @property {string[]} [tags]
 * @property {string} [recurring]
 * @property {Array<{text:string, done:boolean}>} [subtasks]
 * @property {boolean} completed
 * @property {string} [completedAt]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Stats
 * @property {number} active
 * @property {number} completed
 * @property {number} overdue
 * @property {number} total
 */

class TodoStore {
	/** @type {number} */
	nextId = $state(1);
	/** @type {boolean} */
	isLoading = $state(true);
	/** @type {boolean} */
	prefersReducedMotion = $state(false);

	// ── Notification state ──
	/** @type {boolean} */
	requestedNotification = $state(false);
	/** @type {boolean} */
	notificationsEnabled = $state(false);

	// ── Upcoming due tasks (computed in effect) ──
	/** @type {Todo[]} */
	upcomingDueTasks = $state([]);

	// ── Todos ──
	/** @type {Todo[]} */
	todos = $state([]);
	/** @type {Todo[]} */
	archivedTodos = $state([]);

	// ── Categories ──
	/** @type {string[]} */
	categories = $state(['Work', 'Personal', 'Ideas']);
	/** @type {Record<string,string>} */
	categoryColors = $state({
		Work: '#3b82f6',
		Personal: '#22c55e',
		Ideas: '#a855f7'
	});

	// ── Tags ──
	/** @type {string[]} */
	availableTags = $state(['urgent', 'meeting', 'home', 'shopping', 'health', 'in-progress']);
	/** @type {Record<string,string>} */
	tagColors = $state({
		urgent: '#ef4444',
		meeting: '#f59e0b',
		home: '#06b6d4',
		shopping: '#ec4899',
		health: '#22c55e',
		'in-progress': '#f97316'
	});

	// ── Templates ──
	templates = $state([
		{
			name: 'None',
			title: '',
			description: '',
			dueDate: '',
			priority: 'medium',
			category: '',
			tags: []
		},
		{
			name: 'Meeting',
			title: 'Meeting with ',
			description: 'Discuss ',
			dueDate: '',
			priority: 'medium',
			category: 'Work',
			tags: ['meeting']
		},
		{
			name: 'Errand',
			title: '',
			description: 'Buy ',
			dueDate: '',
			priority: 'low',
			category: 'Personal',
			tags: ['shopping']
		},
		{
			name: 'Urgent',
			title: 'URGENT: ',
			description: '',
			dueDate: '',
			priority: 'high',
			category: 'Work',
			tags: ['urgent']
		},
		{
			name: 'Health',
			title: 'Workout: ',
			description: '',
			dueDate: '',
			priority: 'medium',
			category: 'Personal',
			tags: ['health']
		}
	]);

	// ── Filter / Sort ──
	filterText = $state('');
	filterStatus = $state('all');
	filterCategory = $state('');
	sortBy = $state('manual');
	filterTags = $state([]);
	filterPriority = $state('all');
	filterDateFrom = $state('');
	filterDateTo = $state('');
	activeFilterCount = $state(0);

	// ── Select mode ──
	selectMode = $state(false);
	selectedTodos = $state(new SvelteSet());

	// ── Archived select mode ──
	archivedSelectMode = $state(false);
	selectedArchived = $state(new SvelteSet());

	// ── Undo archive / complete ──
	/** @type {Todo[]} */
	lastArchivedTodos = $state([]);
	/** @type {Todo[]} */
	lastCompletedTodos = $state([]);

	// ── Toast ──
	toast = $state({ show: false, message: '', type: 'success' });

	// ── Dark mode ──
	darkMode = $state(false);

	// ── Drag-to-assign category/tag ──

	/**
	 * @param {number} id
	 * @param {string} category
	 */
	assignCategory(id, category) {
		const todo = this.todos.find((t) => t.id === id);
		if (todo) {
			todo.category = todo.category === category ? '' : category; // toggle
		}
	}

	/**
	 * @param {number} id
	 * @param {string} tag
	 */
	assignTag(id, tag) {
		const todo = this.todos.find((t) => t.id === id);
		if (todo) {
			const tags = todo.tags || [];
			if (tags.includes(tag)) {
				todo.tags = tags.filter((t) => t !== tag); // remove
			} else {
				todo.tags = [...tags, tag]; // add
			}
		}
	}

	// ── Edit modal state ──
	/** @type {number|null} */
	editingTodoId = $state(null);

	/**
	 * @param {number} id
	 */
	startEdit(id) {
		this.editingTodoId = id;
	}

	cancelEdit() {
		this.editingTodoId = null;
	}

	// ── Drag and drop ──
	/** @type {number|null} */
	draggedId = $state(null);
	/** @type {number|null} */
	dragOverId = $state(null);
	/** @type {'before'|'after'|null} */
	dragIndicatorPos = $state(null);
	/** @type {'category'|'tag'|null} */
	dragTargetPill = $state(null);
	/** @type {string} */
	dragTargetValue = $state('');

	/** @type {HTMLDivElement|null} */
	_dragGhost = null;

	// ── Derived values (updated by $effect) ──
	/** @type {Stats} */
	stats = $state({ active: 0, completed: 0, overdue: 0, total: 0 });
	/** @type {Todo[]} */
	filteredTodos = $state([]);

	// ── Analytics computed values (updated by $effect) ──
	/** @type {number} */
	streak = $state(0);
	/** @type {Record<string,number>} */
	completionsByDay = $state({});
	/** @type {{high:number, medium:number, low:number}} */
	priorityDistribution = $state({ high: 0, medium: 0, low: 0 });
	/** @type {Record<string,number>} */
	categoryBreakdown = $state({});
	/** @type {Todo[]} */
	overdueTasks = $state([]);

	/** @type {boolean} */
	storageError = $state(false);

	constructor() {
		this._init();
		this._checkReducedMotion();

		// Storage event listener for cross-tab sync
		if (typeof window !== 'undefined') {
			window.addEventListener('storage', this._handleStorageChange.bind(this));
		}

		// Effect: recompute stats, upcoming due, and save todos + archivedTodos
		$effect(() => {
			const t = this.todos;
			const a = this.archivedTodos;
			this.stats = this._computeStats([...t, ...a]);
			this.filteredTodos = this._computeFiltered(t);
			this.upcomingDueTasks = this._computeUpcomingDue(t);
			this.streak = this._computeStreak([...t, ...a]);
			this.completionsByDay = this._computeCompletionsByDay([...t, ...a]);
			this.priorityDistribution = this._computePriorityDistribution(t);
			this.categoryBreakdown = this._computeCategoryBreakdown([...t, ...a]);
			this.overdueTasks = this._computeOverdueTasks([...t, ...a]);
			storageSet('todos', t);
			storageSet('archivedTodos', a);
		});

		// Effect: recompute filteredTodos when filters/sort change
		$effect(() => {
			// Read filter/sort deps to track them
			const ft = this.filterText;
			const fs = this.filterStatus;
			const fc = this.filterCategory;
			const sb = this.sortBy;
			const fp = this.filterPriority;
			const ftags = this.filterTags;
			const fdf = this.filterDateFrom;
			const fdt = this.filterDateTo;
			// Recompute filtered from current todos + these filters
			this.filteredTodos = this._computeFiltered(this.todos, ft, fs, fc, sb, fp, ftags, fdf, fdt);
			// Compute active filter count
			let count = 0;
			if (ft) count++;
			if (fs !== 'all') count++;
			if (fc) count++;
			if (fp !== 'all') count++;
			if (ftags.length > 0) count++;
			if (fdf) count++;
			if (fdt) count++;
			this.activeFilterCount = count;
		});

		// Effect: sync dark mode to DOM and localStorage
		$effect(() => {
			const dm = this.darkMode;
			if (typeof document !== 'undefined') {
				document.documentElement.classList.toggle('dark', dm);
				document.documentElement.style.colorScheme = dm ? 'dark' : 'light';
			}
			storageSet('darkMode', dm);
		});

		// ── Notification setup (runs once after mount) ──
		if (typeof window !== 'undefined') {
			setTimeout(() => {
				this._setupNotifications();
			}, 500);
		}
	}

	/**
	 * Set up browser notifications:
	 * - If already granted, show due-task notifications immediately
	 * - If not yet decided, request on first user click
	 */
	_setupNotifications() {
		if (typeof window === 'undefined' || !('Notification' in window)) return;

		// Already granted — notify on load
		if (Notification.permission === 'granted') {
			this.notificationsEnabled = true;
			this.notifyDueTasks();
			return;
		}

		// 'default' — request permission on first user interaction
		if (Notification.permission === 'default') {
			const handler = () => {
				this.requestNotificationPermission();
				document.removeEventListener('click', handler);
			};
			document.addEventListener('click', handler, { once: true });
		}
	}

	// ── Initialization ──

	_init() {
		const saved = storageGet('todos') || [];
		const archivedSaved = storageGet('archivedTodos') || [];

		let maxId = 0;
		const seenIds = new Set();

		if (Array.isArray(saved) && saved.length > 0) {
			this.todos = saved.map((t) => {
				if (seenIds.has(t.id)) t.id = ++maxId; // Recover corrupted IDs
				seenIds.add(t.id);
				maxId = Math.max(maxId, t.id);
				return t;
			});
		}

		if (Array.isArray(archivedSaved) && archivedSaved.length > 0) {
			this.archivedTodos = archivedSaved.map((t) => {
				if (seenIds.has(t.id)) t.id = ++maxId; // Recover corrupted IDs
				seenIds.add(t.id);
				maxId = Math.max(maxId, t.id);
				return t;
			});
		}

		this.nextId = maxId + 1;

		this.darkMode = this._getInitialDarkMode();
		this.isLoading = false;
	}

	_checkReducedMotion() {
		if (typeof window !== 'undefined') {
			this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		}
	}

	_getInitialDarkMode() {
		const saved = storageGet('darkMode');
		if (saved !== null) return saved;
		if (typeof window !== 'undefined') {
			return window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		return false;
	}

	// ── Fuzzy search (no external deps) ──

	/**
	 * Simple character-wise fuzzy match.
	 * Returns true if all characters of `query` appear in order within `text`.
	 * @param {string} query
	 * @param {string} text
	 * @returns {boolean}
	 */
	_fuzzyMatch(query, text) {
		return fuzzyMatch(query, text);
	}

	// ── Stats computation ──

	/**
	 * @param {Todo[]} todos
	 * @returns {Stats}
	 */
	_computeStats(todos) {
		return computeStats(todos);
	}

	/**
	 * Count consecutive days (from today backward) with at least one completion.
	 * @param {Todo[]} todos
	 * @returns {number}
	 */
	_computeStreak(todos) {
		return computeStreak(todos);
	}

	/**
	 * Count completions per day-of-week for the current week (Mon-Sun).
	 * @param {Todo[]} todos
	 * @returns {Record<string,number>}
	 */
	_computeCompletionsByDay(todos) {
		return computeCompletionsByDay(todos);
	}

	/**
	 * Count tasks by priority level.
	 * @param {Todo[]} todos
	 * @returns {{high:number, medium:number, low:number}}
	 */
	_computePriorityDistribution(todos) {
		return computePriorityDistribution(todos);
	}

	/**
	 * Count tasks by category.
	 * @param {Todo[]} todos
	 * @returns {Record<string,number>}
	 */
	_computeCategoryBreakdown(todos) {
		return computeCategoryBreakdown(todos);
	}

	/**
	 * Get array of overdue (active past-due) tasks.
	 * @param {Todo[]} todos
	 * @returns {Todo[]}
	 */
	_computeOverdueTasks(todos) {
		return computeOverdueTasks(todos);
	}

	/**
	 * @param {Todo[]} todos
	 * @param {string} [filterText]
	 * @param {string} [filterStatus]
	 * @param {string} [filterCategory]
	 * @param {string} [sortBy]
	 * @param {string} [filterPriority]
	 * @param {string[]} [filterTags]
	 * @param {string} [filterDateFrom]
	 * @param {string} [filterDateTo]
	 * @returns {Todo[]}
	 */
	_computeFiltered(
		todos,
		filterText,
		filterStatus,
		filterCategory,
		sortBy,
		filterPriority,
		filterTags,
		filterDateFrom,
		filterDateTo
	) {
		// Use instance values if not explicitly passed
		const ft = filterText ?? this.filterText;
		const fs = filterStatus ?? this.filterStatus;
		const fc = filterCategory ?? this.filterCategory;
		const sb = sortBy ?? this.sortBy;
		const fp = filterPriority ?? this.filterPriority;
		const ftags = filterTags ?? this.filterTags;
		const fdf = filterDateFrom ?? this.filterDateFrom;
		const fdt = filterDateTo ?? this.filterDateTo;

		let result = todos;

		// Fuzzy text filter (title weighted higher — checked first)
		if (ft.trim()) {
			const q = ft.trim();
			result = result.filter((t) => {
				if (this._fuzzyMatch(q, t.title)) return true;
				if (t.description && this._fuzzyMatch(q, t.description)) return true;
				return false;
			});
		}

		// Status filter
		if (fs === 'active') {
			result = result.filter((t) => !t.completed);
		} else if (fs === 'done') {
			result = result.filter((t) => t.completed);
		}

		// Category filter
		if (fc) {
			result = result.filter((t) => t.category === fc);
		}

		// Priority filter
		if (fp !== 'all') {
			result = result.filter((t) => t.priority === fp);
		}

		// Tags filter (AND logic — all selected tags must be present)
		if (ftags.length > 0) {
			result = result.filter((t) => {
				const todoTags = t.tags || [];
				return ftags.every((tag) => todoTags.includes(tag));
			});
		}

		// Date range filter
		if (fdf) {
			result = result.filter((t) => t.dueDate && t.dueDate >= fdf);
		}
		if (fdt) {
			result = result.filter((t) => t.dueDate && t.dueDate <= fdt);
		}

		// Sort
		if (sb === 'priority') {
			const order = { high: 0, medium: 1, low: 2 };
			result = [...result].sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1));
		} else if (sb === 'date') {
			result = [...result].sort((a, b) => {
				if (!a.dueDate && !b.dueDate) return 0;
				if (!a.dueDate) return 1;
				if (!b.dueDate) return -1;
				return new Date(a.dueDate) - new Date(b.dueDate);
			});
		} else if (sb === 'alpha-asc') {
			result = [...result].sort((a, b) => a.title.localeCompare(b.title));
		} else if (sb === 'alpha-desc') {
			result = [...result].sort((a, b) => b.title.localeCompare(a.title));
		} else if (sb === 'category') {
			result = [...result].sort((a, b) => {
				const catA = a.category || '';
				const catB = b.category || '';
				if (catA !== catB) return catA.localeCompare(catB);
				return a.title.localeCompare(b.title);
			});
		}

		return result;
	}

	// ── Todo CRUD ──

	/**
	 * @param {string} title
	 * @param {string} description
	 * @param {string} dueDate
	 * @param {string} priority
	 * @param {string} category
	 * @param {string[]} tags
	 * @param {string} recurring
	 * @param {Array<{text:string, done:boolean}>} [subtasks]
	 */
	addTodo(title, description, dueDate, priority, category, tags, recurring, subtasks) {
		this.todos.push({
			id: this.nextId++,
			title,
			description,
			dueDate,
			priority,
			category,
			tags: tags || [],
			recurring,
			subtasks: subtasks?.filter((s) => s.text.trim()) || [],
			completed: false,
			createdAt: new Date().toISOString()
		});
	}

	/**
	 * @param {number} id
	 * @param {Partial<Todo>} updates
	 */
	updateTodo(id, updates) {
		const todo = this.todos.find((t) => t.id === id);
		if (todo) {
			Object.assign(todo, updates);
		}
	}

	/**
	 * @param {number} id
	 */
	deleteTodo(id) {
		const index = this.todos.findIndex((t) => t.id === id);
		if (index !== -1) {
			const [todo] = this.todos.splice(index, 1);
			this.archivedTodos = [...this.archivedTodos, todo];
			this.lastArchivedTodos = [todo];
			this.showToast('Task archived', 'info');
		}
	}

	undoArchive() {
		if (this.lastArchivedTodos.length > 0) {
			const count = this.lastArchivedTodos.length;
			for (const todo of this.lastArchivedTodos) {
				const idx = this.archivedTodos.findIndex((t) => t.id === todo.id);
				if (idx !== -1) {
					const [restored] = this.archivedTodos.splice(idx, 1);
					this.todos = [...this.todos, restored];
				}
			}
			this.lastArchivedTodos = [];
			this.showToast(`${count} task${count > 1 ? 's' : ''} restored`, 'success');
		}
	}

	undoComplete() {
		if (this.lastCompletedTodos.length > 0) {
			const count = this.lastCompletedTodos.length;
			this.todos = this.todos.map((t) => {
				const undone = this.lastCompletedTodos.find((u) => u.id === t.id);
				if (undone) {
					const updated = { ...t, completed: false };
					delete updated.completedAt;
					return updated;
				}
				return t;
			});
			this.lastCompletedTodos = [];
			this.showToast(`${count} task${count > 1 ? 's' : ''} reverted`, 'success');
		}
	}

	/**
	 * @param {number} id
	 */
	restoreTodo(id) {
		const index = this.archivedTodos.findIndex((t) => t.id === id);
		if (index !== -1) {
			const [todo] = this.archivedTodos.splice(index, 1);
			this.todos = [...this.todos, todo];
			this.showToast('Task restored', 'success');
		}
	}

	/**
	 * @param {number} id
	 */
	permanentDeleteTodo(id) {
		const index = this.archivedTodos.findIndex((t) => t.id === id);
		if (index !== -1) {
			this.archivedTodos.splice(index, 1);
			this.showToast('Task permanently deleted', 'info');
		}
	}

	archiveSelected() {
		const count = this.selectedTodos.size;
		const archived = this.todos.filter((t) => this.selectedTodos.has(t.id));
		this.lastArchivedTodos = archived;
		this.todos = this.todos.filter((t) => !this.selectedTodos.has(t.id));
		this.archivedTodos = [...this.archivedTodos, ...archived];
		this.showToast(`${count} tasks archived`, 'info');
		this.selectedTodos = new SvelteSet();
		this.selectMode = false;
	}

	/**
	 * @param {number} id
	 */
	toggleTodo(id) {
		const todo = this.todos.find((t) => t.id === id);
		if (todo) {
			const wasCompleted = todo.completed;
			todo.completed = !todo.completed;
			// Track completion timestamp for analytics
			if (todo.completed) {
				todo.completedAt = new Date().toISOString();
			} else {
				delete todo.completedAt;
			}
			// Recurring task: create new instance with updated due date
			if (!wasCompleted && todo.completed && todo.recurring) {
				const copy = this._createRecurringCopy(todo);
				if (copy) {
					this.todos.push(copy);
				}
			}
		}
	}

	/**
	 * Toggle a tag on a todo (add if absent, remove if present).
	 * @param {number} id
	 * @param {string} tag
	 */
	toggleTag(id, tag) {
		const todo = this.todos.find((t) => t.id === id);
		if (todo) {
			const tags = todo.tags || [];
			if (tags.includes(tag)) {
				todo.tags = tags.filter((t) => t !== tag);
			} else {
				todo.tags = [...tags, tag];
			}
		}
	}

	// ── Batch operations ──

	/**
	 * @param {number} id
	 */
	toggleSelect(id) {
		if (this.selectedTodos.has(id)) {
			this.selectedTodos.delete(id);
		} else {
			this.selectedTodos.add(id);
		}
	}

	selectAll() {
		this.selectedTodos = new SvelteSet(this.filteredTodos.map((t) => t.id));
	}

	deselectAll() {
		this.selectedTodos = new SvelteSet();
	}

	// ── Archived select mode ──

	/**
	 * @param {number} id
	 */
	toggleArchivedSelect(id) {
		if (this.selectedArchived.has(id)) {
			this.selectedArchived.delete(id);
		} else {
			this.selectedArchived.add(id);
		}
	}

	selectAllArchived() {
		this.selectedArchived = new SvelteSet(this.archivedTodos.map((t) => t.id));
	}

	deselectAllArchived() {
		this.selectedArchived = new SvelteSet();
	}

	restoreSelectedArchived() {
		const count = this.selectedArchived.size;
		if (count === 0) return;
		const toRestore = this.archivedTodos.filter((t) => this.selectedArchived.has(t.id));
		this.todos = [...this.todos, ...toRestore];
		this.archivedTodos = this.archivedTodos.filter((t) => !this.selectedArchived.has(t.id));
		this.showToast(`${count} task${count > 1 ? 's' : ''} restored`, 'success');
		this.selectedArchived = new SvelteSet();
		this.archivedSelectMode = false;
	}

	permanentDeleteSelectedArchived() {
		const count = this.selectedArchived.size;
		if (count === 0) return;
		this.archivedTodos = this.archivedTodos.filter((t) => !this.selectedArchived.has(t.id));
		this.showToast(`${count} task${count > 1 ? 's' : ''} permanently deleted`, 'info');
		this.selectedArchived = new SvelteSet();
		this.archivedSelectMode = false;
	}

	/**
	 * Create a new todo copy for a recurring task (with the next due date).
	 * Returns the new todo object, or null if the task is not recurring.
	 * @param {Todo} todo
	 * @returns {Todo|null}
	 */
	_createRecurringCopy(todo) {
		if (!todo.recurring) return null;
		const newDueDate = this.getNextDueDate(todo.dueDate, todo.recurring);
		return {
			id: this.nextId++,
			title: todo.title,
			description: todo.description || '',
			dueDate: newDueDate,
			priority: todo.priority,
			category: todo.category || '',
			tags: todo.tags || [],
			recurring: todo.recurring,
			subtasks: todo.subtasks || [],
			completed: false,
			createdAt: new Date().toISOString()
		};
	}

	completeSelected() {
		const count = this.selectedTodos.size;
		this.lastCompletedTodos = this.todos.filter((t) => this.selectedTodos.has(t.id));
		// Mark selected todos as completed
		this.todos = this.todos.map((t) =>
			this.selectedTodos.has(t.id)
				? { ...t, completed: true, completedAt: new Date().toISOString() }
				: t
		);
		// Create recurring copies for any recurring tasks that were just completed
		// (skip already-completed todos so double-clicking doesn't spawn duplicates)
		const recurringCopies = [];
		for (const todo of this.lastCompletedTodos) {
			if (todo.completed) continue;
			const copy = this._createRecurringCopy(todo);
			if (copy) recurringCopies.push(copy);
		}
		if (recurringCopies.length > 0) {
			this.todos = [...this.todos, ...recurringCopies];
		}
		this.showToast(`${count} tasks completed`, 'info');
		this.selectedTodos = new SvelteSet();
		this.selectMode = false;
	}

	// ── Category management ──

	/**
	 * @param {string} cat
	 */
	setFilterCategory(cat) {
		if (cat) {
			this.filterCategory = this.filterCategory === cat ? '' : cat;
		} else {
			this.filterCategory = '';
		}
	}

	clearFilters() {
		this.filterText = '';
		this.filterStatus = 'all';
		this.filterCategory = '';
		this.sortBy = 'manual';
		this.filterTags = [];
		this.filterPriority = 'all';
		this.filterDateFrom = '';
		this.filterDateTo = '';
	}

	addCategory() {
		const name = this.newCategoryName.trim();
		if (name && !this.categories.includes(name)) {
			this.categories = [...this.categories, name];
			const colors = [
				'#ef4444',
				'#f59e0b',
				'#06b6d4',
				'#ec4899',
				'#84cc16',
				'#14b8a6',
				'#f97316',
				'#8b5cf6'
			];
			const used = Object.values(this.categoryColors);
			const avail = colors.find((c) => !used.includes(c));
			this.categoryColors = { ...this.categoryColors, [name]: avail || '#64748b' };
			this.newCategoryName = '';
			this.showAddCategory = false;
		}
	}

	// ── Tag management ──

	_getRandomTagColor() {
		const colors = [
			'#ef4444',
			'#f59e0b',
			'#06b6d4',
			'#ec4899',
			'#84cc16',
			'#14b8a6',
			'#f97316',
			'#8b5cf6',
			'#6366f1'
		];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	// ── Drag and drop ──

	_cleanupDragGhost() {
		if (this._dragGhost && this._dragGhost.parentNode) {
			this._dragGhost.parentNode.removeChild(this._dragGhost);
		}
		this._dragGhost = null;
	}

	/**
	 * @param {DragEvent} e
	 * @param {number} id
	 */
	handleDragStart(e, id) {
		this.draggedId = id;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', String(id));

		// Custom drag ghost image
		const todo = this.todos.find((t) => t.id === id);
		if (todo) {
			this._cleanupDragGhost();
			const ghost = document.createElement('div');
			ghost.textContent = todo.title;
			ghost.style.cssText =
				'position:absolute;top:-9999px;left:-9999px;padding:6px 14px;' +
				'background:var(--card-bg,#ffffff);border:2px solid var(--btn-primary,#2563eb);' +
				"border-radius:8px;font-family:'Outfit',sans-serif;font-size:13px;" +
				'font-weight:600;color:var(--text,#1f2937);' +
				'box-shadow:0 4px 16px rgba(37,99,235,0.3);white-space:nowrap;';
			document.body.appendChild(ghost);
			this._dragGhost = ghost;
			e.dataTransfer.setDragImage(ghost, 10, 10);
		}
	}

	handleDragEnd() {
		this._cleanupDragGhost();
		this.draggedId = null;
		this.dragOverId = null;
		this.dragIndicatorPos = null;
		this.dragTargetPill = null;
		this.dragTargetValue = '';
	}

	/**
	 * @param {DragEvent} e
	 * @param {number} id
	 */
	handleDragOver(e, id) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		if (this.draggedId !== id) {
			this.dragOverId = id;

			const target = /** @type {Element} */ (e.currentTarget);
			const rect = target.getBoundingClientRect();
			const y = e.clientY - rect.top;
			this.dragIndicatorPos = y < rect.height / 2 ? 'before' : 'after';
		}
	}

	handleDragLeave() {
		this.dragOverId = null;
		this.dragIndicatorPos = null;
	}

	/**
	 * @param {DragEvent} e
	 * @param {number} targetId
	 */
	handleDrop(e, targetId) {
		e.preventDefault();
		const draggedId = this.draggedId;
		const indicator = this.dragIndicatorPos;

		this.dragOverId = null;
		this.dragIndicatorPos = null;

		if (draggedId === null || draggedId === targetId) return;

		const fromIdx = this.todos.findIndex((t) => t.id === draggedId);
		let toIdx = this.todos.findIndex((t) => t.id === targetId);

		if (fromIdx === -1 || toIdx === -1) return;

		// Remove dragged item
		const [item] = this.todos.splice(fromIdx, 1);

		// Adjust toIdx if removal shifted it
		if (fromIdx < toIdx) toIdx--;

		// Insert at target position based on indicator
		if (indicator === 'after') toIdx++;

		this.todos.splice(toIdx, 0, item);
		this.draggedId = null;
	}

	// ── Pill drag-and-drop (for category/tag assignment) ──

	/**
	 * @param {DragEvent} e
	 * @param {'category'|'tag'} type
	 * @param {string} value
	 */
	handlePillDragOver(e, type, value) {
		if (this.sortBy !== 'manual' || this.draggedId === null) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		this.dragTargetPill = type;
		this.dragTargetValue = value;
	}

	handlePillDragLeave() {
		this.dragTargetPill = null;
		this.dragTargetValue = '';
	}

	/**
	 * @param {DragEvent} e
	 * @param {'category'|'tag'} type
	 * @param {string} value
	 */
	handlePillDrop(e, type, value) {
		e.preventDefault();
		if (this.draggedId === null) return;
		if (type === 'category') {
			this.assignCategory(this.draggedId, value);
		} else if (type === 'tag') {
			this.assignTag(this.draggedId, value);
		}
		this.dragTargetPill = null;
		this.dragTargetValue = '';
		// draggedId will be cleared by handleDragEnd on the source element
	}

	// ── Recurrence ──

	/**
	 * @param {string} currentDate
	 * @param {string} recurring
	 * @returns {string}
	 */
	getNextDueDate(currentDate, recurring) {
		return getNextDueDate(currentDate, recurring);
	}

	// ── Upcoming due tasks computation ──

	/**
	 * Compute tasks due within the next 2 days (not completed), sorted by date.
	 * @param {Todo[]} todos
	 * @returns {Todo[]}
	 */
	_computeUpcomingDue(todos) {
		return computeUpcomingDue(todos);
	}

	// ── Notifications ──

	/**
	 * Request notification permission from the browser.
	 * Sets the `requestedNotification` flag and updates `notificationsEnabled`.
	 */
	requestNotificationPermission() {
		this.requestedNotification = true;
		if (typeof window === 'undefined' || !('Notification' in window)) return;
		if (Notification.permission === 'granted') {
			this.notificationsEnabled = true;
			return;
		}
		if (Notification.permission === 'denied') {
			this.notificationsEnabled = false;
			return;
		}
		// 'default' — show the browser prompt
		Notification.requestPermission().then((perm) => {
			this.notificationsEnabled = perm === 'granted';
			if (perm === 'granted') {
				this.notifyDueTasks();
			}
		});
	}

	/**
	 * Send browser notifications for tasks due today and overdue tasks.
	 * Only fires if permission is already granted.
	 */
	notifyDueTasks() {
		if (typeof window === 'undefined' || !('Notification' in window)) return;
		if (Notification.permission !== 'granted') return;

		const today = localDateStr();
		const dueToday = this.todos.filter((t) => !t.completed && t.dueDate === today);
		const overdue = this.todos.filter((t) => !t.completed && t.dueDate && t.dueDate < today);

		if (dueToday.length > 0) {
			new Notification('Tasks Due Today', {
				body: `You have ${dueToday.length} task${dueToday.length === 1 ? '' : 's'} due today:\n${dueToday.map((t) => '• ' + t.title).join('\n')}`
			});
		}
		if (overdue.length > 0) {
			new Notification('Overdue Tasks', {
				body: `You have ${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}:\n${overdue.map((t) => '• ' + t.title).join('\n')}`
			});
		}
	}

	// ── Notifications ──

	/**
	 * @param {string} message
	 * @param {'success'|'info'|'warning'} type
	 */
	showToast(message, type = 'info') {
		this.toast = { show: true, message, type };
		const duration = type === 'info' ? (message.includes('deleted') ? 4000 : 3000) : 2000;
		setTimeout(() => {
			this.toast = { ...this.toast, show: false };
		}, duration);
	}

	// ── Keyboard shortcut ──

	/**
	 * @param {KeyboardEvent} e
	 */
	handleKeydown(e) {
		if (e.key === 'Escape') {
			if (this.selectMode) {
				this.selectMode = false;
				this.selectedTodos = new SvelteSet();
			}
			if (this.archivedSelectMode) {
				this.archivedSelectMode = false;
				this.selectedArchived = new SvelteSet();
			}
		}
	}

	// ── Cross-tab storage sync ──

	/**
	 * Handle storage events from other tabs.
	 * @param {StorageEvent} e
	 */
	_handleStorageChange(e) {
		if (e.key === 'todos') {
			const todos = storageGet('todos');
			if (todos && Array.isArray(todos)) {
				this.todos = todos;
				this.nextId = Math.max(...todos.map((t) => t.id)) + 1;
			}
		} else if (e.key === 'archivedTodos') {
			const archived = storageGet('archivedTodos');
			if (archived && Array.isArray(archived)) {
				this.archivedTodos = archived;
			}
		} else if (e.key === 'darkMode') {
			const dm = storageGet('darkMode');
			if (dm !== null) {
				this.darkMode = dm;
			}
		}
	}

	// ── Import / Export ──

	/**
	 * Export todos and archived todos as JSON string.
	 * @returns {string} JSON string containing todos and archivedTodos
	 */
	exportTodos() {
		return JSON.stringify(
			{
				todos: this.todos,
				archivedTodos: this.archivedTodos,
				exportedAt: new Date().toISOString()
			},
			null,
			2
		);
	}

	/**
	 * Import todos from JSON string.
	 * @param {string} json - JSON string containing todos and archivedTodos
	 * @returns {{success: boolean, message: string}} Result object
	 */
	importTodos(json) {
		try {
			const data = JSON.parse(json);
			if (!data || typeof data !== 'object') {
				return { success: false, message: 'Invalid import format' };
			}

			let importedCount = 0;

			// Import todos if present and valid
			if (Array.isArray(data.todos)) {
				// Validate and filter valid todos
				const validTodos = data.todos.filter((t) => t && t.id && t.title);
				if (validTodos.length > 0) {
					// Collect all existing IDs (from both todos and archived)
					const existingIds = new Set(this.todos.map((t) => t.id));
					const existingArchivedIds = new Set(this.archivedTodos.map((t) => t.id));

					// Process each todo and assign new IDs for conflicts
					const adjustedNewTodos = validTodos.map((t) => {
						let newId = t.id;
						// Check both todos and archived for conflicts
						while (existingIds.has(newId) || existingArchivedIds.has(newId)) {
							newId = this.nextId++;
						}
						existingIds.add(newId);
						return { ...t, id: newId };
					});

					this.todos = [...this.todos, ...adjustedNewTodos];
					importedCount += adjustedNewTodos.length;
				}
			}

			// Import archived todos if present and valid
			if (Array.isArray(data.archivedTodos)) {
				const validArchived = data.archivedTodos.filter((t) => t && t.id && t.title);
				if (validArchived.length > 0) {
					const existingIds = new Set(this.todos.map((t) => t.id));
					const existingArchivedIds = new Set(this.archivedTodos.map((t) => t.id));

					const adjustedArchived = validArchived.map((t) => {
						let newId = t.id;
						while (existingIds.has(newId) || existingArchivedIds.has(newId)) {
							newId = this.nextId++;
						}
						existingIds.add(newId);
						return { ...t, id: newId };
					});

					this.archivedTodos = [...this.archivedTodos, ...adjustedArchived];
					importedCount += adjustedArchived.length;
				}
			}

			// Return error if nothing was imported
			if (importedCount === 0) {
				return { success: false, message: 'No valid tasks found in import file' };
			}

			return {
				success: true,
				message: `Successfully imported ${importedCount} tasks`
			};
		} catch (error) {
			return {
				success: false,
				message: `Import failed: ${error.message}`
			};
		}
	}
}

// ── Context (type-safe via createContext) ──

/** @typedef {InstanceType<typeof TodoStore>} TodoStoreType */

export const [getTodoStore, setTodoStore] = createContext /** @type {TodoStoreType} */();

/**
 * Factory function to create a new TodoStore instance and set it in context.
 * @returns {TodoStoreType}
 */
export function createTodoStore() {
	const store = new TodoStore();
	setTodoStore(store);
	return store;
}

// ── Export for testing ──
export { TodoStore };
