import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TodoStore } from '../todoStore.svelte.js';

// Extract pure computation methods from the TodoStore prototype.
// These methods don't use `this` or runes — they operate purely on arguments.
const { _fuzzyMatch, _computeStats, _getRandomTagColor, getNextDueDate } = TodoStore.prototype;

describe('TodoStore pure methods', () => {
	describe('_fuzzyMatch', () => {
		it('returns true when query is empty', () => {
			expect(_fuzzyMatch('', 'anything')).toBe(true);
			expect(_fuzzyMatch('', '')).toBe(true);
		});

		it('returns true when all query chars appear in order in text', () => {
			expect(_fuzzyMatch('groc', 'Buy groceries')).toBe(true);
		});

		it('is case-insensitive', () => {
			expect(_fuzzyMatch('GROC', 'buy groceries')).toBe(true);
			expect(_fuzzyMatch('groc', 'BUY GROCERIES')).toBe(true);
		});

		it('returns false when query does not match', () => {
			expect(_fuzzyMatch('xyz', 'hello world')).toBe(false);
		});

		it('requires characters in order', () => {
			expect(_fuzzyMatch('ba', 'ab')).toBe(false);
		});

		it('works with single character', () => {
			expect(_fuzzyMatch('a', 'hello world')).toBe(false);
			expect(_fuzzyMatch('h', 'hello world')).toBe(true);
		});

		it('matches with gaps', () => {
			expect(_fuzzyMatch('hw', 'hello world')).toBe(true);
		});
	});

	describe('_computeStats', () => {
		it('returns zero counts for empty todos', () => {
			const stats = _computeStats([]);
			expect(stats).toEqual({ active: 0, completed: 0, overdue: 0, total: 0 });
		});

		it('counts active tasks', () => {
			const todos = [
				{ id: 1, completed: false },
				{ id: 2, completed: false },
				{ id: 3, completed: true }
			];
			const stats = _computeStats(todos);
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
			const stats = _computeStats(todos);
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
			const stats = _computeStats(todos);
			expect(stats.active).toBe(0);
			expect(stats.completed).toBe(2);
			expect(stats.overdue).toBe(0);
			expect(stats.total).toBe(2);
		});
	});

	describe('_getRandomTagColor', () => {
		it('returns a hex color string', () => {
			const color = _getRandomTagColor();
			expect(color).toMatch(/^#[0-9a-f]{6}$/);
		});

		it('returns one of the predefined colors when Math.random is controlled', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0);
			const color = _getRandomTagColor();
			// Math.random() returns 0 → index 0 → '#ef4444'
			expect(color).toBe('#ef4444');
			vi.restoreAllMocks();
		});

		it('returns last color when Math.random is near 1', () => {
			vi.spyOn(Math, 'random').mockReturnValue(0.999);
			const color = _getRandomTagColor();
			// Math.floor(0.999 * 9) = 8 → index 8 → '#6366f1'
			expect(color).toBe('#6366f1');
			vi.restoreAllMocks();
		});

		it('returns different colors on different random values', () => {
			const colors = new Set();
			// Call multiple times with controlled randomness to verify variety
			for (let i = 0; i < 20; i++) {
				vi.spyOn(Math, 'random').mockReturnValue(i / 20);
				colors.add(_getRandomTagColor());
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

		it('handles month-end overflow correctly (JS behavior)', () => {
			// Jan 31 + 1 month → JavaScript date.setMonth overflows to Mar 2
			// This is correct JS Date behavior (not a bug)
			const result = getNextDueDate('2024-01-31', 'monthly');
			expect(result).toBe('2024-03-02');
		});
	});
});
