import { json, error } from '@sveltejs/kit';
import { getSettings, updateSettings } from '$lib/server/todoService.js';

/**
 * GET /api/todos/settings — Fetch user settings payload.
 * Requires authentication.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function GET(event) {
	try {
		const session = await event.locals.auth();
		const authUserId = session?.user?.authUserId || null;
		if (!authUserId) {
			return error(401, 'Unauthorized');
		}

		const settings = await getSettings(authUserId);
		return json({ settings });
	} catch (err) {
		console.error('[api] GET /api/todos/settings failed:', err);
		return error(500, 'Internal server error');
	}
}

/**
 * PATCH /api/todos/settings — Merge settings payload into user settings.
 * Requires authentication.
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

		const { settings } = await event.request.json();
		if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
			return error(400, 'settings must be an object');
		}

		await updateSettings(authUserId, settings);
		return json({ success: true });
	} catch (err) {
		console.error('[api] PATCH /api/todos/settings failed:', err);
		return error(500, 'Internal server error');
	}
}
