import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	storageGet,
	storageSet,
	storageRemove,
	storageAvailable,
	isGuestMode,
	getGuestData,
	clearGuestData
} from '../scripts/storage.js';

describe('storage', () => {
	let mockStore = {};

	beforeEach(() => {
		mockStore = {};
		const mockStorage = {
			getItem: vi.fn((key) => mockStore[key] ?? null),
			setItem: vi.fn((key, value) => {
				mockStore[key] = String(value);
			}),
			removeItem: vi.fn((key) => {
				delete mockStore[key];
			}),
			clear: vi.fn(() => {
				mockStore = {};
			}),
			get length() {
				return Object.keys(mockStore).length;
			},
			key: vi.fn((index) => Object.keys(mockStore)[index] ?? null)
		};
		vi.stubGlobal('localStorage', mockStorage);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('storageGet', () => {
		it('returns null when key does not exist', () => {
			const result = storageGet('nonexistent');
			expect(result).toBeNull();
			expect(localStorage.getItem).toHaveBeenCalledWith('nonexistent');
		});

		it('returns parsed value when key exists', () => {
			mockStore['mykey'] = JSON.stringify({ foo: 'bar' });
			const result = storageGet('mykey');
			expect(result).toEqual({ foo: 'bar' });
		});

		it('returns null and warns on invalid JSON', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			mockStore['bad'] = 'not-json{{{';
			const result = storageGet('bad');
			expect(result).toBeNull();
			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});

		it('returns null when localStorage.getItem throws', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			localStorage.getItem.mockImplementationOnce(() => {
				throw new Error('storage error');
			});
			const result = storageGet('key');
			expect(result).toBeNull();
			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});
	});

	describe('storageSet', () => {
		it('stores JSON-serialized value', () => {
			storageSet('key', { a: 1, b: 2 });
			expect(localStorage.setItem).toHaveBeenCalledWith('key', JSON.stringify({ a: 1, b: 2 }));
			expect(mockStore['key']).toBe(JSON.stringify({ a: 1, b: 2 }));
		});

		it('warns on error (e.g. quota exceeded)', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			localStorage.setItem.mockImplementationOnce(() => {
				throw new DOMException('QuotaExceededError', 'QuotaExceededError');
			});
			storageSet('key', 'value');
			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});
	});

	describe('storageRemove', () => {
		it('removes a key', () => {
			mockStore['key'] = 'value';
			storageRemove('key');
			expect(localStorage.removeItem).toHaveBeenCalledWith('key');
			expect(mockStore['key']).toBeUndefined();
		});

		it('warns on error', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			localStorage.removeItem.mockImplementationOnce(() => {
				throw new Error('permission denied');
			});
			storageRemove('key');
			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});
	});

	describe('storageAvailable', () => {
		it('returns true when localStorage works', () => {
			const result = storageAvailable();
			expect(result).toBe(true);
		});

		it('returns false when localStorage throws', () => {
			localStorage.setItem.mockImplementationOnce(() => {
				throw new Error('denied');
			});
			const result = storageAvailable();
			expect(result).toBe(false);
		});
	});

	// ── New storage helpers ──

	describe('isGuestMode', () => {
		it('returns true when authMode is "guest" (raw value)', () => {
			// isGuestMode uses localStorage.getItem directly (not storageGet),
			// so it compares the raw string value without JSON parsing.
			mockStore['authMode'] = 'guest';
			const result = isGuestMode();
			expect(result).toBe(true);
		});

		it('returns false when authMode is not set', () => {
			const result = isGuestMode();
			expect(result).toBe(false);
		});

		it('returns false when authMode is some other raw value', () => {
			mockStore['authMode'] = 'signed-in';
			const result = isGuestMode();
			expect(result).toBe(false);
		});

		it('returns false on localStorage error', () => {
			localStorage.getItem.mockImplementationOnce(() => {
				throw new Error('access denied');
			});
			const result = isGuestMode();
			expect(result).toBe(false);
		});
	});

	describe('getGuestData', () => {
		it('returns all guest data fields', () => {
			mockStore['todos'] = JSON.stringify([{ id: 1, title: 'Test' }]);
			mockStore['archivedTodos'] = JSON.stringify([{ id: 2, title: 'Archived' }]);
			mockStore['customTags'] = JSON.stringify(['custom-tag']);
			mockStore['tagColors'] = JSON.stringify({ 'custom-tag': '#ef4444' });
			mockStore['darkMode'] = JSON.stringify(true);

			const data = getGuestData();
			expect(data).toEqual({
				todos: [{ id: 1, title: 'Test' }],
				archivedTodos: [{ id: 2, title: 'Archived' }],
				customTags: ['custom-tag'],
				tagColors: { 'custom-tag': '#ef4444' },
				darkMode: true
			});
		});

		it('returns empty arrays for missing todos/archivedTodos', () => {
			const data = getGuestData();
			expect(data.todos).toEqual([]);
			expect(data.archivedTodos).toEqual([]);
		});

		it('returns empty array/map for missing customTags/tagColors and null for darkMode', () => {
			const data = getGuestData();
			expect(data.customTags).toEqual([]);
			expect(data.tagColors).toEqual({});
			expect(data.darkMode).toBeNull();
		});

		it('handles localStorage errors gracefully (storageGet catches internally)', () => {
			// storageGet catches errors from localStorage.getItem and returns null;
			// getGuestData's outer try/catch is a safety net for non-storageGet errors.
			// Spy on console.warn to avoid noisy test output (storageGet intentionally warns).
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			localStorage.getItem.mockImplementation(() => {
				throw new Error('storage error');
			});
			const data = getGuestData();
			// storageGet catches the error, warns, and returns null for each key.
			// Then || [] converts null to [] for todos/archivedTodos.
			expect(data.todos).toEqual([]);
			expect(data.archivedTodos).toEqual([]);
			expect(data.customTags).toEqual([]);
			expect(data.tagColors).toEqual({});
			expect(data.darkMode).toBeNull();
			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});
	});

	describe('clearGuestData', () => {
		it('removes all auth and todo keys', () => {
			mockStore['authMode'] = JSON.stringify('guest');
			mockStore['_localDataSynced'] = JSON.stringify(true);
			mockStore['todos'] = JSON.stringify([{ id: 1, title: 'Test' }]);
			mockStore['archivedTodos'] = JSON.stringify([]);
			mockStore['categories'] = JSON.stringify(['Work']);
			mockStore['categoryColors'] = JSON.stringify({});
			mockStore['availableTags'] = JSON.stringify([]);
			mockStore['customTags'] = JSON.stringify([]);
			mockStore['tagColors'] = JSON.stringify({});
			mockStore['templates'] = JSON.stringify([]);
			mockStore['darkMode'] = JSON.stringify(false);
			mockStore['filterText'] = JSON.stringify('');
			mockStore['filterStatus'] = JSON.stringify('all');
			mockStore['filterCategory'] = JSON.stringify('');
			mockStore['sortBy'] = JSON.stringify('manual');
			mockStore['filterTags'] = JSON.stringify([]);
			mockStore['filterPriority'] = JSON.stringify('all');
			mockStore['filterDateFrom'] = JSON.stringify('');
			mockStore['filterDateTo'] = JSON.stringify('');

			clearGuestData();

			expect(mockStore['authMode']).toBeUndefined();
			expect(mockStore['_localDataSynced']).toBeUndefined();
			expect(mockStore['todos']).toBeUndefined();
			expect(mockStore['archivedTodos']).toBeUndefined();
			expect(mockStore['categories']).toBeUndefined();
			expect(mockStore['categoryColors']).toBeUndefined();
			expect(mockStore['availableTags']).toBeUndefined();
			expect(mockStore['customTags']).toBeUndefined();
			expect(mockStore['tagColors']).toBeUndefined();
			expect(mockStore['templates']).toBeUndefined();
			expect(mockStore['darkMode']).toBeUndefined();
			expect(mockStore['filterText']).toBeUndefined();
			expect(mockStore['filterStatus']).toBeUndefined();
			expect(mockStore['filterCategory']).toBeUndefined();
			expect(mockStore['sortBy']).toBeUndefined();
			expect(mockStore['filterTags']).toBeUndefined();
			expect(mockStore['filterPriority']).toBeUndefined();
			expect(mockStore['filterDateFrom']).toBeUndefined();
			expect(mockStore['filterDateTo']).toBeUndefined();
		});

		it('does not throw when localStorage.removeItem throws', () => {
			localStorage.removeItem.mockImplementation(() => {
				throw new Error('denied');
			});
			expect(() => clearGuestData()).not.toThrow();
		});
	});

	describe('SSR safety (no localStorage)', () => {
		beforeEach(() => {
			vi.unstubAllGlobals();
		});

		it('storageGet returns null when localStorage is undefined (SSR)', () => {
			const result = storageGet('anykey');
			expect(result).toBeNull();
		});

		it('storageSet does not throw when localStorage is undefined (SSR)', () => {
			expect(() => storageSet('key', 'value')).not.toThrow();
		});

		it('storageRemove does not throw when localStorage is undefined (SSR)', () => {
			expect(() => storageRemove('key')).not.toThrow();
		});

		it('storageAvailable returns false when localStorage is undefined (SSR)', () => {
			const result = storageAvailable();
			expect(result).toBe(false);
		});

		it('isGuestMode returns false when localStorage is undefined (SSR)', () => {
			const result = isGuestMode();
			expect(result).toBe(false);
		});

		it('getGuestData fields are null/[] when localStorage is undefined (SSR)', () => {
			const result = getGuestData();
			// storageGet returns null when localStorage is undefined
			expect(result.todos).toEqual([]); // null || [] = []
			expect(result.archivedTodos).toEqual([]);
			expect(result.customTags).toEqual([]);
			expect(result.darkMode).toBeNull();
		});

		it('clearGuestData does not throw when localStorage is undefined (SSR)', () => {
			expect(() => clearGuestData()).not.toThrow();
		});
	});
});
