/**
 * Safe localStorage wrapper with error handling.
 * All operations gracefully handle SSR and storage errors (private browsing, quota, etc.)
 */

/**
 * Check if localStorage is available and writable.
 * @returns {boolean}
 */
export function storageAvailable() {
	try {
		const key = '__storage_test__';
		localStorage.setItem(key, '1');
		localStorage.removeItem(key);
		return true;
	} catch {
		return false;
	}
}

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
 * Check if user is in guest mode.
 * @returns {boolean}
 */
export function isGuestMode() {
	try {
		return localStorage.getItem('authMode') === 'guest';
	} catch {
		return false;
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
			categories: storageGet('categories'),
			categoryColors: storageGet('categoryColors'),
			availableTags: storageGet('availableTags'),
			tagColors: storageGet('tagColors'),
			templates: storageGet('templates'),
			darkMode: storageGet('darkMode')
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
		localStorage.removeItem('todos');
		localStorage.removeItem('archivedTodos');
		localStorage.removeItem('categories');
		localStorage.removeItem('categoryColors');
		localStorage.removeItem('availableTags');
		localStorage.removeItem('tagColors');
		localStorage.removeItem('templates');
		localStorage.removeItem('darkMode');
		localStorage.removeItem('filterText');
		localStorage.removeItem('filterStatus');
		localStorage.removeItem('filterCategory');
		localStorage.removeItem('sortBy');
		localStorage.removeItem('filterTags');
		localStorage.removeItem('filterPriority');
		localStorage.removeItem('filterDateFrom');
		localStorage.removeItem('filterDateTo');
	} catch {
		// ignore
	}
}
