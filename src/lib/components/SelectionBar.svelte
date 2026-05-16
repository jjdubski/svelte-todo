<script>
	/**
	 * Shared bottom action bar for multi-selection.
	 * @type {number} count  - Number of selected items
	 * @type {Array<{label: string, onClick: Function, style: string}>} actions - Action buttons
	 * @type {Function} onCancel - Clears selection state
	 */
	let { count, actions = [], onCancel } = $props();
</script>

{#if count > 0}
	<div class="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 sm:w-auto">
		<div
			class="flex flex-wrap items-center justify-center gap-2 rounded-xl border px-3 py-2.5 shadow-lg sm:gap-3 sm:px-4 sm:py-3"
			style="background: var(--card-bg); border-color: var(--border);"
		>
			<span class="text-sm font-medium" style="color: var(--text-heading);">
				{count} selected
			</span>
			{#each actions as action (action.label)}
				<button
					type="button"
					onclick={action.onClick}
					class="cursor-pointer rounded-lg border-none px-3 py-1.5 text-xs font-semibold text-white"
					style="background: {action.style};"
				>
					{action.label}
				</button>
			{/each}
			<button
				type="button"
				onclick={onCancel}
				class="cursor-pointer rounded-lg border-none px-3 py-1.5 text-xs font-semibold"
				style="background: var(--input-bg); color: var(--text-heading);"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}
