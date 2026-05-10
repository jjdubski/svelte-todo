<script>
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { createTodoStore } from '$lib/state/todoStore.svelte.js';
	import NavBar from '$lib/NavBar.svelte';

	let { children } = $props();

	// Initialize the todo store and set it in context for all child routes
	const _store = createTodoStore();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a
	href="#main-content"
	class="skip-link sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-[var(--btn-primary)] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white focus:no-underline focus:sm:text-sm"
>
	Skip to main content
</a>
<NavBar />
<main id="main-content">
	{@render children()}
</main>
