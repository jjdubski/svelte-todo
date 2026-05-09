<script>
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { createTodoStore } from '$lib/todoStore.svelte.js';
	import NavBar from '$lib/NavBar.svelte';

	let { children } = $props();

	// Initialize the todo store and set it in context for all child routes
	const _store = createTodoStore();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<NavBar />
{@render children()}
