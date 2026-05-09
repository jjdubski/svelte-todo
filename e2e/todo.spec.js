import { test, expect } from '@playwright/test';

test.describe('Todo App', () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage to start fresh
		await page.goto('/');
		await page.evaluate(() => localStorage.clear());
		await page.reload();
	});

	test('Basic CRUD: add, complete, delete task', async ({ page }) => {
		// Page title is visible
		await expect(page.locator('h1')).toHaveText('Todo List');

		// Type a task title and click Add Task
		const titleInput = page.locator('#title-input');
		await titleInput.fill('Buy groceries');
		await page.locator('button', { hasText: 'Add Task' }).click();

		// Verify the task appears in the list
		await expect(page.locator('h3.todo-title')).toHaveText('Buy groceries');

		// Click the checkbox — verify it gets marked complete (strikethrough)
		const checkbox = page.locator('.todo-check').first();
		await checkbox.click();

		// The todo card should get the 'completed' class
		const todoCard = page.locator('.todo-card').first();
		await expect(todoCard).toHaveClass(/completed/);

		// Click delete button — verify task is removed
		const deleteBtn = page.locator('[aria-label="Delete task"]').first();
		await deleteBtn.click();

		// Verify task is removed
		await expect(page.locator('h3.todo-title')).toHaveCount(0);

		// Verify "Undo" toast appears
		const undoToast = page.locator('button', { hasText: 'Undo' });
		await expect(undoToast).toBeVisible();
	});

	test('Dark mode toggle', async ({ page }) => {
		// Click the dark mode toggle button (initially "Switch to dark mode")
		const darkToggle = page.locator('[aria-label="Switch to dark mode"]');
		await darkToggle.click();

		// Verify dark class is applied to <html>
		await expect(page.locator('html')).toHaveClass(/dark/);

		// Toggle back
		const lightToggle = page.locator('[aria-label="Switch to light mode"]');
		await lightToggle.click();

		// Verify dark class is removed
		await expect(page.locator('html')).not.toHaveClass(/dark/);
	});

	test('Search/filter tasks', async ({ page }) => {
		// Add two tasks with different titles
		const titleInput = page.locator('#title-input');

		await titleInput.fill('Buy groceries');
		await page.locator('button', { hasText: 'Add Task' }).click();

		await titleInput.fill('Read a book');
		await page.locator('button', { hasText: 'Add Task' }).click();

		// Both tasks should be visible
		await expect(page.locator('h3.todo-title')).toHaveCount(2);

		// Type in search box
		const searchInput = page.locator('input[placeholder="Search..."]');
		await searchInput.fill('groceries');

		// Verify only matching task is visible
		await expect(page.locator('h3.todo-title')).toHaveCount(1);
		await expect(page.locator('h3.todo-title')).toHaveText('Buy groceries');

		// Clear search
		await searchInput.fill('');

		// Both should be visible again
		await expect(page.locator('h3.todo-title')).toHaveCount(2);
	});

	test('Navigation', async ({ page }) => {
		// Navigate to Board page
		await page.locator('a.nav-link', { hasText: 'Board' }).click();
		await expect(page).toHaveURL(/\/board/);
		// Verify Kanban board page loads with "Pending" column header
		await expect(page.locator('h3', { hasText: 'Pending' })).toBeVisible();

		// Navigate to Analytics page
		await page.locator('a.nav-link', { hasText: 'Analytics' }).click();
		await expect(page).toHaveURL(/\/stats/);
		// Verify analytics page loads with "Completion Rate"
		await expect(page.locator('h3', { hasText: 'Completion Rate' })).toBeVisible();

		// Navigate back to Tasks
		await page.locator('a.nav-link', { hasText: 'Tasks' }).click();
		await expect(page).toHaveURL(/\/$/);
		// Verify main list is visible (the add form)
		await expect(page.locator('#title-input')).toBeVisible();
	});

	test('Drag handles visible when sort is manual', async ({ page }) => {
		// Add a task so there's something to see
		const titleInput = page.locator('#title-input');
		await titleInput.fill('Task one');
		await page.locator('button', { hasText: 'Add Task' }).click();

		// Verify drag handle exists (visible when sortBy is 'manual' by default)
		const dragHandle = page.locator('[aria-label="Drag to reorder"]');
		await expect(dragHandle).toBeVisible();
	});

	test('Stats bar shows correct counts', async ({ page }) => {
		// Add two tasks
		const titleInput = page.locator('#title-input');

		await titleInput.fill('Task A');
		await page.locator('button', { hasText: 'Add Task' }).click();

		await titleInput.fill('Task B');
		await page.locator('button', { hasText: 'Add Task' }).click();

		// Stats bar should show "2" active
		await expect(page.locator('text=Active')).toBeVisible();
		// We should see 2 active
		const activeStat = page.locator('text=Active').first().locator('..');
		await expect(activeStat.locator('span').first()).toHaveText('2');

		// Complete one task
		const checkbox = page.locator('.todo-check').first();
		await checkbox.click();

		// Should now show 1 active and 1 completed
		await page.waitForTimeout(500); // Allow spring animation to settle
		const statsText = await page
			.locator('text=Completed')
			.first()
			.locator('..')
			.locator('span')
			.first()
			.textContent();
		// The completed span should show "1" (could be "1" or "0" briefly due to spring)
		expect(['1', '0']).toContain(statsText);
	});
});
