import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthStore } from '../state/authStore.svelte.js';
import { storageGet, storageSet } from '../scripts/storage.js';

// Mock @auth/sveltekit/client at top level so login/logout methods work in tests
vi.mock('@auth/sveltekit/client', () => ({
	signIn: vi.fn(),
	signOut: vi.fn()
}));

// Mock todoStore so dynamic import in switchToProfile doesn't cause side effects
vi.mock('../state/todoStore.svelte.js', () => ({
	getTodoStore: vi.fn(() => ({
		loadFromApi: vi.fn().mockResolvedValue(undefined)
	}))
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

		it('falls back to guest mode when session fetch fails and authMode was guest', async () => {
			// Set up localStorage with guest mode BEFORE creating the store
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

			// Session fetch was attempted even though authMode was 'guest'
			expect(fetch).toHaveBeenCalledWith('/auth/session');
			// Falls back to guest mode when no session
			expect(auth.isGuest).toBe(true);
		});

		it('leaves guest mode marker when session is found (migration dialog handles clearing)', async () => {
			vi.unstubAllGlobals();
			const mockStore = { authMode: JSON.stringify('guest') };
			vi.stubGlobal('localStorage', createMockLocalStorage(mockStore));
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: async () => ({
						user: {
							authUserId: 'google-123',
							email: 'test@example.com',
							name: 'Test User'
						}
					})
				})
			);
			vi.stubGlobal('window', { location: { href: '' } });

			const auth = new AuthStore();

			await vi.waitFor(() => {
				expect(auth.isLoading).toBe(false);
			});

			// User is logged in, not guest
			expect(auth.isLoggedIn).toBe(true);
			expect(auth.isGuest).toBe(false);
			// authMode is NOT cleared here — it's left for the migration dialog to handle
			expect(localStorage.getItem('authMode')).toBe(JSON.stringify('guest'));
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

	// ---------------------------------------------------------------------------
	// Multi-profile switching — Option B (API-based)
	// ---------------------------------------------------------------------------

	describe('saveCurrentProfile', () => {
		it('returns early when auth.user is null', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = null;

			auth.saveCurrentProfile();

			expect(localStorage.getItem('savedProfiles')).toBeNull();
		});

		it('returns early when auth.user has no authUserId', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { email: 'test@example.com', name: 'No Auth ID' };

			auth.saveCurrentProfile();

			expect(localStorage.getItem('savedProfiles')).toBeNull();
		});

		it('creates a new profile entry in localStorage', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = {
				authUserId: 'google-123',
				email: 'test@example.com',
				name: 'Test User',
				picture: 'https://example.com/pic.jpg'
			};

			auth.saveCurrentProfile();

			const profiles = auth.getSavedProfilesSync();
			expect(profiles).toHaveLength(1);
			expect(profiles[0]).toMatchObject({
				authUserId: 'google-123',
				email: 'test@example.com',
				name: 'Test User',
				picture: 'https://example.com/pic.jpg',
				provider: 'google'
			});
			expect(typeof profiles[0].lastUsed).toBe('number');
		});

		it('defaults missing provider to "google"', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-123', email: 'test@example.com' };

			auth.saveCurrentProfile();

			const profiles = auth.getSavedProfilesSync();
			expect(profiles[0].provider).toBe('google');
		});

		it('defaults missing optional fields to empty string', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-123' };

			auth.saveCurrentProfile();

			const profiles = auth.getSavedProfilesSync();
			expect(profiles[0].email).toBe('');
			expect(profiles[0].name).toBe('');
			expect(profiles[0].picture).toBe('');
		});

		it('updates existing profile instead of adding duplicate', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));

			auth.user = { authUserId: 'google-123', email: 'old@example.com', name: 'Old Name' };
			auth.saveCurrentProfile();

			auth.user = { authUserId: 'google-123', email: 'new@example.com', name: 'New Name' };
			auth.saveCurrentProfile();

			const profiles = auth.getSavedProfilesSync();
			expect(profiles).toHaveLength(1);
			expect(profiles[0].email).toBe('new@example.com');
			expect(profiles[0].name).toBe('New Name');
		});

		it('sets lastUsed to a reasonable timestamp', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-123', email: 'test@example.com' };

			const before = Date.now();
			auth.saveCurrentProfile();
			const after = Date.now();

			const profiles = auth.getSavedProfilesSync();
			expect(profiles[0].lastUsed).toBeGreaterThanOrEqual(before);
			expect(profiles[0].lastUsed).toBeLessThanOrEqual(after);
		});

		it('does not affect other profiles when saving', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));

			// Seed an existing profile via storageSet (compatible with getSavedProfilesSync)
			storageSet('savedProfiles', [
				{ authUserId: 'google-other', email: 'other@example.com', name: 'Other', lastUsed: 100 }
			]);

			auth.user = { authUserId: 'google-123', email: 'test@example.com', name: 'Test' };
			auth.saveCurrentProfile();

			const profiles = auth.getSavedProfilesSync();
			expect(profiles).toHaveLength(2);
			expect(profiles.find((p) => p.authUserId === 'google-other')).toBeTruthy();
			expect(profiles.find((p) => p.authUserId === 'google-123')).toBeTruthy();
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

			// Should not throw
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

			// Should not throw when API returns non-ok
			await expect(auth.removeSavedProfile('nonexistent')).resolves.toBeUndefined();
		});
	});

	describe('switchToProfile', () => {
		it('calls POST /api/profiles with target authUserId', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					targetAuthUserId: 'google-target',
					profile: { authUserId: 'google-target', email: 'target@example.com', name: 'Target' }
				})
			});

			await auth.switchToProfile('google-target');

			expect(fetch).toHaveBeenCalledWith('/api/profiles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetAuthUserId: 'google-target' })
			});
		});

		it('sets activeProfile from API response', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					targetAuthUserId: 'google-target',
					profile: { authUserId: 'google-target', email: 'target@example.com', name: 'Target' }
				})
			});

			await auth.switchToProfile('google-target');

			expect(auth.activeProfile).toEqual({
				authUserId: 'google-target',
				email: 'target@example.com',
				name: 'Target'
			});
		});

		it('handles fetch failure gracefully (activeProfile unchanged)', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			// Should not throw
			await expect(auth.switchToProfile('google-target')).resolves.toBeUndefined();
			// activeProfile should remain unchanged (null)
			expect(auth.activeProfile).toBeNull();
		});

		it('does not change activeProfile when API returns non-ok status', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({})
			});

			await auth.switchToProfile('google-target');

			expect(auth.activeProfile).toBeNull();
		});
	});

	describe('addNewProfile', () => {
		it('saves current profile and sets _pendingProfileAction to "add"', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			const { signIn, signOut } = await import('@auth/sveltekit/client');
			vi.mocked(signIn).mockClear();
			vi.mocked(signOut).mockClear();

			await auth.addNewProfile();

			expect(auth.getSavedProfilesSync()).toHaveLength(1);
			expect(storageGet('_pendingProfileAction')).toBe('add');
		});

		it('calls signOut then signIn without login_hint', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			const { signIn, signOut } = await import('@auth/sveltekit/client');
			vi.mocked(signIn).mockClear();
			vi.mocked(signOut).mockClear();

			const callOrder = [];
			vi.mocked(signOut).mockImplementation(() => { callOrder.push('signOut'); });
			vi.mocked(signIn).mockImplementation(() => { callOrder.push('signIn'); });

			await auth.addNewProfile();

			expect(signOut).toHaveBeenCalledWith({ redirect: false });
			expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/profiles' });
			expect(callOrder).toEqual(['signOut', 'signIn']);
		});
	});

	describe('switchToGuest', () => {
		it('saves profile, sets authMode to guest, signs out, and redirects to /tasks', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-current', email: 'current@example.com' };

			const { signOut } = await import('@auth/sveltekit/client');
			vi.mocked(signOut).mockClear();

			await auth.switchToGuest();

			// Current profile saved
			expect(auth.getSavedProfilesSync()).toHaveLength(1);
			expect(auth.getSavedProfilesSync()[0].authUserId).toBe('google-current');

			// authMode set to guest
			expect(storageGet('authMode')).toBe('guest');

			// signOut called
			expect(signOut).toHaveBeenCalledWith({ redirect: false });

			// Redirect
			expect(window.location.href).toBe('/tasks');
		});

		it('does not save profile when user is null', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = null;

			const { signOut } = await import('@auth/sveltekit/client');
			vi.mocked(signOut).mockClear();

			await auth.switchToGuest();

			// No profile should have been saved (user was null)
			expect(auth.getSavedProfilesSync()).toEqual([]);

			// Still sets guest mode and signs out
			expect(storageGet('authMode')).toBe('guest');
			expect(signOut).toHaveBeenCalledWith({ redirect: false });
			expect(window.location.href).toBe('/tasks');
		});

		it('does not save profile when user has no authUserId', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { email: 'incomplete@example.com' };

			const { signOut } = await import('@auth/sveltekit/client');
			vi.mocked(signOut).mockClear();

			await auth.switchToGuest();

			expect(auth.getSavedProfilesSync()).toEqual([]);
			expect(storageGet('authMode')).toBe('guest');
			expect(signOut).toHaveBeenCalledWith({ redirect: false });
			expect(window.location.href).toBe('/tasks');
		});
	});

	describe('loadActiveProfile', () => {
		it('sets activeProfile to the matching profile from API', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-123', email: 'test@example.com' };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{ authUserId: 'google-123', email: 'test@example.com', name: 'Test' },
					{ authUserId: 'google-456', email: 'other@example.com', name: 'Other' }
				]
			});

			await auth.loadActiveProfile();
			expect(auth.activeProfile?.authUserId).toBe('google-123');
			expect(auth.activeProfile?.email).toBe('test@example.com');
		});

		it('sets activeProfile to null when user has no authUserId', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = null;

			await auth.loadActiveProfile();
			expect(auth.activeProfile).toBeNull();
		});

		it('sets activeProfile to null when user object lacks authUserId', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { email: 'incomplete@example.com' };

			await auth.loadActiveProfile();
			expect(auth.activeProfile).toBeNull();
		});

		it('sets activeProfile to null when no matching profile is found', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-999', email: 'unknown@example.com' };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{ authUserId: 'google-123', email: 'test@example.com', name: 'Test' }
				]
			});

			await auth.loadActiveProfile();
			expect(auth.activeProfile).toBeNull();
		});

		it('handles API failure gracefully and sets activeProfile to null', async () => {
			const auth = new AuthStore();
			await vi.waitFor(() => expect(auth.isLoading).toBe(false));
			auth.user = { authUserId: 'google-123', email: 'test@example.com' };

			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			await auth.loadActiveProfile();
			// getSavedProfiles returns [] on error, so find returns undefined → activeProfile is null
			expect(auth.activeProfile).toBeNull();
		});
	});
});
