<script>
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Plus, ChevronDown, ChevronUp } from 'lucide-svelte';
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import { getFormState } from '$lib/state/formState.svelte.js';
	import MarkdownToolbar from './MarkdownToolbar.svelte';

	const store = getTodoStore();
	const formStore = getFormState();

	let descTextarea = $state(null);

	function handleAdd() {
		if (formStore.newTitle.trim()) {
			store.addTodo(
				formStore.newTitle.trim(),
				formStore.newDescription.trim(),
				formStore.newDueDate,
				formStore.newPriority,
				formStore.newCategory,
				formStore.newTags,
				formStore.newRecurring
			);
			formStore.reset();
		}
	}

	function handleTemplate(template) {
		formStore.applyTemplate(template);
	}

	function addCustomTag() {
		const tag = formStore.newCustomTag.trim().toLowerCase();
		if (tag && !formStore.newTags.includes(tag)) {
			formStore.newTags = [...formStore.newTags, tag];
			if (!store.availableTags.includes(tag)) {
				store.availableTags = [...store.availableTags, tag];
				const colors = [
					'#ef4444',
					'#f59e0b',
					'#06b6d4',
					'#ec4899',
					'#84cc16',
					'#14b8a6',
					'#f97316',
					'#8b5cf6',
					'#6366f1'
				];
				store.tagColors = {
					...store.tagColors,
					[tag]: colors[Math.floor(Math.random() * colors.length)]
				};
				// Track in customTags for persistence
				if (!store.customTags.includes(tag)) {
					store.customTags = [...store.customTags, tag];
				}
			}
		}
		formStore.newCustomTag = '';
	}

	// Template detection effect
	$effect(() => {
		if (formStore.selectedTemplate !== 'None') {
			const t = store.templates.find((t) => t.name === formStore.selectedTemplate);
			if (t) {
				const hasChanges =
					formStore.newTitle !== t.title ||
					formStore.newDescription !== t.description ||
					formStore.newDueDate !== t.dueDate ||
					formStore.newPriority !== t.priority ||
					formStore.newCategory !== t.category ||
					JSON.stringify(formStore.newTags) !== JSON.stringify(t.tags) ||
					formStore.newRecurring !== '';
				if (hasChanges) {
					formStore.selectedTemplate = 'None';
				}
			}
		}
	});
</script>

