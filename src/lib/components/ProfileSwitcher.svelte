<script>
	import { User, X } from 'lucide-svelte';
	import { getAuthStore } from '$lib/state/authStore.svelte.js';

	const auth = getAuthStore();

	let savedProfiles = $state([]);
	let profilesError = $state('');

	/**
	 * Validate and normalize a raw profile entry from storage.
	 * Returns null for invalid entries so a single bad entry doesn't
	 * fail the entire profiles list.
	 * @param {unknown} entry
	 * @returns {import('$lib/state/authStore.svelte.js').ProfileEntry | null}
	 */
	function normalizeProfile(entry) {
		if (!entry || typeof entry !== 'object' || typeof entry.authUserId !== 'string' || !entry.authUserId) {
			return null;
		}

		let lastUsed = 0;
		if (typeof entry.lastUsed === 'number') {
			lastUsed = entry.lastUsed;
		} else if (typeof entry.lastUsed === 'string' || entry.lastUsed instanceof Date) {
			const parsed = new Date(entry.lastUsed).getTime();
			lastUsed = Number.isFinite(parsed) ? parsed : 0;
		}

		return {
			authUserId: entry.authUserId,
			email: typeof entry.email === 'string' ? entry.email : '',
			name: typeof entry.name === 'string' ? entry.name : '',
			picture: typeof entry.picture === 'string' ? entry.picture : '',
			provider: typeof entry.provider === 'string' ? entry.provider : 'google',
			lastUsed
		};
	}

	async function loadSavedProfiles() {
		profilesError = '';
		savedProfiles = [];

		try {
			const raw = await auth.getSavedProfiles();
			if (!Array.isArray(raw)) return;
			if (raw.length === 0) return;

			const validated = raw.map(normalizeProfile).filter(Boolean);
			if (validated.length === 0 && raw.length > 0) {
				profilesError = 'Saved profile data is corrupted. Clear browser storage and sign in again.';
				return;
			}

			savedProfiles = validated;
		} catch {
			profilesError = 'Failed to load profiles.';
		}
	}

	$effect(() => {
		// Access activeProfile to refresh list after profile switch
		const _activeProfile = auth.activeProfile;
		if (!auth.isLoading) {
			void _activeProfile;
			loadSavedProfiles();
		}
	});

	let currentProfile = $derived(
		auth.user?.authUserId
			? {
					authUserId: auth.user.authUserId,
					email: auth.user.email || '',
					name: auth.user.name || '',
					picture: auth.user.picture || '',
					provider: auth.user.provider || 'google',
					lastUsed: Date.now()
				}
			: null
	);

	let profiles = $derived.by(() => {
		const deduped = [];

		for (const profile of savedProfiles) {
			const existingIndex = deduped.findIndex((entry) => entry.authUserId === profile.authUserId);
			if (existingIndex === -1) {
				deduped.push(profile);
			} else {
				deduped[existingIndex] = {
					...deduped[existingIndex],
					...profile
				};
			}
		}

		if (currentProfile) {
			const existingIndex = deduped.findIndex((entry) => entry.authUserId === currentProfile.authUserId);
			if (existingIndex === -1) {
				deduped.push(currentProfile);
			} else {
				deduped[existingIndex] = {
					...deduped[existingIndex],
					...currentProfile
				};
			}
		}

		return deduped.sort((a, b) => b.lastUsed - a.lastUsed);
	});

	let showGuestCard = $derived(auth.isGuest || !auth.isLoggedIn);
	let hasProfiles = $derived(profiles.length > 0);
	let showPrimarySignIn = $derived(!auth.isLoggedIn && !auth.isGuest && !hasProfiles);

	async function handleSwitchProfile(authUserId) {
		if (!authUserId) return;
		await auth.switchToProfile(authUserId);
	}

	async function handleAddAccount() {
		await auth.addNewProfile();
	}

	async function handleSwitchToGuest() {
		await auth.switchToGuest();
	}

	async function handleRemoveProfile(authUserId) {
		await auth.removeSavedProfile(authUserId);
		await loadSavedProfiles();
	}

	function getInitial(profile) {
		return (profile.name || profile.email || '?')[0].toUpperCase();
	}
</script>

