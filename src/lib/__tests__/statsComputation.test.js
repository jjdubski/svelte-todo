import { describe, it, expect } from 'vitest';
import {
	computeCombinedCompletionRate,
	computeCategoryBreakdown,
	computeCategoryPercentages
} from '../utils/todoUtils.js';

describe('computeCombinedCompletionRate', () => {
	it('returns 0 when both arrays are empty', () => {
		expect(computeCombinedCompletionRate([], [])).toBe(0);
	});

	it('returns 0 when all tasks are incomplete', () => {
		const todos = [
			{ id: 1, completed: false },
			{ id: 2, completed: false }
		];
		const archived = [{ id: 3, completed: false }];
		expect(computeCombinedCompletionRate(todos, archived)).toBe(0);
	});

	it('returns 100 when all tasks are complete', () => {
		const todos = [
			{ id: 1, completed: true },
			{ id: 2, completed: true }
		];
		const archived = [{ id: 3, completed: true }];
		expect(computeCombinedCompletionRate(todos, archived)).toBe(100);
	});

	it('combines active and archived todos correctly', () => {
		// 2 of 4 completed = 50%
		const todos = [
			{ id: 1, completed: true },
			{ id: 2, completed: false }
		];
		const archived = [
			{ id: 3, completed: true },
			{ id: 4, completed: false }
		];
		expect(computeCombinedCompletionRate(todos, archived)).toBe(50);
	});

	it('includes archived completed todos in rate (not dropping when archiving a completed task)', () => {
		// Active: 1 completed, 1 incomplete = 50%
		// Archived: 1 completed = 100%
		// Combined: 2 of 3 completed ≈ 67%
		const todos = [
			{ id: 1, completed: true },
			{ id: 2, completed: false }
		];
		const archived = [{ id: 3, completed: true }];
		expect(computeCombinedCompletionRate(todos, archived)).toBe(67);
	});

	it('adds archived incomplete todos to total (rate adjusts downward)', () => {
		// Active: 1 completed, 0 incomplete = 100%
		// Archived: 1 incomplete
		// Combined: 1 of 2 completed = 50%
		const todos = [{ id: 1, completed: true }];
		const archived = [{ id: 2, completed: false }];
		expect(computeCombinedCompletionRate(todos, archived)).toBe(50);
	});

	it('handles only archived todos (no active todos)', () => {
		const archived = [
			{ id: 1, completed: true },
			{ id: 2, completed: false },
			{ id: 3, completed: true }
		];
		// 2 of 3 completed ≈ 67%
		expect(computeCombinedCompletionRate([], archived)).toBe(67);
	});

	it('handles only active todos (no archived todos)', () => {
		const todos = [
			{ id: 1, completed: true },
			{ id: 2, completed: false }
		];
		expect(computeCombinedCompletionRate(todos, [])).toBe(50);
	});

	it('rounds the percentage', () => {
		// 1 of 3 completed ≈ 33.33% → rounds to 33
		const todos = [{ id: 1, completed: true }];
		const archived = [
			{ id: 2, completed: false },
			{ id: 3, completed: false }
		];
		expect(computeCombinedCompletionRate(todos, archived)).toBe(33);

		// 1 of 6 completed ≈ 16.67% → rounds to 17
		const todos2 = [{ id: 1, completed: true }];
		const archived2 = [
			{ id: 2, completed: false },
			{ id: 3, completed: false },
			{ id: 4, completed: false },
			{ id: 5, completed: false },
			{ id: 6, completed: false }
		];
		expect(computeCombinedCompletionRate(todos2, archived2)).toBe(17);
	});
});

