/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { createLogger } from 'vite';
import { defineConfig } from 'vitest/config';

// Suppress SSR transform warning in @auth/sveltekit (imports customFetch from @auth/core
// only to re-export it, which Vite's SSR transform sees as unused):
//   "customFetch" is imported from external module "@auth/core" but never used
const logger = createLogger();
const { warn: originalWarn } = logger;
logger.warn = (msg, options) => {
	if (msg.includes('customFetch') && msg.includes('@auth/sveltekit')) return;
	originalWarn(msg, options);
};

// Default optional public env vars so $env/static/public doesn't fail at build time.
// Users override these in their .env file when enabling the corresponding feature.
process.env.PUBLIC_APPLE_ENABLED = process.env.PUBLIC_APPLE_ENABLED || 'false';

export default defineConfig({
	customLogger: logger,
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['app-icon.svg', 'app-icon-192.png', 'app-icon-512.png', 'favicon.svg'],
			manifest: {
				name: 'Svelte Todo',
				short_name: 'Todo',
				description: 'A modern Todo application built with Svelte 5',
				theme_color: '#3b82f6',
				background_color: '#2563eb',
				display: 'standalone',
				icons: [
					{
						src: 'app-icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: 'app-icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: 'app-icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			}
		})
	],
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
