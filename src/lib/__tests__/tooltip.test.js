import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Pure logic extracted from Tooltip.svelte ──

/**
 * Equivalent to Tooltip.svelte's getPriorityColor().
 * @param {string} priorityValue
 * @returns {string} CSS variable for the priority color
 */
function getPriorityColor(priorityValue) {
	if (priorityValue === 'high') return 'var(--priority-high)';
	if (priorityValue === 'low') return 'var(--priority-low)';
	return 'var(--priority-medium)';
}

/**
 * Equivalent to Tooltip.svelte's getTagColor().
 * @param {string} tag
 * @param {Record<string,string>} [tagColors]
 * @returns {string}
 */
function getTagColor(tag, tagColors = {}) {
	const color = tagColors[tag];
	return typeof color === 'string' && color.trim() ? color : '#64748b';
}

/**
 * Equivalent to Tooltip.svelte's description truncation logic in updateContent():
 *   description.length > 80 ? `${description.slice(0, 80)}...` : description
 * @param {string} description
 * @returns {string}
 */
function formatDescription(description) {
	if (!description) return '';
	return description.length > 80 ? `${description.slice(0, 80)}...` : description;
}

/**
 * Equivalent to Tooltip.svelte's tags slice logic in updateContent():
 *   tags.slice(0, 3).forEach(...)
 * @param {string[]} tags
 * @returns {string[]} First 3 tags
 */
function truncateTags(tags) {
	if (!Array.isArray(tags)) return [];
	return tags.slice(0, 3);
}

/**
 * Calculates the tooltip position, matching Tooltip.svelte's updatePosition().
 *
 * @param {DOMRect} targetRect - The target element's bounding rect
 * @param {DOMRect} tooltipRect - The tooltip element's bounding rect (width/height)
 * @param {number} viewportWidth - window.innerWidth
 * @param {number} viewportHeight - window.innerHeight
 * @param {number} [viewportPadding=8] - minimum distance from viewport edge
 * @param {number} [offset=8] - gap between target and tooltip
 * @returns {{ left: number, top: number, placement: 'above'|'below' }}
 */
function calculateTooltipPosition(
	targetRect,
	tooltipRect,
	viewportWidth,
	viewportHeight,
	viewportPadding = 8,
	offset = 8
) {
	let left = targetRect.left + targetRect.width / 2;
	const halfTooltipWidth = tooltipRect.width / 2;

	// Clamp horizontal: keep tooltip within viewport
	left = Math.max(
		viewportPadding + halfTooltipWidth,
		Math.min(left, viewportWidth - viewportPadding - halfTooltipWidth)
	);

	let placement = 'above';
	let top = targetRect.top - offset;

	// If not enough space above, place below
	if (targetRect.top - offset - tooltipRect.height < viewportPadding) {
		placement = 'below';
		top = targetRect.bottom + offset;
	}

	// If below also overflows, switch back to above (but clamped)
	if (placement === 'below' && top + tooltipRect.height > viewportHeight - viewportPadding) {
		placement = 'above';
		top = Math.max(viewportPadding + tooltipRect.height, targetRect.top - offset);
	}

	return { left, top, placement };
}

/**
 * Determine the transform string based on placement.
 * @param {'above'|'below'} placement
 * @returns {string}
 */
function getTooltipTransform(placement) {
	return placement === 'above' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';
}

/**
 * Determines the arrow CSS classes based on placement.
 * @param {'above'|'below'} placement
 * @returns {{ className: string, arrowClasses: string }}
 */
function getArrowClasses(placement) {
	const base = 'absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45';

	if (placement === 'below') {
		return {
			className: `${base} bottom-full border-l border-t`,
			arrowClasses: 'bottom-full border-l border-t'
		};
	}

	return {
		className: `${base} top-full border-r border-b`,
		arrowClasses: 'top-full border-r border-b'
	};
}

/**
 * Determines whether the tooltip should be visible based on targetEl.
 * Equivalent to the $effect(() => { if (targetEl) { scheduleShow(); } else { scheduleHide(); } }) logic.
 *
 * @param {Element|null} targetEl
 * @returns {'show'|'hide'}
 */
function getTargetVisibility(targetEl) {
	return targetEl ? 'show' : 'hide';
}

