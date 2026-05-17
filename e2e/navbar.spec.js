import { test, expect } from '@playwright/test';

test.describe('NavBar', () => {
	test.beforeEach(async ({ page }) => {
		// Set guest mode before any page JavaScript loads
		await page.addInitScript(() => {
			localStorage.clear();
			localStorage.setItem('authMode', JSON.stringify('guest'));
		});
	});

	// ──────────────────────────────────────────────
	// Desktop navbar (>= 640px)
	// ──────────────────────────────────────────────

	test.describe('Desktop viewport', () => {
		test.beforeEach(async ({ page }) => {
			await page.setViewportSize({ width: 1280, height: 800 });
			await page.goto('/tasks');
			await page.waitForSelector('#title-input', { timeout: 10000 });
		});

		test('displays all nav links horizontally', async ({ page }) => {
			const navLinks = page.locator('nav a.nav-link');
			await expect(navLinks).toHaveText(['Tasks', 'Board', 'Calendar', 'Analytics', 'Archived', 'Settings']);
		});

		test('highlights the current page link with .active class', async ({ page }) => {
			const activeLink = page.locator('a.nav-link.active');
			await expect(activeLink).toHaveText('Tasks');
		});

		test('mobile toggle and dropdown are not visible', async ({ page }) => {
			// The mobile toggle container is hidden via sm:hidden
			const mobileToggle = page.locator('.mobile-nav-toggle');
			await expect(mobileToggle).not.toBeVisible();

			// The mobile dropdown should not be present in the DOM
			const mobileDropdown = page.locator('.mobile-nav-dropdown');
			await expect(mobileDropdown).toHaveCount(0);
		});

		test('active class updates when navigating to a different page', async ({ page }) => {
			await page.locator('a.nav-link', { hasText: 'Board' }).click();
			await page.waitForURL(/\/board/);

			const activeLink = page.locator('a.nav-link.active');
			await expect(activeLink).toHaveText('Board');
		});
	});

	// ──────────────────────────────────────────────
	// Mobile navbar (< 640px)
	// ──────────────────────────────────────────────

	test.describe('Mobile viewport', () => {
		test.beforeEach(async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto('/tasks');
			await page.waitForSelector('#title-input', { timeout: 10000 });
		});

		test('shows current page name and triangle on the left, auth/theme on the right', async ({ page }) => {
			// The toggle shows the current page label
			const toggle = page.locator('.mobile-nav-toggle');
			await expect(toggle).toBeVisible();
			await expect(toggle.locator('#current-page-label')).toHaveText('Tasks');

			// The triangle SVG is present inside the toggle
			const triangle = toggle.locator('svg');
			await expect(triangle).toBeVisible();
			// The aria-hidden attribute is on the span wrapping the SVG
			await expect(page.locator('.mobile-nav-toggle span[aria-hidden="true"]')).toBeVisible();

			// The auth button and theme toggle are visible on the right
			await expect(page.locator('[aria-label="Switch to dark mode"]')).toBeVisible();
		});

		test('dropdown is closed initially', async ({ page }) => {
			const dropdown = page.locator('.mobile-nav-dropdown');
			await expect(dropdown).toHaveCount(0);
		});

		test('clicking the toggle opens the dropdown with other nav options', async ({ page }) => {
			// Open the dropdown
			await page.locator('.mobile-nav-toggle').click();

			// Dropdown should now be visible
			const dropdown = page.locator('.mobile-nav-dropdown');
			await expect(dropdown).toBeVisible();

			// Should show all nav links except the current page (Tasks)
			const dropdownLinks = dropdown.locator('a');
			await expect(dropdownLinks).toHaveText(['Board', 'Calendar', 'Analytics', 'Archived', 'Settings']);
		});

		test('triangle rotates 180 degrees when dropdown is open', async ({ page }) => {
			// The rotate-180 class is on the span wrapping the SVG
			const triangleWrapper = page.locator('.mobile-nav-toggle span[aria-hidden="true"]');

			// Initially, the triangle wrapper should NOT have the rotate-180 class
			await expect(triangleWrapper).not.toHaveClass(/rotate-180/);

			// Open the dropdown
			await page.locator('.mobile-nav-toggle').click();

			// Now the triangle wrapper should have the rotate-180 class
			await expect(triangleWrapper).toHaveClass(/rotate-180/);
		});

		test('clicking outside closes the dropdown', async ({ page }) => {
			// Open the dropdown
			await page.locator('.mobile-nav-toggle').click();
			await expect(page.locator('.mobile-nav-dropdown')).toBeVisible();

			// Click outside (on the main content area, which is not overlapped by the dropdown)
			await page.locator('main').click();

			// Dropdown should close
			await expect(page.locator('.mobile-nav-dropdown')).not.toBeVisible();
		});

		test('selecting a nav option navigates and closes the dropdown', async ({ page }) => {
			// Open the dropdown
			await page.locator('.mobile-nav-toggle').click();
			await expect(page.locator('.mobile-nav-dropdown')).toBeVisible();

			// Click a nav option in the dropdown
			await page.locator('.mobile-nav-dropdown a', { hasText: 'Board' }).click();

			// Should navigate to /board
			await page.waitForURL(/\/board/);
			await expect(page.getByRole('heading', { level: 2, name: 'Kanban Board' }).first()).toBeVisible();

			// Dropdown should be closed after navigation
			await expect(page.locator('.mobile-nav-dropdown')).not.toBeVisible();
		});

		test('toggle shows the updated current page name after navigation', async ({ page }) => {
			// Open the dropdown and navigate to Board
			await page.locator('.mobile-nav-toggle').click();
			await page.locator('.mobile-nav-dropdown a', { hasText: 'Board' }).click();
			await page.waitForURL(/\/board/);

			// The toggle should now show "Board"
			const toggle = page.locator('.mobile-nav-toggle span.text-base');
			await expect(toggle).toHaveText('Board');
		});

		test('can navigate to all pages from the mobile dropdown', async ({ page }) => {
			const pages = [
				{ label: 'Board', url: /\/board/, heading: 'Kanban Board' },
				{ label: 'Calendar', url: /\/calendar/, heading: 'Calendar View' },
				{ label: 'Analytics', url: /\/stats/, heading: 'Analytics' },
				{ label: 'Archived', url: /\/archived/, heading: 'Archived Tasks' },
				{ label: 'Settings', url: /\/settings/, heading: 'Settings' }
			];

			for (const { label, url, heading } of pages) {
				// Open dropdown
				await page.locator('.mobile-nav-toggle').click();
				await expect(page.locator('.mobile-nav-dropdown')).toBeVisible();

				// Navigate via dropdown
				await page.locator('.mobile-nav-dropdown a', { hasText: label }).click();
				await page.waitForURL(url);

				// Verify heading
				if (label === 'Settings') {
					await expect(page.getByRole('heading', { level: 1, name: heading }).first()).toBeVisible();
				} else {
					await expect(page.getByRole('heading', { level: 2, name: heading }).first()).toBeVisible();
				}

				// Verify toggle shows new current page
				await expect(page.locator('.mobile-nav-toggle span.text-base')).toHaveText(label);

				// Verify dropdown is closed
				await expect(page.locator('.mobile-nav-dropdown')).not.toBeVisible();
			}
		});

		test('click-outside on a different element (the nav itself) closes the dropdown', async ({ page }) => {
			// Open the dropdown
			await page.locator('.mobile-nav-toggle').click();
			await expect(page.locator('.mobile-nav-dropdown')).toBeVisible();

			// Click on the nav bar itself (but outside the toggle/dropdown)
			const nav = page.locator('nav');
			// The nav has padding; clicking on the right side (near auth button) won't be inside toggle or dropdown
			const navBox = await nav.boundingBox();
			if (navBox) {
				await page.mouse.click(navBox.x + navBox.width - 30, navBox.y + navBox.height / 2);
			}

			await expect(page.locator('.mobile-nav-dropdown')).not.toBeVisible();
		});
	});
});
