import { createContext } from 'svelte';
import { storageGet, storageSet, storageRemove } from '$lib/scripts/storage.js';

class AuthStore {
	/** @type {import('@auth/sveltekit').Session | null} */
	user = $state(null);
	/** @type {{ authUserId: string, email: string, name: string, picture: string, provider: string, lastUsed?: number | string | Date } | null} */
	activeProfile = $state(null);
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

					// Sync profile_family_id cookie for multi-account linking.
					// This is a fire-and-forget idempotent call — always run it
					// because HttpOnly cookies are invisible to document.cookie.
					if (data.user.familyId) {
						fetch('/api/profiles/family-sync', { method: 'POST' }).catch(() => {});
					}

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
		this.activeProfile = null;
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

	saveCurrentProfile() {
		if (!this.user?.authUserId) return;
		const savedProfiles =
			this.getSavedProfilesSync?.() || JSON.parse(localStorage.getItem('savedProfiles') || '[]');
		const entry = {
			authUserId: this.user.authUserId,
			email: this.user.email || '',
			name: this.user.name || '',
			picture: this.user.picture || '',
			provider: this.user.provider || 'google',
			lastUsed: Date.now()
		};
		const idx = savedProfiles.findIndex((profile) => profile.authUserId === entry.authUserId);
		if (idx === -1) savedProfiles.push(entry);
		else savedProfiles[idx] = { ...savedProfiles[idx], ...entry };
		localStorage.setItem('savedProfiles', JSON.stringify(savedProfiles));
	}

	/** @type {boolean} */
	_switchingProfile = false;

	async switchToProfile(authUserId) {
		if (this._switchingProfile) return;
		this._switchingProfile = true;
		try {
			const res = await fetch('/api/profiles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetAuthUserId: authUserId })
			});

			if (res.ok) {
				const data = await res.json();
				this.activeProfile = data.profile || null;

				// Reload todo data to reflect the active profile's content
				const { getTodoStore } = await import('./todoStore.svelte.js');
				await getTodoStore().loadFromApi();
			}
		} catch {
			// fallback
		} finally {
			this._switchingProfile = false;
		}
	}

	async addNewProfile() {
		this.saveCurrentProfile();
		storageSet('_pendingProfileAction', 'add');

		// Save the current user's familyId so the new account can be linked
		// to the same family after the OAuth flow completes.
		// This is more reliable than relying on the profile_family_id cookie
		// surviving the cross-site OAuth redirect.
		if (this.user?.familyId) {
			storageSet('_pendingProfileFamilyId', this.user.familyId);
		}

		const { signIn, signOut } = await import('@auth/sveltekit/client');
		await signOut({ redirect: false });
		await signIn('google', { callbackUrl: '/profiles' });
	}

	async switchToGuest() {
		this.saveCurrentProfile();
		storageSet('authMode', 'guest');

		const { signOut } = await import('@auth/sveltekit/client');
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

	getSavedProfilesSync() {
		const savedProfiles = storageGet('savedProfiles');
		return Array.isArray(savedProfiles) ? savedProfiles : [];
	}

	async removeSavedProfile(authUserId) {
		try {
			await fetch(`/api/profiles/${encodeURIComponent(authUserId)}`, { method: 'DELETE' });
		} catch {
			// ignore
		}
	}

	async loadActiveProfile() {
		if (!this.user?.authUserId) {
			this.activeProfile = null;
			return;
		}

		const profiles = await this.getSavedProfiles();
		this.activeProfile = profiles.find((profile) => profile.authUserId === this.user?.authUserId) || null;
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
