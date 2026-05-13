<script>
	import favicon from '$lib/assets/favicon.svg';
	import { getAuthStore } from '$lib/state/authStore.svelte.js';
	import { PUBLIC_APPLE_ENABLED } from '$env/static/public';

	const auth = getAuthStore();
	const appleEnabled = PUBLIC_APPLE_ENABLED === 'true';

	// Redirect to tasks if already signed in (skip login page for authenticated users)
	$effect(() => {
		if (!auth.isLoading && auth.isLoggedIn) {
			window.location.href = '/tasks';
		}
	});
</script>

{#if auth.isLoading}
	<div
		class="flex min-h-dvh items-center justify-center"
		style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%);"
	>
		<div
			class="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
			style="border-color: var(--border); border-top-color: var(--btn-primary);"
		></div>
	</div>
{:else if !auth.isLoggedIn}
	<div
		class="flex min-h-dvh items-center justify-center p-4"
		style="background: linear-gradient(145deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 100%);"
	>
		<div
			class="w-full max-w-sm rounded-2xl border p-8"
			style="background: var(--card-bg); border-color: var(--border); box-shadow: 0 8px 32px var(--shadow);"
		>
			<!-- Logo / App Name -->
			<div class="mb-8 text-center">
				<img src={favicon} alt="Todo App" class="mx-auto mb-3 h-12 w-12" />
				<h1 class="text-2xl font-bold" style="color: var(--text-heading);">Todo App</h1>
				<p class="mt-1 text-sm" style="color: var(--text-secondary);">Stay organized, get things done</p>
			</div>

			<!-- Sign in with Google -->
			<button
				onclick={() => auth.login('google')}
				class="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all hover:shadow-md"
				style="background: #ffffff; border-color: #dadce0; color: #1f2937;"
			>
				<!-- Google SVG logo -->
				<svg class="h-5 w-5" viewBox="0 0 24 24">
					<path
						fill="#4285F4"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
					/>
					<path
						fill="#34A853"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="#FBBC05"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					/>
					<path
						fill="#EA4335"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
				Sign in with Google
			</button>

			<!-- Sign in with Apple (only shown when configured) -->
			{#if appleEnabled}
				<button
					onclick={() => auth.login('apple')}
					class="mt-3 flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-md"
					style="background: #000000; border-color: #000000;"
				>
					<!-- Apple SVG logo -->
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="white">
						<path
							d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
						/>
					</svg>
					Sign in with Apple
				</button>
			{/if}

			<!-- Divider -->
			<div class="my-5 flex items-center gap-3">
				<div class="flex-1 border-t" style="border-color: var(--border);"></div>
				<span class="text-xs tracking-wider uppercase" style="color: var(--text-muted);">or</span>
				<div class="flex-1 border-t" style="border-color: var(--border);"></div>
			</div>

			<!-- Continue as Guest -->
			<button
				onclick={() => auth.continueAsGuest()}
				class="w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:opacity-80"
				style="background: var(--input-bg); color: var(--text);"
			>
				Continue as Guest
			</button>
			<p class="mt-2 text-center text-xs" style="color: var(--text-muted);">Your data is stored locally only</p>
		</div>
	</div>
{/if}
