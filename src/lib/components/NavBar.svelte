<script>
	import { page } from '$app/stores';
	import { Sun, Moon } from 'lucide-svelte';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import AuthButton from '$lib/components/AuthButton.svelte';

	const store = getTodoStore();

	const links = [
		{ href: '/tasks', label: 'Tasks' },
		{ href: '/board', label: 'Board' },
		{ href: '/calendar', label: 'Calendar' },
		{ href: '/stats', label: 'Analytics' },
		{ href: '/archived', label: 'Archived' }
	];
</script>

<!-- Don't render nav on the login page -->
{#if $page.url.pathname !== '/'}
	<nav
		class="relative flex items-center justify-start gap-1 border-b px-4 py-2 sm:justify-center"
		style="background: var(--card-bg); border-color: var(--border); transition: background 0.3s, border-color 0.3s;"
	>
		<div class="flex gap-1">
			{#each links as link (link.href)}
				<a
					href={link.href}
					data-sveltekit-preload-data
					class="nav-link rounded-lg px-3 py-1.5 text-xs font-medium no-underline transition-all sm:text-base"
					class:active={$page.url.pathname === link.href}
				>
					{link.label}
				</a>
			{/each}
		</div>
		<div class="absolute right-4 flex items-center gap-2">
			<AuthButton />
			<span
				class="cursor-pointer"
				onclick={() => (store.darkMode = !store.darkMode)}
				onkeydown={(e) =>
					(e.key === 'Enter' || e.key === ' ') && (store.darkMode = !store.darkMode)}
				role="button"
				tabindex="0"
				aria-label={store.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if store.darkMode}
					<Sun size={25} />
				{:else}
					<Moon size={25} />
				{/if}
			</span>
		</div>
	</nav>
{/if}

<style>
	.nav-link:hover {
		background: var(--input-bg);
		color: var(--text-heading);
	}

	.nav-link.active {
		background: var(--btn-primary);
		color: white;
	}
</style>
