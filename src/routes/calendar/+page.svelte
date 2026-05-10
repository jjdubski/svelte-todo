<script>
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import { ChevronLeft, ChevronRight, Check } from 'lucide-svelte';
	import { format, addMonths, subMonths, isToday } from 'date-fns';

	const store = getTodoStore();

	let currentDate = $state(new Date());

	let currentMonthName = $derived(format(currentDate, 'MMMM'));
	let currentYearNum = $derived(currentDate.getFullYear());
	let daysInMonth = $derived(
		new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
	);
	let firstDayOfMonth = $derived(
		new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
	); // 0 = Sunday

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
</script>

<div
	class="flex min-h-dvh justify-center p-4"
	style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%); transition: background 0.3s;"
>
	<div
		class="flex w-full max-w-[1080px] flex-col rounded-2xl border p-4 sm:rounded-xl sm:p-5 xl:max-w-[1400px] 2xl:max-w-[1600px]"
		style="background: var(--card-bg); box-shadow: 0 8px 32px var(--shadow); border-color: var(--border); transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;"
	>
		<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
			<h2 class="m-0 text-xl font-semibold sm:text-2xl" style="color: var(--text-heading);">
				Calendar View
			</h2>
			<div
				class="order-last flex w-full flex-1 items-center justify-center gap-2 sm:order-none sm:w-auto sm:gap-4"
			>
				<button
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
					class="glow-btn flex cursor-pointer items-center justify-center rounded-md border-0 p-1"
					style="color: var(--text-muted);"
					onclick={nextMonth}
				>
					<ChevronRight size={24} />
				</button>
			</div>
			<a
				href="/"
				class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium no-underline transition-all hover:opacity-80 sm:text-base"
				style="color: var(--btn-primary); background: var(--input-bg);"
			>
				Back to Tasks
			</a>
		</div>

		<div class="grid flex-1 grid-cols-7 gap-px sm:gap-1">
			<!-- Weekdays header -->
			{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day (day)}
				<div
					class="pb-1 text-center text-xs font-semibold sm:pb-2 sm:text-sm"
					style="color: var(--text-muted);"
				>
					<span class="hidden sm:inline">{day}</span>
					<span class="sm:hidden">{day.charAt(0)}</span>
				</div>
			{/each}

			<!-- Empty slots before first day -->
			{#each Array(firstDayOfMonth) as _, i (i)}
				<div
					class="aspect-square rounded-lg border p-1 sm:rounded-xl sm:p-2"
					style="border-color: transparent;"
				></div>
			{/each}

			<!-- Days -->
			{#each Array(daysInMonth) as _, i (i)}
				{@const day = i + 1}
				{@const tasks = getTasksForDay(day)}
				{@const isDayToday = isToday(
					new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
				)}

				<div
					class="flex aspect-square flex-col gap-1 overflow-y-auto rounded-lg border p-1 sm:rounded-xl sm:p-2"
					style="border-color: {isDayToday
						? 'var(--btn-primary)'
						: 'var(--border)'}; background: var(--todo-bg);"
				>
					<span
						class="mb-1 block text-xs font-bold sm:text-sm"
						style="color: {isDayToday ? 'var(--btn-primary)' : 'var(--text-secondary)'};"
					>
						{day}
					</span>
					{#each tasks as task (task.id)}
						<div
							class="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs"
							style="background: var(--input-bg); color: {task.completed
								? 'var(--text-muted)'
								: 'var(--text-heading)'}; text-decoration: {task.completed
								? 'line-through'
								: 'none'};"
							title={task.title}
						>
							{#if task.completed}
								<Check size={10} class="hidden sm:block" style="color: var(--btn-save);" />
							{/if}
							<span class="truncate">{task.title}</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>
