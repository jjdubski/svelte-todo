<script>
	import { fade, scale } from 'svelte/transition';
	import { getAuthStore } from '$lib/state/authStore.svelte.js';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import { storageGet, getGuestData, clearGuestData } from '$lib/scripts/storage.js';
	import { materialEasing } from '$lib/utils/motion.js';

	const auth = getAuthStore();
	const store = getTodoStore();

	let showMigration = $state(false);
	let isSyncing = $state(false);
	let syncError = $state('');
	let prefersReducedMotion = $state(false);

	/**
	 * Show the migration dialog when:
	 * - User is signed in (not guest)
	 * - Was previously in guest mode (authMode == 'guest')
	 * - Has local todos in localStorage
	 *
	 * Once migration completes (sync or start fresh), `clearGuestData()`
	 * removes authMode and todo data, so the dialog won't re-trigger.
	 *
	 * Safety: the only way an authMode of 'guest' persists is if the user
	 * genuinely entered guest mode. `clearGuestMode()` (called on logout
	 * and 401 errors) clears authMode + cached data, so stale auth-session
	 * data cannot accidentally trigger this dialog.
	 */
	$effect(() => {
		if (!auth.isLoading && auth.isLoggedIn && !auth.isGuest) {
			const wasGuest = storageGet('authMode') === 'guest';
			const hasLocalTodos = (storageGet('todos') || []).length > 0;
			showMigration = wasGuest && hasLocalTodos;
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
			// Load full server data (may include data from other devices)
			await store.loadFromApi();
		} catch (e) {
			syncError = e.message || 'Failed to sync. Please try again.';
		} finally {
			isSyncing = false;
		}
	}

	function handleStartFresh() {
		clearGuestData();
		// Reset store state then load server data
		store.todos = [];
		store.archivedTodos = [];
		showMigration = false;
		store.loadFromApi();
	}
</script>

{#if showMigration}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
		onclick={() => {}}
		transition:fade={{ duration: prefersReducedMotion ? 0 : 150, easing: materialEasing }}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-md rounded-2xl border p-6 shadow-xl"
			style="background: var(--card-bg); border-color: var(--border);"
			onclick={(e) => e.stopPropagation()}
			transition:scale={{
				duration: prefersReducedMotion ? 0 : 150,
				start: 0.95,
				easing: materialEasing
			}}
		>
			<h2 class="mb-2 text-lg font-bold" style="color: var(--text-heading);">Sync your data?</h2>
			<p class="mb-6 text-sm leading-relaxed" style="color: var(--text-secondary);">
				You have tasks saved locally. Would you like to sync them to your account so they're available
				everywhere?
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
					type="button"
					onclick={handleStartFresh}
					disabled={isSyncing}
					class="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
					style="background: var(--input-bg); border-color: var(--border); color: var(--text);"
				>
					Start fresh
				</button>
				<button
					type="button"
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
