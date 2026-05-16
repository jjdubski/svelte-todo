<script>
	import { fade, scale } from 'svelte/transition';
	import { HelpCircle, X, Settings, Keyboard, MousePointer2 } from 'lucide-svelte';
	import { materialEasing } from '$lib/utils/motion.js';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';

	const store = getTodoStore();

	let showHelp = $state(false);
	let prefersReducedMotion = $state(false);

	// Determine which page we're on for dynamic shortcut content
	let currentPath = $derived($page.url.pathname);

	/** @type {Array<{keys: string[], desc: string}>} */
	let pageShortcuts = $derived.by(() => {
		const path = currentPath;
		if (path === '/tasks') {
			return [
				{ keys: ['/'], desc: 'Focus search' },
				{ keys: ['n'], desc: 'New task' },
				{ keys: ['e'], desc: 'Edit focused task' },
				{ keys: ['a'], desc: 'Archive selected or focused task' },
				{ keys: ['Esc'], desc: 'Close dialogs / exit select mode' },
				{ keys: ['Ctrl', 'F'], desc: 'Focus search (from anywhere)' },
				{ keys: ['?'], desc: 'Open this help dialog' }
			];
		}
		if (path === '/board') {
			return [
				{ keys: ['e'], desc: 'Edit focused task' },
				{ keys: ['a'], desc: 'Archive selected or focused task' },
				{ keys: ['Esc'], desc: 'Close dialogs / exit select mode' },
				{ keys: ['?'], desc: 'Open this help dialog' }
			];
		}
		// Default shortcuts for all other pages (archived, calendar, stats, settings)
		return [
			{ keys: ['Esc'], desc: 'Close dialogs / exit select mode' },
			{ keys: ['?'], desc: 'Open this help dialog' }
		];
	});

	let showMultiSelect = $derived(currentPath === '/board' || currentPath.startsWith('/archived'));

	function openHelp() {
		showHelp = true;
	}

	function closeHelp() {
		showHelp = false;
	}

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			closeHelp();
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') {
			closeHelp();
		}
	}

	// Open help when triggered by keyboard shortcut from any page
	$effect(() => {
		if (store.helpRequested) {
			// Reading the value creates the dependency
			showHelp = true;
		}
	});

	$effect(() => {
		if (showHelp) {
			document.addEventListener('keydown', handleKeydown);
			return () => document.removeEventListener('keydown', handleKeydown);
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});
</script>

<!-- Floating help button -->
<button
	type="button"
	class="glow-btn fixed right-4 bottom-4 z-40 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 shadow-lg"
	style="background: rgba(37, 99, 235, 0.85); color: white; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);"
	data-btn="primary"
	onclick={openHelp}
	aria-label="Open help"
	title="Help"
>
	<HelpCircle size={20} />
</button>

<!-- Help overlay -->
{#if showHelp}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background: rgba(0, 0, 0, 0.5);"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label="Help"
		onclick={handleBackdropClick}
		transition:fade={{ duration: prefersReducedMotion ? 0 : 150, easing: materialEasing }}
	>
		<div
			class="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
			style="background: var(--card-bg); border-color: var(--border); max-height: 80vh; overflow-y: auto;"
			transition:scale={{ duration: prefersReducedMotion ? 0 : 150, start: 0.95, easing: materialEasing }}
		>
			<!-- Header -->
			<div class="mb-5 flex items-center justify-between">
				<h2 class="m-0 text-lg font-semibold sm:text-xl" style="color: var(--text-heading);">Help</h2>
				<button
					type="button"
					class="flex cursor-pointer items-center justify-center rounded-lg border-none p-1.5"
					style="background: transparent; color: var(--text-muted);"
					onclick={closeHelp}
					aria-label="Close help"
				>
					<X size={18} />
				</button>
			</div>

			<!-- Keyboard shortcuts section (page-specific) -->
			<div class="mb-5">
				<div class="mb-3 flex items-center gap-2">
					<Keyboard size={16} style="color: var(--btn-primary);" />
					<h3 class="m-0 text-sm font-semibold sm:text-base" style="color: var(--text-heading);">
						Keyboard Shortcuts
						<span class="ml-1.5 text-xs font-normal opacity-60" style="color: var(--text-muted);"
							>— {currentPath === '/tasks'
								? 'Tasks'
								: currentPath === '/board'
									? 'Board'
									: 'This page'}</span
						>
					</h3>
				</div>
				<div class="rounded-xl border p-4" style="background: var(--todo-bg); border-color: var(--border);">
					{#if pageShortcuts.length > 0}
						<ul class="m-0 space-y-2.5 text-sm sm:text-base" style="color: var(--text-secondary);">
							{#each pageShortcuts as shortcut (shortcut.desc)}
								<li class="flex items-center gap-3">
									{#if shortcut.keys.length === 1}
										<kbd
											class="inline-flex min-w-[28px] items-center justify-center rounded-md border px-2 py-0.5 font-mono text-xs font-bold sm:text-sm"
											style="background: var(--input-bg); border-color: var(--border); color: var(--text-heading);"
											>{shortcut.keys[0]}</kbd
										>
									{:else}
										<kbd
											class="inline-flex min-w-[28px] items-center justify-center gap-0.5 rounded-md border px-2 py-0.5 font-mono text-xs font-bold sm:text-sm"
											style="background: var(--input-bg); border-color: var(--border); color: var(--text-heading);"
										>
											{#each shortcut.keys as key, i (key)}
												<span>{key}</span>
												{#if i < shortcut.keys.length - 1}
													<span class="text-xs opacity-60">+</span>
												{/if}
											{/each}
										</kbd>
									{/if}
									<span style="color: var(--text-muted);">{shortcut.desc}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="m-0 text-sm sm:text-base" style="color: var(--text-muted);">
							No keyboard shortcuts for this page.
						</p>
					{/if}
				</div>
			</div>

			<!-- Multi-select instructions (board + archived only) -->
			{#if showMultiSelect}
				<div class="mb-5">
					<div class="mb-3 flex items-center gap-2">
						<MousePointer2 size={16} style="color: var(--btn-primary);" />
						<h3 class="m-0 text-sm font-semibold sm:text-base" style="color: var(--text-heading);">
							Multi-Select
						</h3>
					</div>
					<div class="rounded-xl border p-4" style="background: var(--todo-bg); border-color: var(--border);">
						<ul class="m-0 space-y-2 pl-5 text-sm sm:text-base" style="color: var(--text-secondary);">
							<li>
								<strong style="color: var(--text-heading);">Ctrl/Cmd + Click</strong>
								<span style="color: var(--text-muted);"> — Toggle individual selection</span>
							</li>
							<li>
								<strong style="color: var(--text-heading);">Shift + Click</strong>
								<span style="color: var(--text-muted);"> — Range select</span>
							</li>
						</ul>
					</div>
				</div>
			{/if}

			<!-- Settings link -->
			<div>
				<a
					href={resolve('/settings')}
					class="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium no-underline transition-all hover:opacity-80 sm:text-base"
					style="background: var(--input-bg); border-color: var(--border); color: var(--btn-primary);"
					onclick={closeHelp}
				>
					<Settings size={16} />
					Open Settings
				</a>
			</div>
		</div>
	</div>
{/if}
