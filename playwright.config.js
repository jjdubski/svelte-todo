import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	retries: 1,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:4173',
		headless: true,
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		timeout: 60000,
		reuseExistingServer: !process.env.CI
	}
});
