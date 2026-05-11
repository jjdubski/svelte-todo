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

	// Load data from the server for authenticated users.
	// If the user was previously in guest mode AND has local data, the migration dialog
	// handles it (skip this). If they were a guest but have no local data, load from API
	// directly so they see their account's data.
	$effect(() => {
		if (!_authStore.isLoading && _authStore.isLoggedIn && !_authStore.isGuest) {
			const wasGuest = storageGet('authMode') === 'guest';
			const hasLocalData =
				(storageGet('todos') || []).length > 0 || (storageGet('archivedTodos') || []).length > 0;
			if (!wasGuest || !hasLocalData) {
				_todoStore.loadFromApi();
			}
			// If wasGuest && hasLocalData, the MigrationDialog's own effect
			// shows the dialog; no loadFromApi until migration completes.
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
