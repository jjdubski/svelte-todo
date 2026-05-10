<script>
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import StatsBar from '$lib/StatsBar.svelte';
	import {
		BarChart3,
		PieChart,
		List,
		AlertTriangle,
		Flame,
		ArrowLeft,
		Target
	} from 'lucide-svelte';

	const store = getTodoStore();

	/** Format a date string for display */
	function formatDate(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	/** Completion rate percentage */
	let completedPct = $derived(
		store.stats.total > 0 ? Math.round((store.stats.completed / store.stats.total) * 100) : 0
	);
	let activePct = $derived(
		store.stats.total > 0 ? Math.round((store.stats.active / store.stats.total) * 100) : 0
	);

	/** Max completions in a day (for scaling bar charts) */
	let maxDayCompletions = $derived(Math.max(1, ...Object.values(store.completionsByDay)));

	/** Total tasks for priority distribution bar */
	let priorityTotal = $derived(
		store.priorityDistribution.high +
			store.priorityDistribution.medium +
			store.priorityDistribution.low
	);
</script>

<div
	class="flex min-h-dvh justify-center p-4"
	style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%); transition: background 0.3s;"
>
	<div
		class="w-full max-w-[1080px] rounded-2xl border p-8 sm:rounded-xl sm:p-5 xl:max-w-[1300px] 2xl:max-w-[1500px]"
		style="background: var(--card-bg); box-shadow: 0 8px 32px var(--shadow); border-color: var(--border); transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;"
	>
		<div class="mb-4 flex items-center justify-between gap-2">
			<h2 class="m-0 text-xl font-semibold sm:text-2xl" style="color: var(--text-heading);">
				Analytics
			</h2>
			<a
				href="/"
				class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium no-underline transition-all hover:opacity-80 sm:text-base"
				style="color: var(--btn-primary); background: var(--input-bg);"
			>
				<ArrowLeft size={14} /> Back to Tasks
			</a>
		</div>

		<StatsBar />

		<!-- Analytics Grid -->
		<div class="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
			<!-- 1. Completion Rate -->
			<div
				class="glow-card stat-card rounded-xl border p-5"
				style="background: var(--todo-bg); border-color: var(--border);"
			>
				<div class="mb-3 flex items-center gap-2">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-lg"
						style="background: rgba(34, 197, 94, 0.15);"
					>
						<Target size={18} style="color: #22c55e;" />
					</div>
					<div>
						<h3 class="m-0 text-sm font-semibold sm:text-base" style="color: var(--text-heading);">
							Completion Rate
						</h3>
						<p class="m-0 text-xs sm:text-sm" style="color: var(--text-muted);">
							{store.stats.total} total tasks
						</p>
					</div>
				</div>

				<div class="mb-2 flex items-center justify-between text-sm sm:text-base">
					<span style="color: var(--text-secondary);"
						>Completed: <strong>{completedPct}%</strong></span
					>
					<span style="color: var(--text-secondary);">Active: <strong>{activePct}%</strong></span>
				</div>

				<div class="h-8 w-full overflow-hidden rounded-lg" style="background: var(--input-bg);">
					{#if store.stats.total > 0}
						<div
							class="h-full rounded-lg transition-all duration-500"
							style="width: {completedPct}%; background: linear-gradient(90deg, #22c55e, #4ade80);"
						></div>
					{/if}
				</div>

				<div
					class="mt-2 flex items-center justify-between text-xs sm:text-sm"
					style="color: var(--text-muted);"
				>
					<span>{store.stats.completed} done</span>
					<span>{store.stats.active} active</span>
				</div>
			</div>

			<!-- 2. Streak Counter -->
			<div
				class="glow-card stat-card rounded-xl border p-5"
				style="background: var(--todo-bg); border-color: var(--border);"
			>
				<div class="mb-3 flex items-center gap-2">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-lg"
						style="background: rgba(249, 115, 22, 0.15);"
					>
						<Flame size={18} style="color: #f97316;" />
					</div>
					<h3 class="m-0 text-sm font-semibold sm:text-base" style="color: var(--text-heading);">
						Completion Streak
					</h3>
				</div>

				<div class="flex flex-col items-center py-4">
					<span
						class="text-3xl font-extrabold sm:text-5xl"
						style="color: {store.streak > 0 ? '#f97316' : 'var(--text-muted)'}; line-height: 1;"
					>
						{store.streak}
					</span>
					<span class="mt-2 text-sm font-medium sm:text-base" style="color: var(--text-secondary);">
						{store.streak === 1 ? 'day' : 'days'} consecutive
					</span>
					{#if store.streak > 0}
						<p class="m-0 mt-3 text-xs sm:text-sm" style="color: var(--text-muted);">
							Keep it up! You're on a roll.
						</p>
					{:else}
						<p class="m-0 mt-3 text-xs sm:text-sm" style="color: var(--text-muted);">
							Complete a task today to start a streak!
						</p>
					{/if}
				</div>
			</div>

			<!-- 3. Productivity by Day of Week -->
			<div
				class="glow-card stat-card rounded-xl border p-5"
				style="background: var(--todo-bg); border-color: var(--border);"
			>
				<div class="mb-4 flex items-center gap-2">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-lg"
						style="background: rgba(99, 102, 241, 0.15);"
					>
						<BarChart3 size={18} style="color: #6366f1;" />
					</div>
					<div>
						<h3 class="m-0 text-sm font-semibold sm:text-base" style="color: var(--text-heading);">
							Productivity This Week
						</h3>
						<p class="m-0 text-xs sm:text-sm" style="color: var(--text-muted);">
							Tasks completed per day
						</p>
					</div>
				</div>

				<div class="flex items-end justify-around gap-1" style="height: 120px;">
					{#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as day (day)}
						{@const count = store.completionsByDay[day] || 0}
						{@const heightPct = (count / maxDayCompletions) * 100}
						<div class="flex flex-1 flex-col items-center gap-1">
							<span
								class="text-xs font-bold"
								style="color: {count > 0 ? 'var(--text-secondary)' : 'var(--text-muted)'};"
							>
								{count}
							</span>
							<div
								class="w-full rounded-t transition-all duration-500"
								style="
									height: {Math.max(heightPct || 0, 4)}px;
									background: linear-gradient(180deg, #6366f1, #8b5cf6);
									opacity: {count > 0 ? 1 : 0.25};
								"
							></div>
							<span class="text-xs" style="color: var(--text-muted);">{day.slice(0, 2)}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- 4. Priority Distribution -->
			<div
				class="glow-card stat-card rounded-xl border p-5"
				style="background: var(--todo-bg); border-color: var(--border);"
			>
				<div class="mb-3 flex items-center gap-2">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-lg"
						style="background: rgba(245, 158, 11, 0.15);"
					>
						<PieChart size={18} style="color: #f59e0b;" />
					</div>
					<h3 class="m-0 text-sm font-semibold sm:text-base" style="color: var(--text-heading);">
						Priority Distribution
					</h3>
				</div>

				<div class="space-y-3">
					<!-- Stacked bar -->
					<div class="h-6 w-full overflow-hidden rounded-lg" style="background: var(--input-bg);">
						{#if priorityTotal > 0}
							<div class="flex h-full">
								<div
									class="h-full transition-all duration-500"
									style="width: {(store.priorityDistribution.high / priorityTotal) *
										100}%; background: var(--priority-high);"
								></div>
								<div
									class="h-full transition-all duration-500"
									style="width: {(store.priorityDistribution.medium / priorityTotal) *
										100}%; background: var(--priority-medium);"
								></div>
								<div
									class="h-full transition-all duration-500"
									style="width: {(store.priorityDistribution.low / priorityTotal) *
										100}%; background: var(--priority-low);"
								></div>
							</div>
						{/if}
					</div>

					<div class="flex items-center justify-between text-sm sm:text-base">
						<div class="flex items-center gap-1.5">
							<span
								class="inline-block h-2.5 w-2.5 rounded-full"
								style="background: var(--priority-high);"
							></span>
							<span style="color: var(--text-secondary);">High</span>
							<strong style="color: var(--text-heading);">{store.priorityDistribution.high}</strong>
						</div>
						<div class="flex items-center gap-1.5">
							<span
								class="inline-block h-2.5 w-2.5 rounded-full"
								style="background: var(--priority-medium);"
							></span>
							<span style="color: var(--text-secondary);">Medium</span>
							<strong style="color: var(--text-heading);"
								>{store.priorityDistribution.medium}</strong
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span
								class="inline-block h-2.5 w-2.5 rounded-full"
								style="background: var(--priority-low);"
							></span>
							<span style="color: var(--text-secondary);">Low</span>
							<strong style="color: var(--text-heading);">{store.priorityDistribution.low}</strong>
						</div>
					</div>
				</div>
			</div>

			<!-- 5. Category Breakdown -->
			<div
				class="glow-card stat-card rounded-xl border p-5"
				style="background: var(--todo-bg); border-color: var(--border);"
			>
				<div class="mb-3 flex items-center gap-2">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-lg"
						style="background: rgba(168, 85, 247, 0.15);"
					>
						<List size={18} style="color: #a855f7;" />
					</div>
					<h3 class="m-0 text-sm font-semibold sm:text-base" style="color: var(--text-heading);">
						Category Breakdown
					</h3>
				</div>

				<div class="space-y-2">
					{#if Object.keys(store.categoryBreakdown).length === 0}
						<p class="m-0 py-4 text-center text-sm" style="color: var(--text-muted);">
							No categories assigned yet
						</p>
					{:else}
						{#each Object.entries(store.categoryBreakdown) as [category, count] (category)}
							{@const color = store.categoryColors[category] || '#64748b'}
							{@const pct =
								store.stats.total > 0 ? Math.round((count / store.stats.total) * 100) : 0}
							<div class="flex items-center gap-3">
								<span
									class="inline-block h-3 w-3 shrink-0 rounded-full"
									style="background: {color};"
								></span>
								<span
									class="flex-1 text-sm font-medium sm:text-base"
									style="color: var(--text-secondary);"
								>
									{category}
								</span>
								<span class="text-sm font-semibold sm:text-base" style="color: var(--text-heading);"
									>{count}</span
								>
								<span class="text-xs sm:text-sm" style="color: var(--text-muted);">({pct}%)</span>
								<div
									class="h-1.5 w-16 overflow-hidden rounded-full sm:w-24"
									style="background: var(--input-bg);"
								>
									<div
										class="h-full rounded-full transition-all duration-500"
										style="width: {pct}%; background: {color};"
									></div>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- 6. Overdue Tasks -->
			<div
				class="glow-card stat-card rounded-xl border p-5"
				style="background: var(--todo-bg); border-color: var(--border);"
			>
				<div class="mb-3 flex items-center gap-2">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-lg"
						style="background: rgba(239, 68, 68, 0.15);"
					>
						<AlertTriangle size={18} style="color: #ef4444;" />
					</div>
					<div>
						<h3 class="m-0 text-sm font-semibold sm:text-base" style="color: var(--text-heading);">
							Overdue Tasks
						</h3>
						<p class="m-0 text-xs sm:text-sm" style="color: var(--text-muted);">
							{store.stats.overdue} task{store.stats.overdue !== 1 ? 's' : ''} past due
						</p>
					</div>
				</div>

				<div class="space-y-1.5">
					{#if store.overdueTasks.length === 0}
						<p class="m-0 py-4 text-center text-sm sm:text-base" style="color: var(--text-muted);">
							No overdue tasks — you're all caught up!
						</p>
					{:else}
						{#each store.overdueTasks as todo (todo.id)}
							<a
								href="/"
								class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline transition-colors"
								style="background: rgba(239, 68, 68, 0.08); color: var(--priority-high);"
							>
								<AlertTriangle size={12} />
								<span class="flex-1 truncate font-medium">{todo.title}</span>
								<span class="shrink-0 text-xs font-semibold sm:text-sm">
									{formatDate(todo.dueDate)}
								</span>
							</a>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.stat-card {
		transition:
			transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.3s ease,
			border-color 0.3s ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		border-color: var(--btn-primary);
		box-shadow: 0 8px 30px rgba(37, 99, 235, 0.12);
	}
</style>
