<script>
	import { getTodoStore } from '$lib/todoStore.svelte.js';
	import StatsBar from '$lib/StatsBar.svelte';

	const store = getTodoStore();
</script>

<div
	class="flex min-h-dvh justify-center p-8 sm:p-4"
	style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%); transition: background 0.3s;"
>
	<div
		class="w-full max-w-[900px] rounded-2xl border p-8 sm:rounded-xl sm:p-5 xl:max-w-[1100px] 2xl:max-w-[1300px]"
		style="background: var(--card-bg); box-shadow: 0 8px 32px var(--shadow); border-color: var(--border); transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;"
	>
		<StatsBar />
		<div class="flex flex-col items-center justify-center px-4 py-24">
			<h2 class="text-2xl font-semibold" style="color: var(--text-heading);">Archived Tasks</h2>
			<p class="mt-2 text-sm" style="color: var(--text-muted);">Coming Soon</p>
		</div>
	</div>
</div>
