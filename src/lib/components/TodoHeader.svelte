<script>
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import { createEventDispatcher } from 'svelte';

	const store = getTodoStore();
	const dispatch = createEventDispatcher();

	/**
	 * Trigger export of todos and download as JSON file.
	 */
	function handleExport() {
		const data = store.exportTodos();
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		store.showToast('Exported todos successfully', 'success');
	}

	/**
	 * Handle file selection for import.
	 */
	function handleImport() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json,application/json';
		input.onchange = (e) => {
			const file = e.target.files[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (event) => {
				const result = store.importTodos(event.target.result);
				if (result.success) {
					store.showToast(result.message, 'success');
				} else {
					store.showToast(result.message, 'warning');
				}
			};
			reader.readAsText(file);
		};
		input.click();
	}
</script>

<div class="mb-3 grid w-full grid-cols-1 items-center gap-3 sm:grid-cols-3">
	<div class="hidden sm:block"></div>
	<h1
		class="m-0 text-center text-3xl font-medium sm:text-4xl"
		style="color: var(--text-heading); letter-spacing: 0.05em;"
	>
		Todo List
	</h1>

	<!-- Export/Import buttons -->
	<div class="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
		<button
			type="button"
			class="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors"
			style="background: var(--btn-secondary-bg, #f3f4f6); color: var(--btn-secondary-text, #374151); border: 1px solid var(--border, #d1d5db);"
			onclick={handleImport}
			title="Import todos from JSON file"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="17 8 12 3 7 8" />
				<line x1="12" y1="3" x2="12" y2="15" />
			</svg>
			Import
		</button>

		<button
			type="button"
			class="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors"
			style="background: var(--btn-primary-bg, #2563eb); color: var(--btn-primary-text, #ffffff); border: 1px solid var(--btn-primary-bg, #2563eb);"
			onclick={handleExport}
			title="Export todos to JSON file"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
			Export
		</button>
	</div>
</div>

<!-- Shortcut hint moved here from footer -->
<div class="mb-4 text-center text-xs" style="color: var(--text-muted);">
	<kbd
		class="inline-block rounded px-1.5 py-0.5 text-[11px]"
		style="background: var(--todo-bg); border: 1px solid var(--border); font-family: inherit; margin: 0 2px;"
		>Ctrl</kbd
	>+<kbd
		class="inline-block rounded px-1.5 py-0.5 text-[11px]"
		style="background: var(--todo-bg); border: 1px solid var(--border); font-family: inherit; margin: 0 2px;">N</kbd
	>
	quick add
</div>
