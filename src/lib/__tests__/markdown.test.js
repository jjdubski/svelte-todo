import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../scripts/markdown.js';

describe('renderMarkdown', () => {
	it('returns empty string for falsy input', () => {
		expect(renderMarkdown('')).toBe('');
		expect(renderMarkdown(null)).toBe('');
		expect(renderMarkdown(undefined)).toBe('');
	});

	it('wraps basic text in <p>', () => {
		expect(renderMarkdown('Hello world')).toBe('<p>Hello world</p>');
	});

	it('renders **bold** as <strong>', () => {
		expect(renderMarkdown('This is **bold** text')).toBe('<p>This is <strong>bold</strong> text</p>');
	});

	it('renders *italic* as <em>', () => {
		expect(renderMarkdown('This is *italic* text')).toBe('<p>This is <em>italic</em> text</p>');
	});

	it('renders `code` as <code>', () => {
		expect(renderMarkdown('Use `code` here')).toBe('<p>Use <code>code</code> here</p>');
	});

	it('renders [link](url) as anchor with target and rel', () => {
		const result = renderMarkdown('Click [here](https://example.com)');
		expect(result).toBe('<p>Click <a href="https://example.com" target="_blank" rel="noopener">here</a></p>');
	});

	it('renders ## Heading as <h2>', () => {
		expect(renderMarkdown('## Heading Text')).toBe('<h2>Heading Text</h2>');
	});

	it('renders - item as unordered list', () => {
		const result = renderMarkdown('- Item one\n- Item two');
		expect(result).toBe('<ul><li>Item one</li><li>Item two</li></ul>');
	});

	it('escapes HTML entities to prevent XSS', () => {
		const result = renderMarkdown('<script>alert("xss")</script>');
		expect(result).toContain('&lt;script&gt;');
		expect(result).toContain('&lt;/script&gt;');
		expect(result).not.toContain('<script>');
	});

	it('renders multiple paragraphs separated by blank line', () => {
		const result = renderMarkdown('First paragraph\n\nSecond paragraph');
		expect(result).toBe('<p>First paragraph</p>\n<p>Second paragraph</p>');
	});

	it('converts newlines to <br> within a paragraph', () => {
		const result = renderMarkdown('Line one\nLine two');
		expect(result).toBe('<p>Line one<br>Line two</p>');
	});

	it('renders inline formatting inside paragraphs', () => {
		const result = renderMarkdown('**bold** and *italic* and `code`');
		expect(result).toBe('<p><strong>bold</strong> and <em>italic</em> and <code>code</code></p>');
	});

	it('renders inline formatting inside headings', () => {
		const result = renderMarkdown('## **Bold Heading**');
		expect(result).toBe('<h2><strong>Bold Heading</strong></h2>');
	});

	it('renders inline formatting inside list items', () => {
		const result = renderMarkdown('- **bold** item\n- *italic* item');
		expect(result).toBe('<ul><li><strong>bold</strong> item</li><li><em>italic</em> item</li></ul>');
	});

	it('handles mixed content: heading, list, and paragraph', () => {
		const result = renderMarkdown('## Section\n\n- Item A\n- Item B\n\nSome **important** note.');
		expect(result).toBe(
			'<h2>Section</h2>\n<ul><li>Item A</li><li>Item B</li></ul>\n<p>Some <strong>important</strong> note.</p>'
		);
	});
});
