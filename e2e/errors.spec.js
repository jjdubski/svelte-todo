import { test, expect } from '@playwright/test';

test.describe('Error Pages', () => {
	test.beforeEach(async ({ page }) => {
		// Set guest mode before any page JavaScript loads
		await page.addInitScript(() => {
			localStorage.clear();
			localStorage.setItem('authMode', JSON.stringify('guest'));
		});
	});

	test('displays 404 status and contextual message for nonexistent page', async ({ page }) => {
		await page.goto('/nonexistent-page-xyz');

		// Verify 404 status is prominently displayed in the h1
		await expect(page.locator('h1')).toHaveText('404');

		// Verify the contextual message for 404 is shown
		await expect(page.getByText('Page not found — the link you followed may be broken')).toBeVisible();

		// Verify "Back to Tasks" link exists
		await expect(page.getByRole('link', { name: 'Back to Tasks' })).toBeVisible();
	});

	test('hides nav bar on error page', async ({ page }) => {
		await page.goto('/nonexistent-page-xyz');

		// Wait for the error page to fully render
		await expect(page.locator('h1')).toHaveText('404');

		// Nav bar should not be rendered when $page.error is set
		await expect(page.locator('nav')).toHaveCount(0);
	});

	test('Back to Tasks navigates to root URL', async ({ page }) => {
		await page.goto('/nonexistent-page-xyz');

		// Wait for the error page to fully render
		await expect(page.locator('h1')).toHaveText('404');

		// Click the "Back to Tasks" link
		await page.getByRole('link', { name: 'Back to Tasks' }).click();

		// Should land on the root page
		await page.waitForURL('/');
	});
});
