<script>
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import BackButton from '$lib/components/BackButton.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import { ChevronLeft, ChevronRight, Check } from 'lucide-svelte';
	import { format, addMonths, subMonths, isToday } from 'date-fns';
	import DayDetailModal from '$lib/components/DayDetailModal.svelte';

	const store = getTodoStore();

	let currentDate = $state(new Date());
	let selectedDate = $state(null);
	let tooltipTarget = $state(null);
	let tooltipTask = $state(null);

	let currentMonthName = $derived(format(currentDate, 'MMMM'));
	let currentYearNum = $derived(currentDate.getFullYear());
	let daysInMonth = $derived(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
	let firstDayOfMonth = $derived(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()); // 0 = Sunday

	function prevMonth() {
		currentDate = subMonths(currentDate, 1);
	}

	function nextMonth() {
		currentDate = addMonths(currentDate, 1);
	}

	// Group tasks by date
	let tasksByDate = $derived.by(() => {
		const map = {};
		store.todos.forEach((todo) => {
			if (todo.dueDate) {
				if (!map[todo.dueDate]) map[todo.dueDate] = [];
				map[todo.dueDate].push(todo);
			}
		});
		return map;
	});

	function getTasksForDay(day) {
		const date = new Date(currentYearNum, currentDate.getMonth(), day);
		const dateStr = format(date, 'yyyy-MM-dd');
		return tasksByDate[dateStr] || [];
	}

	function getTaskLineColor(task) {
		const firstTag = task.tags?.[0];
		if (firstTag && store.tagColors[firstTag]) return store.tagColors[firstTag];
		return '#9ca3af';
	}
</script>

<div class="mb-2 flex items-center justify-between">
	<h2 class="m-0 text-xl font-semibold sm:text-2xl" style="color: var(--text-heading);">Calendar View</h2>
	<BackButton />
</div>
<div class="mb-6 flex items-center justify-center gap-2 sm:gap-4">
	<button
		type="button"
		class="glow-btn flex cursor-pointer items-center justify-center rounded-md border-0 p-1"
		style="color: var(--text-muted);"
		onclick={prevMonth}
	>
		<ChevronLeft size={24} />
	</button>
	<h3
		class="m-0 text-base font-medium sm:text-lg"
		style="color: var(--text-heading); width: 140px; text-align: center;"
	>
		{currentMonthName}
		{currentYearNum}
	</h3>
	<button
		type="button"
		class="glow-btn flex cursor-pointer items-center justify-center rounded-md border-0 p-1"
		style="color: var(--text-muted);"
		onclick={nextMonth}
	>
		<ChevronRight size={24} />
	</button>
</div>

<div class="grid flex-1 grid-cols-7 gap-px sm:gap-1">
	<!-- Weekdays header -->
	{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day (day)}
		<div class="pb-1 text-center text-xs font-semibold sm:pb-2 sm:text-sm" style="color: var(--text-muted);">
			<span class="hidden sm:inline">{day}</span>
			<span class="sm:hidden">{day.charAt(0)}</span>
		</div>
	{/each}

	<!-- Empty slots before first day -->
	{#each Array(firstDayOfMonth) as _, i (i)}
		<div class="aspect-square rounded-lg border p-1 sm:rounded-xl sm:p-2" style="border-color: transparent;"></div>
	{/each}

	<!-- Days -->
	{#each Array(daysInMonth) as _, i (i)}
		{@const day = i + 1}
		{@const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)}
		{@const dateStr = format(date, 'yyyy-MM-dd')}
		{@const tasks = getTasksForDay(day)}
		{@const isDayToday = isToday(date)}

		<div
			class="relative flex aspect-square cursor-pointer flex-col gap-0.5 overflow-hidden rounded-lg border p-1 sm:rounded-xl sm:p-2"
			style="border-color: {isDayToday ? 'var(--btn-primary)' : 'var(--border)'}; background: var(--todo-bg);"
			onclick={() => (selectedDate = dateStr)}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selectedDate = dateStr)}
			role="button"
			tabindex="0"
		>
			<span
				class="block text-xs font-bold sm:text-sm"
				style="color: {isDayToday ? 'var(--btn-primary)' : 'var(--text-secondary)'};"
			>
				{day}
			</span>
			{#if tasks.length > 0}
				<div
					class="pointer-events-none top-1 right-1 left-1 flex max-h-6 flex-col gap-0.5 overflow-hidden sm:hidden"
				>
					{#each tasks.slice(0, 4) as task (task.id)}
						<div class="h-0.5 w-full rounded-full" style="background: {getTaskLineColor(task)};"></div>
					{/each}
				</div>
			{/if}

			<div class="hidden flex-col gap-0.5 sm:flex">
				{#each tasks as task (task.id)}
					<div
						class="flex items-center truncate rounded px-0.5 py-0.25 text-xs sm:px-1 sm:py-0.5"
						style="background: var(--input-bg); color: {task.completed
							? 'var(--text-muted)'
							: 'var(--text-heading)'}; text-decoration: {task.completed ? 'line-through' : 'none'};"
						onmouseenter={(e) => {
							tooltipTask = task;
							tooltipTarget = e.currentTarget;
						}}
						onmouseleave={() => {
							tooltipTarget = null;
						}}
						role="button"
						tabindex="0"
						aria-label={task.title}
					>
						{#if task.completed}
							<Check size={10} class="hidden sm:block" style="color: var(--btn-save);" />
						{/if}
						<span class="truncate">{task.title}</span>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<DayDetailModal {selectedDate} onclose={() => (selectedDate = null)} />
<Tooltip
	title={tooltipTask?.title}
	description={tooltipTask?.description}
	priority={tooltipTask?.priority}
	tags={tooltipTask?.tags || []}
	tagColors={store.tagColors}
	targetEl={tooltipTarget}
/>
