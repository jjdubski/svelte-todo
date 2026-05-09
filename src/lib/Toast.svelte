<script>
	import { CheckCircle, Info, AlertTriangle } from 'lucide-svelte';
	import { getTodoStore } from '$lib/todoStore.svelte.js';

	const store = getTodoStore();
</script>

<div
	class="fixed bottom-6 left-1/2 z-[1000] w-[min(90%,400px)] -translate-x-1/2"
	aria-live="polite"
>
	<div
		class="animate-toast-in flex items-center gap-3 rounded-xl border px-4 py-3.5 shadow-lg"
		style="background: var(--card-bg); border-color: var(--border); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);"
		class:success={store.toast.type === 'success'}
		class:info={store.toast.type === 'info'}
		class:warning={store.toast.type === 'warning'}
	>
		<div
			class="shrink-0"
			class:text-green-500={store.toast.type === 'success'}
			class:text-red-500={store.toast.type === 'warning'}
			class:text-blue-500={store.toast.type === 'info'}
		>
			{#if store.toast.type === 'success'}
				<CheckCircle size={18} style="color: var(--btn-save);" />
			{:else if store.toast.type === 'warning'}
				<AlertTriangle size={18} style="color: var(--priority-high);" />
			{:else}
				<Info size={18} style="color: var(--btn-primary);" />
			{/if}
		</div>
		<span class="flex-1 text-sm" style="color: var(--text);">{store.toast.message}</span>
	</div>
</div>

<style>
	.success {
		border-color: var(--btn-save) !important;
	}

	.info {
		border-color: var(--btn-primary) !important;
	}

	.warning {
		border-color: var(--priority-high) !important;
	}

	button:hover {
		filter: brightness(1.15);
	}
</style>
