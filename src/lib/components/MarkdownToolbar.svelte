<script>
	import { Bold, Italic, List, Link } from 'lucide-svelte';

	let { value = $bindable(''), textareaRef } = $props();

	function insertMarkdown(prefix, suffix = '') {
		if (!textareaRef) return;

		const start = textareaRef.selectionStart;
		const end = textareaRef.selectionEnd;
		const text = value;
		const selectedText = text.substring(start, end);

		const before = text.substring(0, start);
		const after = text.substring(end);

		value = before + prefix + selectedText + suffix + after;

		// Set focus back and adjust selection
		setTimeout(() => {
			textareaRef.focus();
			textareaRef.setSelectionRange(start + prefix.length, end + prefix.length);
		}, 0);
	}
</script>

<div class="mb-2 flex items-center gap-1 border-b pb-2" style="border-color: var(--border);">
	<button type="button" class="toolbar-btn rounded p-1" onclick={() => insertMarkdown('**', '**')} aria-label="Bold">
		<Bold size={16} />
	</button>
	<button type="button" class="toolbar-btn rounded p-1" onclick={() => insertMarkdown('_', '_')} aria-label="Italic">
		<Italic size={16} />
	</button>
	<div class="mx-1 h-4 w-px" style="background: var(--border);"></div>
	<button
		type="button"
		class="toolbar-btn rounded p-1"
		onclick={() => insertMarkdown('\n- ')}
		aria-label="Bullet List"
	>
		<List size={16} />
	</button>
	<button
		type="button"
		class="toolbar-btn rounded p-1"
		onclick={() => insertMarkdown('[', '](url)')}
		aria-label="Link"
	>
		<Link size={16} />
	</button>
</div>

<style>
	.toolbar-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background 0.2s,
			color 0.2s;
	}
	.toolbar-btn:hover {
		background: var(--input-bg);
		color: var(--text-heading);
	}
</style>
