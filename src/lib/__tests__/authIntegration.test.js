import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TodoStore } from '../state/todoStore.svelte.js';

/**
 * Create a minimal mock auth store that can be attached to a TodoStore.
 */
function createMockAuthStore(isLoggedIn = false, isGuest = false) {
	return {
		isLoggedIn,
		isGuest,
		clearGuestMode: vi.fn(),
		user: isLoggedIn ? { authUserId: 'test-123', email: 'test@example.com' } : null
	};
}

describe('TodoStore API sync layer', () => {
	/** @type {import('../state/todoStore.svelte.js').default} */
	let store;

	beforeEach(() => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			get length() {
				return 0;
			},
			key: vi.fn(() => null)
		});
		vi.stubGlobal('fetch', vi.fn());
		vi.stubGlobal('window', {
			location: { href: '' },
			matchMedia: vi.fn().mockReturnValue({ matches: false }),
			addEventListener: vi.fn()
		});

		store = new TodoStore();
		store.showToast = vi.fn();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('setAuthStore', () => {
		it('accepts an auth store reference', () => {
			const mockAuth = createMockAuthStore();
			store.setAuthStore(mockAuth);
			expect(store._auth).toBe(mockAuth);
		});
	});

	describe('_syncToApi', () => {
		it('does nothing when user is not logged in', async () => {
			const mockAuth = createMockAuthStore(false);
			store.setAuthStore(mockAuth);

			await store._syncToApi('POST', '/api/todos', { title: 'Test' });

			expect(fetch).not.toHaveBeenCalled();
		});

		it('does nothing when auth is not set', async () => {
			store._auth = null;

			await store._syncToApi('POST', '/api/todos', { title: 'Test' });

			expect(fetch).not.toHaveBeenCalled();
		});

		it('fires fetch when user is logged in', async () => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
			vi.mocked(fetch).mockResolvedValue({ ok: true });

			await store._syncToApi('POST', '/api/todos', { title: 'Test' });

			expect(fetch).toHaveBeenCalledWith('/api/todos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: 'Test' })
			});
		});

		it('sends request without body for methods that do not need one', async () => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
			vi.mocked(fetch).mockResolvedValue({ ok: true });

			await store._syncToApi('DELETE', '/api/todos/1');

			expect(fetch).toHaveBeenCalledWith('/api/todos/1', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: undefined
			});
		});

		it('shows a toast when the API returns an error', async () => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
			vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 });

			await store._syncToApi('POST', '/api/todos', { title: 'Test' });

			expect(store.showToast).toHaveBeenCalledWith(
				'Could not sync to cloud. Your changes are saved locally.',
				'warning'
			);
		});

		it('redirects to login on 401', async () => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
			vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 });

			await store._syncToApi('POST', '/api/todos', { title: 'Test' });

			expect(mockAuth.clearGuestMode).toHaveBeenCalled();
			expect(window.location.href).toBe('/');
		});

		it('shows a toast when fetch throws (network error)', async () => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
			vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

			await store._syncToApi('POST', '/api/todos', { title: 'Test' });

			expect(store.showToast).toHaveBeenCalledWith(
				'Could not sync to cloud. Your changes are saved locally.',
				'warning'
			);
		});
	});

	describe('CRUD sync helpers', () => {
		it('_syncCreate calls _syncToApi with POST', () => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
			const spy = vi.spyOn(store, '_syncToApi');

			const todo = { id: 1, title: 'Test', completed: false, createdAt: '2025-01-01' };
			store._syncCreate(todo);

			expect(spy).toHaveBeenCalledWith('POST', '/api/todos', todo);
		});

		it('_syncUpdate calls _syncToApi with PUT', () => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
			const spy = vi.spyOn(store, '_syncToApi');

			store._syncUpdate(1, { title: 'Updated' });

			expect(spy).toHaveBeenCalledWith('PUT', '/api/todos/1', { title: 'Updated' });
		});

		it('_syncDelete calls _syncToApi with DELETE', () => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
			const spy = vi.spyOn(store, '_syncToApi');

			store._syncDelete(1);

			expect(spy).toHaveBeenCalledWith('DELETE', '/api/todos/1');
		});

		it('_syncBatch calls _syncToApi with POST and ids', () => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
			const spy = vi.spyOn(store, '_syncToApi');

			store._syncBatch('/api/todos/archive', [1, 2, 3]);

			expect(spy).toHaveBeenCalledWith('POST', '/api/todos/archive', { ids: [1, 2, 3] });
		});

		it('_syncPermanentDelete calls _syncToApi with POST and id', () => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
			const spy = vi.spyOn(store, '_syncToApi');

			store._syncPermanentDelete(5);

			expect(spy).toHaveBeenCalledWith('POST', '/api/todos/permanent-delete', { id: 5 });
		});
	});

	describe('CRUD operations call sync methods', () => {
		beforeEach(() => {
			const mockAuth = createMockAuthStore(true);
			store.setAuthStore(mockAuth);
		});

		it('addTodo calls _syncCreate', () => {
			const spy = vi.spyOn(store, '_syncCreate');
			store.addTodo('New Task', '', '', 'medium', 'Work', [], '', []);
			expect(spy).toHaveBeenCalled();
		});

		it('updateTodo calls _syncUpdate', () => {
			store.todos = [{ id: 1, title: 'Test', completed: false, createdAt: '2025-01-01' }];
			const spy = vi.spyOn(store, '_syncUpdate');
			store.updateTodo(1, { title: 'Updated' });
			expect(spy).toHaveBeenCalledWith(1, { title: 'Updated' });
		});

		it('deleteTodo calls _syncDelete', () => {
			store.todos = [{ id: 1, title: 'Test', completed: false, createdAt: '2025-01-01' }];
			const spy = vi.spyOn(store, '_syncDelete');
			store.deleteTodo(1);
			expect(spy).toHaveBeenCalledWith(1);
		});

		it('restoreTodo calls _syncBatch', () => {
			store.archivedTodos = [
				{ id: 1, title: 'Archived', completed: true, createdAt: '2025-01-01' }
			];
			const spy = vi.spyOn(store, '_syncBatch');
			store.restoreTodo(1);
			expect(spy).toHaveBeenCalledWith('/api/todos/restore', [1]);
		});

		it('permanentDeleteTodo calls _syncPermanentDelete', () => {
			store.archivedTodos = [
				{ id: 1, title: 'Archived', completed: true, createdAt: '2025-01-01' }
			];
			const spy = vi.spyOn(store, '_syncPermanentDelete');
			store.permanentDeleteTodo(1);
			expect(spy).toHaveBeenCalledWith(1);
		});
	});
});