{#snippet googleIcon()}
	<svg class="h-5 w-5" viewBox="0 0 24 24">
		<path
			fill="#4285F4"
			d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
		/>
		<path
			fill="#34A853"
			d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
		/>
		<path
			fill="#FBBC05"
			d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
		/>
		<path
			fill="#EA4335"
			d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
		/>
	</svg>
{/snippet}

{#if auth.isLoading}
	<div class="flex w-full max-w-md items-center justify-center rounded-2xl border p-8" style="background: var(--card-bg); border-color: var(--border); box-shadow: 0 8px 32px var(--shadow);">
		<div class="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" style="border-color: var(--border); border-top-color: var(--btn-primary);"></div>
	</div>
{:else if profilesError}
	<div class="w-full max-w-md rounded-2xl border p-6" style="background: var(--card-bg); border-color: var(--border); box-shadow: 0 8px 32px var(--shadow);">
		<h1 class="text-xl font-bold" style="color: var(--text-heading);">Profile Error</h1>
		<p class="mt-2 text-sm" style="color: var(--text-secondary);">{profilesError}</p>
		<button type="button" class="mt-4 cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white" style="background: var(--btn-primary);" onclick={loadSavedProfiles}>
			Try again
		</button>
	</div>
{:else if showPrimarySignIn}
	<div class="w-full max-w-md rounded-2xl border p-6" style="background: var(--card-bg); border-color: var(--border); box-shadow: 0 8px 32px var(--shadow);">
		<h1 class="text-xl font-bold" style="color: var(--text-heading);">Sign in to get started</h1>
		<p class="mt-2 text-sm" style="color: var(--text-secondary);">No saved profiles were found on this device.</p>

		<button type="button" onclick={handleAddAccount} class="mt-5 flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all hover:shadow-md" style="background: #ffffff; border-color: #dadce0; color: #1f2937;">
			{@render googleIcon()}
			Sign in with Google
		</button>
	</div>
{:else}
	<div class="w-full max-w-md rounded-2xl border p-5" style="background: var(--card-bg); border-color: var(--border); box-shadow: 0 8px 32px var(--shadow);">
		<h1 class="text-xl font-bold" style="color: var(--text-heading);">Switch profile</h1>
		<p class="mt-1 text-sm" style="color: var(--text-secondary);">Choose an account for this device.</p>

		<div class="mt-4 space-y-2">
			{#each profiles as profile (profile.authUserId)}
				{@const isActive = (auth.activeProfile?.authUserId ?? auth.user?.authUserId) === profile.authUserId}
				<div class="profile-row flex items-center gap-2 rounded-xl border p-2" style="background: var(--input-bg); border-color: var(--border);">
					<button
						type="button"
						onclick={() => handleSwitchProfile(profile.authUserId)}
						disabled={isActive || !profile.authUserId}
						class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-1 py-1 text-left disabled:cursor-default"
					>
						{#if profile.picture}
							<img src={profile.picture} alt="" class="h-10 w-10 rounded-full" />
						{:else}
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
								style="background: var(--btn-primary);"
							>
								{getInitial(profile)}
							</div>
						{/if}

						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold" style="color: var(--text);">{profile.name || 'Google Account'}</p>
							<p class="truncate text-xs" style="color: var(--text-secondary);">{profile.email}</p>
						</div>

						{#if isActive}
							<span class="rounded-full px-2 py-0.5 text-xs font-medium" style="background: var(--card-bg); color: var(--text-secondary);">
								Active
							</span>
						{:else}
							<span class="rounded-full px-2 py-0.5 text-xs font-medium text-white" style="background: var(--btn-primary);">
								Switch
							</span>
						{/if}
					</button>

					<button
						type="button"
						onclick={() => handleRemoveProfile(profile.authUserId)}
						disabled={isActive}
						class="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent disabled:cursor-not-allowed disabled:opacity-30"
						class:cursor-pointer={!isActive}
						style="color: var(--text-muted);"
						aria-label={`Remove ${profile.email || profile.name || 'profile'}`}
					>
						<X size={16} />
					</button>
				</div>
			{/each}

			{#if showGuestCard}
				<div class="profile-row flex items-center gap-2 rounded-xl border p-2" style="background: var(--input-bg); border-color: var(--border);">
					<button
						type="button"
						onclick={handleSwitchToGuest}
						disabled={auth.isGuest}
						class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-1 py-1 text-left disabled:cursor-default"
					>
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full"
							style="background: var(--card-bg); color: var(--text-secondary);"
						>
							<User size={18} />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold" style="color: var(--text);">Guest</p>
							<p class="truncate text-xs" style="color: var(--text-secondary);">Local data</p>
						</div>

						{#if auth.isGuest}
							<span class="rounded-full px-2 py-0.5 text-xs font-medium" style="background: var(--card-bg); color: var(--text-secondary);">
								Active
							</span>
						{:else}
							<span class="rounded-full px-2 py-0.5 text-xs font-medium text-white" style="background: var(--btn-primary);">
								Switch
							</span>
						{/if}
					</button>
				</div>
			{/if}
		</div>

		{#if auth.isGuest}
			<div class="mt-4 border-t pt-4" style="border-color: var(--border);">
				<button type="button" onclick={handleAddAccount} class="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all hover:shadow-md" style="background: #ffffff; border-color: #dadce0; color: #1f2937;">
					{@render googleIcon()}
					Sign in with Google
				</button>
			</div>
		{:else}
			<div class="mt-4 border-t pt-4" style="border-color: var(--border);">
				<button type="button" onclick={handleAddAccount} class="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all hover:shadow-md" style="background: #ffffff; border-color: #dadce0; color: #1f2937;">
					{@render googleIcon()}
					Add another Google account
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.profile-row {
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.profile-row:hover {
		border-color: var(--btn-primary);
	}
</style>
