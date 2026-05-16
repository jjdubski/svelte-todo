<script>
	import { page } from '$app/stores';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import { createFormState } from '$lib/state/formState.svelte.js';
	import TodoHeader from '$lib/components/TodoHeader.svelte';
	import TodoForm from '$lib/components/TodoForm.svelte';
	import TodoFilters from '$lib/components/TodoFilters.svelte';
	import TodoList from '$lib/components/TodoList.svelte';
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
		// Ignore when typing in input, textarea, or select elements
		const tag = e.target?.tagName?.toLowerCase();
		const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
		const isContentEditable = e.target?.isContentEditable;

		if (!isInput && !isContentEditable) {
			// n — New task
			if (e.key === 'n') {
				e.preventDefault();
				formStore.showForm = true;
				setTimeout(() => document.getElementById('title-input')?.focus(), 50);
				return;
			}

			// / — Focus search
			if (e.key === '/') {
				e.preventDefault();
				store.focusSearchRequested++;
				return;
			}

			// e — Edit the active (hovered/focused) task
			if (e.key === 'e' && store.activeTaskId != null) {
				e.preventDefault();
				store.startEdit(store.activeTaskId);
				return;
			}

			// a — Archive selected tasks, or the active task
			if (e.key === 'a') {
				e.preventDefault();
				if (store.selectedTodos.size > 0) {
					store.archiveSelected();
				} else if (store.activeTaskId != null) {
					store.deleteTodo(store.activeTaskId);
					store.activeTaskId = null;
				}
				return;
			}
		}

		// Ctrl/Cmd+F — Focus search (works even from inputs)
		if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
			e.preventDefault();
			store.focusSearchRequested++;
			return;
		}

		store.handleKeydown(e);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<TodoHeader />
{#if store.dueDateRemindersEnabled && !store.requestedNotification && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default'}
	<div
		class="notif-banner mb-4 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm sm:text-base"
		style="background: var(--input-bg); border-color: var(--border); color: var(--text-secondary);"
	>
		<span class="flex-1">Enable notifications for due date reminders</span>
		<button
			type="button"
			class="glow-btn cursor-pointer rounded-md border-none px-3 py-1.5 text-xs font-semibold text-white sm:text-sm"
			style="background: var(--btn-primary);"
			onclick={() => store.requestNotificationPermission()}
		>
			Enable
		</button>
		<button
			type="button"
			class="flex cursor-pointer items-center justify-center rounded border-none p-1 text-sm leading-none sm:text-base"
			style="color: var(--text-muted); background: transparent;"
			onclick={() => (store.requestedNotification = true)}
			aria-label="Dismiss notification banner"
		>
			&times;
		</button>
	</div>
{/if}
<TodoForm />
<TodoFilters />
<TodoList />

{#if editingTodo}
	<TodoEditModal todo={editingTodo} />
{/if}
