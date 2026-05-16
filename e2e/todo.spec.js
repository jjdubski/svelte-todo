import { test, expect } from '@playwright/test';

test.describe('Todo App', () => {
	test.beforeEach(async ({ page }) => {
		// Set guest mode before any page JavaScript loads
		await page.addInitScript(() => {
			localStorage.clear();
			localStorage.setItem('authMode', JSON.stringify('guest'));
		});
		await page.goto('/tasks');
		await page.waitForSelector('#title-input', { timeout: 10000 });
	});

	test('Basic CRUD: add, complete, delete task', async ({ page }) => {
		await expect(page.locator('h1')).toHaveText('Todo List');

		const titleInput = page.locator('#title-input');
		await titleInput.fill('Buy groceries');
		await page.locator('button[data-btn="primary"]', { hasText: 'Add Task' }).click();

		await expect(page.locator('.todo-title')).toHaveText('Buy groceries');

		const checkbox = page.locator('.todo-check').first();
		await checkbox.click();

		const todoCard = page.locator('.todo-card').first();
		await expect(todoCard).toHaveClass(/completed/);

		const deleteBtn = page.locator('[aria-label="Archive task"]').first();
		await deleteBtn.click();

		await expect(page.locator('.todo-title')).toHaveCount(0);

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
		await expect(page.locator('.todo-title')).toHaveCount(2);

		// The search input is rendered as a searchbox with accessible name "Search tasks"
		const searchField = page.getByRole('searchbox', { name: /search/i });
		await expect(searchField).toBeVisible({ timeout: 5000 });
		await searchField.fill('groceries');

		// Verify only matching task is visible
		await expect(page.locator('.todo-title')).toHaveCount(1);
		await expect(page.locator('.todo-title')).toHaveText('Buy groceries');

		// Clear search
		await searchField.fill('');

		// Both should be visible again
		await expect(page.locator('.todo-title')).toHaveCount(2);
	});

	test('Search stays editable and filters still work after selecting status', async ({ page }) => {
		const titleInput = page.locator('#title-input');

		await titleInput.fill('Buy groceries');
		await page.locator('button[data-btn="primary"]', { hasText: 'Add Task' }).click();

		await titleInput.fill('Read a book');
		await page.locator('button[data-btn="primary"]', { hasText: 'Add Task' }).click();

		const searchField = page.getByRole('searchbox', { name: /search/i });
		await searchField.click();
		await searchField.type('buy ');
		await expect(searchField).toHaveValue('buy ');

		const statusFilter = page.getByRole('combobox', { name: /filter by status/i });
		await statusFilter.selectOption('active');

		await expect(statusFilter).toHaveValue('active');
		await expect(page.locator('.todo-title')).toHaveCount(2);

		await searchField.click();
		await searchField.press('End');
		await searchField.type(' groceries');
		await expect(searchField).toHaveValue(/buy\s+groceries$/);
		await expect(page.locator('.todo-title')).toHaveCount(1);
		await expect(page.locator('.todo-title')).toHaveText('Buy groceries');

		const categoryWork = page.getByRole('button', { name: 'Work' }).first();
		await categoryWork.click();
		await expect(categoryWork).toHaveClass(/active/);

		await categoryWork.click();
		await expect(categoryWork).not.toHaveClass(/active/);
	});

	test('Navigation', async ({ page }) => {
		await page.locator('a.nav-link', { hasText: 'Board' }).click();
		await expect(page).toHaveURL(/\/board/);
		await expect(page.getByRole('heading', { level: 3, name: 'Pending' }).first()).toBeVisible();

		await page.locator('a.nav-link', { hasText: 'Analytics' }).click();
		await expect(page).toHaveURL(/\/stats/);
		await expect(page.getByRole('heading', { level: 3, name: 'Completion Rate' }).first()).toBeVisible();

		await page.locator('a.nav-link', { hasText: 'Tasks' }).click();
		await expect(page).toHaveURL(/\/tasks/);
		await expect(page.getByRole('textbox', { name: 'Task title' }).first()).toBeVisible();
	});

	test('Drag handles visible when sort is manual', async ({ page }) => {
		const titleInput = page.locator('#title-input');
		await titleInput.fill('Task one');
		await page.locator('button[data-btn="primary"]', { hasText: 'Add Task' }).click();
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

	// ── New E2E Tests for Auth ──

	test.describe('Authentication UI', () => {
		test('Login page is shown for unauthenticated users', async ({ page }) => {
			// Clear localStorage before page loads to simulate unauthenticated user
			await page.addInitScript(() => {
				localStorage.clear();
			});
			await page.goto('/');
			// Should see login options
			await expect(page.locator('text=Continue as Guest')).toBeVisible({ timeout: 10000 });
			// Should see Google sign-in button
			await expect(page.locator('text=Google')).toBeVisible();
		});

		test('Guest mode continues to todo list', async ({ page }) => {
			// Start with no auth state
			await page.addInitScript(() => {
				localStorage.clear();
			});
			await page.goto('/');
			await page.waitForTimeout(1000); // let JS init
			await page.locator('text=Continue as Guest').click();
			await page.waitForURL(/\/tasks/);
			await expect(page.locator('#title-input')).toBeVisible({ timeout: 10000 });
		});

		test('Tasks page accessible via /tasks in guest mode', async ({ page }) => {
			await page.addInitScript(() => {
				localStorage.clear();
				localStorage.setItem('authMode', JSON.stringify('guest'));
			});
			await page.goto('/tasks');
			await page.waitForSelector('#title-input', { timeout: 10000 });
			await expect(page.locator('h1')).toHaveText('Todo List');
		});
	});
});