/**
 * Simulates the scheduleShow/scheduleHide logic from Tooltip.svelte.
 * Returns an object with scheduleShow, scheduleHide, clearAll, isShowPending, isHidePending methods
 * and onShow/onHide callback registration, matching the component's timeout management.
 */
function createTimerController() {
	let showTimeout;
	let hideTimeout;
	const callbacks = { show: null, hide: null };

	function scheduleShow() {
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = undefined;
		}
		if (showTimeout) {
			clearTimeout(showTimeout);
			showTimeout = undefined;
		}
		showTimeout = setTimeout(() => {
			if (callbacks.show) callbacks.show();
		}, 200);
		return showTimeout;
	}

	function scheduleHide() {
		if (showTimeout) {
			clearTimeout(showTimeout);
			showTimeout = undefined;
		}
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = undefined;
		}
		hideTimeout = setTimeout(() => {
			if (callbacks.hide) callbacks.hide();
		}, 100);
		return hideTimeout;
	}

	function clearAll() {
		if (showTimeout) clearTimeout(showTimeout);
		if (hideTimeout) clearTimeout(hideTimeout);
		showTimeout = undefined;
		hideTimeout = undefined;
	}

	function isShowPending() {
		return showTimeout !== undefined;
	}

	function isHidePending() {
		return hideTimeout !== undefined;
	}

	return {
		scheduleShow,
		scheduleHide,
		clearAll,
		isShowPending,
		isHidePending,
		onShow: (fn) => (callbacks.show = fn),
		onHide: (fn) => (callbacks.hide = fn)
	};
}

// ── Tests ──

describe('Tooltip — getPriorityColor()', () => {
	it('returns priority-high for "high"', () => {
		expect(getPriorityColor('high')).toBe('var(--priority-high)');
	});

	it('returns priority-low for "low"', () => {
		expect(getPriorityColor('low')).toBe('var(--priority-low)');
	});

	it('returns priority-medium for "medium"', () => {
		expect(getPriorityColor('medium')).toBe('var(--priority-medium)');
	});

	it('returns priority-medium for unknown priority values', () => {
		expect(getPriorityColor('urgent')).toBe('var(--priority-medium)');
		expect(getPriorityColor('critical')).toBe('var(--priority-medium)');
		expect(getPriorityColor('')).toBe('var(--priority-medium)');
	});

	it('returns priority-medium for null/undefined', () => {
		expect(getPriorityColor(null)).toBe('var(--priority-medium)');
		expect(getPriorityColor(undefined)).toBe('var(--priority-medium)');
	});
});

describe('Tooltip — getTagColor()', () => {
	const tagColors = {
		work: '#3b82f6',
		personal: '#10b981',
		health: '#f59e0b'
	};

	it('returns the color from tagColors when tag exists', () => {
		expect(getTagColor('work', tagColors)).toBe('#3b82f6');
		expect(getTagColor('personal', tagColors)).toBe('#10b981');
		expect(getTagColor('health', tagColors)).toBe('#f59e0b');
	});

	it('returns fallback color when tag is not in tagColors', () => {
		expect(getTagColor('finance', tagColors)).toBe('#64748b');
	});

	it('returns fallback color when tagColors is empty object', () => {
		expect(getTagColor('work', {})).toBe('#64748b');
	});

	it('returns fallback color when tagColors is undefined', () => {
		expect(getTagColor('work')).toBe('#64748b');
	});

	it('returns fallback color when the stored color is empty string', () => {
		const colors = { work: '' };
		expect(getTagColor('work', colors)).toBe('#64748b');
	});

	it('returns fallback color when the stored color is whitespace only', () => {
		const colors = { work: '   ' };
		expect(getTagColor('work', colors)).toBe('#64748b');
	});

	it('returns fallback color when the stored color is not a string', () => {
		const colors = { work: 123, personal: null, health: undefined };
		expect(getTagColor('work', colors)).toBe('#64748b');
		expect(getTagColor('personal', colors)).toBe('#64748b');
		expect(getTagColor('health', colors)).toBe('#64748b');
	});

	it('handles tags with special characters correctly', () => {
		const colors = { 'work/finance': '#ff0000', 'tag-1': '#00ff00' };
		expect(getTagColor('work/finance', colors)).toBe('#ff0000');
		expect(getTagColor('tag-1', colors)).toBe('#00ff00');
	});
});

