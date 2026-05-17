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
			// Serve manifest + SW in dev mode (otherwise /manifest.webmanifest returns 404)
			devOptions: { enabled: true },
			includeAssets: ['app-icon.svg', 'app-icon-192.png', 'app-icon-512.png', 'favicon.svg'],
			manifest: {
				name: 'Svelte Todo',
				short_name: 'Todo',
				description: 'A modern Todo application built with Svelte 5',
				id: '/',
				start_url: '/',
				scope: '/',
				theme_color: '#3b82f6',
				background_color: '#2563eb',
				display: 'standalone',
				categories: ['productivity'],
				lang: 'en',
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
						// NOTE: Using the same source file for "any" and "maskable" is functional,
						// but Android adaptive icons may crop edge content without safe padding.
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				// Don't precache HTML — it references versioned chunk hashes that change
				// with every deploy. Serving stale HTML from cache causes "Failed to fetch
				// dynamically imported module" errors when those chunks no longer exist.
				globPatterns: ['**/*.{js,css,svg,png,ico,json,woff2}'],
				// Use NetworkFirst for navigation so HTML always comes from the network
				// when online (current chunk references), but still works offline via cache.
				runtimeCaching: [
					{
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'NetworkFirst',
						options: {
							cacheName: 'pages',
							expiration: {
								maxEntries: 20,
								maxAgeSeconds: 24 * 60 * 60
							}
						}
					}
				],
				navigateFallback: '/',
				navigateFallbackDenylist: [/\/api\//]
			}
		})
	],
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
