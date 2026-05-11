import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthStore } from '../state/authStore.svelte.js';

// Mock @auth/sveltekit/client at top level so login/logout methods work in tests
vi.mock('@auth/sveltekit/client', () => ({
	signIn: vi.fn(),
	signOut: vi.fn()
}));

/**
 * Helper: create a minimal localStorage mock.
 */
function createMockLocalStorage(initialStore = {}) {
	const store = { ...initialStore };
	return {
		getItem: vi.fn((key) => store[key] ?? null),
		setItem: vi.fn((key, value) => {
			store[key] = String(value);
		}),
		removeItem: vi.fn((key) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			Object.keys(store).forEach((k) => delete store[k]);
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index) => Object.keys(store)[index] ?? null)
	};
}

describe('AuthStore', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', createMockLocalStorage());
		vi.stubGlobal('fetch', vi.fn());
		vi.stubGlobal('window', { location: { href: '' } });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('constructor / _init', () => {
		it('sets isLoading to true initially and resolves', async () => {
			// Mock fetch to simulate no session
			vi.mocked(fetch).mockResolvedValue({
				ok: false,
				json: async () => ({})
			});

			const auth = new AuthStore();
			expect(auth.isLoading).toBe(true);

			// Wait for _fetchSession to resolve
			await vi.waitFor(() => {
				expect(auth.isLoading).toBe(false);
			});
		});

		it('detects guest mode from localStorage and skips session fetch', () => {
			// Set up localStorage with guest mode BEFORE creating the store
			vi.unstubAllGlobals();
			const mockStore = { authMode: JSON.stringify('guest') };
			vi.stubGlobal('localStorage', createMockLocalStorage(mockStore));
			vi.stubGlobal('fetch', vi.fn());
			vi.stubGlobal('window', { location: { href: '' } });

			const auth = new AuthStore();
			expect(auth.isGuest).toBe(true);
			expect(auth.isLoading).toBe(false);
			expect(fetch).not.toHaveBeenCalled();
		});

		it('fetches session when no guest mode and logs in on valid session', async () => {
			const mockUser = {
				authUserId: 'google-123',
				email: 'test@example.com',
				name: 'Test User',
				picture: 'https://example.com/pic.jpg'
			};

			vi.mocked(fetch).mockResolvedValue({
				ok: true,
				json: async () => ({ user: mockUser })
			});

			const auth = new AuthStore();

			await vi.waitFor(() => {
				expect(auth.isLoading).toBe(false);
			});

			expect(fetch).toHaveBeenCalledWith('/auth/session');
			expect(auth.isLoggedIn).toBe(true);
			expect(auth.user).toEqual(mockUser);
		});

		it('handles session fetch failure gracefully', async () => {
			vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

			const auth = new AuthStore();

			await vi.waitFor(() => {
				expect(auth.isLoading).toBe(false);
			});

			expect(auth.isLoggedIn).toBe(false);
			expect(auth.user).toBeNull();
		});

		it('handles session fetch returning no user', async () => {
			vi.mocked(fetch).mockResolvedValue({
				ok: true,
				json: async () => ({ user: null })
			});

			const auth = new AuthStore();

			await vi.waitFor(() => {
				expect(auth.isLoading).toBe(false);
			});

			expect(auth.isLoggedIn).toBe(false);
			expect(auth.user).toBeNull();
		});
	});

	describe('continueAsGuest', () => {
		it('sets authMode in localStorage and redirects to /tasks', () => {
			const auth = new AuthStore();

			// Reset loading to true for this test
			auth.isLoading = true;
			auth.isGuest = false;

			auth.continueAsGuest();

			expect(window.location.href).toBe('/tasks');
			expect(auth.isGuest).toBe(true);
			expect(auth.isLoading).toBe(false);
		});
	});

	describe('clearGuestMode', () => {
		it('removes authMode from localStorage and sets isGuest to false', () => {
			const auth = new AuthStore();

			// Set up guest-like state
			auth.isGuest = true;
			localStorage.setItem('authMode', JSON.stringify('guest'));

			auth.clearGuestMode();

			expect(auth.isGuest).toBe(false);
			expect(localStorage.getItem('authMode')).toBeNull();
		});
	});

	describe('login and logout', () => {
		it('login dynamically imports and calls signIn', async () => {
			const auth = new AuthStore();
			auth.isLoading = false;

			await auth.login('google');

			// The mock from vi.mock is hoisted, so signIn is already mocked
			const { signIn } = await import('@auth/sveltekit/client');
			expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/tasks' });
		});

		it('logout dynamically imports and calls signOut', async () => {
			const auth = new AuthStore();

			await auth.logout();

			const { signOut } = await import('@auth/sveltekit/client');
			expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
		});
	});
});