describe('Tooltip — formatDescription()', () => {
	it('returns the description as-is when 80 characters or fewer', () => {
		const short = 'Buy groceries';
		expect(formatDescription(short)).toBe('Buy groceries');
	});

	it('truncates and appends "..." when description exceeds 80 characters', () => {
		const long = 'A'.repeat(85);
		const result = formatDescription(long);
		expect(result).toBe('A'.repeat(80) + '...');
		expect(result.length).toBe(83); // 80 chars + '...'
	});

	it('handles exactly 80 characters without truncation', () => {
		const exact = 'A'.repeat(80);
		expect(formatDescription(exact)).toBe(exact);
		expect(formatDescription(exact).length).toBe(80);
	});

	it('handles 81 characters with truncation', () => {
		const text = 'A'.repeat(81);
		expect(formatDescription(text)).toBe('A'.repeat(80) + '...');
	});

	it('returns empty string for empty description', () => {
		expect(formatDescription('')).toBe('');
	});

	it('returns empty string for null/undefined', () => {
		expect(formatDescription(null)).toBe('');
		expect(formatDescription(undefined)).toBe('');
	});

	it('preserves spaces and special characters when not truncated', () => {
		const desc = 'Task with spaces, symbols: @#$%';
		expect(formatDescription(desc)).toBe(desc);
	});

	it('preserves the first 80 characters of multi-byte strings', () => {
		// Japanese characters (each is 1 JS char, but broader test)
		const text = 'あ'.repeat(85);
		const result = formatDescription(text);
		expect(result).toBe('あ'.repeat(80) + '...');
	});
});

describe('Tooltip — truncateTags()', () => {
	it('returns all tags when there are 3 or fewer', () => {
		expect(truncateTags(['a', 'b'])).toEqual(['a', 'b']);
		expect(truncateTags(['a'])).toEqual(['a']);
		expect(truncateTags([])).toEqual([]);
	});

	it('returns only first 3 tags when there are more than 3', () => {
		const tags = ['work', 'personal', 'health', 'finance', 'urgent'];
		expect(truncateTags(tags)).toEqual(['work', 'personal', 'health']);
	});

	it('returns empty array for null/undefined', () => {
		expect(truncateTags(null)).toEqual([]);
		expect(truncateTags(undefined)).toEqual([]);
	});

	it('returns empty array when input is not an array', () => {
		expect(truncateTags('not-array')).toEqual([]);
		expect(truncateTags(123)).toEqual([]);
		expect(truncateTags({})).toEqual([]);
	});

	it('does not mutate the original array', () => {
		const original = ['a', 'b', 'c', 'd'];
		const originalCopy = [...original];
		truncateTags(original);
		expect(original).toEqual(originalCopy);
	});
});

