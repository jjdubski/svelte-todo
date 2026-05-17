<script>
	import '../app.css';
	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { fade } from 'svelte/transition';
	import { createTodoStore } from '$lib/state/todoStore.svelte.js';
	import { createAuthStore } from '$lib/state/authStore.svelte.js';
	import { createThemeStore } from '$lib/state/themeStore.svelte.js';
	import { storageGet, storageRemove } from '$lib/scripts/storage.js';
	import { materialEasing } from '$lib/utils/motion.js';
	import { page } from '$app/stores';
	import NavBar from '$lib/components/NavBar.svelte';
	import MigrationDialog from '$lib/components/MigrationDialog.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import HelpButton from '$lib/components/HelpButton.svelte';

	let { children } = $props();

	// Initialize stores and wire auth into todo store for API sync
	const _todoStore = createTodoStore();
	const _authStore = createAuthStore();
	createThemeStore(_authStore);
	_todoStore.setAuthStore(_authStore);

	let attemptedBackgroundSync = $state(false);

	// All pages in the (app) group — these share the same layout wrapper
	const appGroupPaths = ['/board', '/archived', '/stats', '/tasks', '/calendar', '/settings'];

	let transitionDuration = $state(200);

	async function registerBackgroundSync() {
		if (typeof window === 'undefined') return;
		if ('serviceWorker' in navigator && 'PeriodicSyncManager' in window) {
			try {
				const registration = await navigator.serviceWorker.ready;
				await registration.periodicSync.register('overdue-check', {
					minInterval: 24 * 60 * 60 * 1000
				});
			} catch {
				// PeriodicSync not supported or permission denied
			}
		}
	}

	// If the user has local data (todos in localStorage), the MigrationDialog handles
	// syncing it to the server and then calls loadFromApi. If there's no local data,
	// or the data was already synced in a previous session, load directly from the
	// server so the user sees their account data.
	$effect(() => {
		if (!_authStore.isLoading && _authStore.isLoggedIn && !_authStore.isGuest) {
			const pendingAction = storageGet('_pendingProfileAction');
			if (pendingAction) {
				_authStore.saveCurrentProfile();

				// If adding a new account, link the new account to the previous
				// account's profile family (handles family linking when the
				// profile_family_id cookie doesn't survive the OAuth redirect).
				if (pendingAction === 'add') {
					const familyId = storageGet('_pendingProfileFamilyId');
					if (familyId && _authStore.user?.authUserId) {
						fetch('/api/profiles/link-to-family', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ familyId })
						}).catch(() => {});
					}
					storageRemove('_pendingProfileFamilyId');
				}

				storageRemove('_pendingProfileAction');
				if ($page.url.pathname !== '/profiles') {
					goto(resolve('/profiles'));
				}
				return;
			}

			const wasGuest = storageGet('authMode') === 'guest';
			const hasGuestData =
				(storageGet('todos') || []).length > 0 || (storageGet('archivedTodos') || []).length > 0;

			// Only pause auto-load when we specifically have guest data to migrate.
			if (!wasGuest || !hasGuestData) {
				_todoStore.loadFromApi();
				_authStore.loadActiveProfile();
			}
		}
	});

	$effect(() => {
		if (!_authStore.isLoading && _authStore.isLoggedIn && !attemptedBackgroundSync) {
			attemptedBackgroundSync = true;
			void registerBackgroundSync();
		}
	});

	function handleGlobalKeydown(e) {
		// ? — Open help dialog from any page
		if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			const tag = e.target?.tagName?.toLowerCase();
			const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
			if (!isInput && !e.target?.isContentEditable) {
				e.preventDefault();
				_todoStore.helpRequested++;
				return;
			}
		}
	}

	beforeNavigate(({ from, to }) => {
		const fromPath = from?.url.pathname;
		const toPath = to?.url.pathname;
		if (fromPath && toPath && appGroupPaths.includes(fromPath) && appGroupPaths.includes(toPath)) {
			transitionDuration = 0; // same group — instant swap
		} else {
			transitionDuration = 200; // cross group — fade
		}
	});
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<NavBar />
<main id="main-content">
	{#key $page.url.pathname}
		<div
			transition:fade={{
				duration: _todoStore.prefersReducedMotion ? 0 : transitionDuration,
				easing: materialEasing
			}}
		>
			{@render children()}
		</div>
	{/key}
</main>
{#if _todoStore.toast.show}
	<Toast />
{/if}
<MigrationDialog />
<InstallPrompt />
<HelpButton />
