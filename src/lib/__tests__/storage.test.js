import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storageGet, storageSet, storageRemove, storageAvailable } from '../storage.js';

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
});
