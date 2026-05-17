import { json, error } from '@sveltejs/kit';
import { batchArchive } from '$lib/server/todoService.js';
import { resolveEffectiveAuthUserId } from '$lib/server/profileService.js';

/**
 * POST /api/todos/archive — Batch archive todos.
 * Requires authentication.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	try {
		const authUserId = await resolveEffectiveAuthUserId(event);
		if (!authUserId) {
			return error(401, 'Unauthorized');
		}

		const body = await event.request.json();
		const { ids } = body;

		if (!Array.isArray(ids) || ids.length === 0) {
			return error(400, 'ids must be a non-empty array');
		}

		const archived = await batchArchive(authUserId, ids);
		return json({ archived });
	} catch (err) {
		console.error('[api] POST /api/todos/archive failed:', err);
		return error(500, 'Internal server error');
	}
}
