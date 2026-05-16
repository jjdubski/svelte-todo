import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Pure logic extracted from NavBar.svelte ──

/**
 * The navigation links array, matching NavBar.svelte.
 * @type {Array<{href: string, label: string}>}
 */
const links = [
	{ href: '/tasks', label: 'Tasks' },
	{ href: '/board', label: 'Board' },
	{ href: '/calendar', label: 'Calendar' },
	{ href: '/stats', label: 'Analytics' },
	{ href: '/archived', label: 'Archived' },
	{ href: '/settings', label: 'Settings' }
];

/**
 * Equivalent to NavBar.svelte's $derived expression:
 *   links.find((l) => l.href === $page.url.pathname)?.label || 'Tasks'
 *
 * @param {string} pathname - The current URL pathname
 * @returns {string} The label of the matching nav link, or 'Tasks' as default
 */
function getCurrentPageLabel(pathname) {
	return links.find((l) => l.href === pathname)?.label || 'Tasks';
}

/**
 * Equivalent to the click-outside handler logic inside NavBar.svelte's $effect.
 * Returns true when the click target is outside the mobile menu (menu should close),
 * returns false when the click is on or inside the toggle button or dropdown.
 *
 * Mirrors the Svelte code:
 *   if (target instanceof Element &&
 *       (target.closest('.mobile-nav-toggle') || target.closest('.mobile-nav-dropdown'))) {
 *       return; // don't close
 *   }
 *   mobileMenuOpen = false; // close
 *
 * @param {{ closest: Function } | null} target - The event target
 * @returns {boolean} true if the click is outside the menu (should close)
 */
function isMenuClickOutside(target) {
	// If target is not an element-like object, treat as outside (close menu)
	if (!target || typeof target.closest !== 'function') return true;

	// If click is inside the toggle or dropdown, don't close
	if (target.closest('.mobile-nav-toggle') || target.closest('.mobile-nav-dropdown')) {
		return false;
	}

	// Click is outside the menu — close it
	return true;
}

/**
 * Simulates the $effect lifecycle in NavBar.svelte.
 * When the menu is open, registers a window click listener that closes the menu
 * on outside clicks. Returns a cleanup function that removes the listener.
 *
 * @param {boolean} menuOpen - Whether the mobile menu is currently open
 * @param {() => void} closeFn - Callback to close the menu
 * @returns {() => void} Cleanup function to remove the event listener
 */
function setupClickOutsideEffect(menuOpen, closeFn) {
	if (!menuOpen) return () => {};

	const handler = (/** @type {{ target: any }} */ e) => {
		if (isMenuClickOutside(e.target)) {
			closeFn();
		}
	};

	window.addEventListener('click', handler);
	return () => window.removeEventListener('click', handler);
}

// ── Tests ──

describe('NavBar — currentPageLabel', () => {
	it('returns correct label for /tasks route', () => {
		expect(getCurrentPageLabel('/tasks')).toBe('Tasks');
	});

	it('returns correct label for /board route', () => {
		expect(getCurrentPageLabel('/board')).toBe('Board');
	});

	it('returns correct label for /calendar route', () => {
		expect(getCurrentPageLabel('/calendar')).toBe('Calendar');
	});

	it('returns correct label for /stats route', () => {
		expect(getCurrentPageLabel('/stats')).toBe('Analytics');
	});

	it('returns correct label for /archived route', () => {
		expect(getCurrentPageLabel('/archived')).toBe('Archived');
	});

	it('returns correct label for /settings route', () => {
		expect(getCurrentPageLabel('/settings')).toBe('Settings');
	});

	it('defaults to "Tasks" for unknown route', () => {
		expect(getCurrentPageLabel('/unknown')).toBe('Tasks');
	});

	it('defaults to "Tasks" for the root path', () => {
		expect(getCurrentPageLabel('/')).toBe('Tasks');
	});

	it('defaults to "Tasks" for empty string', () => {
		expect(getCurrentPageLabel('')).toBe('Tasks');
	});

	it('defaults to "Tasks" for nullish input', () => {
		expect(getCurrentPageLabel(undefined)).toBe('Tasks');
		expect(getCurrentPageLabel(null)).toBe('Tasks');
	});
});

