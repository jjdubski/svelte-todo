<script>
	import { getTodoStore } from '$lib/todoStore.svelte.js';
	import TodoHeader from '$lib/TodoHeader.svelte';
	import TodoForm from '$lib/TodoForm.svelte';
	import TodoFilters from '$lib/TodoFilters.svelte';
	import TodoList from '$lib/TodoList.svelte';
	import StatsBar from '$lib/StatsBar.svelte';
	import Toast from '$lib/Toast.svelte';

	const store = getTodoStore();
</script>

<svelte:window onkeydown={(e) => store.handleKeydown(e)} />

<div
	class="flex min-h-dvh justify-center p-8 sm:p-4"
	style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%); transition: background 0.3s;"
>
	<div
		class="w-full max-w-[900px] rounded-2xl border p-8 sm:rounded-xl sm:p-5"
		style="background: var(--card-bg); box-shadow: 0 8px 32px var(--shadow); border-color: var(--border); transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;"
	>
		<TodoHeader />
		<StatsBar />
		<TodoForm />
		<TodoFilters />
		<TodoList />
	</div>
</div>

{#if store.toast.show}
	<Toast />
{/if}
