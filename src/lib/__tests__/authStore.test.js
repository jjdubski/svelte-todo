import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthStore } from '../state/authStore.svelte.js';
import { storageGet } from '../scripts/storage.js';

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
			vi.mocked(fetch).mockResolvedValue({
				ok: false,
				json: async () => ({})
			});

			const auth = new AuthStore();
			expect(auth.isLoading).toBe(true);

			await vi.waitFor(() => {
				expect(auth.isLoading).toBe(false);
			});
		});

		it('falls back to guest mode when session fetch fails and authMode was guest', async () => {
			vi.unstubAllGlobals();
			const mockStore = { authMode: JSON.stringify('guest') };
			vi.stubGlobal('localStorage', createMockLocalStorage(mockStore));
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
			vi.stubGlobal('window', { location: { href: '' } });

			const auth = new AuthStore();
			expect(auth.isLoading).toBe(true);

			await vi.waitFor(() => {
				expect(auth.isLoading).toBe(false);
			});

			expect(fetch).toHaveBeenCalledWith('/auth/session');
			expect(auth.isGuest).toBe(true);
		});

		it('leaves guest mode marker when session is found (migration dialog handles clearing)', async () => {
			vi.unstubAllGlobals();
			const mockStore = { authMode: JSON.stringify('guest') };
			vi.stubGlobal('localStorage', createMockLocalStorage(mockStore));
			vi.stubGlobal(
				'fetch',
				vi.fn().mockImplementation((url) => {
					if (url === '/auth/session') {
						return Promise.resolve({
							ok: true,
							json: async () => ({
								user: { authUserId: 'google-123', email: 'test@example.com', name: 'Test User' }
							})
						});
					}
					// /api/profiles/ensure
					return Promise.resolve({ ok: true, json: async () => ({}) });
				})
			);
			vi.stubGlobal('window', { location: { href: '' } });

			const auth = new AuthStore();

			await vi.waitFor(() => {
				expect(auth.isLoading).toBe(false);
			});

			expect(auth.isLoggedIn).toBe(true);
			expect(auth.isGuest).toBe(false);
			expect(localStorage.getItem('authMode')).toBe(JSON.stringify('guest'));
		});

		it('fetches session when no guest mode and logs in on valid session', async () => {
			const mockUser = {
				authUserId: 'google-123',
				email: 'test@example.com',
				name: 'Test User',
				picture: 'https://example.com/pic.jpg'
			};

			vi.mocked(fetch).mockImplementation((url) => {
				if (url === '/auth/session') {
					return Promise.resolve({ ok: true, json: async () => ({ user: mockUser }) });
				}
				return Promise.resolve({ ok: true, json: async () => ({}) });
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
			auth.isLoading = true;
			auth.isGuest = false;

			auth.continueAsGuest();

			expect(window.location.href).toBe('/tasks');
			expect(auth.isGuest).toBe(true);
			expect(auth.isLoading).toBe(false);
		});
	});

	describe('clearGuestMode', () => {
		it('removes authMode and pending flags from localStorage and sets isGuest to false', () => {
			const auth = new AuthStore();
			auth.isGuest = true;
			localStorage.setItem('authMode', JSON.stringify('guest'));
			localStorage.setItem('_pendingProfileAction', JSON.stringify('add'));

			auth.clearGuestMode();

			expect(auth.isGuest).toBe(false);
			expect(localStorage.getItem('authMode')).toBeNull();
			expect(localStorage.getItem('_pendingProfileAction')).toBeNull();
		});
	});

	describe('login and logout', () => {
		it('login dynamically imports and calls signIn', async () => {
			const auth = new AuthStore();
			auth.isLoading = false;

			await auth.login('google');

			const { signIn } = await import('@auth/sveltekit/client');
			expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/tasks' });
		});

		it('logout clears pending flags and calls signOut', async () => {
			const auth = new AuthStore();
			localStorage.setItem('_pendingProfileAction', JSON.stringify('add'));

			await auth.logout();

			const { signOut } = await import('@auth/sveltekit/client');
			expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
			expect(localStorage.getItem('_pendingProfileAction')).toBeNull();
		});
	});

	// ---------------------------------------------------------------------------
	// Multi-profile switching — Credentials provider based
	// ---------------------------------------------------------------------------

	describe('switchToProfile', () => {
		it('calls /api/profiles POST with targetAuthUserId', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true })
			});
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ user: { ...auth.user, authUserId: 'google-target' } })
			});

			await auth.switchToProfile('google-target');

			expect(fetch).toHaveBeenCalledWith('/api/profiles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetAuthUserId: 'google-target',
					callbackUrl: window.location.pathname
				})
			});
		});

		it('re-fetches session and calls reloadTodos callback on successful switch', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			const reloadTodos = vi.fn().mockResolvedValue(undefined);
			auth.setReloadTodos(reloadTodos);

			const switchedUser = {
				authUserId: 'google-target',
				email: 'target@example.com',
				name: 'Target User'
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true })
			});
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ user: switchedUser })
			});

			await auth.switchToProfile('google-target');

			expect(fetch).toHaveBeenCalledWith('/auth/session');
			expect(auth.user).toEqual(switchedUser);
			expect(reloadTodos).toHaveBeenCalledOnce();
		});

		it('returns early when no targetAuthUserId provided', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current' };

			vi.mocked(fetch).mockClear();
			await auth.switchToProfile('');

			expect(fetch).not.toHaveBeenCalledWith('/api/profiles', expect.anything());
		});

		it('returns early when current user is missing', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = null;

			vi.mocked(fetch).mockClear();
			await auth.switchToProfile('google-target');

			expect(fetch).not.toHaveBeenCalledWith('/api/profiles', expect.anything());
		});

		it('does not update session when /api/profiles switch fails', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({ success: false, error: 'Switch failed' })
			});

			await auth.switchToProfile('google-target');

			expect(auth.user?.authUserId).toBe('google-current');
		});
	});

	describe('addNewProfile', () => {
		it('sets _pendingProfileAction to "add"', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			const { signIn } = await import('@auth/sveltekit/client');
			vi.mocked(signIn).mockClear();

			await auth.addNewProfile();

			expect(storageGet('_pendingProfileAction')).toBe('add');
		});

		it('clears _pendingProfileAction on error', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			const { signIn } = await import('@auth/sveltekit/client');
			vi.mocked(signIn).mockRejectedValue(new Error('Sign in failed'));

			await auth.addNewProfile();

			expect(storageGet('_pendingProfileAction')).toBeNull();
		});

		it('calls signIn with google provider', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			const { signIn } = await import('@auth/sveltekit/client');
			vi.mocked(signIn).mockClear();

			await auth.addNewProfile();

			expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/profiles' });
		});
	});

	describe('switchToGuest', () => {
		it('sets authMode to guest, signs out, clears pending flags, and redirects', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };
			localStorage.setItem('_pendingProfileAction', JSON.stringify('add'));

			const { signOut } = await import('@auth/sveltekit/client');
			vi.mocked(signOut).mockClear();

			await auth.switchToGuest();

			expect(storageGet('authMode')).toBe('guest');
			expect(storageGet('_pendingProfileAction')).toBeNull();
			expect(signOut).toHaveBeenCalledWith({ redirect: false });
			expect(window.location.href).toBe('/tasks');
		});
	});

	describe('getSavedProfiles', () => {
		it('returns empty array when API returns no profiles', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => []
			});

			const result = await auth.getSavedProfiles();
			expect(result).toEqual([]);
		});

		it('returns profiles from API', async () => {
			const mockProfiles = [
				{ authUserId: 'google-123', email: 'a@b.com', name: 'A', lastUsed: 100 },
				{ authUserId: 'google-456', email: 'c@d.com', name: 'C', lastUsed: 200 }
			];

			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockProfiles
			});

			const result = await auth.getSavedProfiles();
			expect(fetch).toHaveBeenCalledWith('/api/profiles');
			expect(result).toEqual(mockProfiles);
		});

		it('returns empty array on fetch failure', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));

			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			const result = await auth.getSavedProfiles();
			expect(result).toEqual([]);
		});

		it('returns empty array when API returns non-ok status', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({ error: 'Server error' })
			});

			const result = await auth.getSavedProfiles();
			expect(result).toEqual([]);
		});
	});

	describe('removeSavedProfile', () => {
		it('sends DELETE request for the correct authUserId', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));

			await auth.removeSavedProfile('google-222');

			expect(fetch).toHaveBeenCalledWith(
				'/api/profiles/google-222',
				expect.objectContaining({ method: 'DELETE' })
			);
		});

		it('handles remove gracefully when fetch fails', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));

			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			await expect(auth.removeSavedProfile('google-222')).resolves.toBeUndefined();
		});

		it('handles API error response gracefully', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: async () => ({})
			});

			await expect(auth.removeSavedProfile('nonexistent')).resolves.toBeUndefined();
		});
	});
});
