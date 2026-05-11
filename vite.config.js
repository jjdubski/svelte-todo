/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// Default optional public env vars so $env/static/public doesn't fail at build time.
// Users override these in their .env file when enabling the corresponding feature.
process.env.PUBLIC_APPLE_ENABLED = process.env.PUBLIC_APPLE_ENABLED || 'false';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Svelte Todo',
				short_name: 'Todo',
				description: 'A modern Todo application built with Svelte 5',
				theme_color: '#3b82f6',
				icons: [
					{
						src: 'favicon.svg',
						sizes: '192x192',
						type: 'image/svg+xml'
					},
					{
						src: 'favicon.svg',
						sizes: '512x512',
						type: 'image/svg+xml'
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
