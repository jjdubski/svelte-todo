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