describe('computeCategoryPercentages', () => {
	it('returns empty object for empty breakdown', () => {
		expect(computeCategoryPercentages({})).toEqual({});
	});

	it('returns 100% for a single category', () => {
		expect(computeCategoryPercentages({ Work: 5 })).toEqual({ Work: 100 });
	});

	it('computes correct percentages for multiple categories', () => {
		// Work: 3, Personal: 1 → total 4 → 75%, 25%
		const breakdown = { Work: 3, Personal: 1 };
		const result = computeCategoryPercentages(breakdown);
		expect(result).toEqual({ Work: 75, Personal: 25 });
	});

	it('percentages always sum to approximately 100% (within rounding)', () => {
		// With 3 categories of 1 each: 33 + 33 + 33 = 99 (rounding)
		const breakdown = { A: 1, B: 1, C: 1 };
		const result = computeCategoryPercentages(breakdown);
		const sum = Object.values(result).reduce((s, v) => s + v, 0);
		expect(sum).toBeGreaterThanOrEqual(99);
		expect(sum).toBeLessThanOrEqual(101);
	});

	it('handles zero counts gracefully', () => {
		// Even if a category has 0 count, it should get 0%
		const breakdown = { Work: 0, Personal: 5 };
		const result = computeCategoryPercentages(breakdown);
		expect(result.Work).toBe(0);
		expect(result.Personal).toBe(100);
	});

	it('handles breakdown with only zero counts', () => {
		const breakdown = { Work: 0, Personal: 0 };
		const result = computeCategoryPercentages(breakdown);
		expect(result).toEqual({ Work: 0, Personal: 0 });
	});
});

describe('computeCategoryBreakdown (combined with percentages)', () => {
	it('correctly breaks down categories from both active and archived todos', () => {
		const todos = [
			{ id: 1, category: 'Work' },
			{ id: 2, category: 'Personal' }
		];
		const archived = [
			{ id: 3, category: 'Work' },
			{ id: 4, category: 'Ideas' }
		];
		const breakdown = computeCategoryBreakdown([...todos, ...archived]);
		expect(breakdown).toEqual({ Work: 2, Personal: 1, Ideas: 1 });
	});

	it('computes percentages from combined breakdown that sum to 100%', () => {
		const todos = [
			{ id: 1, category: 'Work' },
			{ id: 2, category: 'Work' },
			{ id: 3, category: 'Personal' }
		];
		const archived = [
			{ id: 4, category: 'Work' },
			{ id: 5, category: 'Ideas' },
			{ id: 6, category: 'Ideas' }
		];
		// Combined: Work=3, Personal=1, Ideas=2 → total=6
		// Work: 50%, Personal: 17%, Ideas: 33% → sum=100
		const breakdown = computeCategoryBreakdown([...todos, ...archived]);
		const percentages = computeCategoryPercentages(breakdown);
		expect(percentages).toEqual({ Work: 50, Personal: 17, Ideas: 33 });
		const sum = Object.values(percentages).reduce((s, v) => s + v, 0);
		expect(sum).toBe(100);
	});

	it('only archived categories are reflected in breakdown', () => {
		const todos = [
			{ id: 1, category: '' }, // no category
			{ id: 2 } // no category field
		];
		const archived = [
			{ id: 3, category: 'Work' },
			{ id: 4, category: 'Personal' }
		];
		const breakdown = computeCategoryBreakdown([...todos, ...archived]);
		expect(breakdown).toEqual({ Work: 1, Personal: 1 });
		const percentages = computeCategoryPercentages(breakdown);
		expect(percentages).toEqual({ Work: 50, Personal: 50 });
	});

	it('no categories at all produces empty breakdown and percentages', () => {
		const todos = [{ id: 1 }, { id: 2 }];
		const archived = [{ id: 3 }, { id: 4 }];
		const breakdown = computeCategoryBreakdown([...todos, ...archived]);
		expect(breakdown).toEqual({});
		const percentages = computeCategoryPercentages(breakdown);
		expect(percentages).toEqual({});
	});

	it('mixed: some todos have categories, some do not', () => {
		const todos = [
			{ id: 1, category: 'Work' },
			{ id: 2 } // no category
		];
		const archived = [{ id: 3, category: 'Personal' }];
		const breakdown = computeCategoryBreakdown([...todos, ...archived]);
		expect(breakdown).toEqual({ Work: 1, Personal: 1 });
		const percentages = computeCategoryPercentages(breakdown);
		expect(percentages).toEqual({ Work: 50, Personal: 50 });
	});
});
