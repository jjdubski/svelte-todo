import { createContext } from 'svelte';
import { storageGet, storageSet, storageRemove } from '$lib/scripts/storage.js';

/** @type {Promise<typeof import('@auth/sveltekit/client')> | null} */
let _authClientPromise = null;

/**
 * Lazily load and cache the @auth/sveltekit/client module.
 * @returns {Promise<typeof import('@auth/sveltekit/client')>}
 */
function _getAuthClient() {
	if (!_authClientPromise) {
		_authClientPromise = import('@auth/sveltekit/client');
	}
	return _authClientPromise;
}

class AuthStore {
	/** @type {import('@auth/sveltekit').Session | null} */
	user = $state(null);
	/** @type {boolean} */
	isLoggedIn = $state(false);
	/** @type {boolean} */
	isLoading = $state(true);
	/** @type {boolean} */
	isGuest = $state(false);
	/** @type {number} */
	profilesVersion = $state(0);
	/** @type {(() => Promise<void>) | null} */
	_reloadTodos = null;

	constructor() {
		this._init();
	}

	/**
	 * Register a callback to reload todo data after a profile switch.
	 * Must be called from a component context (where getContext is valid).
	 * @param {() => Promise<void>} fn
	 */
	setReloadTodos(fn) {
		this._reloadTodos = fn;
	}

	/**
	 * Notify profile-dependent UI to re-fetch profiles.
	 */
	notifyProfilesChanged() {
		this.profilesVersion += 1;
	}

	_init() {
		const wasGuest = storageGet('authMode') === 'guest';
		this._fetchSession(wasGuest);
	}

	/**
	 * Fetch the session from the server.
	 * If a valid session exists, the user is logged in.
	 * If no session and the user was previously in guest mode, fall back to guest behavior.
	 *
	 * NOTE: We do NOT clear `authMode` here — the migration dialog handles that.
	 * @param {boolean} wasGuest
	 */
	async _fetchSession(wasGuest) {
		try {
			const res = await fetch('/auth/session');
			if (res.ok) {
				const data = await res.json();
				if (data?.user) {
					this.user = data.user;
					this.isLoggedIn = true;
					this.isLoading = false;

					// Ensure linked_profiles cookie exists (lazy-create on first sign-in)
					try {
						await fetch('/api/profiles/ensure', { method: 'POST' });
					} catch {
						// Non-critical — GET /api/profiles also creates it lazily
					}

					return;
				}
			}
		} catch (err) {
			console.error('[authStore] /auth/session request failed', err);
		}

		// No valid session found
		// Clean up abandoned "Add Account" flow (user backed out of OAuth)
		if (storageGet('_pendingProfileAction')) {
			storageRemove('_pendingProfileAction');
		}
		if (wasGuest) {
			this.isGuest = true;
		}
		this.isLoading = false;
	}

	/**
	 * Sign in with an OAuth provider.
	 * @param {string} provider
	 */
	async login(provider) {
		const { signIn } = await _getAuthClient();
		await signIn(provider, { callbackUrl: '/tasks' });
	}

	async logout() {
		storageRemove('_pendingProfileAction');
		const { signOut } = await _getAuthClient();
		await signOut({ callbackUrl: '/' });
	}

	/**
	 * Switch to a different linked profile.
	 * Uses a dedicated server endpoint that mutates Auth.js session cookies
	 * server-side (no client CSRF flow).
	 * @param {string} authUserId
	 */
	async switchToProfile(authUserId) {
		if (!authUserId || !this.user?.authUserId) {
			console.error('[authStore] switchToProfile missing identifiers', {
				targetAuthUserId: authUserId,
				currentAuthUserId: this.user?.authUserId || null
			});
			return;
		}

		let switchRes;
		let switchData = null;
		try {
			switchRes = await fetch('/api/profiles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetAuthUserId: authUserId,
					callbackUrl: window.location.pathname
				})
			});

			try {
				switchData = await switchRes.json();
			} catch {
				switchData = null;
			}
		} catch (err) {
			console.error('[authStore] switchToProfile request to /api/profiles failed', err);
			return;
		}

		if (!switchRes.ok || !switchData?.success) {
			console.error('[authStore] switchToProfile endpoint returned failure', {
				status: switchRes.status,
				data: switchData,
				targetAuthUserId: authUserId,
				currentAuthUserId: this.user?.authUserId || null
			});
			return;
		}

		// Session cookie has been updated server-side — re-fetch to sync client state
		try {
			const res = await fetch('/auth/session');
			if (res.ok) {
				const data = await res.json();
				if (data?.user) {
					this.user = data.user;
					this.isLoggedIn = true;
					this.isGuest = false;

					if (this.user?.authUserId !== authUserId) {
						console.error('[authStore] switch session did not change to target authUserId', {
							targetAuthUserId: authUserId,
							actualAuthUserId: this.user?.authUserId || null,
							switchResult: switchData
						});
					}
				}
			} else {
				console.error('[authStore] switchToProfile session refresh failed', {
					status: res.status,
					targetAuthUserId: authUserId,
					currentAuthUserId: this.user?.authUserId
				});
			}
		} catch (err) {
			console.error('[authStore] switchToProfile session refresh request error', err);
		}

		if (!this._reloadTodos) {
			console.error('[authStore] switchToProfile reload callback not registered');
		}
		await this._reloadTodos?.();
	}

	async addNewProfile() {
		storageSet('_pendingProfileAction', 'add');

		const { signIn } = await _getAuthClient();
		try {
			await signIn('google', { callbackUrl: '/profiles' });
		} catch (err) {
			storageRemove('_pendingProfileAction');
			console.error('[authStore] addNewProfile failed', {
				error: err,
				currentAuthUserId: this.user?.authUserId || null
			});
		}
	}

	async switchToGuest() {
		storageSet('authMode', 'guest');
		storageRemove('_pendingProfileAction');

		const { signOut } = await _getAuthClient();
		await signOut({ redirect: false });
		window.location.href = '/tasks';
	}

	async getSavedProfiles() {
		try {
			const res = await fetch('/api/profiles');
			if (!res.ok) return [];
			return await res.json();
		} catch {
			return [];
		}
	}

	async removeSavedProfile(authUserId) {
		try {
			await fetch(`/api/profiles/${encodeURIComponent(authUserId)}`, { method: 'DELETE' });
		} catch {
			// ignore
		}
	}

	continueAsGuest() {
		storageSet('authMode', 'guest');
		this.isGuest = true;
		this.isLoading = false;
		window.location.href = '/tasks';
	}

	clearGuestMode() {
		storageRemove('authMode');
		storageRemove('_pendingProfileAction');
		this.isGuest = false;
	}
}

/** @typedef {InstanceType<typeof AuthStore>} AuthStoreType */

export const [getAuthStore, setAuthStore] = createContext /** @type {AuthStoreType} */();

/**
 * Factory function to create a new AuthStore instance and set it in context.
 * @returns {AuthStoreType}
 */
export function createAuthStore() {
	const store = new AuthStore();
	setAuthStore(store);
	return store;
}

export { AuthStore };
