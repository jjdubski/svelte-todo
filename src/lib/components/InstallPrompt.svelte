<script>
	import { Download, X } from 'lucide-svelte';

	const DISMISSAL_KEY = 'installPromptDismissedAt';
	const RE_PROMPT_DAYS = 30;

	let deferredPrompt = $state(null);
	let showBanner = $state(false);

	function shouldShow() {
		// Already installed
		if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
			return false;
		}

		// Check dismissal timestamp
		try {
			const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
			if (dismissedAt) {
				const dismissed = new Date(dismissedAt).getTime();
				const now = Date.now();
				const daysSince = (now - dismissed) / (1000 * 60 * 60 * 24);
				if (daysSince < RE_PROMPT_DAYS) return false;
			}
		} catch {
			// localStorage unavailable, allow prompt
		}

		return true;
	}

	function handleInstall() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		deferredPrompt.userChoice.then(() => {
			deferredPrompt = null;
			showBanner = false;
		});
	}

	function handleDismiss() {
		showBanner = false;
		try {
			localStorage.setItem(DISMISSAL_KEY, new Date().toISOString());
		} catch {
			// localStorage unavailable
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') return;

		// Check if already installed
		if (window.matchMedia('(display-mode: standalone)').matches) return;

		// Listen for the beforeinstallprompt event
		function onBeforeInstall(e) {
			e.preventDefault();
			deferredPrompt = e;
			if (shouldShow()) {
				showBanner = true;
			}
		}

		window.addEventListener('beforeinstallprompt', onBeforeInstall);

		return () => {
			window.removeEventListener('beforeinstallprompt', onBeforeInstall);
		};
	});
</script>

{#if showBanner}
	<div
		class="fixed right-4 bottom-4 left-4 z-50 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg sm:right-4 sm:left-auto sm:max-w-md"
		style="background: var(--card-bg); border-color: var(--border); box-shadow: 0 8px 32px var(--shadow);"
	>
		<div class="flex items-center gap-3">
			<Download size={20} style="color: var(--btn-primary);" />
			<p class="m-0 text-sm font-medium sm:text-base" style="color: var(--text);">
				Install the app for a better experience
			</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="glow-btn flex cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-1.5 text-sm font-semibold text-white"
				style="background: var(--btn-primary);"
				data-btn="primary"
				onclick={handleInstall}
			>
				Install
			</button>
			<button
				type="button"
				class="flex cursor-pointer items-center justify-center rounded-lg border-none p-1.5"
				style="background: transparent; color: var(--text-muted);"
				onclick={handleDismiss}
				aria-label="Dismiss install prompt"
			>
				<X size={16} />
			</button>
		</div>
	</div>
{/if}
