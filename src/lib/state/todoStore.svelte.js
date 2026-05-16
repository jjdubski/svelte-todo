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
import { lightTap } from '$lib/utils/haptics.js';
import { parseQuery, stringifyQuery } from '$lib/utils/queryParser.js';

/**
 * @typedef {Object} Todo
 * @property {string} id
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

/**
 * Generate a UUID v4 string using the Web Crypto API.
 * @returns {string}
 */
function _generateId() {
	return crypto.randomUUID();
}

/**
 * Deduplicate an array of todos by ID, keeping the first occurrence.
 * @param {Todo[]} todos
 * @returns {Todo[]}
 */
function _dedupTodos(todos) {
	const seen = new Set();
	return todos.filter((t) => {
		if (seen.has(t.id)) return false;
		seen.add(t.id);
		return true;
	});
}

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function _deepClone(value) {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value));
}

const HISTORY_STACK_LIMIT = 50;

/**
 * @param {string} value
 * @returns {string}
 */
function _normalizeDateTokenValue(value) {
	const raw = (value || '').trim();
	if (!raw) return '';

	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

	const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
	if (slashMatch) {
		const month = slashMatch[1].padStart(2, '0');
		const day = slashMatch[2].padStart(2, '0');
		const year = slashMatch[3];
		return `${year}-${month}-${day}`;
	}

	return '';
}

/**
 * @param {string} value
 * @returns {'all'|'active'|'done'}
 */
function _normalizeStatusTokenValue(value) {
	const normalized = (value || '').trim().toLowerCase();
	if (normalized === 'active') return 'active';
	if (normalized === 'done' || normalized === 'completed') return 'done';
	if (normalized === 'all') return 'all';
	return 'all';
}

/**
 * @param {string} value
 * @returns {'manual'|'priority'|'date'|'alpha-asc'|'alpha-desc'|'category'}
 */
function _normalizeSortTokenValue(value) {
	const normalized = (value || '').trim().toLowerCase();
	if (normalized === 'priority') return 'priority';
	if (normalized === 'date') return 'date';
	if (normalized === 'alpha-asc' || normalized === 'a-z' || normalized === 'az') return 'alpha-asc';
	if (normalized === 'alpha-desc' || normalized === 'z-a' || normalized === 'za') return 'alpha-desc';
	if (normalized === 'category') return 'category';
	return 'manual';
}

class TodoStore {
	/** @type {boolean} */
	isLoading = $state(true);
	/** @type {boolean} */
	prefersReducedMotion = $state(false);

	// ── Notification state ──
	/** @type {boolean} */
	requestedNotification = $state(false);
	/** @type {boolean} */
	notificationsEnabled = $state(false);
	/** @type {boolean} */
	dueDateRemindersEnabled = $state(true);
	/** @type {boolean} */
	remindOverdueTasks = $state(true);
	/** @type {boolean} */
	remindTodayTasks = $state(true);

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
	categories = $state(['Work', 'Personal', 'Ideas', 'Other']);
	/** @type {Record<string,string>} */
	categoryColors = $state({
		Work: '#3b82f6',
		Personal: '#22c55e',
		Ideas: '#a855f7',
		Other: '#6b7280'
	});

