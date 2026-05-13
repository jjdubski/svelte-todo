<script>
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';

	/**
	 * @param {number} status
	 */
	function getContextualMessage(status) {
		if (status === 404) return 'Page not found — the link you followed may be broken';
		if (status === 403) return "You don't have access to this page";
		if (status >= 500) return 'Server error — something went wrong on our end';
		return 'Something went wrong, try again later!';
	}
</script>

<div
	class="flex min-h-dvh items-center justify-center p-4"
	style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%)"
>
	<div
		class="w-full max-w-[420px] rounded-2xl border p-8 text-center"
		style="background: var(--card-bg); border-color: var(--border); box-shadow: var(--shadow);"
	>
		<h1 class="text-6xl font-bold" style="color: var(--btn-primary);">{$page.status}</h1>

		{#if $page.status === 404}
			<p class="mt-3 text-base" style="color: var(--text-heading);">
				Page not found — the link you followed may be broken
			</p>
		{:else if $page.status === 403}
			<p class="mt-3 text-base" style="color: var(--text-heading);">You don't have access to this page</p>
		{:else if $page.status >= 500}
			<p class="mt-3 text-base" style="color: var(--text-heading);">
				Server error — something went wrong on our end
			</p>
		{:else}
			<p class="mt-3 text-base" style="color: var(--text-heading);">Something went wrong, try again later!</p>
		{/if}

		{#if $page.error?.message && $page.error.message !== getContextualMessage($page.status)}
			<p class="mt-2 text-sm" style="color: var(--text-secondary);">{$page.error.message}</p>
		{/if}

		<div class="mt-6">
			<a
				href={resolve('/')}
				class="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white no-underline"
				style="background: var(--btn-primary);"
			>
				Back to Tasks
			</a>
		</div>
	</div>
</div>
