import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TodoStore } from '../state/todoStore.svelte.js';

function createMockLocalStorage(initialStore = {}) {
	const store = { ...initialStore };
	return {
		_store: store,
		getItem: vi.fn((key) => store[key] ?? null),
		setItem: vi.fn((key, value) => {
			store[key] = String(value);
		}),
		removeItem: vi.fn((key) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			Object.keys(store).forEach((key) => delete store[key]);
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index) => Object.keys(store)[index] ?? null)
	};
}

function installBrowserMocks(localStorageMock = createMockLocalStorage()) {
	vi.stubGlobal('localStorage', localStorageMock);
	vi.stubGlobal('window', {
		matchMedia: vi.fn().mockReturnValue({ matches: false }),
		addEventListener: vi.fn(),
		location: { href: '' }
	});
	vi.stubGlobal('document', {
		documentElement: {
			classList: { toggle: vi.fn() },
			style: {}
		}
	});
	return localStorageMock;
}

describe('TodoStore localStorage persistence and auth switching', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('hydrates guest todos, archived todos, custom tags, tag colors, and dark mode from localStorage', () => {
		const localStorageMock = installBrowserMocks(
			createMockLocalStorage({
				todos: JSON.stringify([
					{ id: '1', title: 'Guest task', completed: false, createdAt: '2026-05-01' },
					{ id: '1', title: 'Duplicate guest task', completed: false, createdAt: '2026-05-01' }
				]),
				archivedTodos: JSON.stringify([
					{ id: '2', title: 'Archived guest task', completed: true, createdAt: '2026-05-02' }
				]),
				customTags: JSON.stringify(['client-only']),
				tagColors: JSON.stringify({ 'client-only': '#123456' }),
				darkMode: JSON.stringify(true)
			})
		);

		const store = new TodoStore();

		expect(store.todos).toEqual([{ id: '1', title: 'Guest task', completed: false, createdAt: '2026-05-01' }]);
		expect(store.archivedTodos).toEqual([
			{ id: '2', title: 'Archived guest task', completed: true, createdAt: '2026-05-02' }
		]);
		expect(store.customTags).toEqual(['client-only']);
		expect(store.availableTags).toContain('client-only');
		expect(store.tagColors['client-only']).toBe('#123456');
		expect(store.darkMode).toBe(true);
		expect(localStorageMock.getItem).toHaveBeenCalledWith('todos');
	});

	it('refreshes cached todos from storage events and ignores corrupt replacement data', () => {
		const localStorageMock = installBrowserMocks(
			createMockLocalStorage({
				todos: JSON.stringify([{ id: '1', title: 'Initial', completed: false, createdAt: '2026-05-01' }]),
				archivedTodos: JSON.stringify([])
			})
		);
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const store = new TodoStore();

		localStorageMock._store.todos = JSON.stringify([
			{ id: '2', title: 'Updated from another tab', completed: false, createdAt: '2026-05-03' }
		]);
		store._handleStorageChange({ key: 'todos' });

		expect(store.todos).toEqual([
			{ id: '2', title: 'Updated from another tab', completed: false, createdAt: '2026-05-03' }
		]);

		localStorageMock._store.todos = 'not-json{{{';
		store._handleStorageChange({ key: 'todos' });

		expect(store.todos).toEqual([
			{ id: '2', title: 'Updated from another tab', completed: false, createdAt: '2026-05-03' }
		]);
		expect(warnSpy).toHaveBeenCalled();
	});

	it('replaces guest cache with authenticated API data when loadFromApi runs', async () => {
		installBrowserMocks(
			createMockLocalStorage({
				todos: JSON.stringify([
					{ id: 'guest-1', title: 'Local only', completed: false, createdAt: '2026-05-01' }
				])
			})
		);
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					todos: [{ id: 'server-1', title: 'Synced task', completed: false, createdAt: '2026-05-04' }],
					archivedTodos: [
						{ id: 'server-archived', title: 'Synced archive', completed: true, createdAt: '2026-05-05' }
					],
					customTags: ['synced-tag'],
					tagColors: { 'synced-tag': '#abcdef' },
					darkMode: true
				})
			})
		);
		const store = new TodoStore();
		store.setAuthStore({ isLoggedIn: true });

		await store.loadFromApi();

		expect(fetch).toHaveBeenCalledWith('/api/todos');
		expect(store.todos).toEqual([
			{ id: 'server-1', title: 'Synced task', completed: false, createdAt: '2026-05-04' }
		]);
		expect(store.archivedTodos).toEqual([
			{ id: 'server-archived', title: 'Synced archive', completed: true, createdAt: '2026-05-05' }
		]);
		expect(store.customTags).toEqual(['synced-tag']);
		expect(store.availableTags).toContain('synced-tag');
		expect(store.tagColors['synced-tag']).toBe('#abcdef');
		expect(store.darkMode).toBe(true);
	});

	it('does not fetch authenticated data while no auth store or login is present', async () => {
		installBrowserMocks();
		vi.stubGlobal('fetch', vi.fn());
		const store = new TodoStore();

		await store.loadFromApi();
		store.setAuthStore({ isLoggedIn: false });
		await store.loadFromApi();

		expect(fetch).not.toHaveBeenCalled();
	});
});
