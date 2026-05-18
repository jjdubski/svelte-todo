import { json, error } from '@sveltejs/kit';
import { updateDarkMode } from '$lib/server/todoService.js';

/**
 * PATCH /api/todos/dark-mode — Update the user's dark mode preference.
 * Requires authentication. Called when the user toggles dark mode.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function PATCH(event) {
	try {
		const session = await event.locals.auth();
		const authUserId = session?.user?.authUserId || null;
		if (!authUserId) {
			return error(401, 'Unauthorized');
		}

		const { darkMode } = await event.request.json();

		if (typeof darkMode !== 'boolean') {
			return error(400, 'darkMode must be a boolean');
		}

		await updateDarkMode(authUserId, darkMode);
		return json({ success: true });
	} catch (err) {
		console.error('[api] PATCH /api/todos/dark-mode failed:', err);
		return error(500, 'Internal server error');
	}
}
