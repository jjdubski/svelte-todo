<script>
	import { getTodoStore } from '$lib/state/todoStore.svelte.js';
	import { getThemeStore } from '$lib/state/themeStore.svelte.js';
	import ColorPicker from '$lib/components/ColorPicker.svelte';

	const store = getTodoStore();
	const themeStore = getThemeStore();

	let importInput = $state(null);

	/**
	 * Trigger export of todos and download as JSON file.
	 */
	function handleExport() {
		const data = store.exportTodos();
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		store.showToast('Exported todos successfully', 'success');
	}

	/**
	 * Handle file selection for import.
	 * @param {Event} e
	 */
	function handleImport(e) {
		const target = /** @type {HTMLInputElement} */ (e.currentTarget);
		const file = target?.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const raw = typeof event.target?.result === 'string' ? event.target.result : '';
			const result = store.importTodos(raw);
			if (result.success) {
				store.showToast(result.message, 'success');
			} else {
				store.showToast(result.message, 'warning');
			}
			target.value = '';
		};
		reader.readAsText(file);
	}

	/**
	 * @param {'default'|'forest'|'ocean'|'sunset'|'midnight'|'custom'} presetId
	 */
	function selectThemePreset(presetId) {
		themeStore.themePreset = presetId;
		// Each preset has a matching accent — update automatically.
		// User can still override via the accent color picker afterward.
		if (presetId !== 'custom') {
			const preset = themeStore.presetThemes.find((p) => p.id === presetId);
			if (preset?.accent) {
				themeStore.accentColor = preset.accent;
			}
		}
	}
</script>