{#if formStore.showForm}
	<div
		class="mb-6"
		transition:fade={{
			duration: store.prefersReducedMotion ? 0 : 250,
			easing: cubicOut
		}}
	>
		<!-- Templates Segmented Control -->
		<span class="mb-2 block text-xs font-medium sm:text-sm" style="color: var(--text-muted);"
			>Choose a template</span
		>
		<div
			class="mb-4 flex flex-wrap gap-1 rounded-xl p-1 sm:gap-0.5 sm:p-0.5"
			style="background: var(--input-bg); border: 1px solid var(--border);"
		>
			{#each store.templates as template (template.name)}
				<button
					type="button"
					class="glow-btn template-btn flex-1 cursor-pointer rounded-lg border-none px-3 py-2 text-sm font-medium sm:text-base"
					class:active={formStore.selectedTemplate === template.name}
					onclick={() => handleTemplate(template)}
				>
					{template.name}
				</button>
			{/each}
		</div>

		<input
			id="title-input"
			class="mb-3 w-full rounded-xl p-3 text-sm sm:text-base"
			style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text); transition: border 0.2s, box-shadow 0.2s;"
			bind:value={formStore.newTitle}
			placeholder="What needs to be done?"
			onkeydown={(e) => e.key === 'Enter' && handleAdd()}
			autocomplete="off"
			name="title"
			aria-label="Task title"
		/>
		<div
			class="mb-3 rounded-xl p-3"
			style="border: 1px solid var(--border); background: var(--input-bg); transition: border 0.2s, box-shadow 0.2s;"
		>
			<MarkdownToolbar bind:value={formStore.newDescription} textareaRef={descTextarea} />
			<textarea
				bind:this={descTextarea}
				class="w-full resize-y bg-transparent text-sm outline-none sm:text-base"
				style="min-height: 70px; color: var(--text);"
				bind:value={formStore.newDescription}
				placeholder="Add details (Markdown supported)…"
				rows="2"
				name="description"
				aria-label="Task description"
			></textarea>
		</div>
		<div class="flex flex-wrap gap-2">
			<input
				type="date"
				class="mb-3 min-w-[100px] flex-1 rounded-xl p-3 text-sm sm:text-base"
				style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);"
				bind:value={formStore.newDueDate}
				aria-label="Due date"
			/>
			<select
				class="mb-3 min-w-[100px] flex-1 rounded-xl p-3 text-sm sm:text-base"
				style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);"
				bind:value={formStore.newPriority}
				aria-label="Priority"
			>
				<option value="high">High</option>
				<option value="medium">Medium</option>
				<option value="low">Low</option>
			</select>
			<select
				class="mb-3 min-w-[100px] flex-1 rounded-xl p-3 text-sm sm:text-base"
				style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);"
				bind:value={formStore.newCategory}
				aria-label="Category"
			>
				<option value="">Category</option>
				{#each store.categories as cat (cat)}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
			<select
				class="mb-3 min-w-[100px] flex-1 rounded-xl p-3 text-sm sm:text-base"
				style="border: 1px solid var(--border); background: var(--input-bg); color: var(--text);"
				bind:value={formStore.newRecurring}
				aria-label="Recurring"
			>
				<option value="">Repeat</option>
				<option value="daily">Daily</option>
				<option value="weekly">Weekly</option>
				<option value="monthly">Monthly</option>
			</select>
		</div>

		<!-- Tags selector -->
		<div class="mb-3">
			<div class="mb-2 flex flex-wrap items-center gap-2">
				<span class="text-xs font-medium sm:text-sm" style="color: var(--text-muted);">Tags:</span>
				{#each store.availableTags as tag (tag)}
					<button
						class="glow-tag tag-btn cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium sm:text-base"
						style="--tag-color: {store.tagColors[tag]};"
						class:selected={formStore.newTags.includes(tag)}
						onclick={() =>
							(formStore.newTags = formStore.newTags.includes(tag)
								? formStore.newTags.filter((t) => t !== tag)
								: [...formStore.newTags, tag])}
						type="button"
						data-btn="tag"
					>
						{tag}
					</button>
				{/each}
				{#each formStore.newTags.filter((t) => !store.availableTags.includes(t)) as tag (tag)}
					<button
						class="tag-btn cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium sm:text-base"
						style="background: #6366f1; color: white; border-color: #6366f1;"
						data-btn="tag"
						onclick={() => (formStore.newTags = formStore.newTags.filter((t) => t !== tag))}
						type="button"
					>
						{tag} ×
					</button>
				{/each}
			</div>
			<div class="flex">
				<input
					type="text"
					class="tag-input-field flex-1 rounded-l-lg px-3 py-2 text-sm outline-none sm:text-base"
					style="border: 1px dashed var(--border); border-right: none; background: transparent; color: var(--text);"
					placeholder="Add custom tag…"
					bind:value={formStore.newCustomTag}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addCustomTag();
						}
					}}
				/>
				<button
					class="tag-add-btn flex cursor-pointer items-center rounded-r-lg border-none px-3 py-2 text-sm sm:text-base"
					style="border: 1px dashed var(--border); background: transparent; color: var(--text-muted); transition: border 0.2s, color 0.2s;"
					data-btn="ghost"
					onclick={() => addCustomTag()}
					aria-label="Add custom tag"
					type="button"
				>
					+
				</button>
			</div>
		</div>

		<button
			type="button"
			class="glow-btn flex w-full flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none px-4 py-3.5 text-sm font-semibold sm:text-base"
			style="background: var(--btn-primary); color: white;"
			data-btn="primary"
			onclick={handleAdd}
		>
			<Plus size={16} /> Add Task
		</button>
	</div>
{:else}
	<button
		type="button"
		class="glow-btn mb-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4"
		style="border-color: var(--border); color: var(--text-muted);"
		data-btn="ghost"
		onclick={() => (formStore.showForm = true)}
	>
		<Plus size={18} /> Add a task
	</button>
{/if}

<!-- Toggle form visibility -->
<button
	type="button"
	class="glow-btn mb-3 flex w-full cursor-pointer items-center justify-center rounded-md border-none py-2"
	style="background: transparent; color: var(--text-muted);"
	data-btn="ghost"
	onclick={() => (formStore.showForm = !formStore.showForm)}
	aria-label="Toggle add form"
>
	{#if formStore.showForm}
		<ChevronUp size={16} />
	{:else}
		<ChevronDown size={16} />
	{/if}
</button>

<style>
	.template-btn {
		background: transparent;
		color: var(--text-secondary);
		transition: all 0.2s;
	}

	.template-btn:hover {
		background: var(--input-bg);
	}

	.template-btn.active {
		background: var(--btn-primary) !important;
		color: white !important;
		box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
	}

	.tag-btn.selected {
		background: var(--tag-color) !important;
		color: white;
		border-color: var(--tag-color);
	}

	.tag-input-field:focus {
		border-color: var(--btn-primary);
	}

	:global(.tag-input-field:focus + .tag-add-btn) {
		border-color: var(--btn-primary);
		color: var(--btn-primary);
	}

	.tag-add-btn:hover {
		border-color: var(--btn-primary) !important;
		color: var(--btn-primary) !important;
	}

	:global(.tag-btn:hover) {
		filter: brightness(1.1);
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			transition-duration: 0.01ms !important;
			animation-duration: 0.01ms !important;
		}
	}
</style>
