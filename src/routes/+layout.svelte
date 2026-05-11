<script>
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { createTodoStore } from '$lib/state/todoStore.svelte.js';
	import { createAuthStore } from '$lib/state/authStore.svelte.js';
	import { storageGet } from '$lib/scripts/storage.js';
	import NavBar from '$lib/components/NavBar.svelte';
	import MigrationDialog from '$lib/components/MigrationDialog.svelte';

	let { children } = $props();

	// Initialize stores and wire auth into todo store for API sync
	const _todoStore = createTodoStore();
	const _authStore = createAuthStore();
	_todoStore.setAuthStore(_authStore);

	// If the user has local data (todos in localStorage), the MigrationDialog handles
	// syncing it to the server and then calls loadFromApi. If there's no local data,
	// or the data was already synced in a previous session, load directly from the
	// server so the user sees their account data.
	$effect(() => {
		if (!_authStore.isLoading && _authStore.isLoggedIn && !_authStore.isGuest) {
			const wasGuest = storageGet('authMode') === 'guest';
			const hasGuestData =
				(storageGet('todos') || []).length > 0 || (storageGet('archivedTodos') || []).length > 0;

			// Only pause auto-load when we specifically have guest data to migrate.
			if (!wasGuest || !hasGuestData) {
				_todoStore.loadFromApi();
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a
	href="#main-content"
	class="skip-link sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-[var(--btn-primary)] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white focus:no-underline focus:sm:text-sm"
>
	Skip to main content
</a>
<NavBar />
<main id="main-content">
	{@render children()}
</main>
<MigrationDialog />
