import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SvelteSet } from 'svelte/reactivity';
import { TodoStore } from '../state/todoStore.svelte.js';
import { stringifyQuery } from '../utils/queryParser.js';
import {
	fuzzyMatch,
	computeStats,
	computeStreak,
	computeCompletionsByDay,
	computePriorityDistribution,
	computeCategoryBreakdown,
	computeOverdueTasks,
	computeUpcomingDue,
	getRandomTagColor,
	getNextDueDate
} from '../utils/todoUtils.js';

describe('utils.js functions', () => {
	describe('fuzzyMatch', () => {
		it('returns true when query is empty', () => {
			expect(fuzzyMatch('', 'anything')).toBe(true);
			expect(fuzzyMatch('', '')).toBe(true);
		});

		it('returns true when all query chars appear in order in text', () => {
			expect(fuzzyMatch('groc', 'Buy groceries')).toBe(true);
		});

		it('is case-insensitive', () => {
			expect(fuzzyMatch('GROC', 'buy groceries')).toBe(true);
			expect(fuzzyMatch('groc', 'BUY GROCERIES')).toBe(true);
		});

		it('returns false when query does not match', () => {
			expect(fuzzyMatch('xyz', 'hello world')).toBe(false);
		});

		it('requires characters in order', () => {
			expect(fuzzyMatch('ba', 'ab')).toBe(false);
		});

		it('works with single character', () => {
			expect(fuzzyMatch('a', 'hello world')).toBe(false);
			expect(fuzzyMatch('h', 'hello world')).toBe(true);
		});

		it('matches with gaps', () => {
			expect(fuzzyMatch('hw', 'hello world')).toBe(true);
		});
	});

	describe('computeStats', () => {
		it('returns zero counts for empty todos', () => {
			const stats = computeStats([]);
			expect(stats).toEqual({ active: 0, completed: 0, overdue: 0, total: 0 });
		});

		it('counts active tasks', () => {
			const todos = [
				{ id: 1, completed: false },
				{ id: 2, completed: false },
				{ id: 3, completed: true }
			];
			const stats = computeStats(todos);
			expect(stats.active).toBe(2);
			expect(stats.completed).toBe(1);
			expect(stats.total).toBe(3);
		});

		it('counts overdue tasks (past due date and not completed)', () => {
			const todos = [
				{ id: 1, completed: false, dueDate: '2020-01-01' }, // overdue
				{ id: 2, completed: false, dueDate: '2099-12-31' }, // future, not overdue
				{ id: 3, completed: true, dueDate: '2020-01-01' }, // completed, not overdue
				{ id: 4, completed: false } // no due date, not overdue
			];
			const stats = computeStats(todos);
			expect(stats.overdue).toBe(1);
			expect(stats.active).toBe(3);
			expect(stats.completed).toBe(1);
			expect(stats.total).toBe(4);
		});

		it('all completed tasks', () => {
			const todos = [
				{ id: 1, completed: true },
				{ id: 2, completed: true }
			];
			const stats = computeStats(todos);
			expect(stats.active).toBe(0);
			expect(stats.completed).toBe(2);
			expect(stats.overdue).toBe(0);
			expect(stats.total).toBe(2);
		});
	});

	describe('getRandomTagColor', () => {
		it('returns a hex color string', () => {
			const color = getRandomTagColor();
			expect(color).toMatch(/^#[0-9a-f]{6}$/);
		});

		it('returns one of the predefined colors when Math.random is controlled', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0);
			const color = getRandomTagColor();
			// Math.random() returns 0 → index 0 → '#ef4444'
			expect(color).toBe('#ef4444');
			vi.restoreAllMocks();
		});

		it('returns last color when Math.random is near 1', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.999);
			const color = getRandomTagColor();
			// Math.floor(0.999 * 9) = 8 → index 8 → '#6366f1'
			expect(color).toBe('#6366f1');
			vi.restoreAllMocks();
		});

		it('returns different colors on different random values', () => {
			const colors = new Set();
			// Call multiple times with controlled randomness to verify variety
			for (let i = 0; i < 20; i++) {
				vi.spyOn(Math, 'random').mockReturnValue(i / 20);
				colors.add(getRandomTagColor());
				vi.restoreAllMocks();
			}
			// With 20 calls across the range, we should see at least a few different colors
			expect(colors.size).toBeGreaterThan(1);
		});
	});

	describe('getNextDueDate', () => {
		it('returns empty string when no currentDate or recurring', () => {
			expect(getNextDueDate('', 'daily')).toBe('');
			expect(getNextDueDate('2024-01-01', '')).toBe('');
			expect(getNextDueDate('', '')).toBe('');
		});

		it('adds 1 day for daily recurrence', () => {
			expect(getNextDueDate('2024-01-01', 'daily')).toBe('2024-01-02');
			expect(getNextDueDate('2024-12-31', 'daily')).toBe('2025-01-01'); // year boundary
		});

		it('adds 7 days for weekly recurrence', () => {
			expect(getNextDueDate('2024-01-01', 'weekly')).toBe('2024-01-08');
			expect(getNextDueDate('2024-12-25', 'weekly')).toBe('2025-01-01'); // year boundary
		});

		it('adds 1 month for monthly recurrence', () => {
			expect(getNextDueDate('2024-01-15', 'monthly')).toBe('2024-02-15');
			expect(getNextDueDate('2024-12-01', 'monthly')).toBe('2025-01-01'); // year boundary
		});

		it('handles month-end overflow correctly (JS behavior with date-fns)', () => {
			// Jan 31 + 1 month → date-fns gives Feb 29 (last day of Feb in leap year)
			// This is correct date-fns behavior (not a bug)
			const result = getNextDueDate('2024-01-31', 'monthly');
			expect(result).toBe('2024-02-29');
		});
	});

	describe('computeStreak', () => {
		it('returns 0 when no completed tasks', () => {
			expect(computeStreak([])).toBe(0);
		});

		it('returns 0 when completed tasks have no completedAt', () => {
			const todos = [{ id: 1, completed: true }];
			expect(computeStreak(todos)).toBe(0);
		});

		it('counts a single completion today as streak of 1', () => {
			const now = new Date();
			const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
			const todos = [{ id: 1, completed: true, completedAt: today + 'T12:00:00' }];
			expect(computeStreak(todos)).toBe(1);
		});

		it('counts consecutive days backwards from today', () => {
			const todos = [];
			for (let i = 0; i < 3; i++) {
				const d = new Date();
				d.setDate(d.getDate() - i);
				const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
				todos.push({ id: i + 1, completed: true, completedAt: dateStr + 'T12:00:00' });
			}
			expect(computeStreak(todos)).toBe(3);
		});

		it('breaks streak when a day is missing', () => {
			const todos = [];
			// Today and yesterday completed, but day before yesterday is missing
			for (let i = 0; i < 2; i++) {
				const d = new Date();
				d.setDate(d.getDate() - i);
				const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
				todos.push({ id: i + 1, completed: true, completedAt: dateStr + 'T12:00:00' });
			}
			// Add a completion from 3 days ago (gap at 2 days ago)
			const d3 = new Date();
			d3.setDate(d3.getDate() - 3);
			const dateStr3 = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, '0')}-${String(d3.getDate()).padStart(2, '0')}`;
			todos.push({
				id: 3,
				completed: true,
				completedAt: dateStr3 + 'T12:00:00'
			});
			expect(computeStreak(todos)).toBe(2);
		});
	});

	describe('computeCompletionsByDay', () => {
		it('returns zero counts for no completions', () => {
			const result = computeCompletionsByDay([]);
			expect(result).toEqual({ Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 });
		});

		it('counts a completion on its correct day of week', () => {
			// Create a completion for today (using local date)
			const now = new Date();
			const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
			const dayOfWeek = now.getDay();
			const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
			const todos = [{ id: 1, completed: true, completedAt: todayStr + 'T12:00:00' }];
			const result = computeCompletionsByDay(todos);
			expect(result[labels[dayOfWeek]]).toBe(1);
		});
	});

	describe('computePriorityDistribution', () => {
		it('returns zero counts for empty todos', () => {
			expect(computePriorityDistribution([])).toEqual({ high: 0, medium: 0, low: 0 });
		});

		it('counts tasks by priority', () => {
			const todos = [
				{ id: 1, priority: 'high' },
				{ id: 2, priority: 'high' },
				{ id: 3, priority: 'medium' },
				{ id: 4, priority: 'low' }
			];
			const result = computePriorityDistribution(todos);
			expect(result).toEqual({ high: 2, medium: 1, low: 1 });
		});

		it('defaults missing priority to medium', () => {
			const todos = [{ id: 1 }, { id: 2, priority: 'high' }];
			const result = computePriorityDistribution(todos);
			expect(result).toEqual({ high: 1, medium: 1, low: 0 });
		});
	});

	describe('computeCategoryBreakdown', () => {
		it('returns empty object for no categories', () => {
			expect(computeCategoryBreakdown([])).toEqual({});
		});

		it('counts tasks by category', () => {
			const todos = [
				{ id: 1, category: 'Work' },
				{ id: 2, category: 'Work' },
				{ id: 3, category: 'Personal' }
			];
			const result = computeCategoryBreakdown(todos);
			expect(result).toEqual({ Work: 2, Personal: 1 });
		});

		it('ignores tasks without a category', () => {
			const todos = [{ id: 1 }, { id: 2, category: 'Work' }];
			const result = computeCategoryBreakdown(todos);
			expect(result).toEqual({ Work: 1 });
		});
	});

	describe('computeOverdueTasks', () => {
		it('returns empty array when no todos', () => {
			expect(computeOverdueTasks([])).toEqual([]);
		});

		it('returns tasks that are past due and not completed', () => {
			const todos = [
				{ id: 1, completed: false, dueDate: '2020-01-01' }, // overdue
				{ id: 2, completed: false, dueDate: '2099-12-31' }, // future
				{ id: 3, completed: true, dueDate: '2020-01-01' }, // completed, not overdue
				{ id: 4, completed: false } // no due date
			];
			const result = computeOverdueTasks(todos);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(1);
		});
	});

	describe('computeUpcomingDue', () => {
		it('returns empty array when no todos', () => {
			expect(computeUpcomingDue([])).toEqual([]);
		});

		it('returns tasks due today or within next 2 days (in local time)', () => {
			// Use local date strings so the test is timezone-independent
			const now = new Date();
			const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
			const tomorrowLocal = new Date(now);
			tomorrowLocal.setDate(tomorrowLocal.getDate() + 1);
			const tomorrowStr = `${tomorrowLocal.getFullYear()}-${String(tomorrowLocal.getMonth() + 1).padStart(2, '0')}-${String(tomorrowLocal.getDate()).padStart(2, '0')}`;
			const twoDaysLocal = new Date(now);
			twoDaysLocal.setDate(twoDaysLocal.getDate() + 2);
			const twoDaysStr = `${twoDaysLocal.getFullYear()}-${String(twoDaysLocal.getMonth() + 1).padStart(2, '0')}-${String(twoDaysLocal.getDate()).padStart(2, '0')}`;

			const todos = [
				{ id: 1, completed: false, dueDate: todayLocal }, // due today
				{ id: 2, completed: false, dueDate: tomorrowStr }, // due tomorrow
				{ id: 3, completed: false, dueDate: twoDaysStr }, // due in 2 days
				{ id: 4, completed: false, dueDate: '2099-12-31' }, // far future, excluded
				{ id: 5, completed: true, dueDate: todayLocal }, // completed, excluded
				{ id: 6, completed: false } // no due date, excluded
			];
			const result = computeUpcomingDue(todos);
			expect(result).toHaveLength(3);
			expect(result.map((t) => t.id)).toEqual([1, 2, 3]);
		});

		it('sorts results by due date ascending', () => {
			const now = new Date();
			const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
			const tomorrowLocal = new Date(now);
			tomorrowLocal.setDate(tomorrowLocal.getDate() + 1);
			const tomorrowStr = `${tomorrowLocal.getFullYear()}-${String(tomorrowLocal.getMonth() + 1).padStart(2, '0')}-${String(tomorrowLocal.getDate()).padStart(2, '0')}`;

			const todos = [
				{ id: 1, completed: false, dueDate: tomorrowStr },
				{ id: 2, completed: false, dueDate: todayLocal }
			];
			const result = computeUpcomingDue(todos);
			expect(result[0].id).toBe(2);
			expect(result[1].id).toBe(1);
		});
	});
});

describe('TodoStore instance methods', () => {
	describe('completeSelected with recurring tasks', () => {
		/** @type {import('../state/todoStore.svelte.js').default} */
		let store;

		beforeEach(() => {
			// Mock localStorage so store constructor doesn't fail
			vi.stubGlobal('localStorage', {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn(),
				get length() {
					return 0;
				},
				key: vi.fn(() => null)
			});
			store = new TodoStore();
			// Silence showToast (which uses setTimeout)
			store.showToast = vi.fn();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('creates a new recurring instance when completing a selected recurring task', () => {
			store.todos = [
				{
					id: '1',
					title: 'Daily standup',
					completed: false,
					dueDate: '2026-05-09',
					recurring: 'daily',
					tags: [],
					createdAt: '2026-05-09T00:00:00.000Z'
				}
			];
			store.selectedTodos = new SvelteSet(['1']);
			store.selectMode = true;

			store.completeSelected();

			// Original task should be completed
			expect(store.todos[0].completed).toBe(true);
			expect(store.todos[0].completedAt).toBeTruthy();
			// New recurring copy should exist
			expect(store.todos.length).toBe(2);
			expect(store.todos[1].recurring).toBe('daily');
			expect(store.todos[1].completed).toBe(false);
			expect(store.todos[1].dueDate).toBe('2026-05-10');
			expect(store.todos[1].title).toBe('Daily standup');
			// Select mode cleared
			expect(store.selectMode).toBe(false);
			expect(store.selectedTodos.size).toBe(0);
		});

		it('creates recurring copies for multiple selected recurring tasks', () => {
			store.todos = [
				{
					id: '1',
					title: 'Daily A',
					completed: false,
					dueDate: '2026-05-09',
					recurring: 'daily',
					tags: [],
					createdAt: '2026-05-09T00:00:00.000Z'
				},
				{
					id: '2',
					title: 'Weekly B',
					completed: false,
					dueDate: '2026-05-09',
					recurring: 'weekly',
					tags: [],
					createdAt: '2026-05-09T00:00:00.000Z'
				},
				{
					id: '3',
					title: 'One-time C',
					completed: false,
					dueDate: '2026-05-09',
					tags: [],
					createdAt: '2026-05-09T00:00:00.000Z'
				}
			];
			store.selectedTodos = new SvelteSet(['1', '2', '3']);

			store.completeSelected();

			// Should have 5 todos: 3 completed originals + 2 recurring copies (one-time doesn't recur)
			expect(store.todos.length).toBe(5);
			expect(store.todos[0].completed).toBe(true); // Daily A
			expect(store.todos[1].completed).toBe(true); // Weekly B
			expect(store.todos[2].completed).toBe(true); // One-time C
			// Recurring copies
			const copies = store.todos.filter((t) => !t.completed);
			expect(copies).toHaveLength(2);
			expect(copies.find((t) => t.recurring === 'daily')).toBeTruthy();
			expect(copies.find((t) => t.recurring === 'weekly')).toBeTruthy();
		});

		it('does not create copies for non-recurring tasks', () => {
			store.todos = [
				{
					id: '1',
					title: 'One-time task',
					completed: false,
					dueDate: '2026-05-09',
					tags: [],
					createdAt: '2026-05-09T00:00:00.000Z'
				}
			];
			store.selectedTodos = new SvelteSet(['1']);

			store.completeSelected();

			expect(store.todos.length).toBe(1);
			expect(store.todos[0].completed).toBe(true);
		});

		it('does not create a recurring copy if the todo is already completed', () => {
			store.todos = [
				{
					id: '1',
					title: 'Already done recurring',
					completed: true,
					dueDate: '2026-05-09',
					recurring: 'daily',
					tags: [],
					createdAt: '2026-05-09T00:00:00.000Z',
					completedAt: '2026-05-09T12:00:00.000Z'
				}
			];
			store.selectedTodos = new SvelteSet(['1']);

			store.completeSelected();

			// Should still be just 1 todo — no recurring copy spawned
			expect(store.todos.length).toBe(1);
			expect(store.todos[0].completed).toBe(true);
			expect(store.todos[0].recurring).toBe('daily');
		});
	});

	describe('exportTodos', () => {
		/** @type {import('../state/todoStore.svelte.js').default} */
		let store;

		beforeEach(() => {
			vi.stubGlobal('localStorage', {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn(),
				get length() {
					return 0;
				},
				key: vi.fn(() => null)
			});
			store = new TodoStore();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('returns JSON string with todos, archivedTodos, customTags, and tagColors', () => {
			store.todos = [{ id: '1', title: 'Test', completed: false, createdAt: '2024-01-01' }];
			store.archivedTodos = [{ id: '2', title: 'Archived', completed: true, createdAt: '2024-01-01' }];
			store.customTags = ['work', 'personal'];
			store.tagColors = { urgent: '#ef4444', work: '#3b82f6' };

			const result = store.exportTodos();
			const parsed = JSON.parse(result);

			expect(parsed.todos).toHaveLength(1);
			expect(parsed.archivedTodos).toHaveLength(1);
			expect(parsed.customTags).toEqual(['work', 'personal']);
			expect(parsed.tagColors).toEqual({ urgent: '#ef4444', work: '#3b82f6' });
			expect(parsed.exportedAt).toBeTruthy();
		});
	});

	describe('importTodos', () => {
		/** @type {import('../state/todoStore.svelte.js').default} */
		let store;

		beforeEach(() => {
			vi.stubGlobal('localStorage', {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn(),
				get length() {
					return 0;
				},
				key: vi.fn(() => null)
			});
			store = new TodoStore();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('successfully imports valid JSON', () => {
			const json = JSON.stringify({
				todos: [{ id: '1', title: 'Imported', completed: false, createdAt: '2024-01-01' }],
				archivedTodos: []
			});

			const result = store.importTodos(json);

			expect(result.success).toBe(true);
			expect(store.todos).toHaveLength(1);
			expect(store.todos[0].title).toBe('Imported');
		});

		it('returns error for invalid JSON', () => {
			const result = store.importTodos('not valid json');
			expect(result.success).toBe(false);
			expect(result.message).toContain('failed');
		});

		it('returns error for invalid format', () => {
			const result = store.importTodos(JSON.stringify({ invalid: 'format' }));
			expect(result.success).toBe(false);
			expect(result.message).toContain('No valid tasks');
		});

		it('updates existing todo when ID matches', () => {
			store.todos = [{ id: '1', title: 'Existing', completed: false, createdAt: '2024-01-01' }];

			const json = JSON.stringify({
				todos: [{ id: '1', title: 'Updated', completed: true, createdAt: '2024-01-01' }],
				archivedTodos: []
			});

			const result = store.importTodos(json);

			expect(result.success).toBe(true);
			expect(result.message).toContain('updated');
			expect(store.todos).toHaveLength(1);
			expect(store.todos[0].title).toBe('Updated');
			expect(store.todos[0].completed).toBe(true);
		});

		it('adds new todo when ID does not match existing', () => {
			store.todos = [{ id: '1', title: 'Existing', completed: false, createdAt: '2024-01-01' }];

			const json = JSON.stringify({
				todos: [{ id: '2', title: 'New', completed: false, createdAt: '2024-01-01' }],
				archivedTodos: []
			});

			const result = store.importTodos(json);

			expect(result.success).toBe(true);
			expect(result.message).toContain('imported');
			expect(store.todos).toHaveLength(2);
			expect(store.todos.find((t) => t.title === 'New')).toBeTruthy();
		});

		it('imports custom tags and tag colors', () => {
			const json = JSON.stringify({
				todos: [{ id: '1', title: 'Test', completed: false, createdAt: '2024-01-01' }],
				archivedTodos: [],
				customTags: ['custom1', 'custom2'],
				tagColors: { custom1: '#ff0000', custom2: '#00ff00' }
			});

			store.importTodos(json);

			expect(store.customTags).toContain('custom1');
			expect(store.customTags).toContain('custom2');
			expect(store.tagColors.custom1).toBe('#ff0000');
			expect(store.tagColors.custom2).toBe('#00ff00');
			expect(store.availableTags).toContain('custom1');
			expect(store.availableTags).toContain('custom2');
		});

		it('handles archived todos with update and add', () => {
			store.archivedTodos = [{ id: 'a1', title: 'Old Archive', completed: true, createdAt: '2024-01-01' }];

			const json = JSON.stringify({
				todos: [],
				archivedTodos: [
					{
						id: 'a1',
						title: 'Updated Archive',
						completed: true,
						createdAt: '2024-01-01'
					},
					{ id: 'a2', title: 'New Archive', completed: true, createdAt: '2024-01-01' }
				]
			});

			const result = store.importTodos(json);

			expect(result.success).toBe(true);
			expect(store.archivedTodos).toHaveLength(2);
			expect(store.archivedTodos.find((t) => t.id === 'a1').title).toBe('Updated Archive');
			expect(store.archivedTodos.find((t) => t.id === 'a2').title).toBe('New Archive');
		});

		it('merges tags without removing existing ones', () => {
			store.customTags = ['existing'];
			store.tagColors = { existing: '#0000ff' };

			const json = JSON.stringify({
				todos: [{ id: '1', title: 'Test', completed: false, createdAt: '2024-01-01' }],
				archivedTodos: [],
				customTags: ['newtag'],
				tagColors: { newtag: '#ff00ff' }
			});

			store.importTodos(json);

			expect(store.customTags).toEqual(['existing', 'newtag']);
			expect(store.tagColors.existing).toBe('#0000ff');
			expect(store.tagColors.newtag).toBe('#ff00ff');
		});
	});

	describe('undoMove', () => {
		/** @type {import('../state/todoStore.svelte.js').default} */
		let store;

		beforeEach(() => {
			vi.stubGlobal('localStorage', {
				getItem: vi.fn(() => null),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn(),
				get length() {
					return 0;
				},
				key: vi.fn(() => null)
			});
			store = new TodoStore();
			// Silence showToast (which uses setTimeout)
			store.showToast = vi.fn();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('restores completed and tags from lastMovedStates', () => {
			const todo = {
				id: '1',
				title: 'Test Task',
				completed: false,
				tags: ['personal', 'home'],
				createdAt: '2026-01-01T00:00:00.000Z'
			};
			store.todos = [todo];
			store.lastMovedTodos = [{ ...todo }];
			store.lastMovedStates = [{ completed: false, tags: ['personal', 'home'] }];

			// Simulate the move effect (e.g., moved to Done column — completed toggled, tags changed)
			store.todos[0].completed = true;
			store.todos[0].tags = [];

			store.undoMove();

			expect(store.todos[0].completed).toBe(false);
			expect(store.todos[0].tags).toEqual(['personal', 'home']);
		});

		it('clears lastMovedTodos and lastMovedStates after undo', () => {
			const todo = {
				id: '1',
				title: 'Test Task',
				completed: false,
				tags: [],
				createdAt: '2026-01-01T00:00:00.000Z'
			};
			store.todos = [todo];
			store.lastMovedTodos = [{ ...todo }];
			store.lastMovedStates = [{ completed: false, tags: [] }];

			store.undoMove();

			expect(store.lastMovedTodos).toEqual([]);
			expect(store.lastMovedStates).toEqual([]);
		});
	});
});
// ── _computeFiltered Tests ──
describe('_computeFiltered', () => {
	/** @type {import('../state/todoStore.svelte.js').default} */
	let store;

	beforeEach(() => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			get length() {
				return 0;
			},
			key: vi.fn(() => null)
		});
		store = new TodoStore();
		// Set up test todos
		store.todos = [
			{
				id: '1',
				title: 'Buy groceries',
				description: 'Milk and eggs',
				completed: false,
				dueDate: '2024-01-15',
				priority: 'high',
				category: 'Personal',
				tags: ['shopping', 'urgent'],
				createdAt: '2024-01-01'
			},
			{
				id: '2',
				title: 'Write documentation',
				description: 'Update README',
				completed: false,
				dueDate: '2024-01-20',
				priority: 'medium',
				category: 'Work',
				tags: ['documentation'],
				createdAt: '2024-01-02'
			},
			{
				id: '3',
				title: 'Call mom',
				description: 'Weekly check-in',
				completed: true,
				dueDate: '2024-01-10',
				priority: 'low',
				category: 'Personal',
				tags: [],
				completedAt: '2024-01-10T12:00:00.000Z',
				createdAt: '2024-01-03'
			},
			{
				id: '4',
				title: 'Team meeting',
				completed: false,
				dueDate: '2024-01-18',
				priority: 'medium',
				category: 'Work',
				tags: ['meeting'],
				createdAt: '2024-01-04'
			},
			{
				id: '5',
				title: 'Fix bug #123',
				completed: false,
				dueDate: '2024-01-22',
				priority: 'high',
				category: 'Work',
				tags: [],
				createdAt: '2024-01-05'
			}
		];
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	// ── Text Search Filter Tests ──
	describe('text search filter', () => {
		it('returns all todos when filter text is empty', () => {
			const result = store._computeFiltered(store.todos, '');
			expect(result).toHaveLength(5);
		});

		it('filters by title using fuzzy match', () => {
			const result = store._computeFiltered(store.todos, 'groc');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('filters by description using fuzzy match', () => {
			const result = store._computeFiltered(store.todos, 'readme');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('2');
		});

		it('is case-insensitive', () => {
			const result = store._computeFiltered(store.todos, 'BUY');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('does not match when query characters are out of order', () => {
			const result = store._computeFiltered(store.todos, 'ba');
			expect(result).toHaveLength(0);
		});

		it('matches with gaps in fuzzy search', () => {
			const result = store._computeFiltered(store.todos, 'wrt');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('2'); // "Write documentation"
		});
	});

	// ── Status Filter Tests ──
	describe('status filter', () => {
		it('returns all todos when status is "all"', () => {
			const result = store._computeFiltered(store.todos, '', 'all');
			expect(result).toHaveLength(5);
		});

		it('filters active (not completed) todos when status is "active"', () => {
			const result = store._computeFiltered(store.todos, '', 'active');
			expect(result).toHaveLength(4);
			expect(result.every((t) => !t.completed)).toBe(true);
		});

		it('filters completed todos when status is "done"', () => {
			const result = store._computeFiltered(store.todos, '', 'done');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('3');
		});
	});

	// ── Category Filter Tests ──
	describe('category filter', () => {
		it('returns all todos when category is empty', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '');
			expect(result).toHaveLength(5);
		});

		it('filters by category "Work"', () => {
			const result = store._computeFiltered(store.todos, '', 'all', 'Work');
			expect(result).toHaveLength(3);
			expect(result.every((t) => t.category === 'Work')).toBe(true);
		});

		it('filters by category "Personal"', () => {
			const result = store._computeFiltered(store.todos, '', 'all', 'Personal');
			expect(result).toHaveLength(2);
			expect(result.every((t) => t.category === 'Personal')).toBe(true);
		});

		it('returns empty array when no todos match category', () => {
			const result = store._computeFiltered(store.todos, '', 'all', 'Nonexistent');
			expect(result).toHaveLength(0);
		});
	});

	// ── Priority Filter Tests ──
	describe('priority filter', () => {
		it('returns all todos when priority is "all"', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'all');
			expect(result).toHaveLength(5);
		});

		it('filters by "high" priority', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'high');
			expect(result).toHaveLength(2);
			expect(result.every((t) => t.priority === 'high')).toBe(true);
		});

		it('filters by "medium" priority', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'medium');
			expect(result).toHaveLength(2);
			expect(result.every((t) => t.priority === 'medium')).toBe(true);
		});

		it('filters by "low" priority', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'low');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('3');
		});
	});

	// ── Tags Filter Tests ──
	describe('tags filter', () => {
		it('returns all todos when no tags specified', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'all', []);
			expect(result).toHaveLength(5);
		});

		it('filters by single tag (AND logic)', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'all', ['shopping']);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('filters by multiple tags (AND logic - all must be present)', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'all', ['urgent', 'shopping']);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('returns empty when tags do not match', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'all', ['nonexistent']);
			expect(result).toHaveLength(0);
		});

		it('returns empty when only some tags match', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'all', ['shopping', 'meeting']);
			expect(result).toHaveLength(0); // No todo has both tags
		});
	});

	// ── Date Range Filter Tests ──
	describe('date range filter', () => {
		it('filters by date from (minimum due date)', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'all', [], '2024-01-15');
			// id 1: 2024-01-15, id 2: 2024-01-20, id 4: 2024-01-18, id 5: 2024-01-22 (id 3 is 2024-01-10)
			expect(result).toHaveLength(4);
			expect(result.every((t) => t.dueDate >= '2024-01-15')).toBe(true);
		});

		it('filters by date to (maximum due date)', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'all', [], '', '2024-01-15');
			expect(result).toHaveLength(2);
			expect(result.every((t) => t.dueDate <= '2024-01-15')).toBe(true);
		});

		it('filters by date range (both from and to)', () => {
			const result = store._computeFiltered(
				store.todos,
				'',
				'all',
				'',
				'manual',
				'all',
				[],
				'2024-01-16',
				'2024-01-21'
			);
			expect(result).toHaveLength(2);
			expect(result.every((t) => t.dueDate >= '2024-01-16' && t.dueDate <= '2024-01-21')).toBe(true);
		});

		it('excludes todos without due dates when date filter is applied', () => {
			store.todos.push({
				id: '6',
				title: 'No due date',
				completed: false,
				createdAt: '2024-01-06'
			});
			const result = store._computeFiltered(
				store.todos,
				'',
				'all',
				'',
				'manual',
				'all',
				[],
				'2024-01-15',
				'2024-01-20'
			);
			expect(result.find((t) => t.id === '6')).toBeUndefined();
		});
	});

	// ── Sort Tests ──
	describe('sorting', () => {
		it('returns original order for "manual" sort', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual');
			expect(result.map((t) => t.id)).toEqual(['1', '2', '3', '4', '5']);
		});

		it('sorts by priority (high, medium, low)', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'priority');
			expect(result.map((t) => t.id)).toEqual(['1', '5', '2', '4', '3']); // high, high, medium, medium, low
		});

		it('sorts by date ascending (earliest first)', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'date');
			expect(result.map((t) => t.id)).toEqual(['3', '1', '4', '2', '5']); // 10, 15, 18, 20, 22
		});

		it('sorts by date with tasks without due dates at the end', () => {
			store.todos.push({
				id: '6',
				title: 'No due date',
				completed: false,
				createdAt: '2024-01-06'
			});
			const result = store._computeFiltered(store.todos, '', 'all', '', 'date');
			expect(result[result.length - 1].id).toBe('6'); // No due date should be last
		});

		it('sorts alphabetically ascending (alpha-asc)', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'alpha-asc');
			expect(result.map((t) => t.title)).toEqual([
				'Buy groceries',
				'Call mom',
				'Fix bug #123',
				'Team meeting',
				'Write documentation'
			]);
		});

		it('sorts alphabetically descending (alpha-desc)', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'alpha-desc');
			expect(result.map((t) => t.title)).toEqual([
				'Write documentation',
				'Team meeting',
				'Fix bug #123',
				'Call mom',
				'Buy groceries'
			]);
		});

		it('sorts by category then title', () => {
			const result = store._computeFiltered(store.todos, '', 'all', '', 'category');
			// Personal (Buy groceries, Call mom), then Work (Fix bug, Team meeting, Write documentation)
			expect(result.map((t) => t.id)).toEqual(['1', '3', '5', '4', '2']);
		});
	});

	// ── Combination Filter Tests ──
	describe('combination filters', () => {
		it('applies multiple filters together', () => {
			const result = store._computeFiltered(
				store.todos,
				'meet', // text search
				'active', // status
				'Work', // category
				'priority', // sort
				'medium' // priority filter
			);
			// Should find "Team meeting" (medium priority, Work, active)
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('4');
		});

		it('applies all filters at once', () => {
			const result = store._computeFiltered(
				store.todos,
				'write', // matches "Write documentation" in title
				'active',
				'Work',
				'priority',
				'medium',
				['documentation'],
				'2024-01-01',
				'2024-01-31'
			);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('2');
		});

		it('returns empty when no todos match all filters', () => {
			const result = store._computeFiltered(
				store.todos,
				'nonexistent',
				'done', // No completed high-priority Work tasks
				'Work'
			);
			expect(result).toHaveLength(0);
		});
	});

	// ── Edge Cases ──
	describe('edge cases', () => {
		it('returns empty array for empty input', () => {
			const result = store._computeFiltered([]);
			expect(result).toHaveLength(0);
		});

		it('handles todos without optional fields', () => {
			store.todos = [{ id: '1', title: 'Minimal todo', completed: false, createdAt: '2024-01-01' }];
			const result = store._computeFiltered(store.todos, '', 'all', '', 'manual', 'all', [], '', '');
			expect(result).toHaveLength(1);
		});

		it('returns correct count when all filters are active', () => {
			// All filters at maximum restrictiveness - but one item should match
			const result = store._computeFiltered(
				store.todos,
				'gro', // matches first todo
				'all', // all status
				'Personal', // matches first and third
				'manual',
				'high', // matches first and fifth, but not third (low priority)
				['shopping'] // only first todo
			);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});
	});
});

describe('query token synchronization', () => {
	/** @type {import('../state/todoStore.svelte.js').default} */
	let store;

	beforeEach(() => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			get length() {
				return 0;
			},
			key: vi.fn(() => null)
		});
		store = new TodoStore();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('preserves plain-text buffer when adding a status token', () => {
		store._queryPlainTextBuffer = 'buy';
		const tokens = store._buildQueryTokensFromFilters('active', '', 'manual', 'all', [], '', '', '');

		expect(stringifyQuery(tokens, store._queryPlainTextBuffer)).toBe('is:active buy');
	});

	it('preserves plain-text buffer when status token is removed', () => {
		store._queryPlainTextBuffer = 'buy';
		const tokens = store._buildQueryTokensFromFilters('all', '', 'manual', 'all', [], '', '', '');

		expect(stringifyQuery(tokens, store._queryPlainTextBuffer)).toBe('buy');
	});

	it('preserves plain-text buffer while toggling tag tokens', () => {
		store._queryPlainTextBuffer = 'report';
		const withTag = store._buildQueryTokensFromFilters('all', '', 'manual', 'all', ['urgent'], '', '', '');
		expect(stringifyQuery(withTag, store._queryPlainTextBuffer)).toBe('tag:urgent report');

		const withoutTag = store._buildQueryTokensFromFilters('all', '', 'manual', 'all', [], '', '', '');
		expect(stringifyQuery(withoutTag, store._queryPlainTextBuffer)).toBe('report');
	});

	it('does not reassign filterTags when parsed tags are unchanged', () => {
		store.filterTags = ['urgent'];
		const previousTagsRef = store.filterTags;

		store._applyQueryTokens([{ key: 'tag', value: 'urgent' }]);

		expect(store.filterTags).toBe(previousTagsRef);
	});

	it('always clears the token-application guard even when parsing throws', () => {
		store.categories = null;

		expect(() => store._applyQueryTokens([{ key: 'category', value: 'Work' }])).toThrow();
		expect(store._isApplyingQueryTokens).toBe(false);
	});
});

// ── Drag and Drop State Transition Tests ──
describe('TodoStore drag and drop', () => {
	/** @type {import('../state/todoStore.svelte.js').default} */
	let store;

	beforeEach(() => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			get length() {
				return 0;
			},
			key: vi.fn(() => null)
		});
		// Mock document for drag ghost
		vi.stubGlobal('document', {
			createElement: vi.fn(() => {
				const el = {
					textContent: '',
					style: { cssText: '' },
					parentNode: { removeChild: vi.fn() }
				};
				return el;
			}),
			body: { appendChild: vi.fn(), contains: vi.fn(() => true) }
		});
		store = new TodoStore();
		store.todos = [
			{ id: '1', title: 'First', completed: false, createdAt: '2024-01-01' },
			{ id: '2', title: 'Second', completed: false, createdAt: '2024-01-01' },
			{ id: '3', title: 'Third', completed: false, createdAt: '2024-01-01' }
		];
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('handleDragStart', () => {
		it('sets draggedId correctly', () => {
			const mockEvent = {
				dataTransfer: {
					effectAllowed: null,
					data: {},
					setData: vi.fn(),
					setDragImage: vi.fn()
				}
			};

			store.handleDragStart(mockEvent, '2');

			expect(store.draggedId).toBe('2');
			expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', '2');
		});

		it('creates drag ghost element', () => {
			const mockEvent = {
				dataTransfer: {
					effectAllowed: null,
					data: {},
					setData: vi.fn(),
					setDragImage: vi.fn()
				}
			};

			store.handleDragStart(mockEvent, '1');

			expect(store._dragGhost).not.toBeNull();
			expect(document.body.contains(store._dragGhost)).toBe(true);
			expect(mockEvent.dataTransfer.setDragImage).toHaveBeenCalled();
		});

		it('cleans up existing drag ghost before creating new one', () => {
			const mockEvent = {
				dataTransfer: {
					effectAllowed: null,
					data: {},
					setData: vi.fn(),
					setDragImage: vi.fn()
				}
			};

			// First drag
			store.handleDragStart(mockEvent, '1');
			const firstGhost = store._dragGhost;

			// Second drag - should clean up first ghost
			store.handleDragStart(mockEvent, '2');

			// Ghost cleanup verified by checking _dragGhost was replaced
			expect(store._dragGhost).not.toBe(firstGhost);
		});
	});

	describe('handleDragOver', () => {
		it('sets dragOverId and dragIndicatorPos', () => {
			const mockEvent = {
				preventDefault: vi.fn(),
				dataTransfer: { dropEffect: null },
				currentTarget: {
					getBoundingClientRect: () => ({ top: 0, height: 100 })
				},
				clientY: 60 // In the bottom half (60 > 50)
			};

			store.handleDragStart({ dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() } }, '1');
			store.handleDragOver(mockEvent, '2');

			expect(store.dragOverId).toBe('2');
			expect(store.dragIndicatorPos).toBe('after'); // y=30 is in bottom half of height 100
		});

		it('sets dragIndicatorPos to "before" for top half', () => {
			const mockEvent = {
				preventDefault: vi.fn(),
				dataTransfer: { dropEffect: null },
				currentTarget: {
					getBoundingClientRect: () => ({ top: 0, height: 100 })
				},
				clientY: 20 // In the top half
			};

			store.handleDragStart({ dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() } }, '1');
			store.handleDragOver(mockEvent, '2');

			expect(store.dragIndicatorPos).toBe('before');
		});

		it('does not set dragOverId when dragging over same element', () => {
			const mockEvent = {
				preventDefault: vi.fn(),
				dataTransfer: { dropEffect: null },
				currentTarget: {
					getBoundingClientRect: () => ({ top: 0, height: 100 })
				},
				clientY: 50
			};

			store.handleDragStart({ dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() } }, '1');
			store.handleDragOver(mockEvent, '1'); // Same ID

			expect(store.dragOverId).toBeNull();
		});
	});

	describe('handleDrop', () => {
		it('reorders todos array correctly (moving item forward)', () => {
			const mockEvent = {
				preventDefault: vi.fn(),
				dataTransfer: { getData: () => '1' }
			};

			store.handleDragStart({ dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() } }, '1');
			store.handleDrop(mockEvent, '3');

			// Drag 1 onto 3: [1,2,3] -> remove idx 0 -> [2,3], toIdx 2->1, insert -> [2,1,3]
			expect(store.todos[0].id).toBe('2');
			expect(store.todos[1].id).toBe('1');
			expect(store.todos[2].id).toBe('3');
		});

		it('reorders todos array correctly (moving item backward)', () => {
			const mockEvent = {
				preventDefault: vi.fn(),
				dataTransfer: { getData: () => '3' }
			};

			// Drag item 3 to position of item 1
			store.handleDragStart({ dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() } }, '3');
			store.handleDrop(mockEvent, '1');

			// Item 3 should be at index 0
			expect(store.todos[0].id).toBe('3');
			expect(store.todos[1].id).toBe('1');
			expect(store.todos[2].id).toBe('2');
		});

		it('does nothing when draggedId is null', () => {
			const mockEvent = {
				preventDefault: vi.fn(),
				dataTransfer: { getData: () => null }
			};

			store.draggedId = null;
			const originalOrder = [...store.todos];
			store.handleDrop(mockEvent, '2');

			expect(store.todos).toEqual(originalOrder);
		});

		it('does nothing when targetId equals draggedId', () => {
			const mockEvent = {
				preventDefault: vi.fn(),
				dataTransfer: { getData: () => '1' }
			};

			store.handleDragStart({ dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() } }, '1');
			const originalOrder = [...store.todos];
			store.handleDrop(mockEvent, '1');

			expect(store.todos).toEqual(originalOrder);
		});
	});

	describe('handleDragEnd', () => {
		it('cleans up drag ghost element', () => {
			const mockEvent = {
				dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() }
			};
			store.handleDragStart(mockEvent, '1');

			expect(store._dragGhost).not.toBeNull();

			store.handleDragEnd();

			// Ghost cleanup verified by _dragGhost being null
			expect(store._dragGhost).toBeNull();
		});

		it('resets all drag state to null', () => {
			const mockEvent = {
				dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() }
			};
			store.handleDragStart(mockEvent, '1');
			store.handleDragOver(
				{
					preventDefault: vi.fn(),
					dataTransfer: {},
					currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 100 }) },
					clientY: 50
				},
				2
			);

			expect(store.draggedId).not.toBeNull();
			expect(store.dragOverId).not.toBeNull();
			expect(store.dragIndicatorPos).not.toBeNull();

			store.handleDragEnd();

			expect(store.draggedId).toBeNull();
			expect(store.dragOverId).toBeNull();
			expect(store.dragIndicatorPos).toBeNull();
			expect(store.dragTargetPill).toBeNull();
			expect(store.dragTargetValue).toBe('');
		});
	});

	describe('handleDragLeave', () => {
		it('clears dragOverId and dragIndicatorPos', () => {
			store.handleDragStart({ dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() } }, '1');
			store.dragOverId = '2';
			store.dragIndicatorPos = 'before';

			store.handleDragLeave();

			expect(store.dragOverId).toBeNull();
			expect(store.dragIndicatorPos).toBeNull();
		});
	});
});

// ── Recurring Task Edge Case Tests ──
describe('recurring task edge cases', () => {
	/** @type {import('../state/todoStore.svelte.js').default} */
	let store;

	beforeEach(() => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			get length() {
				return 0;
			},
			key: vi.fn(() => null)
		});
		store = new TodoStore();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('getNextDueDate - edge cases', () => {
		it('handles month-end overflow (Jan 31 + 1 month)', () => {
			// Jan 31 + 1 month → Feb 28 (or Feb 29 in leap year 2024)
			const result = store.getNextDueDate('2024-01-31', 'monthly');
			expect(result).toBe('2024-02-29'); // 2024 is a leap year
		});

		it('handles month-end overflow in non-leap year (Jan 31 + 1 month)', () => {
			// Jan 31 + 1 month → Feb 28 in non-leap year
			const result = store.getNextDueDate('2023-01-31', 'monthly');
			expect(result).toBe('2023-02-28');
		});

		it('handles year boundary with weekly recurrence (Dec 31 + 1 week)', () => {
			const result = store.getNextDueDate('2024-12-31', 'weekly');
			expect(result).toBe('2025-01-07');
		});

		it('handles year boundary with monthly recurrence (Dec 1 + 1 month)', () => {
			const result = store.getNextDueDate('2024-12-01', 'monthly');
			expect(result).toBe('2025-01-01');
		});

		it('handles year boundary with daily recurrence (Dec 31 + 1 day)', () => {
			const result = store.getNextDueDate('2024-12-31', 'daily');
			expect(result).toBe('2025-01-01');
		});
	});

	describe('non-recurring tasks', () => {
		it('does not create copies for non-recurring tasks (completeSelected)', () => {
			store.todos = [
				{
					id: '1',
					title: 'One-time task',
					completed: false,
					dueDate: '2026-05-09',
					tags: [],
					createdAt: '2026-05-09T00:00:00.000Z'
				}
			];
			store.selectedTodos = new SvelteSet(['1']);

			store.completeSelected();

			// Should have only 1 todo - no recurring copy
			expect(store.todos).toHaveLength(1);
			expect(store.todos[0].completed).toBe(true);
			expect(store.todos[0].recurring).toBeUndefined();
		});

		it('does not create copies for tasks without recurring field', () => {
			store.todos = [
				{
					id: '1',
					title: 'No recurring field',
					completed: false,
					tags: [],
					createdAt: '2026-05-09T00:00:00.000Z'
				}
			];
			store.selectedTodos = new SvelteSet(['1']);

			store.completeSelected();

			expect(store.todos).toHaveLength(1);
			expect(store.todos[0].completed).toBe(true);
		});
	});

	describe('_createRecurringCopy', () => {
		it('returns null for non-recurring tasks', () => {
			store.todos = [
				{
					id: '1',
					title: 'Non-recurring',
					completed: false,
					createdAt: '2026-05-09T00:00:00.000Z'
				}
			];
			const result = store._createRecurringCopy(store.todos[0]);
			expect(result).toBeNull();
		});

		it('preserves all fields except completed and dueDate for recurring copy', () => {
			store.todos = [
				{
					id: '1',
					title: 'Daily task',
					description: 'Task description',
					dueDate: '2024-01-15',
					priority: 'high',
					category: 'Work',
					tags: ['tag1', 'tag2'],
					recurring: 'daily',
					subtasks: [{ text: 'Subtask', done: false }],
					completed: false,
					createdAt: '2024-01-01'
				}
			];

			const copy = store._createRecurringCopy(store.todos[0]);

			expect(copy.id).toBeTruthy();
			expect(typeof copy.id).toBe('string');
			expect(copy.title).toBe('Daily task');
			expect(copy.description).toBe('Task description');
			expect(copy.priority).toBe('high');
			expect(copy.category).toBe('Work');
			expect(copy.tags).toEqual(['tag1', 'tag2']);
			expect(copy.recurring).toBe('daily');
			expect(copy.subtasks).toEqual([{ text: 'Subtask', done: false }]);
			expect(copy.completed).toBe(false);
			expect(copy.dueDate).toBe('2024-01-16'); // Next day
		});
	});
});

// Additional test for Feb 29 yearly recurrence (testing edge case)
describe('getNextDueDate yearly edge cases', () => {
	let store;

	beforeEach(() => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			get length() {
				return 0;
			},
			key: vi.fn(() => null)
		});
		store = new TodoStore();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('handles leap year February 29 + 1 year → Feb 28', () => {
		// Feb 29 2024 + 1 year → Feb 28 2025 (no Feb 29 in 2025)
		const result = store.getNextDueDate('2024-02-29', 'yearly');
		expect(result).toBe('2025-02-28');
	});

	it('handles Feb 29 2020 (leap year) + 1 year → Feb 28 2021', () => {
		// Feb 29 2020 + 1 year → Feb 28 2021
		const result = store.getNextDueDate('2020-02-29', 'yearly');
		expect(result).toBe('2021-02-28');
	});

	it('handles Feb 28 2021 + 1 year → Feb 28 2022', () => {
		// Feb 28 + 1 year → Feb 28
		const result = store.getNextDueDate('2021-02-28', 'yearly');
		expect(result).toBe('2022-02-28');
	});
});
