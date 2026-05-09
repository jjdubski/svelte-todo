<script>
	let { stats } = $props();
</script>

<div class="flex gap-0 mb-6 p-0 rounded-xl border overflow-hidden" style="background: var(--todo-bg); border-color: var(--border);">
	<div class="flex flex-col items-center flex-1 p-4">
		<span class="text-2xl font-bold" style="color: var(--text-heading); line-height: 1;">{stats.active}</span>
		<span class="text-sm mt-1" style="color: var(--text-muted);">Active</span>
	</div>
	<div class="w-px self-stretch" style="background: var(--border);"></div>
	<div class="flex flex-col items-center flex-1 p-4">
		<span class="text-2xl font-bold" style="color: var(--text-heading); line-height: 1;">{stats.completed}</span>
		<span class="text-sm mt-1" style="color: var(--text-muted);">Completed</span>
	</div>
	<div class="w-px self-stretch" style="background: var(--border);"></div>
	<div class="flex flex-col items-center flex-1 p-4">
		<span class="text-2xl font-bold" style="color: var(--priority-high); line-height: 1;">{stats.overdue}</span>
		<span class="text-sm mt-1" style="color: var(--text-muted);">Overdue</span>
	</div>
</div>
