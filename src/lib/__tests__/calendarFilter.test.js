import { describe, it, expect } from 'vitest';

/**
 * Tests for the calendar filtering logic used in DayDetailModal.svelte.
 *
 * The DayDetailModal component computes:
 *   filteredTasks = $derived(store.todos.filter(t => t.dueDate === selectedDate))
 *
 * This is a pure function — no store or DOM dependency — tested here in isolation.
 */

function filterByDate(todos, selectedDate) {
	if (!selectedDate) return [];
	return todos.filter((t) => t.dueDate === selectedDate);
}

describe('DayDetailModal — date filtering', () => {
	const sampleTodos = [
		{ id: '1', title: 'Meeting with team', dueDate: '2026-05-13', priority: 'high' },
		{ id: '2', title: 'Buy groceries', dueDate: '2026-05-14', priority: 'low' },
		{ id: '3', title: 'Dentist appointment', dueDate: '2026-05-13', priority: 'medium' },
		{ id: '4', title: 'Write report', dueDate: '2026-05-20', priority: 'high' },
		{ id: '5', title: 'No due date task', dueDate: undefined, priority: 'medium' }
	];

	it('returns only todos whose dueDate exactly matches the selected date', () => {
		const result = filterByDate(sampleTodos, '2026-05-13');
		expect(result).toHaveLength(2);
		expect(result.map((t) => t.id)).toEqual(['1', '3']);
	});

	it('returns a single todo when only one matches', () => {
		const result = filterByDate(sampleTodos, '2026-05-20');
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('4');
	});

	it('returns empty array when no tasks match the selected date', () => {
		const result = filterByDate(sampleTodos, '2026-05-01');
		expect(result).toEqual([]);
	});

	it('returns empty array when selectedDate is null (modal hidden)', () => {
		const result = filterByDate(sampleTodos, null);
		expect(result).toEqual([]);
	});

	it('returns empty array when selectedDate is undefined', () => {
		const result = filterByDate(sampleTodos, undefined);
		expect(result).toEqual([]);
	});

	it('excludes todos without a dueDate field', () => {
		const result = filterByDate(sampleTodos, '2026-05-13');
		expect(result.every((t) => t.dueDate !== undefined)).toBe(true);
	});

	it('handles empty todos array', () => {
		expect(filterByDate([], '2026-05-13')).toEqual([]);
	});

	it('is case-insensitive to necessity — dueDate comparison is exact string match', () => {
		const todos = [
			{ id: '1', title: 'A', dueDate: '2026-05-13' },
			{ id: '2', title: 'B', dueDate: '2026-05-13' }
		];
		// The exact string match is the intended behavior
		expect(filterByDate(todos, '2026-05-13')).toHaveLength(2);
		// A slightly different string like '2026-5-13' should NOT match
		expect(filterByDate(todos, '2026-5-13')).toHaveLength(0);
	});
});

/**
 * Tests for the formattedDate derivation used in DayDetailModal.
 *
 * The DayDetailModal computes:
 *   formattedDate = $derived(
 *     selectedDate
 *       ? new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
 *           weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
 *         })
 *       : ''
 *   )
 *
 * We test the non-null branch with a known date and the null/undefined guard.
 */
describe('DayDetailModal — formatted date', () => {
	function formatModalDate(selectedDate) {
		if (!selectedDate) return '';
		return new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	it('returns a formatted date string containing year, month, and day', () => {
		const result = formatModalDate('2026-05-13');
		expect(result).toContain('2026');
		expect(result).toContain('13');
		// Month name should be present (locale-dependent, but 'May' in en-US)
		expect(result.length).toBeGreaterThan(15);
	});

	it('returns empty string when selectedDate is null', () => {
		expect(formatModalDate(null)).toBe('');
	});

	it('returns empty string when selectedDate is undefined', () => {
		expect(formatModalDate(undefined)).toBe('');
	});
});

/**
 * Tests for the tasks grouped-by-date derivation used in the Calendar page.
 *
 * The Calendar page computes:
 *   tasksByDate = $derived.by(() => {
 *     const map = {};
 *     store.todos.forEach((todo) => {
 *       if (todo.dueDate) {
 *         if (!map[todo.dueDate]) map[todo.dueDate] = [];
 *         map[todo.dueDate].push(todo);
 *       }
 *     });
 *     return map;
 *   });
 */
describe('Calendar page — tasks grouped by date', () => {
	function groupByDate(todos) {
		const map = {};
		todos.forEach((todo) => {
			if (todo.dueDate) {
				if (!map[todo.dueDate]) map[todo.dueDate] = [];
				map[todo.dueDate].push(todo);
			}
		});
		return map;
	}

	it('groups multiple todos on the same date together', () => {
		const todos = [
			{ id: '1', title: 'A', dueDate: '2026-05-13' },
			{ id: '2', title: 'B', dueDate: '2026-05-13' },
			{ id: '3', title: 'C', dueDate: '2026-05-14' }
		];
		const grouped = groupByDate(todos);
		expect(grouped['2026-05-13']).toHaveLength(2);
		expect(grouped['2026-05-14']).toHaveLength(1);
	});

	it('excludes todos without a dueDate', () => {
		const todos = [
			{ id: '1', title: 'A', dueDate: '2026-05-13' },
			{ id: '2', title: 'B' } // no dueDate
		];
		const grouped = groupByDate(todos);
		expect(Object.keys(grouped)).toEqual(['2026-05-13']);
	});

	it('returns empty object for empty todos', () => {
		expect(groupByDate([])).toEqual({});
	});

	it('returns empty object when no todos have dueDate', () => {
		const todos = [
			{ id: '1', title: 'A' },
			{ id: '2', title: 'B' }
		];
		expect(groupByDate(todos)).toEqual({});
	});

	it('preserves todo objects in the grouped result', () => {
		const todos = [{ id: '1', title: 'A', dueDate: '2026-05-13', priority: 'high' }];
		const grouped = groupByDate(todos);
		expect(grouped['2026-05-13'][0].title).toBe('A');
		expect(grouped['2026-05-13'][0].priority).toBe('high');
	});
});
