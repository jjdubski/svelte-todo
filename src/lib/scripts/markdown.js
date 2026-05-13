/**
 * Minimal Markdown-to-safe-HTML renderer.
 *
 * Supports:
 *   - `## Heading`            (h2, block-level)
 *   - `**bold**`              (<strong>)
 *   - `*italic*`              (<em>)
 *   - `` `inline code` ``     (<code>)
 *   - `[text](url)`           (<a target="_blank" rel="noopener">)
 *   - `- list item`           (bullet list, single level)
 *   - Double newline → paragraph break
 *   - Single newline → <br>
 *
 * HTML entities are escaped FIRST, preventing XSS.
 * No external dependencies.
 */

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Apply inline markdown formatting to a single line of text.
 * @param {string} text
 * @returns {string}
 */
function inlineFormat(text) {
	// Bold **text** (must run before italic to avoid double-asterisk conflicts)
	text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	// Italic *text* (after bold, only singletons remain)
	text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
	// Inline code `code`
	text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
	// Links [text](url)
	text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
	return text;
}

/**
 * Render a subset of Markdown to safe HTML.
 * @param {string} text - Raw markdown text
 * @returns {string} Safe HTML string
 */
export function renderMarkdown(text) {
	if (!text) return '';

	// 1. Escape HTML entities first (XSS prevention)
	const escaped = escapeHtml(text);

	// 2. Split into blocks by double (or more) newlines
	const blocks = escaped.split(/\n\n+/);
	const result = blocks.map((block) => {
		block = block.trim();
		if (!block) return '';

		const lines = block.split('\n');

		// -- Heading (##) --
		if (block.startsWith('## ')) {
			const content = block.slice(3);
			return '<h2>' + inlineFormat(content) + '</h2>';
		}

		// -- Bullet list (every line must start with "- ") --
		if (lines.every((l) => l.trim().match(/^- /))) {
			const items = lines.map((l) => {
				const content = l.trim().slice(2); // remove "- "
				return '<li>' + inlineFormat(content) + '</li>';
			});
			return '<ul>' + items.join('') + '</ul>';
		}

		// -- Paragraph --
		const paraLines = lines.map((l) => inlineFormat(l));
		return '<p>' + paraLines.join('<br>') + '</p>';
	});

	return result.filter((r) => r).join('\n');
}
