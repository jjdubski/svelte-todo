/**
 * Utility functions for todo operations.
 * These are pure functions extracted from the TodoStore for testability.
 */

import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';

/**
 * Format a Date as YYYY-MM-DD in the local timezone.
 * @param {Date} [date] - The date to format, defaults to now
 * @returns {string} The formatted date string (YYYY-MM-DD)
 */
export function localDateStr(date = new Date()) {
	return format(date, 'yyyy-MM-dd');
}

/**
 * Simple character-wise fuzzy match.
 * Returns true if all characters of `query` appear in order within `text`.
 * @param {string} query - The search query
 * @param {string} text - The text to search in
 * @returns {boolean} True if all query characters appear in order in text
 */
export function fuzzyMatch(query, text) {
	if (!query) return true;
	const q = query.toLowerCase();
	const t = text.toLowerCase();
	let qi = 0;
	for (let ti = 0; ti < t.length && qi < q.length; ti++) {
		if (t[ti] === q[qi]) qi++;
	}
	return qi === q.length;
}

/**
 * @typedef {Object} Stats
 * @property {number} active
 * @property {number} completed
 * @property {number} overdue
 * @property {number} total
 */

/**
 * Compute statistics from a list of todos.
 * @param {Array} todos - Array of todo objects
 * @returns {Stats} Statistics object with active, completed, overdue, and total counts
 */
export function computeStats(todos) {
	const today = localDateStr();
	const active = todos.filter((t) => !t.completed).length;
	const completed = todos.filter((t) => t.completed).length;
	const overdue = todos.filter((t) => !t.completed && t.dueDate && t.dueDate < today).length;
	return { active, completed, overdue, total: todos.length };
}

/**
 * Count consecutive days (from today backward) with at least one completion.
 * @param {Array} todos - Array of todo objects
 * @returns {number} The streak count
 */
export function computeStreak(todos) {
	const completed = todos.filter((t) => t.completed && t.completedAt);
	if (completed.length === 0) return 0;
	const completionDates = new Set(completed.map((t) => localDateStr(new Date(t.completedAt))));
	let streak = 0;
	for (let i = 0; ; i++) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		const dateStr = localDateStr(d);
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
 * @param {Array} todos - Array of todo objects
 * @returns {Record<string, number>} Completion counts by day
 */
export function computeCompletionsByDay(todos) {
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
		const completedDate = new Date(todo.completedAt);
		if (completedDate >= monday) {
			const day = completedDate.getDay();
			counts[labels[day]]++;
		}
	}
	return counts;
}

/**
 * Count tasks by priority level.
 * @param {Array} todos - Array of todo objects
 * @returns {{high: number, medium: number, low: number}} Priority distribution
 */
export function computePriorityDistribution(todos) {
	const result = { high: 0, medium: 0, low: 0 };
	for (const t of todos) {
		const p = t.priority || 'medium';
		if (p in result) result[p]++;
	}
	return result;
}

/**
 * Count tasks by category.
 * @param {Array} todos - Array of todo objects
 * @returns {Record<string, number>} Category breakdown
 */
export function computeCategoryBreakdown(todos) {
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
 * @param {Array} todos - Array of todo objects
 * @returns {Array} Array of overdue todos
 */
export function computeOverdueTasks(todos) {
	const today = localDateStr();
	return todos.filter((t) => !t.completed && t.dueDate && t.dueDate < today);
}

/**
 * Compute tasks due within the next 2 days (not completed), sorted by date.
 * @param {Array} todos - Array of todo objects
 * @returns {Array} Array of upcoming due todos
 */
export function computeUpcomingDue(todos) {
	const today = new Date();
	const todayStr = localDateStr(today);
	const twoDaysStr = localDateStr(addDays(today, 2));

	return todos
		.filter((t) => !t.completed && t.dueDate && t.dueDate >= todayStr && t.dueDate <= twoDaysStr)
		.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/**
 * Get a random tag color from predefined colors.
 * @returns {string} A hex color string
 */
export function getRandomTagColor() {
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

/**
 * Get the next due date for a recurring task.
 * @param {string} currentDate - Current due date (YYYY-MM-DD)
 * @param {string} recurring - Recurrence type ('daily', 'weekly', 'monthly', 'yearly')
 * @returns {string} Next due date (YYYY-MM-DD) or empty string if invalid
 */
export function getNextDueDate(currentDate, recurring) {
	if (!currentDate || !recurring) return '';
	const parts = currentDate.split('-');
	const date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
	switch (recurring) {
		case 'daily':
			return localDateStr(addDays(date, 1));
		case 'weekly':
			return localDateStr(addWeeks(date, 1));
		case 'monthly':
			return localDateStr(addMonths(date, 1));
		case 'yearly':
			return localDateStr(addYears(date, 1));
		default:
			return '';
	}
}

// Export Date-fns functions for convenience
export { format, addDays, addWeeks, addMonths, addYears };
