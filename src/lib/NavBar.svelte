<script>
	import { page } from '$app/stores';
	import { Sun, Moon } from 'lucide-svelte';
	import { getTodoStore } from '$lib/todoStore.svelte.js';

	const store = getTodoStore();

	const links = [
		{ href: '/', label: 'Tasks' },
		{ href: '/board', label: 'Board' },
		{ href: '/stats', label: 'Analytics' },
		{ href: '/archived', label: 'Archived' }
	];
</script>

<nav
	class="relative flex items-center justify-center gap-1 border-b px-4 py-2"
	style="background: var(--card-bg); border-color: var(--border); transition: background 0.3s, border-color 0.3s;"
>
	<div class="flex gap-1">
		{#each links as link (link.href)}
			<a
				href={link.href}
				data-sveltekit-preload-data
				class="nav-link rounded-lg px-3 py-1.5 text-base font-medium no-underline transition-all"
				class:active={$page.url.pathname === link.href}
			>
				{link.label}
			</a>
		{/each}
	</div>
	<button
		class="glow-btn absolute right-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border text-base"
		style="background: var(--todo-bg); border-color: var(--border); color: var(--text-secondary);"
		data-btn="ghost"
		onclick={() => (store.darkMode = !store.darkMode)}
		aria-label={store.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
	>
		{#if store.darkMode}
			<Sun size={20} />
		{:else}
			<Moon size={20} />
		{/if}
	</button>
</nav>

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