describe('Tooltip — calculateTooltipPosition()', () => {
	const defaultViewport = { width: 1024, height: 768 };

	it('positions above the target when there is enough space', () => {
		const targetRect = { top: 300, left: 400, width: 100, height: 30, bottom: 330, right: 500 };
		const tooltipRect = { width: 200, height: 100 };

		const result = calculateTooltipPosition(targetRect, tooltipRect, defaultViewport.width, defaultViewport.height);

		expect(result.placement).toBe('above');
		// Horizontally centered on target
		expect(result.left).toBe(400 + 100 / 2); // 450
		// Above target minus offset
		expect(result.top).toBe(300 - 8);
	});

	it('positions below the target when there is not enough space above', () => {
		// Target near top of viewport (top < tooltipHeight + offset + padding)
		const targetRect = { top: 10, left: 400, width: 100, height: 30, bottom: 40, right: 500 };
		const tooltipRect = { width: 200, height: 100 };

		const result = calculateTooltipPosition(targetRect, tooltipRect, defaultViewport.width, defaultViewport.height);

		expect(result.placement).toBe('below');
		expect(result.top).toBe(40 + 8); // target.bottom + offset
	});

	it('clamps horizontal position when tooltip would overflow right edge', () => {
		// Target near right edge
		const targetRect = { top: 300, left: 980, width: 40, height: 30, bottom: 330, right: 1020 };
		const tooltipRect = { width: 200, height: 100 };

		const result = calculateTooltipPosition(targetRect, tooltipRect, defaultViewport.width, defaultViewport.height);

		// Should clamp so tooltip doesn't go off right edge
		const maxLeft = defaultViewport.width - 8 - 200 / 2; // 1024 - 8 - 100 = 916
		expect(result.left).toBeLessThanOrEqual(maxLeft);
	});

	it('clamps horizontal position when tooltip would overflow left edge', () => {
		// Target near left edge
		const targetRect = { top: 300, left: -10, width: 20, height: 30, bottom: 330, right: 10 };
		const tooltipRect = { width: 200, height: 100 };

		const result = calculateTooltipPosition(targetRect, tooltipRect, defaultViewport.width, defaultViewport.height);

		// Should clamp so tooltip doesn't go off left edge
		const minLeft = 8 + 200 / 2; // 8 + 100 = 108
		expect(result.left).toBeGreaterThanOrEqual(minLeft);
	});

	it('switches back to above when placing below would also overflow', () => {
		// Target at very bottom: not enough space above, but below also overflows
		const targetRect = { top: 10, left: 400, width: 100, height: 800, bottom: 810, right: 500 };
		const tooltipRect = { width: 200, height: 100 };

		const result = calculateTooltipPosition(targetRect, tooltipRect, defaultViewport.width, defaultViewport.height);

		// Should fall back to above
		expect(result.placement).toBe('above');
	});

	it('uses custom viewport padding and offset values', () => {
		const targetRect = { top: 300, left: 400, width: 100, height: 30, bottom: 330, right: 500 };
		const tooltipRect = { width: 200, height: 100 };

		const result = calculateTooltipPosition(
			targetRect,
			tooltipRect,
			defaultViewport.width,
			defaultViewport.height,
			16, // viewportPadding
			12 // offset
		);

		expect(result.placement).toBe('above');
		expect(result.top).toBe(300 - 12); // Uses custom offset

		// Left with custom padding
		const expectedMinLeft = 16 + 200 / 2; // 116
		const expectedMaxLeft = defaultViewport.width - 16 - 200 / 2; // 908
		expect(result.left).toBeGreaterThanOrEqual(expectedMinLeft);
		expect(result.left).toBeLessThanOrEqual(expectedMaxLeft);
	});

	it('handles zero-width tooltip (edge case)', () => {
		const targetRect = { top: 300, left: 400, width: 100, height: 30, bottom: 330, right: 500 };
		const tooltipRect = { width: 0, height: 100 };

		const result = calculateTooltipPosition(targetRect, tooltipRect, defaultViewport.width, defaultViewport.height);

		// Should still calculate, halfTooltipWidth = 0
		expect(result.left).toBe(450); // center of target
		expect(result.placement).toBe('above');
	});

	it('handles zero-height tooltip (edge case)', () => {
		const targetRect = { top: 300, left: 400, width: 100, height: 30, bottom: 330, right: 500 };
		const tooltipRect = { width: 200, height: 0 };

		const result = calculateTooltipPosition(targetRect, tooltipRect, defaultViewport.width, defaultViewport.height);

		expect(result.placement).toBe('above');
	});

	it('clamps top when above placement would still overflow due to short viewport', () => {
		// Target near bottom, tooltip doesn't fit above or below cleanly
		const targetRect = { top: 700, left: 400, width: 100, height: 30, bottom: 730, right: 500 };
		const tooltipRect = { width: 200, height: 100 };
		const viewportHeight = 750;

		const result = calculateTooltipPosition(targetRect, tooltipRect, defaultViewport.width, viewportHeight);

		// Above placement, but clamped so top doesn't go above viewport padding
		expect(result.top).toBeGreaterThanOrEqual(8 + 100); // viewportPadding + tooltipHeight
	});
});

describe('Tooltip — getTooltipTransform()', () => {
	it('returns translate(-50%, -100%) for "above" placement', () => {
		expect(getTooltipTransform('above')).toBe('translate(-50%, -100%)');
	});

	it('returns translate(-50%, 0) for "below" placement', () => {
		expect(getTooltipTransform('below')).toBe('translate(-50%, 0)');
	});
});

