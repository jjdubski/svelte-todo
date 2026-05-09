<script>
	import { getTodoStore } from '$lib/todoStore.svelte.js';

	const store = getTodoStore();
</script>

<div class="relative mb-6 flex items-center justify-center">
	<h1
		class="m-0 text-4xl font-light"
		style="color: var(--text-heading); font-family: 'Caveat', 'Brush Script MT', cursive; letter-spacing: 0.02em;"
	>
		Todo List
	</h1>
</div>

<!-- Shortcut hint moved here from footer -->
<div class="mb-4 text-center text-xs" style="color: var(--text-muted);">
	<kbd
		class="inline-block rounded px-1.5 py-0.5 text-[11px]"
		style="background: var(--todo-bg); border: 1px solid var(--border); font-family: inherit; margin: 0 2px;"
		>Ctrl</kbd
	>+<kbd
		class="inline-block rounded px-1.5 py-0.5 text-[11px]"
		style="background: var(--todo-bg); border: 1px solid var(--border); font-family: inherit; margin: 0 2px;"
		>N</kbd
	>
	quick add
</div>
