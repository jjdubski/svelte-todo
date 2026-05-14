import { test, expect } from '@playwright/test';

test.describe('Calendar page', () => {
	/**
	 * Helper: build a `yyyy-MM-dd` date string for a given day in the current month.
	 * @param {number} day
	 * @returns {string}
	 */
	function dateStr(day) {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, '0');
		const d = String(day).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	test.beforeEach(async ({ page }) => {
		// Pre-populate localStorage with guest mode and sample todos
		// so the calendar page has known data to render.
		await page.addInitScript(() => {
			const now = new Date();
			const y = now.getFullYear();
			const m = String(now.getMonth() + 1).padStart(2, '0');

			localStorage.clear();
			localStorage.setItem('authMode', JSON.stringify('guest'));
			localStorage.setItem(
				'todos',
				JSON.stringify([
					{
						id: 'e2e-cal-1',
						title: 'Team standup',
						description: 'Daily team sync meeting',
						completed: false,
						dueDate: `${y}-${m}-15`,
						priority: 'high',
						tags: ['meeting'],
						createdAt: '2026-01-01T00:00:00.000Z'
					},
					{
						id: 'e2e-cal-2',
						title: 'Review PR',
						description: 'Code review for the calendar feature',
						completed: false,
						dueDate: `${y}-${m}-15`,
						priority: 'medium',
						tags: ['urgent'],
						createdAt: '2026-01-01T00:00:00.000Z'
					},
					{
						id: 'e2e-cal-3',
						title: 'Weekly report',
						description: 'Write the weekly status report',
						completed: true,
						dueDate: `${y}-${m}-20`,
						priority: 'low',
						tags: [],
						completedAt: '2026-05-20T12:00:00.000Z',
						createdAt: '2026-01-01T00:00:00.000Z'
					}
				])
			);
			// Set up custom tags + colors so tag badges render in modal/tooltips
			localStorage.setItem('customTags', JSON.stringify(['meeting', 'urgent']));
			localStorage.setItem('tagColors', JSON.stringify({ meeting: '#f59e0b', urgent: '#ef4444' }));
		});

		await page.goto('/calendar');
		await page.waitForSelector('h2', { timeout: 10000 });
		await expect(page.locator('h2')).toHaveText('Calendar View');
	});

	// ──────────────────────────────────────────────
	// Modal: opening with task content
	// ──────────────────────────────────────────────

	test('clicking a day with tasks opens modal showing those tasks', async ({ page }) => {
		// Click on day 15 (has "Team standup" + "Review PR")
		const day15 = page.locator('div[role="button"]').filter({ hasText: '15' }).first();
		await day15.click();

		// Modal backdrop should appear
		const backdrop = page.locator('.fixed.inset-0.z-50');
		await expect(backdrop).toBeVisible({ timeout: 3000 });

		// Both tasks for day 15 should be listed
		await expect(backdrop.getByText('Team standup')).toBeVisible();
		await expect(backdrop.getByText('Review PR')).toBeVisible();

		// The task from day 20 should NOT be shown
		await expect(backdrop.getByText('Weekly report')).not.toBeVisible();

		// Priority badges should render for the tasks
		await expect(backdrop.getByText('HIGH')).toBeVisible();
		await expect(backdrop.getByText('MEDIUM')).toBeVisible();

		// Task descriptions should appear
		await expect(backdrop.getByText('Daily team sync meeting')).toBeVisible();
		await expect(backdrop.getByText('Code review for the calendar feature')).toBeVisible();
	});

	// ──────────────────────────────────────────────
	// Modal: empty state
	// ──────────────────────────────────────────────

	test('clicking a day without tasks shows empty state', async ({ page }) => {
		// Click on day 1 (no todos added for this day)
		const day1 = page.locator('div[role="button"]').filter({ hasText: '1' }).first();
		await day1.click();

		// Modal should show the empty-state message
		const backdrop = page.locator('.fixed.inset-0.z-50');
		await expect(backdrop).toBeVisible({ timeout: 3000 });
		await expect(backdrop.getByText('No tasks for this day')).toBeVisible();
	});

	// ──────────────────────────────────────────────
	// Modal: close via backdrop click
	// ──────────────────────────────────────────────

	test('clicking backdrop closes the modal', async ({ page }) => {
		// Open the modal first
		const day15 = page.locator('div[role="button"]').filter({ hasText: '15' }).first();
		await day15.click();
		await expect(page.locator('.fixed.inset-0.z-50')).toBeVisible({ timeout: 3000 });

		// Click the backdrop (top-left corner — outside the centered modal)
		await page.mouse.click(10, 10);

		// Modal should close
		await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible({ timeout: 3000 });
	});

	// ──────────────────────────────────────────────
	// Modal: close via close button
	// ──────────────────────────────────────────────

	test('clicking close button closes the modal', async ({ page }) => {
		// Open the modal first
		const day15 = page.locator('div[role="button"]').filter({ hasText: '15' }).first();
		await day15.click();
		await expect(page.locator('.fixed.inset-0.z-50')).toBeVisible({ timeout: 3000 });

		// Click the close button (aria-label="Close")
		await page.locator('button[aria-label="Close"]').click();

		// Modal should close
		await expect(page.locator('.fixed.inset-0.z-50')).not.toBeVisible({ timeout: 3000 });
	});

	// ──────────────────────────────────────────────
	// Modal: navigating to /tasks from a task row
	// ──────────────────────────────────────────────

	test('clicking a task row navigates to the tasks page', async ({ page }) => {
		// Open the modal
		const day15 = page.locator('div[role="button"]').filter({ hasText: '15' }).first();
		await day15.click();
		await expect(page.locator('.fixed.inset-0.z-50')).toBeVisible({ timeout: 3000 });

		// Click on the "Team standup" task button
		await page.locator('.fixed.inset-0.z-50 button', { hasText: 'Team standup' }).click();

		// Should navigate to /tasks
		await page.waitForURL(/\/tasks/, { timeout: 5000 });
		await expect(page.locator('#title-input')).toBeVisible({ timeout: 5000 });
	});

	// ──────────────────────────────────────────────
	// Tooltip on pill hover
	// ──────────────────────────────────────────────

	test('hovering over a task pill shows tooltip with task info', async ({ page }) => {
		// The calendar grid should have task pills (div[role="button"] with aria-label)
		const taskPill = page.locator('[aria-label="Team standup"]').first();
		await expect(taskPill).toBeVisible({ timeout: 3000 });

		// Hover to trigger the portal tooltip (200ms show delay)
		await taskPill.hover();
		await page.waitForTimeout(500);

		// The tooltip-portal element should now be visible at the body level
		const tooltipPortal = page.locator('.tooltip-portal');
		await expect(tooltipPortal).toBeVisible({ timeout: 3000 });

		// Tooltip should contain the task title
		await expect(tooltipPortal.getByText('Team standup')).toBeVisible();

		// Tooltip should contain the priority badge
		await expect(tooltipPortal.getByText('HIGH')).toBeVisible();

		// Tooltip should contain the task description (truncated)
		await expect(tooltipPortal.getByText(/Daily team sync meeting/)).toBeVisible();

		// Tooltip should contain the tag badge (exact match to avoid description text overlap)
		await expect(tooltipPortal.getByText('meeting', { exact: true })).toBeVisible();
	});
});
