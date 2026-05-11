import { createContext } from 'svelte';
import { storageGet, storageSet, storageRemove } from '$lib/scripts/storage.js';

class AuthStore {
	/** @type {import('@auth/sveltekit').Session | null} */
	user = $state(null);
	/** @type {boolean} */
	isLoggedIn = $state(false);
	/** @type {boolean} */
	isLoading = $state(true);
	/** @type {boolean} */
	isGuest = $state(false);

	constructor() {
		this._init();
	}

	_init() {
		// Always try to fetch the session first — don't short-circuit on guest mode,
		// because the user may have authenticated since the last visit.
		const wasGuest = storageGet('authMode') === 'guest';
		this._fetchSession(wasGuest);
	}

	/**
	 * Fetch the session from the server.
	 * If a valid session exists, the user is logged in.
	 * If no session and the user was previously in guest mode, fall back to guest behavior.
	 *
	 * NOTE: We do NOT clear `authMode` here — the migration dialog handles that
	 * after it has had a chance to read the 'guest' marker and offer data migration.
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
					return;
				}
			}
		} catch {
			// Session fetch failed (offline or not logged in)
		}

		// No valid session found
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
		const { signIn } = await import('@auth/sveltekit/client');
		await signIn(provider, { callbackUrl: '/tasks' });
	}

	async logout() {
		const { signOut } = await import('@auth/sveltekit/client');
		await signOut({ callbackUrl: '/' });
	}

	continueAsGuest() {
		storageSet('authMode', 'guest');
		this.isGuest = true;
		this.isLoading = false;
		window.location.href = '/tasks';
	}

	clearGuestMode() {
		storageRemove('authMode');
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