describe('Tooltip — getArrowClasses()', () => {
	it('returns bottom-full border-l border-t for "below" placement', () => {
		const result = getArrowClasses('below');
		expect(result.arrowClasses).toContain('bottom-full');
		expect(result.arrowClasses).toContain('border-l');
		expect(result.arrowClasses).toContain('border-t');
	});

	it('returns top-full border-r border-b for "above" placement', () => {
		const result = getArrowClasses('above');
		expect(result.arrowClasses).toContain('top-full');
		expect(result.arrowClasses).toContain('border-r');
		expect(result.arrowClasses).toContain('border-b');
	});

	it('all placements include base classes', () => {
		const above = getArrowClasses('above');
		const below = getArrowClasses('below');
		['absolute', 'left-1/2', 'h-2', 'w-2', '-translate-x-1/2', 'rotate-45'].forEach((cls) => {
			expect(above.className).toContain(cls);
			expect(below.className).toContain(cls);
		});
	});
});

describe('Tooltip — visibility state management', () => {
	it('returns "show" when targetEl is an element', () => {
		const el = {};
		expect(getTargetVisibility(el)).toBe('show');
	});

	it('returns "hide" when targetEl is null', () => {
		expect(getTargetVisibility(null)).toBe('hide');
	});

	it('returns "hide" when targetEl is undefined', () => {
		expect(getTargetVisibility(undefined)).toBe('hide');
	});
});

