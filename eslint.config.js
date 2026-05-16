import sveltePlugin from 'eslint-plugin-svelte';

export default [
	{
		ignores: ['.svelte-kit/', 'node_modules/', 'build/']
	},
	...sveltePlugin.configs['flat/recommended'],
	{
		rules: {
			// Core no-unused-vars doesn't understand Svelte template references;
			// svelte/no-unused-vars (from recommended config) handles this correctly.
			'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
			'no-console': 'off',

			// ── SvelteKit ────────────────────────────────────────────
			// SvelteKit navigation must go through resolve() for base path safety
			'svelte/no-navigation-without-resolve': 'warn',

			// ── Reactivity ───────────────────────────────────────────
			'svelte/prefer-svelte-reactivity': 'error',

			// ── Security ─────────────────────────────────────────────
			// Markdown rendering is intentional with trusted content (user's own data)
			'svelte/no-at-html-tags': 'off',
			// Prevent tabnabbing: target="_blank" must include rel="noopener noreferrer"
			'svelte/no-target-blank': 'error',

			// ── Accessibility & correctness ──────────────────────────
			// Buttons without explicit type default to submit, causing unexpected form submissions.
			// Many existing violations — fix incrementally. Always add type="button" to new buttons.
			'svelte/button-has-type': 'warn',

			// ── Code quality ─────────────────────────────────────────
			// Prefer const for variables never reassigned (auto-fixable)
			'svelte/prefer-const': 'error',
			// Catch store subscriptions whose unsubscribe function is ignored (memory leak)
			'svelte/no-ignored-unsubscribe': 'warn'
			// Note: svelte/no-unused-class-name is incompatible with Tailwind v4
			// (Tailwind provides utility classes, not component-scoped style definitions)
		}
	}
];
