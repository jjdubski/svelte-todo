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
			'no-unused-vars': 'off',
			'no-console': 'off',
			// SvelteKit navigation is properly handled via data-sveltekit-preload-data
			'svelte/no-navigation-without-resolve': 'off',
			// Existing code uses standard Date — switching to SvelteDate is out of scope
			'svelte/prefer-svelte-reactivity': 'off',
			// Markdown rendering is intentional with trusted content (user's own data)
			'svelte/no-at-html-tags': 'off'
		}
	}
];