describe('NavBar — mobileMenuOpen state machine', () => {
	it('starts closed (false)', () => {
		const mobileMenuOpen = false;
		expect(mobileMenuOpen).toBe(false);
	});

	it('toggles open on first toggle', () => {
		let mobileMenuOpen = false;
		mobileMenuOpen = !mobileMenuOpen;
		expect(mobileMenuOpen).toBe(true);
	});

	it('toggles closed on second toggle', () => {
		let mobileMenuOpen = false;
		mobileMenuOpen = !mobileMenuOpen;
		mobileMenuOpen = !mobileMenuOpen;
		expect(mobileMenuOpen).toBe(false);
	});

	it('cycles open/close correctly with multiple toggles', () => {
		let mobileMenuOpen = false;

		mobileMenuOpen = !mobileMenuOpen; // toggle 1 → open
		expect(mobileMenuOpen).toBe(true);

		mobileMenuOpen = !mobileMenuOpen; // toggle 2 → close
		expect(mobileMenuOpen).toBe(false);

		mobileMenuOpen = !mobileMenuOpen; // toggle 3 → open
		expect(mobileMenuOpen).toBe(true);

		mobileMenuOpen = !mobileMenuOpen; // toggle 4 → close
		expect(mobileMenuOpen).toBe(false);
	});

	it('keyboard Enter and Space use same toggle logic', () => {
		// The onkeydown handler does: mobileMenuOpen = !mobileMenuOpen
		// Same as onclick. Verify the toggle works the same way.
		let mobileMenuOpen = false;

		// Simulate keyboard Enter
		mobileMenuOpen = !mobileMenuOpen;
		expect(mobileMenuOpen).toBe(true);

		// Simulate keyboard Space
		mobileMenuOpen = !mobileMenuOpen;
		expect(mobileMenuOpen).toBe(false);
	});

	it('can be directly set to closed from open', () => {
		let mobileMenuOpen = true;
		mobileMenuOpen = false;
		expect(mobileMenuOpen).toBe(false);
	});
});

describe('NavBar — click-outside detection', () => {
	it('closes menu when clicking on unrelated element', () => {
		const unrelated = { closest: () => null };
		expect(isMenuClickOutside(unrelated)).toBe(true);
	});

	it('does not close when clicking on mobile-nav-toggle', () => {
		const toggle = {
			closest: (/** @type {string} */ sel) => (sel === '.mobile-nav-toggle' ? {} : null)
		};
		expect(isMenuClickOutside(toggle)).toBe(false);
	});

	it('does not close when clicking on mobile-nav-dropdown', () => {
		const dropdown = {
			closest: (/** @type {string} */ sel) => (sel === '.mobile-nav-dropdown' ? {} : null)
		};
		expect(isMenuClickOutside(dropdown)).toBe(false);
	});

	it('does not close when clicking a child inside the dropdown', () => {
		// A link <a> inside the dropdown: closest('.mobile-nav-dropdown') returns truthy
		const dropdownLink = {
			closest: (/** @type {string} */ sel) => (sel === '.mobile-nav-dropdown' ? {} : null)
		};
		expect(isMenuClickOutside(dropdownLink)).toBe(false);
	});

	it('does not close when clicking a child inside the toggle button', () => {
		// The label <span> or triangle <svg> inside toggle
		const toggleChild = {
			closest: (/** @type {string} */ sel) => (sel === '.mobile-nav-toggle' ? {} : null)
		};
		expect(isMenuClickOutside(toggleChild)).toBe(false);
	});

	it('closes menu when target is null', () => {
		expect(isMenuClickOutside(null)).toBe(true);
	});

	it('closes menu when target is undefined', () => {
		expect(isMenuClickOutside(undefined)).toBe(true);
	});

	it('closes menu when target has no closest method (e.g. text node)', () => {
		expect(isMenuClickOutside({})).toBe(true);
		expect(isMenuClickOutside({ closest: undefined })).toBe(true);
	});
});

