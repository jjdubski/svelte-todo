import { test, expect } from '@playwright/test';

test.describe('Board page features', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.clear();
			localStorage.setItem('authMode', JSON.stringify('guest'));
			localStorage.setItem(
				'todos',
				JSON.stringify([
					{
						id: 'b1',
						title: 'Alpha',
						completed: false,
						tags: [],
						priority: 'medium',
						createdAt: '2026-01-01T00:00:00.000Z'
					},
					{
						id: 'b2',
						title: 'Beta',
						completed: false,
						tags: ['in-progress'],
						priority: 'medium',
						createdAt: '2026-01-01T00:00:00.000Z'
					},
					{
						id: 'b3',
						title: 'Gamma',
						completed: true,
						tags: [],
						priority: 'medium',
						createdAt: '2026-01-01T00:00:00.000Z'
					},
					{
						id: 'b4',
						title: 'Delta',
						completed: false,
						tags: [],
						priority: 'medium',
						createdAt: '2026-01-01T00:00:00.000Z'
					},
					{
						id: 'b5',
						title: 'Epsilon',
						completed: false,
						tags: ['in-progress'],
						priority: 'medium',
						createdAt: '2026-01-01T00:00:00.000Z'
					}
				])
			);
		});
		await page.goto('/board');
		await page.waitForSelector('h2');
		await expect(page.locator('h2')).toHaveText('Kanban Board');
	});

	// ──────────────────────────────────────────────
	// Global Toast (Item 8 — layout + board)
	// ──────────────────────────────────────────────

	test('Toast appears when archiving a task from the board page', async ({ page }) => {
		await page.locator('[aria-label="Archive task"]').first().click();

		// Toast should appear with Undo button
		const undoToast = page.locator('button', { hasText: 'Undo' });
		await expect(undoToast).toBeVisible({ timeout: 5000 });

		// Toast message text should be visible
		await expect(page.getByText('Task archived')).toBeVisible();
	});

	// ──────────────────────────────────────────────
	// Multi-selection basics (Item 9)
	// ──────────────────────────────────────────────

	test('clicking a card selects it and clicking another deselects the first', async ({ page }) => {
		const cards = page.locator('.board-card');
		await expect(cards).toHaveCount(5);

		// Click first card → it gets selected styling
		await cards.first().click();
		await expect(cards.first()).toHaveClass(/selected/);

		// Click third card → first card deselects, third selects
		await cards.nth(2).click();
		await expect(cards.first()).not.toHaveClass(/selected/);
		await expect(cards.nth(2)).toHaveClass(/selected/);
	});

	test('Cmd+click toggles selection without affecting other selected cards', async ({ page }) => {
		const cards = page.locator('.board-card');

		// Click first card normally
		await cards.first().click();
		await expect(cards.first()).toHaveClass(/selected/);

		// Cmd+click third card — both should be selected (handler checks e.ctrlKey || e.metaKey)
		await cards.nth(2).click({ modifiers: ['Meta'] });
		await expect(cards.first()).toHaveClass(/selected/);
		await expect(cards.nth(2)).toHaveClass(/selected/);

		// Cmd+click first card again — toggles off, third stays
		await cards.first().click({ modifiers: ['Meta'] });
		await expect(cards.first()).not.toHaveClass(/selected/);
		await expect(cards.nth(2)).toHaveClass(/selected/);
	});

	// ──────────────────────────────────────────────
	// Shift+click range selection (Item 9)
	// ──────────────────────────────────────────────

	test('Shift+click selects a range of cards across columns', async ({ page }) => {
		const cards = page.locator('.board-card');

		// Click first card (Alpha — store.todos index 0)
		await cards.first().click();
		await expect(cards.first()).toHaveClass(/selected/);

		// Shift+click Epsilon (store.todos index 4, DOM index 3 in In Progress column)
		// This should select all 5 cards via range 0..4
		await cards.nth(3).click({ modifiers: ['Shift'] });

		// All 5 cards should be selected
		const selectedCards = page.locator('.board-card.selected');
		await expect(selectedCards).toHaveCount(5);

		// Batch action bar should show the correct count
		await expect(page.getByText('5 selected')).toBeVisible();
	});

	// ──────────────────────────────────────────────
	// Batch action bar (Item 9)
	// ──────────────────────────────────────────────

	test('Cancel button deselects all and hides the batch action bar', async ({ page }) => {
		const cards = page.locator('.board-card');

		// Select multiple cards using Cmd+click
		await cards.first().click();
		await cards.nth(2).click({ modifiers: ['Meta'] });

		// Batch action bar should be visible with Archive, Mark Done, Cancel
		await expect(page.getByText('2 selected')).toBeVisible();
		await expect(page.locator('button', { hasText: 'Archive' })).toBeVisible();
		await expect(page.locator('button', { hasText: 'Mark Done' })).toBeVisible();

		// Click Cancel
		await page.locator('button', { hasText: 'Cancel' }).click();

		// All cards should be deselected
		await expect(page.locator('.board-card.selected')).toHaveCount(0);

		// Batch action bar should be hidden
		await expect(page.getByText(/ selected/)).not.toBeVisible();
	});

	test('Mark Done moves selected cards to the Done column', async ({ page }) => {
		const cards = page.locator('.board-card');

		// Select two pending cards: Alpha (DOM 0, store idx 0) and Delta (DOM 1, store idx 3)
		await cards.nth(0).click();
		await cards.nth(1).click({ modifiers: ['Meta'] });

		// Click Mark Done
		await page.locator('button', { hasText: 'Mark Done' }).click();

		// Done column should now have 3 cards (Gamma + Alpha + Delta)
		const doneColumn = page.locator('.board-column[aria-label="Done column"]');
		await expect(doneColumn.locator('.board-card')).toHaveCount(3);

		// Pending column should have 0 cards
		const pendingColumn = page.locator('.board-column[aria-label="Pending column"]');
		await expect(pendingColumn.locator('.board-card')).toHaveCount(0);
	});

	test('Archive removes selected cards from the board', async ({ page }) => {
		const cards = page.locator('.board-card');
		await expect(cards).toHaveCount(5);

		// Select first and fifth card (Alpha in Pending, Gamma in Done)
		await cards.nth(0).click();
		await cards.nth(4).click({ modifiers: ['Meta'] });

		// Click Archive
		await page.locator('button', { hasText: 'Archive' }).click();

		// Two cards should be removed from the board (3 remain)
		await expect(page.locator('.board-card')).toHaveCount(3);
	});

	// ──────────────────────────────────────────────
	// Click empty space deselects (Item 9)
	// ──────────────────────────────────────────────

	test('clicking empty column space deselects all cards', async ({ page }) => {
		const cards = page.locator('.board-card');

		// Select first card
		await cards.first().click();
		await expect(cards.first()).toHaveClass(/selected/);

		// Click on empty space (padding area) in the Pending column body.
		// The column body is the direct child of .board-column with role="button".
		// The column body has 12px padding so clicking at (5,5) from the top-left
		// hits the padding area — not a card.
		const columnBody = page.locator('.board-column[aria-label="Pending column"] > [role="button"]');
		await columnBody.click({ position: { x: 5, y: 5 } });

		// All cards should be deselected
		await expect(page.locator('.board-card.selected')).toHaveCount(0);
	});

	// ──────────────────────────────────────────────
	// Board move toast with undo (Item 10)
	// ──────────────────────────────────────────────

	test('dragging a card between columns shows toast with Undo', async ({ page }) => {
		// Drag the first card (Alpha, in Pending) to the Done column
		const sourceCard = page.locator('.board-card').first();
		const doneColumn = page.locator('.board-column[aria-label="Done column"]');

		const sourceBox = await sourceCard.boundingBox();
		const doneBox = await doneColumn.boundingBox();

		// Drag to bottom of Done column to avoid landing on the existing card (Gamma)
		await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
		await page.mouse.down();
		await page.mouse.move(doneBox.x + doneBox.width / 2, doneBox.y + doneBox.height - 15, {
			steps: 20
		});
		await page.mouse.up();

		// Toast should appear with the move message
		await expect(page.getByText(/Moved task to/)).toBeVisible({ timeout: 5000 });

		// Click Undo on the toast
		await page.locator('button', { hasText: 'Undo' }).click();

		// Verify column counts restored: Pending count should be back to 2
		const pendingBadge = page.locator('.board-column[aria-label="Pending column"] .rounded-full');
		await expect(pendingBadge).toHaveText('2', { timeout: 3000 });
	});
});
