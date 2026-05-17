<script>
	import { getAuthStore } from '$lib/state/authStore.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	const auth = getAuthStore();
	let showMenu = $state(false);

	function toggleMenu() {
		showMenu = !showMenu;
	}

	async function handleSignOut() {
		showMenu = false;
		await auth.logout();
	}

	async function handleSwitchProfile() {
		showMenu = false;
		await goto(resolve('/profiles'));
	}

	function handleBlur() {
		// Delay to allow click on menu items
		setTimeout(() => {
			showMenu = false;
		}, 200);
	}
</script>

{#if auth.isLoggedIn && auth.user}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="relative" onblur={handleBlur}>
		<button
			type="button"
			onclick={toggleMenu}
			class="flex cursor-pointer items-center gap-2 rounded-full border-none bg-transparent p-0.5"
			aria-label="User menu"
			aria-expanded={showMenu}
		>
			{#if auth.activeProfile?.picture || auth.user?.picture}
				<img src={auth.activeProfile?.picture || auth.user?.picture} alt="" class="h-7 w-7 rounded-full" />
			{:else}
				<div
					class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
					style="background: var(--btn-primary);"
				>
					{(auth.activeProfile?.name || auth.activeProfile?.email || auth.user.name || auth.user.email || '?')[0].toUpperCase()}
				</div>
			{/if}
			<!-- Show this on large screen sizes but on < base hide it -->
			<span class="hidden text-xs lg:inline" style="color: var(--text-secondary);">
				{auth.activeProfile?.name || auth.activeProfile?.email || auth.user?.name || auth.user?.email || ''}
			</span>
		</button>
		{#if showMenu}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="absolute top-full right-0 z-50 mt-1 min-w-[140px] rounded-lg border py-1 shadow-lg"
				style="background: var(--card-bg); border-color: var(--border);"
				onclick={() => (showMenu = false)}
			>
				<button
					type="button"
					onclick={handleSwitchProfile}
					class="w-full cursor-pointer border-none bg-transparent px-4 py-2 text-left text-xs"
					style="color: var(--text);"
				>
					Switch Profile…
				</button>
				<button
					type="button"
					onclick={handleSignOut}
					class="w-full cursor-pointer border-none bg-transparent px-4 py-2 text-left text-xs"
					style="color: var(--text);"
				>
					Sign out
				</button>
			</div>
		{/if}
	</div>
{:else if auth.isGuest}
	<a
		href={resolve('/')}
		class="rounded-lg px-3 py-1.5 text-xs font-medium no-underline transition-all sm:text-base"
		style="background: var(--btn-primary); color: white;"
	>
		Sign in
	</a>
{/if}
