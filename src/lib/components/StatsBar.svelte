<script>
	import { spring } from 'svelte/motion';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';

	const store = getTodoStore();

	const activeSpring = spring(0, { stiffness: 0.15, damping: 0.85 });
	const completedSpring = spring(0, { stiffness: 0.15, damping: 0.85 });
	const overdueSpring = spring(0, { stiffness: 0.15, damping: 0.85 });

	// Snap to the first real value on mount, then animate subsequent updates.
	let _activeInit = false;
	let _completedInit = false;
	let _overdueInit = false;

	$effect(() => {
		if (!_activeInit) {
			_activeInit = true;
			activeSpring.set(store.stats.active, { hard: true });
		} else if (!store.prefersReducedMotion) {
			activeSpring.set(store.stats.active);
		}
	});
	$effect(() => {
		if (!_completedInit) {
			_completedInit = true;
			completedSpring.set(store.stats.completed, { hard: true });
		} else if (!store.prefersReducedMotion) {
			completedSpring.set(store.stats.completed);
		}
	});
	$effect(() => {
		if (!_overdueInit) {
			_overdueInit = true;
			overdueSpring.set(store.stats.overdue, { hard: true });
		} else if (!store.prefersReducedMotion) {
			overdueSpring.set(store.stats.overdue);
		}
	});
</script>

<div
	class="mb-6 flex gap-0 overflow-hidden rounded-xl border p-0"
	style="background: var(--todo-bg); border-color: var(--border);"
>
	<div class="flex flex-1 flex-col items-center p-4">
		<span
			class="text-xl font-bold sm:text-2xl"
			style="color: var(--text-heading); line-height: 1; font-variant-numeric: tabular-nums;"
			>{store.prefersReducedMotion ? store.stats.active : Math.round($activeSpring)}</span
		>
		<span class="mt-1 text-sm sm:text-base" style="color: var(--text-muted);">Active</span>
	</div>
	<div class="w-px self-stretch" style="background: var(--border);"></div>
	<div class="flex flex-1 flex-col items-center p-4">
		<span class="text-xl font-bold sm:text-2xl" style="color: var(--text-heading); line-height: 1;"
			>{store.prefersReducedMotion ? store.stats.completed : Math.round($completedSpring)}</span
		>
		<span class="mt-1 text-sm sm:text-base" style="color: var(--text-muted);">Completed</span>
	</div>
	<div class="w-px self-stretch" style="background: var(--border);"></div>
	<div class="flex flex-1 flex-col items-center p-4">
		<span class="text-xl font-bold sm:text-2xl" style="color: var(--priority-high); line-height: 1;"
			>{store.prefersReducedMotion ? store.stats.overdue : Math.round($overdueSpring)}</span
		>
		<span class="mt-1 text-sm sm:text-base" style="color: var(--text-muted);">Overdue</span>
	</div>
</div>
