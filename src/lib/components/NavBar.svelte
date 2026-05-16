<script>
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { Sun, Moon } from 'lucide-svelte';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import AuthButton from '$lib/components/AuthButton.svelte';

	const store = getTodoStore();

	const links = [
		{ href: '/tasks', label: 'Tasks' },
		{ href: '/board', label: 'Board' },
		{ href: '/calendar', label: 'Calendar' },
		{ href: '/stats', label: 'Analytics' },
		{ href: '/archived', label: 'Archived' },
		{ href: '/settings', label: 'Settings' }
	];

	let mobileMenuOpen = $state(false);
	let currentPageLabel = $derived(links.find((l) => l.href === $page.url.pathname)?.label || 'Tasks');

	$effect(() => {
		if (!mobileMenuOpen) return;

		/** @param {MouseEvent} e */
		const handleWindowClick = (e) => {
			const target = e.target;

			if (
				target instanceof Element &&
				(target.closest('.mobile-nav-toggle') || target.closest('.mobile-nav-dropdown'))
			) {
				return;
			}

			mobileMenuOpen = false;
		};

		window.addEventListener('click', handleWindowClick);

		return () => {
			window.removeEventListener('click', handleWindowClick);
		};
	});
</script>

<!-- Don't render nav on the login page -->
{#if $page.url.pathname !== '/'}
	<nav
		class="relative flex items-center justify-center gap-1 border-b px-4 py-2"
		style="background: var(--card-bg); border-color: var(--border); transition: background 0.3s, border-color 0.3s;"
	>
		<div class="hidden min-[700px]:flex">
			<div class="flex gap-1">
				{#each links as link (link.href)}
					<a
						href={resolve(link.href)}
						data-sveltekit-preload-data
						class="nav-link rounded-lg px-3 py-1.5 text-center text-xs font-medium no-underline transition-all sm:text-base"
						class:active={$page.url.pathname === link.href}
					>
						{link.label}
					</a>
				{/each}
			</div>
		</div>

		<div class="relative flex justify-center min-[700px]:hidden">
			<div
				class="mobile-nav-toggle flex cursor-pointer items-center gap-2 rounded-md px-2 py-1"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				role="button"
				tabindex="0"
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						mobileMenuOpen = !mobileMenuOpen;
					}
				}}
				aria-expanded={mobileMenuOpen}
				aria-label="Toggle mobile navigation menu"
			>
				<span class="text-large font-medium">{currentPageLabel}</span>
				<span
					class="inline-flex transition-transform duration-200"
					class:rotate-180={mobileMenuOpen}
					aria-hidden="true"
				>
					<svg width="10" height="8" viewBox="0 0 10 8">
						<path d="M1 1L5 7L9 1H1Z" fill="currentColor" />
					</svg>
				</span>
			</div>

			{#if mobileMenuOpen}
				<div
					class="mobile-nav-dropdown absolute top-full left-1/2 z-50 mt-2 min-w-40 -translate-x-1/2 rounded-md border p-1 shadow-lg"
					style="background: var(--card-bg); border-color: var(--border);"
				>
					{#each links as link (link.href)}
						{#if link.href !== $page.url.pathname}
							<a
								href={resolve(link.href)}
								data-sveltekit-preload-data
								onclick={() => (mobileMenuOpen = false)}
								class="nav-link block rounded px-3 py-2 text-base font-medium no-underline"
							>
								{link.label}
							</a>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
		<div class="absolute right-4 flex items-center gap-3">
			<AuthButton />
			<span
				class="cursor-pointer"
				onclick={() => (store.darkMode = !store.darkMode)}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (store.darkMode = !store.darkMode)}
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