	// ── Tags (app-defined defaults) ──
	/** @type {string[]} */
	availableTags = $state(['urgent', 'meeting', 'home', 'shopping', 'health', 'in-progress']);
	/** @type {string[]} */
	customTags = $state([]);
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
			title: 'Quarterly planning sync with ',
			description:
				'**Goal:** align on top priorities for this sprint\n*Prep:* review blockers and bring one solution idea\nReference: [Team agenda](https://example.com/agenda)',
			dueDate: '',
			priority: 'medium',
			category: 'Work',
			tags: ['meeting']
		},
		{
			name: 'Errand',
			title: 'Saturday essentials run',
			description: '- Buy pantry staples\n- Pick up household supplies\n- Drop off package returns',
			dueDate: '',
			priority: 'low',
			category: 'Personal',
			tags: ['shopping']
		},
		{
			name: 'Urgent',
			title: 'Critical blocker: resolve before EOD',
			description: '**Impact:** release timeline at risk\n*Next step:* identify owner and unblock immediately',
			dueDate: '',
			priority: 'high',
			category: 'Work',
			tags: ['urgent']
		},
		{
			name: 'Health',
			title: 'Idea lab: healthier weekly routine',
			description:
				'Brainstorm low-effort experiments to improve energy and focus:\n- 15-minute walk after lunch\n- Screen-free wind-down routine\n- Prep quick breakfasts on Sunday',
			dueDate: '',
			priority: 'medium',
			category: 'Ideas',
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
	filterDueKeyword = $state('');
	queryTokens = $state([]);
	queryPlainText = $state('');
	_isSyncingFilterText = false;
	_isApplyingQueryTokens = false;
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
	/** @type {Todo[]} */
	lastMovedTodos = $state([]);
	/** @type {Array<{completed: boolean, tags: string[]}>} */
	lastMovedStates = $state([]);
	_undoStack = $state([]);
	_redoStack = $state([]);

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
			this._syncUpdate(id, { category: todo.category });
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
			this._syncUpdate(id, { tags: todo.tags });
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

	// ── Auth store reference (set by layout after initialization) ──
	/** @type {import('./authStore.svelte.js').AuthStore|null} */
	_auth = null;

	constructor() {
		this._init();
		this._checkReducedMotion();

		// Storage event listener for cross-tab sync
		if (typeof window !== 'undefined') {
			window.addEventListener('storage', this._handleStorageChange.bind(this));
		}

		// Effect: recompute stats, upcoming due, and save todos + archivedTodos + custom tags
		$effect(() => {
			const t = this.todos;
			const a = this.archivedTodos;
			const ct = this.customTags;
			const tc = this.tagColors;
			this.stats = this._computeStats(t);
			this.upcomingDueTasks = this._computeUpcomingDue(t);
			this.streak = this._computeStreak([...t, ...a]);
			this.completionsByDay = this._computeCompletionsByDay([...t, ...a]);
			this.priorityDistribution = this._computePriorityDistribution(t);
			this.categoryBreakdown = this._computeCategoryBreakdown([...t, ...a]);
			this.overdueTasks = this._computeOverdueTasks(t);
			storageSet('todos', t);
			storageSet('archivedTodos', a);
			storageSet('customTags', ct);
			storageSet('tagColors', tc);
		});

		// Effect: recompute filteredTodos when filters/sort change
		$effect(() => {
			const todos = this.todos;
			const ft = this.filterText;

			if (!this._isSyncingFilterText) {
				const parsed = parseQuery(ft);
				this.queryTokens = parsed.tokens;
				this.queryPlainText = parsed.plainText;
				this._applyQueryTokens(parsed.tokens);
			}

			const textQuery = this.queryPlainText;
			const fs = this.filterStatus;
			const fc = this.filterCategory;
			const sb = this.sortBy;
			const fp = this.filterPriority;
			const ftags = this.filterTags;
			const fdf = this.filterDateFrom;
			const fdt = this.filterDateTo;

			this.filteredTodos = this._computeFiltered(todos, textQuery, fs, fc, sb, fp, ftags, fdf, fdt);

			// Compute active filter count
			let count = 0;
			if (textQuery) count++;
			if (fs !== 'all') count++;
			if (fc) count++;
			if (fp !== 'all') count++;
			if (ftags.length > 0) count++;
			if (this.filterDueKeyword) count++;
			if (fdf) count++;
			if (fdt) count++;
			this.activeFilterCount = count;
		});

		// Effect: when UI controls change, keep query tokens/text in sync
		$effect(() => {
			if (this._isApplyingQueryTokens) return;

			const fs = this.filterStatus;
			const fc = this.filterCategory;
			const sb = this.sortBy;
			const fp = this.filterPriority;
			const ftags = this.filterTags;
			const fdf = this.filterDateFrom;
			const fdt = this.filterDateTo;
			const dueKeyword = this.filterDueKeyword;
			const plainText = this.queryPlainText;

			const nextTokens = this._buildQueryTokensFromFilters(fs, fc, sb, fp, ftags, fdf, fdt, dueKeyword);
			const nextFilterText = stringifyQuery(nextTokens, plainText);

			this.queryTokens = nextTokens;
			if (nextFilterText !== this.filterText) {
				this._isSyncingFilterText = true;
				this.filterText = nextFilterText;
				this._isSyncingFilterText = false;
			}
		});

		// Effect: sync dark mode to DOM, localStorage, and server (when signed in)
		$effect(() => {
			const dm = this.darkMode;
			if (typeof document !== 'undefined') {
				document.documentElement.classList.toggle('dark', dm);
				document.documentElement.style.colorScheme = dm ? 'dark' : 'light';
			}
			storageSet('darkMode', dm);
			this._syncDarkMode(dm);
		});

		// Effect: persist + sync notification preferences
		$effect(() => {
			const dueDateRemindersEnabled = this.dueDateRemindersEnabled;
			const remindOverdueTasks = this.remindOverdueTasks;
			const remindTodayTasks = this.remindTodayTasks;

			storageSet('dueDateRemindersEnabled', dueDateRemindersEnabled);
			storageSet('remindOverdueTasks', remindOverdueTasks);
			storageSet('remindTodayTasks', remindTodayTasks);
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
		if (!this.dueDateRemindersEnabled) return;

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

		if (Array.isArray(saved) && saved.length > 0) {
			this.todos = _dedupTodos(saved);
		}

		if (Array.isArray(archivedSaved) && archivedSaved.length > 0) {
			this.archivedTodos = _dedupTodos(archivedSaved);
		}

		// Restore custom tags and tag colors from localStorage
		const savedCustomTags = storageGet('customTags');
		if (Array.isArray(savedCustomTags) && savedCustomTags.length > 0) {
			this.customTags = savedCustomTags;
			for (const tag of savedCustomTags) {
				if (!this.availableTags.includes(tag)) {
					this.availableTags = [...this.availableTags, tag];
				}
			}
		}
		const savedTagColors = storageGet('tagColors');
		if (savedTagColors && typeof savedTagColors === 'object' && !Array.isArray(savedTagColors)) {
			this.tagColors = { ...this.tagColors, ...savedTagColors };
		}

		this.darkMode = this._getInitialDarkMode();

		const savedDueDateRemindersEnabled = storageGet('dueDateRemindersEnabled');
		if (typeof savedDueDateRemindersEnabled === 'boolean') {
			this.dueDateRemindersEnabled = savedDueDateRemindersEnabled;
		}

		const savedRemindOverdueTasks = storageGet('remindOverdueTasks');
		if (typeof savedRemindOverdueTasks === 'boolean') {
			this.remindOverdueTasks = savedRemindOverdueTasks;
		}

		const savedRemindTodayTasks = storageGet('remindTodayTasks');
		if (typeof savedRemindTodayTasks === 'boolean') {
			this.remindTodayTasks = savedRemindTodayTasks;
		}

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
	 * @param {string} [filterDueKeyword]
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
		filterDateTo,
		filterDueKeyword
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
		const dueKeyword = filterDueKeyword ?? this.filterDueKeyword;

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
		if (dueKeyword === 'overdue') {
			const today = localDateStr();
			result = result.filter((t) => !t.completed && t.dueDate && t.dueDate < today);
		}

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

	/**
	 * @returns {{
	 * 	todos: Todo[],
	 * 	archivedTodos: Todo[],
	 * 	lastArchivedTodos: Todo[],
	 * 	lastCompletedTodos: Todo[],
	 * 	lastMovedTodos: Todo[],
	 * 	lastMovedStates: Array<{completed:boolean, tags:string[]}>
	 * }}
	 */
	_createHistorySnapshot() {
		return {
			todos: _deepClone(this.todos),
			archivedTodos: _deepClone(this.archivedTodos),
			lastArchivedTodos: _deepClone(this.lastArchivedTodos),
			lastCompletedTodos: _deepClone(this.lastCompletedTodos),
			lastMovedTodos: _deepClone(this.lastMovedTodos),
			lastMovedStates: _deepClone(this.lastMovedStates)
		};
	}

	/**
	 * @param {ReturnType<TodoStore['_createHistorySnapshot']>} snapshot
	 */
	_restoreHistorySnapshot(snapshot) {
		if (!snapshot) return;
		this.todos = _deepClone(snapshot.todos || []);
		this.archivedTodos = _deepClone(snapshot.archivedTodos || []);
		this.lastArchivedTodos = _deepClone(snapshot.lastArchivedTodos || []);
		this.lastCompletedTodos = _deepClone(snapshot.lastCompletedTodos || []);
		this.lastMovedTodos = _deepClone(snapshot.lastMovedTodos || []);
		this.lastMovedStates = _deepClone(snapshot.lastMovedStates || []);
	}

	/**
	 * @param {string} action
	 */
	_pushUndoSnapshot(action) {
		const entry = {
			action,
			snapshot: this._createHistorySnapshot(),
			timestamp: Date.now()
		};
		this._undoStack = [...this._undoStack, entry].slice(-HISTORY_STACK_LIMIT);
		this._redoStack = [];
	}

	undo() {
		if (this._undoStack.length === 0) return false;
		const entry = this._undoStack[this._undoStack.length - 1];
		const current = this._createHistorySnapshot();

		this._undoStack = this._undoStack.slice(0, -1);
		this._redoStack = [
			...this._redoStack,
			{ action: entry.action, snapshot: current, timestamp: Date.now() }
		].slice(-HISTORY_STACK_LIMIT);

		this._restoreHistorySnapshot(entry.snapshot);
		this.showToast(`Undid ${entry.action}`, 'success');
		return true;
	}

	redo() {
		if (this._redoStack.length === 0) return false;
		const entry = this._redoStack[this._redoStack.length - 1];
		const current = this._createHistorySnapshot();

		this._redoStack = this._redoStack.slice(0, -1);
		this._undoStack = [
			...this._undoStack,
			{ action: entry.action, snapshot: current, timestamp: Date.now() }
		].slice(-HISTORY_STACK_LIMIT);

		this._restoreHistorySnapshot(entry.snapshot);
		this.showToast(`Redid ${entry.action}`, 'success');
		return true;
	}

	/**
	 * @param {Array<{key:string, value:string}>} tokens
	 */
	_applyQueryTokens(tokens) {
		this._isApplyingQueryTokens = true;

		try {
			let nextFilterTags = [];
			let nextFilterPriority = 'all';
			let nextFilterStatus = 'all';
			let nextFilterCategory = '';
			let nextSortBy = 'manual';
			let dueMode = 'none';
			let dueDates = [];

			for (const token of tokens) {
				if (!token || !token.key) continue;
				const value = (token.value || '').trim();
				if (!value) continue;

				if (token.key === 'tag') {
					const normalizedTag = value.toLowerCase();
					if (!nextFilterTags.includes(normalizedTag)) {
						nextFilterTags = [...nextFilterTags, normalizedTag];
					}
					continue;
				}

				if (token.key === 'priority') {
					const priorityValue = value.toLowerCase();
					if (priorityValue === 'high' || priorityValue === 'medium' || priorityValue === 'low') {
						nextFilterPriority = priorityValue;
					}
					continue;
				}

				if (token.key === 'is') {
					nextFilterStatus = _normalizeStatusTokenValue(value);
					continue;
				}

				if (token.key === 'category') {
					const categoryMatch = this.categories.find((cat) => cat.toLowerCase() === value.toLowerCase());
					nextFilterCategory = categoryMatch || value;
					continue;
				}

				if (token.key === 'sort') {
					nextSortBy = _normalizeSortTokenValue(value);
					continue;
				}

				if (token.key === 'due') {
					if (value.toLowerCase() === 'overdue') {
						dueMode = 'overdue';
						dueDates = [];
						continue;
					}

					const normalizedDate = _normalizeDateTokenValue(value);
					if (!normalizedDate) continue;

					if (dueMode !== 'dates') {
						dueMode = 'dates';
						dueDates = [];
					}
					dueDates = [...dueDates, normalizedDate];
				}
			}

			let nextFilterDateFrom = '';
			let nextFilterDateTo = '';
			let nextFilterDueKeyword = '';

			if (dueMode === 'overdue') {
				nextFilterDueKeyword = 'overdue';
			} else if (dueMode === 'dates' && dueDates.length > 0) {
				const sortedDates = [...dueDates].sort();
				nextFilterDateFrom = sortedDates[0];
				nextFilterDateTo = sortedDates[sortedDates.length - 1];
			}

			const tagsAreEqual =
				this.filterTags.length === nextFilterTags.length &&
				this.filterTags.every((tag, idx) => tag === nextFilterTags[idx]);

			if (!tagsAreEqual) {
				this.filterTags = nextFilterTags;
			}
			if (this.filterPriority !== nextFilterPriority) {
				this.filterPriority = nextFilterPriority;
			}
			if (this.filterStatus !== nextFilterStatus) {
				this.filterStatus = nextFilterStatus;
			}
			if (this.filterCategory !== nextFilterCategory) {
				this.filterCategory = nextFilterCategory;
			}
			if (this.sortBy !== nextSortBy) {
				this.sortBy = nextSortBy;
			}
			if (this.filterDateFrom !== nextFilterDateFrom) {
				this.filterDateFrom = nextFilterDateFrom;
			}
			if (this.filterDateTo !== nextFilterDateTo) {
				this.filterDateTo = nextFilterDateTo;
			}
			if (this.filterDueKeyword !== nextFilterDueKeyword) {
				this.filterDueKeyword = nextFilterDueKeyword;
			}
		} finally {
			this._isApplyingQueryTokens = false;
		}
	}

	/**
	 * @param {string} filterStatus
	 * @param {string} filterCategory
	 * @param {string} sortBy
	 * @param {string} filterPriority
	 * @param {string[]} filterTags
	 * @param {string} filterDateFrom
	 * @param {string} filterDateTo
	 * @param {string} filterDueKeyword
	 * @returns {Array<{key:string, value:string}>}
	 */
	_buildQueryTokensFromFilters(
		filterStatus,
		filterCategory,
		sortBy,
		filterPriority,
		filterTags,
		filterDateFrom,
		filterDateTo,
		filterDueKeyword
	) {
		const tokens = [];

		for (const tag of filterTags || []) {
			if (tag) tokens.push({ key: 'tag', value: tag });
		}

		if (filterPriority && filterPriority !== 'all') {
			tokens.push({ key: 'priority', value: filterPriority });
		}

		if (filterStatus && filterStatus !== 'all') {
			tokens.push({ key: 'is', value: filterStatus });
		}

		if (filterDueKeyword === 'overdue') {
			tokens.push({ key: 'due', value: 'overdue' });
		} else {
			const from = filterDateFrom;
			const to = filterDateTo;
			if (from && to) {
				if (from === to) {
					tokens.push({ key: 'due', value: this._formatDateTokenValue(from) });
				} else {
					tokens.push({ key: 'due', value: this._formatDateTokenValue(from) });
					tokens.push({ key: 'due', value: this._formatDateTokenValue(to) });
				}
			} else if (from) {
				tokens.push({ key: 'due', value: this._formatDateTokenValue(from) });
			} else if (to) {
				tokens.push({ key: 'due', value: this._formatDateTokenValue(to) });
			}
		}

		if (filterCategory) {
			tokens.push({ key: 'category', value: filterCategory });
		}

		if (sortBy && sortBy !== 'manual') {
			tokens.push({ key: 'sort', value: sortBy });
		}

		return tokens;
	}

	/**
	 * @param {string} isoDate
	 * @returns {string}
	 */
	_formatDateTokenValue(isoDate) {
		const match = (isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) return isoDate;
		return `${match[2]}-${match[3]}-${match[1]}`;
	}

	// ── Auth store reference ──

	/**
	 * @param {import('./authStore.svelte.js').AuthStore} auth
	 */
	setAuthStore(auth) {
		this._auth = auth;
	}

	// ── Initial data load from server ──

	/**
	 * Fetch all user data from the server (todos, archived, custom tags, settings)
	 * and replace the current store state with server data.
	 * Called after authentication is confirmed for a non-guest user.
	 * Safe to call multiple times — respects loading state internally.
	 */
	async loadFromApi() {
		if (!this._auth?.isLoggedIn) return;
		try {
			const res = await fetch('/api/todos');
			if (res.ok) {
				const data = await res.json();
				// Replace local state with server data (deduped by ID)
				this.todos = Array.isArray(data.todos) ? _dedupTodos(data.todos) : [];
				this.archivedTodos = Array.isArray(data.archivedTodos) ? _dedupTodos(data.archivedTodos) : [];

				// Restore custom tags from server
				if (Array.isArray(data.customTags)) {
					this.customTags = data.customTags;
					for (const tag of data.customTags) {
						if (!this.availableTags.includes(tag)) {
							this.availableTags = [...this.availableTags, tag];
						}
					}
				}
				if (data.tagColors && typeof data.tagColors === 'object') {
					this.tagColors = { ...this.tagColors, ...data.tagColors };
				}
				if (typeof data.darkMode === 'boolean') {
					this.darkMode = data.darkMode;
				}

				const notificationSettings = data.settings?.notifications;
				if (notificationSettings && typeof notificationSettings === 'object') {
					if (typeof notificationSettings.dueDateRemindersEnabled === 'boolean') {
						this.dueDateRemindersEnabled = notificationSettings.dueDateRemindersEnabled;
					}
					if (typeof notificationSettings.remindOverdueTasks === 'boolean') {
						this.remindOverdueTasks = notificationSettings.remindOverdueTasks;
					}
					if (typeof notificationSettings.remindTodayTasks === 'boolean') {
						this.remindTodayTasks = notificationSettings.remindTodayTasks;
					}
				}
			}
		} catch (e) {
			console.warn('[todoStore] Failed to load data from API:', e);
		}
	}

	// ── API sync helpers ──

	/**
	 * Fire-and-forget API call to sync local changes to the server.
	 * Only fires when user is signed in. Errors show a toast.
	 * @param {string} method
	 * @param {string} url
	 * @param {object} [body]
	 */
	async _syncToApi(method, url, body) {
		if (!this._auth?.isLoggedIn) return;
		try {
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: body ? JSON.stringify(body) : undefined
			});
			// Session expired — redirect to login
			if (res.status === 401) {
				this._auth?.clearGuestMode();
				window.location.href = '/';
				return;
			}
			if (!res.ok) {
				this.showToast('Could not sync to cloud. Your changes are saved locally.', 'warning');
			}
		} catch {
			this.showToast('Could not sync to cloud. Your changes are saved locally.', 'warning');
		}
	}

	/**
	 * Sync a newly created todo.
	 * @param {Todo} todo
	 */
	_syncCreate(todo) {
		this._syncToApi('POST', '/api/todos', todo);
	}

	/**
	 * Sync an updated todo.
	 * @param {number} id
	 * @param {Partial<Todo>} updates
	 */
	_syncUpdate(id, updates) {
		this._syncToApi('PUT', `/api/todos/${id}`, updates);
	}

	/**
	 * Sync a deletion (archive) of a todo.
	 * @param {number} id
	 */
	_syncDelete(id) {
		this._syncToApi('DELETE', `/api/todos/${id}`);
	}

	/**
	 * Sync a batch operation (archive/restore).
	 * @param {string} url
	 * @param {number[]} ids
	 */
	_syncBatch(url, ids) {
		this._syncToApi('POST', url, { ids });
	}

	/**
	 * Sync a permanent deletion.
	 * @param {number} id
	 */
	_syncPermanentDelete(id) {
		this._syncToApi('POST', '/api/todos/permanent-delete', { id });
	}

	/**
	 * Sync a full import payload to the server.
	 * Fire-and-forget — only fires when signed in.
	 * @param {{ todos: Array, archivedTodos: Array, customTags: string[], tagColors: Record<string,string> }} data
	 */
	_syncImport(data) {
		this._syncToApi('POST', '/api/todos/import', data);
	}

	/**
	 * Sync the dark mode preference to the server.
	 * Fire-and-forget — only fires when signed in.
	 * @param {boolean} darkMode
	 */
	_syncDarkMode(darkMode) {
		if (!this._auth?.isLoggedIn) return;
		fetch('/api/todos/dark-mode', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ darkMode })
		}).catch(() => {
			// Silently ignore — dark mode is non-critical and saved locally
		});
	}

	/**
	 * Sync settings payload to the server.
	 * Uses a dedicated endpoint and intentionally fails silently.
	 * @param {Record<string, unknown>} settings
	 */
	_syncSettings(settings) {
		if (!this._auth?.isLoggedIn) return;
		fetch('/api/todos/settings', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ settings })
		}).catch(() => {
			// Silently ignore — settings are saved locally and can retry later
		});
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
		const todo = {
			id: _generateId(),
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
		};
		this.todos.push(todo);
		this._syncCreate(todo);
	}

	/**
	 * @param {number} id
	 * @param {Partial<Todo>} updates
	 */
	updateTodo(id, updates) {
		const todo = this.todos.find((t) => t.id === id);
		if (todo) {
			Object.assign(todo, updates);
			this._syncUpdate(id, updates);
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
			this._syncDelete(id);
		}
	}

	undoArchive() {
		if (this.lastArchivedTodos.length > 0) {
			const ids = this.lastArchivedTodos.map((t) => t.id);
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
			this._syncBatch('/api/todos/restore', ids);
		}
	}

	undoComplete() {
		if (this.lastCompletedTodos.length > 0) {
			const ids = this.lastCompletedTodos.map((t) => t.id);
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
			for (const id of ids) {
				this._syncUpdate(id, { completed: false });
			}
		}
	}

	undoMove() {
		if (this.lastMovedTodos.length > 0) {
			for (let i = 0; i < this.lastMovedTodos.length; i++) {
				const todo = this.lastMovedTodos[i];
				const state = this.lastMovedStates[i];
				const current = this.todos.find((t) => t.id === todo.id);
				if (current) {
					current.completed = state.completed;
					current.tags = [...state.tags];
					this._syncUpdate(todo.id, {
						completed: state.completed,
						tags: [...state.tags]
					});
				}
			}
			const count = this.lastMovedTodos.length;
			this.lastMovedTodos = [];
			this.lastMovedStates = [];
			this.showToast(`${count} task${count > 1 ? 's' : ''} move undone`, 'success');
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
			this._syncBatch('/api/todos/restore', [id]);
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
			this._syncPermanentDelete(id);
		}
	}

	archiveSelected() {
		const count = this.selectedTodos.size;
		const ids = [...this.selectedTodos];
		const archived = this.todos.filter((t) => this.selectedTodos.has(t.id));
		this.lastArchivedTodos = archived;
		this.todos = this.todos.filter((t) => !this.selectedTodos.has(t.id));
		this.archivedTodos = [...this.archivedTodos, ...archived];
		this.showToast(`${count} tasks archived`, 'info');
		this.selectedTodos = new SvelteSet();
		this.selectMode = false;
		this._syncBatch('/api/todos/archive', ids);
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
					this._syncCreate(copy);
				}
			}
			this._syncUpdate(id, { completed: todo.completed, completedAt: todo.completedAt });
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
			this._syncUpdate(id, { tags: todo.tags });
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
		const ids = [...this.selectedArchived];
		const toRestore = this.archivedTodos.filter((t) => this.selectedArchived.has(t.id));
		this.todos = [...this.todos, ...toRestore];
		this.archivedTodos = this.archivedTodos.filter((t) => !this.selectedArchived.has(t.id));
		this.showToast(`${count} task${count > 1 ? 's' : ''} restored`, 'success');
		this.selectedArchived = new SvelteSet();
		this.archivedSelectMode = false;
		this._syncBatch('/api/todos/restore', ids);
	}

	permanentDeleteSelectedArchived() {
		const count = this.selectedArchived.size;
		if (count === 0) return;
		const ids = [...this.selectedArchived];
		this.archivedTodos = this.archivedTodos.filter((t) => !this.selectedArchived.has(t.id));
		this.showToast(`${count} task${count > 1 ? 's' : ''} permanently deleted`, 'info');
		this.selectedArchived = new SvelteSet();
		this.archivedSelectMode = false;
		for (const id of ids) {
			this._syncPermanentDelete(id);
		}
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
			id: _generateId(),
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
		const ids = [...this.selectedTodos];
		this.lastCompletedTodos = this.todos.filter((t) => this.selectedTodos.has(t.id));
		// Mark selected todos as completed
		this.todos = this.todos.map((t) =>
			this.selectedTodos.has(t.id) ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
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
			for (const copy of recurringCopies) {
				this._syncCreate(copy);
			}
		}
		this.showToast(`${count} tasks completed`, 'info');
		this.selectedTodos = new SvelteSet();
		this.selectMode = false;
		for (const id of ids) {
			this._syncUpdate(id, { completed: true, completedAt: new Date().toISOString() });
		}
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
		if (!this.dueDateRemindersEnabled) return;
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
		if (!this.dueDateRemindersEnabled) return;

		const today = localDateStr();
		const dueToday = this.todos.filter((t) => !t.completed && t.dueDate === today);
		const overdue = this.todos.filter((t) => !t.completed && t.dueDate && t.dueDate < today);

		if (this.remindTodayTasks && dueToday.length > 0) {
			new Notification('Tasks Due Today', {
				body: `You have ${dueToday.length} task${dueToday.length === 1 ? '' : 's'} due today:\n${dueToday.map((t) => '• ' + t.title).join('\n')}`
			});
		}
		if (this.remindOverdueTasks && overdue.length > 0) {
			new Notification('Overdue Tasks', {
				body: `You have ${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}:\n${overdue.map((t) => '• ' + t.title).join('\n')}`
			});
		}
	}

	/**
	 * @param {boolean} enabled
	 */
	setDueDateRemindersEnabled(enabled) {
		this.dueDateRemindersEnabled = enabled;
		this._syncSettings({
			notifications: {
				dueDateRemindersEnabled: enabled
			}
		});
		if (enabled) {
			this.requestNotificationPermission();
		}
	}

	/**
	 * @param {boolean} enabled
	 */
	setRemindOverdueTasks(enabled) {
		this.remindOverdueTasks = enabled;
		this._syncSettings({
			notifications: {
				remindOverdueTasks: enabled
			}
		});
	}

	/**
	 * @param {boolean} enabled
	 */
	setRemindTodayTasks(enabled) {
		this.remindTodayTasks = enabled;
		this._syncSettings({
			notifications: {
				remindTodayTasks: enabled
			}
		});
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
				lightTap();
			}
			if (this.archivedSelectMode) {
				this.archivedSelectMode = false;
				this.selectedArchived = new SvelteSet();
				lightTap();
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
		} else if (e.key === 'dueDateRemindersEnabled') {
			const enabled = storageGet('dueDateRemindersEnabled');
			if (typeof enabled === 'boolean') {
				this.dueDateRemindersEnabled = enabled;
			}
		} else if (e.key === 'remindOverdueTasks') {
			const enabled = storageGet('remindOverdueTasks');
			if (typeof enabled === 'boolean') {
				this.remindOverdueTasks = enabled;
			}
		} else if (e.key === 'remindTodayTasks') {
			const enabled = storageGet('remindTodayTasks');
			if (typeof enabled === 'boolean') {
				this.remindTodayTasks = enabled;
			}
		}
	}

	// ── Import / Export ──

	/**
	 * Export todos, archived todos, custom tags, and tag colors as JSON string.
	 * @returns {string} JSON string containing all data
	 */
	exportTodos() {
		return JSON.stringify(
			{
				todos: this.todos,
				archivedTodos: this.archivedTodos,
				customTags: this.customTags,
				tagColors: this.tagColors,
				exportedAt: new Date().toISOString()
			},
			null,
			2
		);
	}

	/**
	 * Import todos from JSON string.
	 * Matching IDs are updated in-place; new items are added.
	 * Custom tags and colors are merged into local state.
	 * Synced to server if signed in.
	 * @param {string} json - JSON string containing todos, archivedTodos, customTags, tagColors
	 * @returns {{success: boolean, message: string}} Result object
	 */
	importTodos(json) {
		try {
			const data = JSON.parse(json);
			if (!data || typeof data !== 'object') {
				return { success: false, message: 'Invalid import format' };
			}

			let importedCount = 0;
			let updatedCount = 0;

			// Import todos
			if (Array.isArray(data.todos)) {
				const validTodos = data.todos.filter((t) => t && t.id && t.title);
				for (const todo of validTodos) {
					const idx = this.todos.findIndex((t) => t.id === todo.id);
					if (idx !== -1) {
						this.todos[idx] = { ...this.todos[idx], ...todo };
						updatedCount++;
					} else {
						this.todos = [...this.todos, todo];
						importedCount++;
					}
				}
			}

			// Import archived todos
			if (Array.isArray(data.archivedTodos)) {
				const validArchived = data.archivedTodos.filter((t) => t && t.id && t.title);
				for (const todo of validArchived) {
					const idx = this.archivedTodos.findIndex((t) => t.id === todo.id);
					if (idx !== -1) {
						this.archivedTodos[idx] = { ...this.archivedTodos[idx], ...todo };
						updatedCount++;
					} else {
						this.archivedTodos = [...this.archivedTodos, todo];
						importedCount++;
					}
				}
			}

			// Import custom tags + colors
			if (Array.isArray(data.customTags)) {
				for (const tag of data.customTags) {
					if (!this.availableTags.includes(tag)) {
						this.availableTags = [...this.availableTags, tag];
					}
					if (!this.customTags.includes(tag)) {
						this.customTags = [...this.customTags, tag];
					}
				}
			}
			if (data.tagColors && typeof data.tagColors === 'object') {
				for (const [tag, color] of Object.entries(data.tagColors)) {
					this.tagColors = { ...this.tagColors, [tag]: color };
				}
			}

			if (importedCount === 0 && updatedCount === 0) {
				return { success: false, message: 'No valid tasks found in import file' };
			}

			// Sync full import to server
			this._syncImport({
				todos: data.todos || [],
				archivedTodos: data.archivedTodos || [],
				customTags: data.customTags || [],
				tagColors: data.tagColors || {}
			});

			const parts = [];
			if (importedCount > 0) parts.push(`imported ${importedCount} tasks`);
			if (updatedCount > 0) parts.push(`updated ${updatedCount} tasks`);
			return {
				success: true,
				message: `Successfully ${parts.join(' and ')}`
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
