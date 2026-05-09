import { test, expect } from '@playwright/test';

test.describe('Todo App', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		await page.waitForSelector('#title-input', { timeout: 10000 });
	});

	test('Basic CRUD: add, complete, delete task', async ({ page }) => {
		await expect(page.locator('h1')).toHaveText('Todo List');

		const titleInput = page.locator('#title-input');
		await titleInput.fill('Buy groceries');
		await page.locator('button[data-btn="primary"]', { hasText: 'Add Task' }).click();

		await expect(page.locator('h3.todo-title')).toHaveText('Buy groceries');

		const checkbox = page.locator('.todo-check').first();
		await checkbox.click();

		const todoCard = page.locator('.todo-card').first();
		await expect(todoCard).toHaveClass(/completed/);

		const deleteBtn = page.locator('[aria-label="Delete task"]').first();
		await deleteBtn.click();

		await expect(page.locator('h3.todo-title')).toHaveCount(0);

		const undoToast = page.locator('button', { hasText: 'Undo' });
		await expect(undoToast).toBeVisible();
	});

	test('Dark mode toggle', async ({ page }) => {
		const darkToggle = page.locator('[aria-label="Switch to dark mode"]');
		await darkToggle.click();
		await expect(page.locator('html')).toHaveClass(/dark/);

		const lightToggle = page.locator('[aria-label="Switch to light mode"]');
		await lightToggle.click();
		await expect(page.locator('html')).not.toHaveClass(/dark/);
	});

	test('Search/filter tasks', async ({ page }) => {
		const titleInput = page.locator('#title-input');

		await titleInput.fill('Buy groceries');
		await page.locator('button[data-btn="primary"]', { hasText: 'Add Task' }).click();

		await titleInput.fill('Read a book');
		await page.locator('button[data-btn="primary"]', { hasText: 'Add Task' }).click();

		// Both tasks should be visible
		await expect(page.locator('h3.todo-title')).toHaveCount(2);

		// The search input is rendered as a searchbox with accessible name "Search tasks"
		const searchField = page.getByRole('searchbox', { name: /search/i });
		await expect(searchField).toBeVisible({ timeout: 5000 });
		await searchField.fill('groceries');

		// Verify only matching task is visible
		await expect(page.locator('h3.todo-title')).toHaveCount(1);
		await expect(page.locator('h3.todo-title')).toHaveText('Buy groceries');

		// Clear search
		await searchField.fill('');

		// Both should be visible again
		await expect(page.locator('h3.todo-title')).toHaveCount(2);
	});

	test('Navigation', async ({ page }) => {
		await page.locator('a.nav-link', { hasText: 'Board' }).click();
		await expect(page).toHaveURL(/\/board/);
		await expect(page.locator('h3', { hasText: 'Pending' })).toBeVisible();

		await page.locator('a.nav-link', { hasText: 'Analytics' }).click();
		await expect(page).toHaveURL(/\/stats/);
		await expect(page.locator('h3', { hasText: 'Completion Rate' })).toBeVisible();

		await page.locator('a.nav-link', { hasText: 'Tasks' }).click();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.locator('#title-input')).toBeVisible();
	});

	test('Drag handles visible when sort is manual', async ({ page }) => {
		const titleInput = page.locator('#title-input');
		await titleInput.fill('Task one');
		await page.locator('button[data-btn="primary"]', { hasText: 'Add Task' }).click();

		const dragHandle = page.locator('[aria-label="Drag to reorder"]');
		await expect(dragHandle).toBeVisible();
	});

	test('Stats bar shows correct counts', async ({ page }) => {
		const titleInput = page.locator('#title-input');

		await titleInput.fill('Task A');
		await page.locator('button[data-btn="primary"]', { hasText: 'Add Task' }).click();

		await titleInput.fill('Task B');
		await page.locator('button[data-btn="primary"]', { hasText: 'Add Task' }).click();

		// Find the stats bar by its structure
		const statsSections = page.locator('div.rounded-xl.border').first();
		await expect(statsSections).toBeVisible();

		const activeSection = statsSections.locator('div.flex').filter({ hasText: 'Active' });
		await expect(activeSection).toBeVisible();

		const activeCount = activeSection.locator('span').first();
		await expect(activeCount).toHaveText('2');
	});
});
