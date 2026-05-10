<script>
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';

	const store = getTodoStore();
</script>

<div class="flex flex-col gap-2.5">
	{#each { length: 3 } as _, i (i)}
		<div
			class="skeleton-card rounded-xl p-3"
			style="background: var(--todo-bg); border: 1px solid var(--border); animation: {store.prefersReducedMotion
				? 'none'
				: 'pulse 1.5s ease-in-out infinite'}; animation-delay: {i * 150}ms;"
		>
			<div class="mb-2 flex items-center gap-2">
				<div class="h-[18px] w-[18px] rounded" style="background: var(--border);"></div>
				<div
					class="skeleton-shimmer h-4 max-w-[60%] flex-1 rounded"
					style="background: {store.prefersReducedMotion
						? 'var(--border)'
						: 'linear-gradient(90deg, var(--border) 25%, var(--input-bg) 50%, var(--border) 75%); background-size: 200% 100%'}; animation: {store.prefersReducedMotion
						? 'none'
						: 'shimmer 1.5s infinite'};"
				></div>
				<div class="h-[18px] w-[50px] rounded-full" style="background: var(--border);"></div>
			</div>
			<div
				class="skeleton-shimmer mb-2 h-3 w-[80%] rounded"
				style="background: {store.prefersReducedMotion
					? 'var(--border)'
					: 'linear-gradient(90deg, var(--border) 25%, var(--input-bg) 50%, var(--border) 75%); background-size: 200% 100%'}; animation: {store.prefersReducedMotion
					? 'none'
					: 'shimmer 1.5s infinite'}; animation-delay: 0.1s;"
			></div>
			<div
				class="skeleton-shimmer h-2.5 w-[40%] rounded"
				style="background: {store.prefersReducedMotion
					? 'var(--border)'
					: 'linear-gradient(90deg, var(--border) 25%, var(--input-bg) 50%, var(--border) 75%); background-size: 200% 100%'}; animation: {store.prefersReducedMotion
					? 'none'
					: 'shimmer 1.5s infinite'}; animation-delay: 0.2s;"
			></div>
		</div>
	{/each}
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-card {
			animation: none !important;
		}

		.skeleton-shimmer {
			animation: none !important;
			background: var(--border) !important;
		}
	}
</style>