<div class="mx-auto" style="max-width: 620px;">
	<div class="mb-4">
		<h1 class="m-0 text-2xl font-semibold sm:text-3xl" style="color: var(--text-heading);">Settings</h1>
		<p class="mt-2 text-sm sm:text-base" style="color: var(--text-secondary);">
			Customize appearance, reminders, and data tools.
		</p>
	</div>

	<hr class="my-4" style="border-color: var(--border);" />

	<section class="space-y-4" aria-labelledby="theme-settings-heading">
		<div>
			<h2 id="theme-settings-heading" class="m-0 text-lg font-semibold" style="color: var(--text-heading);">
				Theme
			</h2>
			<p class="mt-1 text-sm" style="color: var(--text-secondary);">
				Choose a preset, tweak accent color, or use a full custom palette.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each themeStore.presetThemes as preset (preset.id)}
				<button
					type="button"
					class="theme-preset-card rounded-xl border p-3 text-left"
					class:active={themeStore.themePreset === preset.id}
					onclick={() => selectThemePreset(preset.id)}
				>
					<div class="mb-2 flex items-center justify-between gap-2">
						<span class="text-sm font-semibold" style="color: var(--text-heading);">{preset.label}</span>
						{#if themeStore.themePreset === preset.id}
							<span class="text-xs font-semibold" style="color: var(--btn-primary);">Active</span>
						{/if}
					</div>
					<div class="mb-2 flex gap-1">
						<span
							class="h-4 w-4 rounded-full border"
							style="background: {preset.light.bg}; border-color: {preset.light.border};"
						></span>
						<span
							class="h-4 w-4 rounded-full border"
							style="background: {preset.light.cardBg}; border-color: {preset.light.border};"
						></span>
						<span
							class="h-4 w-4 rounded-full border"
							style="background: {preset.dark.bg}; border-color: {preset.dark.border};"
						></span>
						<span
							class="h-4 w-4 rounded-full border"
							style="background: {preset.dark.cardBg}; border-color: {preset.dark.border};"
						></span>
					</div>
					<p class="m-0 text-xs" style="color: var(--text-muted);">{preset.description}</p>
				</button>
			{/each}

			<button
				type="button"
				class="theme-preset-card rounded-xl border p-3 text-left"
				class:active={themeStore.themePreset === 'custom'}
				onclick={() => selectThemePreset('custom')}
			>
				<div class="mb-2 flex items-center justify-between gap-2">
					<span class="text-sm font-semibold" style="color: var(--text-heading);">Custom</span>
					{#if themeStore.themePreset === 'custom'}
						<span class="text-xs font-semibold" style="color: var(--btn-primary);">Active</span>
					{/if}
				</div>
				<div class="mb-2 flex gap-1">
					<span
						class="h-4 w-4 rounded-full border"
						style="background: {themeStore.bgColor}; border-color: {themeStore.borderColor};"
					></span>
					<span
						class="h-4 w-4 rounded-full border"
						style="background: {themeStore.cardColor}; border-color: {themeStore.borderColor};"
					></span>
					<span
						class="h-4 w-4 rounded-full border"
						style="background: {themeStore.accentColor}; border-color: {themeStore.borderColor};"
					></span>
					<span
						class="h-4 w-4 rounded-full border"
						style="background: {themeStore.textColor}; border-color: {themeStore.borderColor};"
					></span>
				</div>
				<p class="m-0 text-xs" style="color: var(--text-muted);">Build your own palette</p>
			</button>
		</div>

		<div class="rounded-xl border p-3" style="border-color: var(--border); background: var(--todo-bg);">
			<ColorPicker
				label="Accent color"
				value={themeStore.accentColor}
				oncolorchange={(c) => (themeStore.accentColor = c)}
			/>
		</div>

		{#if themeStore.themePreset === 'custom'}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div class="rounded-xl border p-3" style="border-color: var(--border); background: var(--todo-bg);">
					<ColorPicker
						label="Background"
						value={themeStore.bgColor}
						oncolorchange={(c) => (themeStore.bgColor = c)}
					/>
				</div>
				<div class="rounded-xl border p-3" style="border-color: var(--border); background: var(--todo-bg);">
					<ColorPicker
						label="Card"
						value={themeStore.cardColor}
						oncolorchange={(c) => (themeStore.cardColor = c)}
					/>
				</div>
				<div class="rounded-xl border p-3" style="border-color: var(--border); background: var(--todo-bg);">
					<ColorPicker
						label="Text"
						value={themeStore.textColor}
						oncolorchange={(c) => (themeStore.textColor = c)}
					/>
				</div>
				<div class="rounded-xl border p-3" style="border-color: var(--border); background: var(--todo-bg);">
					<ColorPicker
						label="Border"
						value={themeStore.borderColor}
						oncolorchange={(c) => (themeStore.borderColor = c)}
					/>
				</div>
			</div>
		{/if}
	</section>

	<hr class="my-4" style="border-color: var(--border);" />

	<section class="space-y-3" aria-labelledby="notification-settings-heading">
		<div>
			<h2
				id="notification-settings-heading"
				class="m-0 text-lg font-semibold"
				style="color: var(--text-heading);"
			>
				Notifications
			</h2>
			<p class="mt-1 text-sm" style="color: var(--text-secondary);">
				Choose which due date reminders should appear.
			</p>
		</div>

		<div class="space-y-2">
			<label class="settings-toggle-row" for="enable-due-date-reminders">
				<div>
					<div class="text-sm font-medium" style="color: var(--text-heading);">Enable due date reminders</div>
					<div class="text-xs" style="color: var(--text-muted);">
						Requests browser notification permission
					</div>
				</div>
				<input
					id="enable-due-date-reminders"
					type="checkbox"
					checked={store.dueDateRemindersEnabled}
					onchange={(e) => store.setDueDateRemindersEnabled(e.currentTarget.checked)}
				/>
			</label>

			<label class="settings-toggle-row" for="enable-overdue-reminders">
				<div>
					<div class="text-sm font-medium" style="color: var(--text-heading);">
						Remind me of overdue tasks
					</div>
					<div class="text-xs" style="color: var(--text-muted);">
						Show notifications for tasks past due date
					</div>
				</div>
				<input
					id="enable-overdue-reminders"
					type="checkbox"
					disabled={!store.dueDateRemindersEnabled}
					checked={store.remindOverdueTasks}
					onchange={(e) => store.setRemindOverdueTasks(e.currentTarget.checked)}
				/>
			</label>

			<label class="settings-toggle-row" for="enable-today-reminders">
				<div>
					<div class="text-sm font-medium" style="color: var(--text-heading);">
						Remind me of today's tasks
					</div>
					<div class="text-xs" style="color: var(--text-muted);">Show notifications due today</div>
				</div>
				<input
					id="enable-today-reminders"
					type="checkbox"
					disabled={!store.dueDateRemindersEnabled}
					checked={store.remindTodayTasks}
					onchange={(e) => store.setRemindTodayTasks(e.currentTarget.checked)}
				/>
			</label>
		</div>
	</section>

	<hr class="my-4" style="border-color: var(--border);" />

	<section class="space-y-3" aria-labelledby="display-settings-heading">
		<div>
			<h2 id="display-settings-heading" class="m-0 text-lg font-semibold" style="color: var(--text-heading);">
				Display
			</h2>
			<p class="mt-1 text-sm" style="color: var(--text-secondary);">
				Font selection is available now. More display controls are coming soon.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each themeStore.fontOptions as option (option.id)}
				<label class="font-option-row" style="font-family: var(--app-font-family);">
					<div>
						<div class="text-sm font-medium" style="color: var(--text-heading);">{option.label}</div>
						<div
							class="text-xs"
							style="color: var(--text-muted); font-family: {option.id === 'system-ui'
								? 'system-ui'
								: option.id === 'inter'
									? "'Inter', system-ui, sans-serif"
									: option.id === 'serif'
										? "'Merriweather', serif"
										: "'JetBrains Mono', ui-monospace, monospace"};"
						>
							Aa Bb Cc 123
						</div>
					</div>
					<input
						type="radio"
						name="font-family"
						value={option.id}
						checked={themeStore.fontFamily === option.id}
						onchange={() => (themeStore.fontFamily = option.id)}
					/>
				</label>
			{/each}
		</div>
	</section>

	<hr class="my-4" style="border-color: var(--border);" />

	<section class="space-y-3" aria-labelledby="data-settings-heading">
		<div>
			<h2 id="data-settings-heading" class="m-0 text-lg font-semibold" style="color: var(--text-heading);">
				Data
			</h2>
			<p class="mt-1 text-sm" style="color: var(--text-secondary);">Import or export your task data as JSON.</p>
		</div>

		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="glow-btn rounded-lg border px-4 py-2 text-sm font-medium"
				style="background: var(--input-bg); color: var(--text-heading); border-color: var(--border);"
				onclick={() => importInput?.click()}
			>
				Import JSON
			</button>

			<button
				type="button"
				class="glow-btn rounded-lg border px-4 py-2 text-sm font-medium text-white"
				style="background: var(--btn-primary); border-color: var(--btn-primary);"
				onclick={handleExport}
			>
				Export JSON
			</button>

			<input
				bind:this={importInput}
				type="file"
				accept=".json,application/json"
				class="hidden"
				onchange={handleImport}
			/>
		</div>
	</section>
</div>

<style>
	.theme-preset-card {
		background: var(--todo-bg);
		border-color: var(--border);
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			transform 0.2s ease;
	}

	.theme-preset-card:hover {
		transform: translateY(-1px);
		border-color: var(--btn-primary);
		box-shadow: 0 6px 18px color-mix(in srgb, var(--btn-primary) 24%, transparent);
	}

	.theme-preset-card.active {
		border-color: var(--btn-primary);
		box-shadow: 0 0 0 1px var(--btn-primary);
	}

	.settings-toggle-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: var(--todo-bg);
	}

	.settings-toggle-row input[type='checkbox'] {
		accent-color: var(--btn-primary);
		width: 1rem;
		height: 1rem;
		cursor: pointer;
	}

	.font-option-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: var(--todo-bg);
	}

	.font-option-row input[type='radio'] {
		accent-color: var(--btn-primary);
		cursor: pointer;
	}
</style>
