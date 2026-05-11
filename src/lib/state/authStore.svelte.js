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
		// Check if user was using guest mode
		const guestMode = storageGet('authMode');
		if (guestMode === 'guest') {
			this.isGuest = true;
			this.isLoading = false;
			return;
		}
		// Fetch session from server
		this._fetchSession();
	}

	async _fetchSession() {
		try {
			const res = await fetch('/auth/session');
			if (res.ok) {
				const data = await res.json();
				if (data?.user) {
					this.user = data.user;
					this.isLoggedIn = true;
				}
			}
		} catch {
			// Session fetch failed (offline or not logged in)
		} finally {
			this.isLoading = false;
		}
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
