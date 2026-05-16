<script>
	import { fade, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { SvelteDate } from 'svelte/reactivity';
	import { materialEasing } from '$lib/utils/motion.js';
	import {
		Layers,
		Plus,
		PartyPopper,
		Search,
		Filter,
		RotateCcw,
		ChevronDown,
		ChevronRight,
		Calendar
	} from 'lucide-svelte';
	import Todo from '$lib/components/Todo.svelte';
	import SkeletonLoader from '$lib/components/SkeletonLoader.svelte';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';

	const store = getTodoStore();

	let showUpcoming = $state(true);

	function _localDateStr(date = new Date()) {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	let todayStr = $derived(_localDateStr());
	let tomorrowStr = $derived.by(() => {
		const d = new SvelteDate();
		d.setDate(d.getDate() + 1);
		return _localDateStr(d);
	});

	function formatUpcomingDate(dateStr) {
		if (!dateStr) return '';
		if (dateStr === todayStr) return 'Due Today';
		if (dateStr === tomorrowStr) return 'Due Tomorrow';
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="flex flex-col gap-2" role="list">
	{#if store.isLoading}
		<SkeletonLoader />
	{:else if store.filteredTodos.length === 0}
		<div
			class="flex flex-col items-center px-4 py-12"
			in:fade={{ duration: store.prefersReducedMotion ? 0 : 300, easing: materialEasing }}
		>
			{#if store.todos.length === 0}
				<!-- No tasks ever -->
				<div
					class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
					style="background: linear-gradient(135deg, var(--btn-primary) 0%, var(--btn-edit) 100%); color: white;"
				>
					<Layers size={40} />
				</div>
				<h3 class="m-0 mb-2 text-base font-semibold sm:text-lg" style="color: var(--text-heading);">
					No tasks yet
				</h3>
				<p class="m-0 mb-6 text-sm sm:text-base" style="color: var(--text-muted);">Add a task to get started</p>
				<button
					type="button"
					class="glow-btn flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none px-4 py-3.5 text-sm font-semibold sm:text-base"
					style="background: var(--btn-primary); color: white; max-width: 280px;"
					data-btn="primary"
					onclick={() => (store.showForm = true)}
				>
					<Plus size={16} /> Add your first task
				</button>
			{:else if store.todos.every((t) => t.completed)}
				<!-- All tasks completed -->
				<div
					class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
					style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white;"
				>
					<PartyPopper size={40} />
				</div>
				<h3 class="m-0 mb-2 text-base font-semibold sm:text-lg" style="color: var(--text-heading);">
					All tasks completed!
				</h3>
				<p class="m-0 mb-6 text-sm sm:text-base" style="color: var(--text-muted);">
					Great job! You're all caught up.
				</p>
				{#if store.activeFilterCount > 0}
					<button
						type="button"
						class="glow-btn flex cursor-pointer items-center gap-1.5 rounded-xl border-none px-4 py-2.5 text-sm font-semibold"
						style="background: var(--btn-cancel); color: white;"
						data-btn="cancel"
						onclick={() => store.clearFilters()}
					>
						<Filter size={14} /> Clear filters
					</button>
				{/if}
			{:else if store.filterText}
				<!-- Search yields no results -->
				<div
					class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
					style="background: linear-gradient(135deg, var(--btn-primary) 0%, var(--btn-edit) 100%); color: white;"
				>
					<Search size={40} />
				</div>
				<h3 class="m-0 mb-2 text-base font-semibold sm:text-lg" style="color: var(--text-heading);">
					No results for “{store.filterText}”
				</h3>
				<p class="m-0 mb-6 text-sm sm:text-base" style="color: var(--text-muted);">
					Try different keywords or check your spelling
				</p>
				<button
					type="button"
					class="glow-btn flex cursor-pointer items-center gap-1.5 rounded-xl border-none px-4 py-2.5 text-sm font-semibold"
					style="background: var(--btn-cancel); color: white;"
					data-btn="cancel"
					onclick={() => store.clearFilters()}
				>
					<Filter size={14} /> Clear filters
				</button>
			{:else}
				<!-- Filters yield no results -->
				<div
					class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
					style="background: linear-gradient(135deg, var(--btn-primary) 0%, var(--btn-edit) 100%); color: white;"
				>
					<Filter size={40} />
				</div>
				<h3 class="m-0 mb-2 text-base font-semibold sm:text-lg" style="color: var(--text-heading);">
					No tasks match your filters
				</h3>
				<p class="m-0 mb-6 text-sm sm:text-base" style="color: var(--text-muted);">
					Try adjusting or clearing your filters
					{#if store.filterDateFrom || store.filterDateTo}
						<br />The date range filter may be limiting results.
					{/if}
				</p>
				<button
					type="button"
					class="glow-btn flex cursor-pointer items-center gap-1.5 rounded-xl border-none px-4 py-2.5 text-sm font-semibold"
					style="background: var(--btn-cancel); color: white;"
					data-btn="cancel"
					onclick={() => store.clearFilters()}
				>
					<RotateCcw size={14} /> Clear filters
				</button>
			{/if}
		</div>
	{:else}
		{#if (store.filterStatus === 'all' || store.filterStatus === 'active') && store.upcomingDueTasks.length > 0}
			<div
				class="upcoming-section glow-card mb-4 rounded-xl border p-3"
				transition:slide={{
					duration: store.prefersReducedMotion ? 0 : 200,
					easing: materialEasing
				}}
			>
				<button
					type="button"
					class="upcoming-toggle flex w-full cursor-pointer items-center gap-2 border-none bg-none p-0 text-sm font-semibold sm:text-base"
					style="color: var(--text-heading);"
					onclick={() => (showUpcoming = !showUpcoming)}
				>
					<Calendar size={14} />
					<span>Upcoming Due Dates</span>
					<span
						class="upcoming-badge ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold text-white sm:text-sm"
						style="background: var(--btn-primary);"
					>
						{store.upcomingDueTasks.length}
					</span>
					<span class="ml-auto" style="color: var(--text-muted);">
						{#if showUpcoming}
							<ChevronDown size={14} />
						{:else}
							<ChevronRight size={14} />
						{/if}
					</span>
				</button>
				{#if showUpcoming}
					<div class="upcoming-list mt-2 flex flex-col gap-1">
						{#each store.upcomingDueTasks as task (task.id)}
							{@const isToday = task.dueDate === todayStr}
							{@const isTomorrow = task.dueDate === tomorrowStr}
							<div
								class="upcoming-task flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm sm:text-base"
								class:due-today={isToday}
								class:due-tomorrow={isTomorrow}
							>
								<span class="flex-1 truncate font-medium" style="color: var(--text);">{task.title}</span
								>
								<span
									class="upcoming-date-label text-xs font-medium whitespace-nowrap sm:text-sm"
									style="color: {isToday
										? 'var(--priority-high)'
										: isTomorrow
											? 'var(--priority-medium)'
											: 'var(--text-muted)'};"
								>
									{formatUpcomingDate(task.dueDate)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
		{#each store.filteredTodos as todo, i (todo.id)}
			<div
				animate:flip={{ duration: store.prefersReducedMotion ? 0 : 300, easing: materialEasing }}
				transition:slide={{
					duration: store.prefersReducedMotion ? 0 : 200,
					easing: materialEasing,
					delay: store.prefersReducedMotion ? 0 : i * 20
				}}
			>
				<Todo {todo} />
			</div>
		{/each}
	{/if}
</div>

<style>
	.upcoming-section {
		border: 1px solid var(--border);
		background: var(--todo-bg);
	}

	.upcoming-toggle {
		user-select: none;
	}

	.upcoming-task {
		background: var(--input-bg);
		border: 1px solid var(--border);
		transition: border-color 0.2s;
	}

	.upcoming-task.due-today {
		border-left: 3px solid var(--priority-high);
	}

	.upcoming-task.due-tomorrow {
		border-left: 3px solid var(--priority-medium);
	}

	.upcoming-task:hover {
		border-color: var(--btn-primary);
	}
</style>