describe('NavBar — $effect lifecycle (click-outside listener)', () => {
	let addEventListenerSpy;
	let removeEventListenerSpy;
	let closeFn;

	beforeEach(() => {
		addEventListenerSpy = vi.fn();
		removeEventListenerSpy = vi.fn();
		closeFn = vi.fn();

		vi.stubGlobal('window', {
			addEventListener: addEventListenerSpy,
			removeEventListener: removeEventListenerSpy
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('does not register click listener when menu is closed', () => {
		const cleanup = setupClickOutsideEffect(false, closeFn);
		expect(addEventListenerSpy).not.toHaveBeenCalled();
		expect(typeof cleanup).toBe('function');
		// Cleanup should be a no-op
		cleanup();
		expect(removeEventListenerSpy).not.toHaveBeenCalled();
	});

	it('registers click listener when menu is open', () => {
		setupClickOutsideEffect(true, closeFn);
		expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
	});

	it('removes click listener on cleanup', () => {
		const cleanup = setupClickOutsideEffect(true, closeFn);
		const registeredHandler = addEventListenerSpy.mock.calls[0][1];
		cleanup();
		expect(removeEventListenerSpy).toHaveBeenCalledWith('click', registeredHandler);
	});

	it('calls closeFn when clicking outside the menu', () => {
		setupClickOutsideEffect(true, closeFn);
		const handler = addEventListenerSpy.mock.calls[0][1];

		// Simulate click on unrelated element
		const event = { target: { closest: () => null } };
		handler(event);

		expect(closeFn).toHaveBeenCalledTimes(1);
	});

	it('does not call closeFn when clicking on the toggle button', () => {
		setupClickOutsideEffect(true, closeFn);
		const handler = addEventListenerSpy.mock.calls[0][1];

		const event = {
			target: {
				closest: (/** @type {string} */ sel) => (sel === '.mobile-nav-toggle' ? {} : null)
			}
		};
		handler(event);

		expect(closeFn).not.toHaveBeenCalled();
	});

	it('does not call closeFn when clicking on the dropdown', () => {
		setupClickOutsideEffect(true, closeFn);
		const handler = addEventListenerSpy.mock.calls[0][1];

		const event = {
			target: {
				closest: (/** @type {string} */ sel) => (sel === '.mobile-nav-dropdown' ? {} : null)
			}
		};
		handler(event);

		expect(closeFn).not.toHaveBeenCalled();
	});

	it('does not call closeFn when clicking a link inside the dropdown', () => {
		setupClickOutsideEffect(true, closeFn);
		const handler = addEventListenerSpy.mock.calls[0][1];

		// A link inside the dropdown: closest('.mobile-nav-dropdown') matches
		const event = {
			target: {
				closest: (/** @type {string} */ sel) => (sel === '.mobile-nav-dropdown' ? {} : null)
			}
		};
		handler(event);

		expect(closeFn).not.toHaveBeenCalled();
	});

	it('calls closeFn when target is not an Element (e.g. text node)', () => {
		setupClickOutsideEffect(true, closeFn);
		const handler = addEventListenerSpy.mock.calls[0][1];

		// A non-element target (no closest method)
		const event = { target: {} };
		handler(event);

		expect(closeFn).toHaveBeenCalledTimes(1);
	});

	it('does not re-register listener when called multiple times with menu closed', () => {
		setupClickOutsideEffect(false, closeFn);
		setupClickOutsideEffect(false, closeFn);
		setupClickOutsideEffect(false, closeFn);
		expect(addEventListenerSpy).not.toHaveBeenCalled();
	});
});
