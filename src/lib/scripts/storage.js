/**
 * Safe localStorage wrapper with error handling.
 * All operations gracefully handle SSR and storage errors (private browsing, quota, etc.)
 */

/**
 * Get a parsed JSON value from localStorage.
 * @param {string} key
 * @returns {any|null}
 */
export function storageGet(key) {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(key);
		if (raw === null) return null;
		return JSON.parse(raw);
	} catch (e) {
		console.warn(`[storage] get("${key}") failed:`, e);
		return null;
	}
}

/**
 * Set a JSON-serializable value in localStorage.
 * @param {string} key
 * @param {any} value
 */
export function storageSet(key, value) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (e) {
		console.warn(`[storage] set("${key}") failed:`, e);
	}
}

/**
 * Remove a key from localStorage.
 * @param {string} key
 */
export function storageRemove(key) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.removeItem(key);
	} catch (e) {
		console.warn(`[storage] remove("${key}") failed:`, e);
	}
}

/**
 * Get all guest data from localStorage for migration.
 * @returns {Record<string,any>}
 */
export function getGuestData() {
	try {
		return {
			todos: storageGet('todos') || [],
			archivedTodos: storageGet('archivedTodos') || [],
			customTags: storageGet('customTags') || [],
			tagColors: storageGet('tagColors') || {},
			darkMode: storageGet('darkMode'),
			settings: {
				notifications: {
					dueDateRemindersEnabled: storageGet('dueDateRemindersEnabled'),
					remindOverdueTasks: storageGet('remindOverdueTasks'),
					remindTodayTasks: storageGet('remindTodayTasks')
				},
				theme: {
					themePreset: storageGet('themePreset'),
					accentColor: storageGet('accentColor'),
					bgColor: storageGet('bgColor'),
					cardColor: storageGet('cardColor'),
					textColor: storageGet('textColor'),
					borderColor: storageGet('borderColor'),
					fontFamily: storageGet('fontFamily')
				},
				display: {
					fontFamily: storageGet('fontFamily')
				}
			}
		};
	} catch {
		return {};
	}
}

/**
 * Clear all guest data from localStorage.
 */
export function clearGuestData() {
	try {
		localStorage.removeItem('authMode');
		localStorage.removeItem('_pendingProfileAction');
		localStorage.removeItem('todos');
		localStorage.removeItem('archivedTodos');
		localStorage.removeItem('customTags');
		localStorage.removeItem('tagColors');
		localStorage.removeItem('darkMode');
		localStorage.removeItem('themePreset');
		localStorage.removeItem('accentColor');
		localStorage.removeItem('bgColor');
		localStorage.removeItem('cardColor');
		localStorage.removeItem('textColor');
		localStorage.removeItem('borderColor');
		localStorage.removeItem('fontFamily');
		localStorage.removeItem('dueDateRemindersEnabled');
		localStorage.removeItem('remindOverdueTasks');
		localStorage.removeItem('remindTodayTasks');
	} catch {
		// ignore
	}
}
