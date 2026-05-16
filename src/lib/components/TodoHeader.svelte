<script>
	import { resolve } from '$app/paths';
</script>

<div class="mb-3 grid w-full grid-cols-1 items-center gap-3 sm:grid-cols-3">
	<div class="hidden sm:block"></div>
	<h1
		class="m-0 text-center text-3xl font-medium sm:text-4xl"
		style="color: var(--text-heading); letter-spacing: 0.05em;"
	>
		Todo List
	</h1>

	<!-- Data controls moved to /settings -->
	<div class="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
		<a
			href={resolve('/settings')}
			data-sveltekit-preload-data
			class="rounded-md px-3 py-1.5 text-sm font-medium no-underline"
			style="background: var(--input-bg); color: var(--text-secondary); border: 1px solid var(--border);"
		>
			Open Settings
		</a>
	</div>
</div>

<!-- Shortcut hint moved here from footer -->
<div class="mb-4 text-center text-xs" style="color: var(--text-muted);">
	<kbd
		class="inline-block rounded px-1.5 py-0.5 text-[11px]"
		style="background: var(--todo-bg); border: 1px solid var(--border); font-family: inherit; margin: 0 2px;">N</kbd
	>
	to quick add
</div>