describe('Tooltip — show/hide timing', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('show is triggered after 200ms delay', () => {
		const controller = createTimerController();
		const showFn = vi.fn();
		controller.onShow(showFn);

		controller.scheduleShow();
		expect(showFn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(199);
		expect(showFn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(showFn).toHaveBeenCalledTimes(1);
	});

	it('hide is triggered after 100ms delay', () => {
		const controller = createTimerController();
		const hideFn = vi.fn();
		controller.onHide(hideFn);

		controller.scheduleHide();
		expect(hideFn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(99);
		expect(hideFn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(hideFn).toHaveBeenCalledTimes(1);
	});

	it('cancels previous show timeout when scheduleHide is called (targetEl becomes null)', () => {
		const controller = createTimerController();
		const showFn = vi.fn();
		const hideFn = vi.fn();
		controller.onShow(showFn);
		controller.onHide(hideFn);

		controller.scheduleShow();
		expect(controller.isShowPending()).toBe(true);

		controller.scheduleHide();
		expect(controller.isShowPending()).toBe(false);
		expect(controller.isHidePending()).toBe(true);

		vi.advanceTimersByTime(200);
		// Show should not have fired (was cancelled)
		expect(showFn).not.toHaveBeenCalled();
		// Hide should fire at 100ms
		expect(hideFn).toHaveBeenCalledTimes(1);
	});

	it('cancels previous hide timeout when scheduleShow is called (targetEl becomes set)', () => {
		const controller = createTimerController();
		const showFn = vi.fn();
		const hideFn = vi.fn();
		controller.onShow(showFn);
		controller.onHide(hideFn);

		controller.scheduleHide();
		expect(controller.isHidePending()).toBe(true);

		controller.scheduleShow();
		expect(controller.isHidePending()).toBe(false);
		expect(controller.isShowPending()).toBe(true);

		vi.advanceTimersByTime(100);
		// Hide should not have fired (was cancelled)
		expect(hideFn).not.toHaveBeenCalled();
		// Show should fire at 200ms
		vi.advanceTimersByTime(100);
		expect(showFn).toHaveBeenCalledTimes(1);
	});

	it('re-scheduling show resets the 200ms timer', () => {
		const controller = createTimerController();
		const showFn = vi.fn();
		controller.onShow(showFn);

		controller.scheduleShow();
		vi.advanceTimersByTime(150);
		// Re-schedule show before the first fires
		controller.scheduleShow();
		vi.advanceTimersByTime(150);
		// Only 150ms have passed since re-schedule, so show shouldn't fire yet
		expect(showFn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(50);
		// Now 200ms total since re-schedule
		expect(showFn).toHaveBeenCalledTimes(1);
	});

	it('re-scheduling hide resets the 100ms timer', () => {
		const controller = createTimerController();
		const hideFn = vi.fn();
		controller.onHide(hideFn);

		controller.scheduleHide();
		vi.advanceTimersByTime(80);
		controller.scheduleHide();
		vi.advanceTimersByTime(80);
		// Only 80ms since re-schedule
		expect(hideFn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(20);
		// 100ms total since re-schedule
		expect(hideFn).toHaveBeenCalledTimes(1);
	});
});

describe('Tooltip — event cleanup', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('clearAll cancels both show and hide timeouts', () => {
		const controller = createTimerController();
		const showFn = vi.fn();
		const hideFn = vi.fn();
		controller.onShow(showFn);
		controller.onHide(hideFn);

		controller.scheduleShow();
		controller.scheduleHide();
		expect(controller.isShowPending() || controller.isHidePending()).toBe(true);

		controller.clearAll();
		expect(controller.isShowPending()).toBe(false);
		expect(controller.isHidePending()).toBe(false);

		// Advance time past both delays — neither should fire
		vi.advanceTimersByTime(500);
		expect(showFn).not.toHaveBeenCalled();
		expect(hideFn).not.toHaveBeenCalled();
	});

	it('clearAll is safe to call multiple times', () => {
		const controller = createTimerController();

		controller.clearAll();
		controller.clearAll();
		controller.clearAll();
		// Should not throw
		expect(true).toBe(true);
	});

	it('clearAll after only show scheduled still works', () => {
		const controller = createTimerController();
		const showFn = vi.fn();
		controller.onShow(showFn);

		controller.scheduleShow();
		controller.clearAll();

		vi.advanceTimersByTime(200);
		expect(showFn).not.toHaveBeenCalled();
	});

	it('clearAll after only hide scheduled still works', () => {
		const controller = createTimerController();
		const hideFn = vi.fn();
		controller.onHide(hideFn);

		controller.scheduleHide();
		controller.clearAll();

		vi.advanceTimersByTime(100);
		expect(hideFn).not.toHaveBeenCalled();
	});
});

describe('Tooltip — content rendering logic', () => {
	/**
	 * Simulates the content update logic from Tooltip.svelte's updateContent().
	 * Returns the transformed state that the tooltip would render.
	 */
	function buildTooltipContent(task, tagColors) {
		const title = task?.title || '';
		const description = task?.description || '';
		const priority = task?.priority || '';
		const tags = Array.isArray(task?.tags) ? task.tags : [];

		const truncatedDesc = formatDescription(description);
		const visibleTags = truncateTags(tags);
		const priorityColor = priority ? getPriorityColor(priority) : null;
		const tagColorList = visibleTags.map((tag) => ({
			tag,
			color: getTagColor(tag, tagColors || {})
		}));

		return {
			title,
			description: truncatedDesc,
			priority: priority ? { value: priority, color: priorityColor } : null,
			tags: tagColorList,
			hasDescription: !!description,
			hasPriority: !!priority,
			hasTags: visibleTags.length > 0
		};
	}

	const tagColors = {
		work: '#3b82f6',
		personal: '#10b981',
		urgent: '#ef4444'
	};

	it('renders title correctly', () => {
		const task = { title: 'Meeting with team', description: '', priority: '', tags: [] };
		const content = buildTooltipContent(task, tagColors);
		expect(content.title).toBe('Meeting with team');
	});

	it('renders empty title gracefully', () => {
		const task = { title: '', description: '', priority: '', tags: [] };
		const content = buildTooltipContent(task, tagColors);
		expect(content.title).toBe('');
	});

	it('renders description with truncation when needed', () => {
		const task = {
			title: 'Task',
			description: 'A'.repeat(100),
			priority: '',
			tags: []
		};
		const content = buildTooltipContent(task, tagColors);
		expect(content.description).toBe('A'.repeat(80) + '...');
		expect(content.hasDescription).toBe(true);
	});

	it('renders short description without truncation', () => {
		const task = {
			title: 'Task',
			description: 'Short description',
			priority: '',
			tags: []
		};
		const content = buildTooltipContent(task, tagColors);
		expect(content.description).toBe('Short description');
		expect(content.hasDescription).toBe(true);
	});

	it('sets hasDescription to false when description is empty', () => {
		const task = { title: 'Task', description: '', priority: '', tags: [] };
		const content = buildTooltipContent(task, tagColors);
		expect(content.hasDescription).toBe(false);
	});

	it('renders priority with correct color', () => {
		const task = {
			title: 'High priority task',
			description: '',
			priority: 'high',
			tags: []
		};
		const content = buildTooltipContent(task, tagColors);
		expect(content.hasPriority).toBe(true);
		expect(content.priority.value).toBe('high');
		expect(content.priority.color).toBe('var(--priority-high)');
	});

	it('renders low priority with correct color', () => {
		const task = {
			title: 'Low priority task',
			description: '',
			priority: 'low',
			tags: []
		};
		const content = buildTooltipContent(task, tagColors);
		expect(content.hasPriority).toBe(true);
		expect(content.priority.value).toBe('low');
		expect(content.priority.color).toBe('var(--priority-low)');
	});

	it('renders medium priority with correct color', () => {
		const task = {
			title: 'Medium priority task',
			description: '',
			priority: 'medium',
			tags: []
		};
		const content = buildTooltipContent(task, tagColors);
		expect(content.hasPriority).toBe(true);
		expect(content.priority.value).toBe('medium');
		expect(content.priority.color).toBe('var(--priority-medium)');
	});

	it('sets hasPriority to false when priority is empty', () => {
		const task = { title: 'Task', description: '', priority: '', tags: [] };
		const content = buildTooltipContent(task, tagColors);
		expect(content.hasPriority).toBe(false);
		expect(content.priority).toBeNull();
	});

	it('renders up to 3 tags with correct colors', () => {
		const task = {
			title: 'Task',
			description: '',
			priority: '',
			tags: ['work', 'personal', 'urgent']
		};
		const content = buildTooltipContent(task, tagColors);
		expect(content.hasTags).toBe(true);
		expect(content.tags).toHaveLength(3);
		expect(content.tags[0]).toEqual({ tag: 'work', color: '#3b82f6' });
		expect(content.tags[1]).toEqual({ tag: 'personal', color: '#10b981' });
		expect(content.tags[2]).toEqual({ tag: 'urgent', color: '#ef4444' });
	});

	it('limits tags to 3 and discards extras', () => {
		const task = {
			title: 'Task',
			description: '',
			priority: '',
			tags: ['a', 'b', 'c', 'd', 'e']
		};
		const content = buildTooltipContent(task, tagColors);
		expect(content.tags).toHaveLength(3);
		expect(content.tags.map((t) => t.tag)).toEqual(['a', 'b', 'c']);
	});

	it('sets hasTags to false when tags array is empty', () => {
		const task = { title: 'Task', description: '', priority: '', tags: [] };
		const content = buildTooltipContent(task, tagColors);
		expect(content.hasTags).toBe(false);
	});

	it('sets hasTags to false when tags is null/undefined', () => {
		const task1 = { title: 'Task', description: '', priority: '', tags: null };
		const task2 = { title: 'Task', description: '', priority: '', tags: undefined };
		expect(buildTooltipContent(task1, tagColors).hasTags).toBe(false);
		expect(buildTooltipContent(task2, tagColors).hasTags).toBe(false);
	});

	it('uses fallback color for tags not in tagColors', () => {
		const task = {
			title: 'Task',
			description: '',
			priority: '',
			tags: ['unknown-tag']
		};
		const content = buildTooltipContent(task, {});
		expect(content.tags[0].color).toBe('#64748b');
	});

	it('renders null task gracefully (falls back to empties)', () => {
		const content = buildTooltipContent(null, tagColors);
		expect(content.title).toBe('');
		expect(content.hasDescription).toBe(false);
		expect(content.hasPriority).toBe(false);
		expect(content.hasTags).toBe(false);
	});

	it('renders task with all fields populated correctly', () => {
		const task = {
			title: 'Project Review',
			description: 'Review the quarterly project updates',
			priority: 'high',
			tags: ['work', 'meeting']
		};
		const content = buildTooltipContent(task, tagColors);
		expect(content.title).toBe('Project Review');
		expect(content.description).toBe('Review the quarterly project updates');
		expect(content.hasDescription).toBe(true);
		expect(content.hasPriority).toBe(true);
		expect(content.priority.value).toBe('high');
		expect(content.hasTags).toBe(true);
		expect(content.tags).toHaveLength(2);
	});
});
