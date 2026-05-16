<script>
	import { fade, scale } from 'svelte/transition';
	import { HelpCircle, X, Settings, Keyboard, MousePointer2 } from 'lucide-svelte';
	import { materialEasing } from '$lib/utils/motion.js';

	let showHelp = $state(false);
	let prefersReducedMotion = $state(false);

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
					class="flex cursor-pointer items-center justify-center rounded-lg border-none p-1.5"
					style="background: transparent; color: var(--text-muted);"
					onclick={closeHelp}
					aria-label="Close help"
				>
					<X size={18} />
				</button>
			</div>

			<!-- Keyboard shortcuts section -->
			<div class="mb-5">
				<div class="mb-3 flex items-center gap-2">
					<Keyboard size={16} style="color: var(--btn-primary);" />
					<h3 class="m-0 text-sm font-semibold sm:text-base" style="color: var(--text-heading);">
						Keyboard Shortcuts
					</h3>
				</div>
				<div class="rounded-xl border p-4" style="background: var(--todo-bg); border-color: var(--border);">
					<p class="m-0 text-sm sm:text-base" style="color: var(--text-muted);">
						Coming soon! Full keyboard shortcut support is planned for a future update (Phase 4).
					</p>
				</div>
			</div>

			<!-- Multi-select instructions -->
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

			<!-- Settings link -->
			<div>
				<a
					href="/settings"
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
