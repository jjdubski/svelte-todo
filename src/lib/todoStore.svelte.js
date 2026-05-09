import { createContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { storageGet, storageSet } from '$lib/storage.js';

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

	// ── Form state ──
	newTitle = $state('');
	newDescription = $state('');
	newDueDate = $state('');
	newPriority = $state('medium');
	newCategory = $state('');
	newTags = $state([]);
	newCustomTag = $state('');
	newRecurring = $state('');
	newCategoryName = $state('');
	showAddCategory = $state(false);
	showForm = $state(true);
	selectedTemplate = $state('None');

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

	// ── Undo archive ──
	/** @type {{id: number}|null} */
	lastArchivedTodo = $state(null);

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

		// Effect: template detection — unset template if user modified fields
		$effect(() => {
			if (this.selectedTemplate !== 'None') {
				const t = this.templates.find((t) => t.name === this.selectedTemplate);
				if (t) {
					const hasChanges =
						this.newTitle !== t.title ||
						this.newDescription !== t.description ||
						this.newDueDate !== t.dueDate ||
						this.newPriority !== t.priority ||
						this.newCategory !== t.category ||
						JSON.stringify(this.newTags) !== JSON.stringify(t.tags) ||
						this.newRecurring !== '';
					if (hasChanges) {
						this.selectedTemplate = 'None';
					}
				}
			}
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
		const saved = storageGet('todos');
		if (saved && Array.isArray(saved) && saved.length > 0) {
			this.todos = saved;
			this.nextId = Math.max(...saved.map((t) => t.id)) + 1;
		}
		const archivedSaved = storageGet('archivedTodos');
		if (archivedSaved && Array.isArray(archivedSaved)) {
			this.archivedTodos = archivedSaved;
		}
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
		if (!query) return true;
		const q = query.toLowerCase();
		const t = text.toLowerCase();
		let qi = 0;
		for (let ti = 0; ti < t.length && qi < q.length; ti++) {
			if (t[ti] === q[qi]) qi++;
		}
		return qi === q.length;
	}

	// ── Stats computation ──

	/**
	 * @param {Todo[]} todos
	 * @returns {Stats}
	 */
	_computeStats(todos) {
		const today = new Date().toISOString().split('T')[0];
		const active = todos.filter((t) => !t.completed).length;
		const completed = todos.filter((t) => t.completed).length;
		const overdue = todos.filter((t) => !t.completed && t.dueDate && t.dueDate < today).length;
		return { active, completed, overdue, total: todos.length };
	}

	/**
	 * Count consecutive days (from today backward) with at least one completion.
	 * @param {Todo[]} todos
	 * @returns {number}
	 */
	_computeStreak(todos) {
		const completed = todos.filter((t) => t.completed && t.completedAt);
		if (completed.length === 0) return 0;
		const completionDates = new Set(completed.map((t) => t.completedAt.split('T')[0]));
		let streak = 0;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		for (let i = 0; ; i++) {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			const dateStr = d.toISOString().split('T')[0];
			if (completionDates.has(dateStr)) {
				streak++;
			} else {
				break;
			}
		}
		return streak;
	}

	/**
	 * Count completions per day-of-week for the current week (Mon-Sun).
	 * @param {Todo[]} todos
	 * @returns {Record<string,number>}
	 */
	_computeCompletionsByDay(todos) {
		const completed = todos.filter((t) => t.completed && t.completedAt);
		const now = new Date();
		const dayOfWeek = now.getDay();
		// Monday = 1, get the diff to reach Monday
		const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
		const monday = new Date(now);
		monday.setDate(now.getDate() + diffToMonday);
		monday.setHours(0, 0, 0, 0);
		const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const counts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
		for (const todo of completed) {
			const completedDate = new Date(todo.completedAt.split('T')[0] + 'T00:00:00');
			if (completedDate >= monday) {
				const day = completedDate.getDay();
				counts[labels[day]]++;
			}
		}
		return counts;
	}

	/**
	 * Count tasks by priority level.
	 * @param {Todo[]} todos
	 * @returns {{high:number, medium:number, low:number}}
	 */
	_computePriorityDistribution(todos) {
		const result = { high: 0, medium: 0, low: 0 };
		for (const t of todos) {
			const p = t.priority || 'medium';
			if (p in result) result[p]++;
		}
		return result;
	}

	/**
	 * Count tasks by category.
	 * @param {Todo[]} todos
	 * @returns {Record<string,number>}
	 */
	_computeCategoryBreakdown(todos) {
		const result = {};
		for (const t of todos) {
			if (t.category) {
				result[t.category] = (result[t.category] || 0) + 1;
			}
		}
		return result;
	}

	/**
	 * Get array of overdue (active past-due) tasks.
	 * @param {Todo[]} todos
	 * @returns {Todo[]}
	 */
	_computeOverdueTasks(todos) {
		const today = new Date().toISOString().split('T')[0];
		return todos.filter((t) => !t.completed && t.dueDate && t.dueDate < today);
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
	 * Add a task from form state. Subtasks are passed in from form component (not stored).
	 * @param {Array<{text:string, done:boolean}>} [subtasks]
	 */
	addFromForm(subtasks) {
		if (this.newTitle.trim()) {
			this.addTodo(
				this.newTitle.trim(),
				this.newDescription.trim(),
				this.newDueDate,
				this.newPriority,
				this.newCategory,
				this.newTags,
				this.newRecurring,
				subtasks
			);
			this.resetForm();
		}
	}

	resetForm() {
		this.newTitle = '';
		this.newDescription = '';
		this.newDueDate = '';
		this.newPriority = 'medium';
		this.newCategory = '';
		this.newTags = [];
		this.newRecurring = '';
		this.selectedTemplate = 'None';
	}

	applyTemplate(template) {
		this.selectedTemplate = template.name;
		this.newTitle = template.title;
		this.newDescription = template.description;
		this.newDueDate = template.dueDate;
		this.newPriority = template.priority;
		this.newCategory = template.category;
		this.newTags = [...template.tags];
		this.newRecurring = '';
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
			this.lastArchivedTodo = { id };
			this.showToast('Task archived', 'info');
		}
	}

	undoArchive() {
		if (this.lastArchivedTodo) {
			this.restoreTodo(this.lastArchivedTodo.id);
			this.lastArchivedTodo = null;
			this.showToast('Task restore undone', 'info');
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

	deleteSelected() {
		const count = this.selectedTodos.size;
		const archived = this.todos.filter((t) => this.selectedTodos.has(t.id));
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
				const newDueDate = this.getNextDueDate(todo.dueDate, todo.recurring);
				this.addTodo(
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

	completeSelected() {
		const count = this.selectedTodos.size;
		this.todos = this.todos.map((t) =>
			this.selectedTodos.has(t.id) ? { ...t, completed: true } : t
		);
		this.showToast(`${count} tasks completed`, 'success');
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

	addCustomTag() {
		const tag = this.newCustomTag.trim().toLowerCase();
		if (tag && !this.newTags.includes(tag)) {
			this.newTags = [...this.newTags, tag];
			if (!this.availableTags.includes(tag)) {
				this.availableTags = [...this.availableTags, tag];
				this.tagColors = { ...this.tagColors, [tag]: this._getRandomTagColor() };
			}
		}
		this.newCustomTag = '';
	}

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
			// Compute indicator position (top or bottom half of the target)
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
		// Insert at target position — always place before the target (swap)
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
		if (!currentDate || !recurring) return '';
		const date = new Date(currentDate + 'T00:00:00');
		switch (recurring) {
			case 'daily':
				date.setDate(date.getDate() + 1);
				break;
			case 'weekly':
				date.setDate(date.getDate() + 7);
				break;
			case 'monthly':
				date.setMonth(date.getMonth() + 1);
				break;
		}
		return date.toISOString().split('T')[0];
	}

	// ── Upcoming due tasks computation ──

	/**
	 * Compute tasks due within the next 2 days (not completed), sorted by date.
	 * @param {Todo[]} todos
	 * @returns {Todo[]}
	 */
	_computeUpcomingDue(todos) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStr = today.toISOString().split('T')[0];
		const twoDaysLater = new Date(today);
		twoDaysLater.setDate(twoDaysLater.getDate() + 2);
		const twoDaysStr = twoDaysLater.toISOString().split('T')[0];

		return todos
			.filter((t) => !t.completed && t.dueDate && t.dueDate >= todayStr && t.dueDate <= twoDaysStr)
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
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

		const today = new Date().toISOString().split('T')[0];
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

	// ── Quick Add from URL Params ──

	/**
	 * Apply URL query parameters to pre-fill the add form.
	 * @param {{title?: string, desc?: string, due?: string, priority?: string, category?: string, tags?: string}} params
	 */
	applyQuickAdd(params) {
		if (params.title !== undefined) this.newTitle = params.title;
		if (params.desc !== undefined) this.newDescription = params.desc;
		if (params.due !== undefined) this.newDueDate = params.due;
		if (params.priority !== undefined) {
			if (['high', 'medium', 'low'].includes(params.priority)) {
				this.newPriority = params.priority;
			}
		}
		if (params.category !== undefined) this.newCategory = params.category;
		if (params.tags !== undefined) {
			this.newTags = params.tags
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean);
		}
		this.showForm = true;
		// Focus the title input after the DOM updates
		setTimeout(() => document.getElementById('title-input')?.focus(), 50);
	}

	// ── Toast ──

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
		if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
			e.preventDefault();
			this.showForm = true;
			setTimeout(() => document.getElementById('title-input')?.focus(), 50);
		}
		if (e.key === 'Escape') {
			if (this.selectMode) {
				this.selectMode = false;
				this.selectedTodos = new SvelteSet();
			}
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
