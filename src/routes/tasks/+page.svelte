<script>
	import { page } from '$app/stores';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import { getFormState, createFormState } from '$lib/state/formState.svelte.js';
	import TodoHeader from '$lib/components/TodoHeader.svelte';
	import TodoForm from '$lib/components/TodoForm.svelte';
	import TodoFilters from '$lib/components/TodoFilters.svelte';
	import TodoList from '$lib/components/TodoList.svelte';
	import StatsBar from '$lib/components/StatsBar.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import TodoEditModal from '$lib/components/TodoEditModal.svelte';

	const store = getTodoStore();
	// Instantiate form state for this page
	const formStore = createFormState();

	let editingTodo = $derived(store.todos.find((t) => t.id === store.editingTodoId));

	// ── URL Query Params: Quick Add ──
	$effect(() => {
		const params = $page.url.searchParams;
		const qp = {};
		let hasParams = false;

		if (params.has('title')) {
			qp.title = params.get('title');
			hasParams = true;
		}
		if (params.has('desc')) {
			qp.desc = params.get('desc');
			hasParams = true;
		}
		if (params.has('due')) {
			qp.due = params.get('due');
			hasParams = true;
		}
		if (params.has('priority')) {
			const p = params.get('priority');
			if (['high', 'medium', 'low'].includes(p)) {
				qp.priority = p;
				hasParams = true;
			}
		}
		if (params.has('category')) {
			qp.category = params.get('category');
			hasParams = true;
		}
		if (params.has('tags')) {
			qp.tags = params.get('tags');
			hasParams = true;
		}
		if (params.get('showForm') === 'true') {
			qp.showForm = true;
			hasParams = true;
		}

		if (hasParams) {
			formStore.applyQuickAdd(qp);
		}
	});

	function handleKeydown(e) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
			e.preventDefault();
			formStore.showForm = true;
			setTimeout(() => document.getElementById('title-input')?.focus(), 50);
		}
		store.handleKeydown(e);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="flex min-h-dvh justify-center p-4"
	style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%); transition: background 0.3s;"
>
	<div
		class="w-full max-w-[1080px] rounded-2xl border p-5 sm:rounded-xl xl:max-w-[1100px] 2xl:max-w-[1300px]"
		style="background: var(--card-bg); box-shadow: 0 8px 32px var(--shadow); border-color: var(--border); transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;"
	>
		<TodoHeader />
		{#if !store.requestedNotification && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default'}
			<div
				class="notif-banner mb-4 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm sm:text-base"
				style="background: var(--input-bg); border-color: var(--border); color: var(--text-secondary);"
			>
				<span class="flex-1">Enable notifications for due date reminders</span>
				<button
					class="glow-btn cursor-pointer rounded-md border-none px-3 py-1.5 text-xs font-semibold text-white sm:text-sm"
					style="background: var(--btn-primary);"
					onclick={() => store.requestNotificationPermission()}
				>
					Enable
				</button>
				<button
					class="flex cursor-pointer items-center justify-center rounded border-none p-1 text-sm leading-none sm:text-base"
					style="color: var(--text-muted); background: transparent;"
					onclick={() => (store.requestedNotification = true)}
					aria-label="Dismiss notification banner"
				>
					&times;
				</button>
			</div>
		{/if}
		<StatsBar />
		<TodoForm />
		<TodoFilters />
		<TodoList />
	</div>
</div>

{#if store.toast.show}
	<Toast />
{/if}

{#if editingTodo}
	<TodoEditModal todo={editingTodo} />
{/if}
