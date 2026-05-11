<script>
	import { getAuthStore } from '$lib/state/authStore.svelte.js';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import { storageGet, getGuestData, clearGuestData } from '$lib/scripts/storage.js';

	const auth = getAuthStore();
	const store = getTodoStore();

	let showMigration = $state(false);
	let isSyncing = $state(false);
	let syncError = $state('');

	/**
	 * Show the migration dialog when:
	 * - User is signed in (not guest)
	 * - Was previously using guest mode (authMode in localStorage)
	 * - Has local todos
	 */
	$effect(() => {
		if (!auth.isLoading && auth.isLoggedIn && !auth.isGuest) {
			const wasGuest = storageGet('authMode') === 'guest';
			const hasLocalTodos = (storageGet('todos') || []).length > 0;
			if (wasGuest && hasLocalTodos) {
				showMigration = true;
			}
		}
	});

	async function handleSync() {
		isSyncing = true;
		syncError = '';
		try {
			const guestData = getGuestData();
			const res = await fetch('/api/todos/migrate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(guestData)
			});
			if (!res.ok) {
				throw new Error('Server returned ' + res.status);
			}
			// Migration succeeded — clear guest data from localStorage
			clearGuestData();
			showMigration = false;
		} catch (e) {
			syncError = e.message || 'Failed to sync. Please try again.';
		} finally {
			isSyncing = false;
		}
	}

	function handleStartFresh() {
		clearGuestData();
		// Clear local todos
		localStorage.removeItem('todos');
		localStorage.removeItem('archivedTodos');
		// Reset store state
		store.todos = [];
		store.archivedTodos = [];
		showMigration = false;
	}
</script>

{#if showMigration}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
		onclick={() => {}}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-md rounded-2xl border p-6 shadow-xl"
			style="background: var(--card-bg); border-color: var(--border);"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-2 text-lg font-bold" style="color: var(--text-heading);">Sync your data?</h2>
			<p class="mb-6 text-sm leading-relaxed" style="color: var(--text-secondary);">
				You have tasks saved locally. Would you like to sync them to your account so they're
				available everywhere?
			</p>

			{#if syncError}
				<div
					class="mb-4 rounded-lg border px-3 py-2 text-xs"
					style="background: var(--input-bg); border-color: var(--priority-high); color: var(--priority-high);"
				>
					{syncError}
				</div>
			{/if}

			<div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
				<button
					onclick={handleStartFresh}
					disabled={isSyncing}
					class="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
					style="background: var(--input-bg); border-color: var(--border); color: var(--text);"
				>
					Start fresh
				</button>
				<button
					onclick={handleSync}
					disabled={isSyncing}
					class="flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
					style="background: var(--btn-primary);"
				>
					{#if isSyncing}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
							style="border-color: rgba(255,255,255,0.3); border-top-color: white;"
						></div>
						Syncing...
					{:else}
						Sync my data
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
