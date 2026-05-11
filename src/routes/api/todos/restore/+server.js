import { json, error } from '@sveltejs/kit';
import { batchRestore } from '$lib/server/todoService.js';

/**
 * POST /api/todos/restore — Batch restore archived todos.
 * Requires authentication.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	try {
		const session = await event.locals.auth();
		if (!session?.user?.authUserId) {
			return error(401, 'Unauthorized');
		}

		const body = await event.request.json();
		const { ids } = body;

		if (!Array.isArray(ids) || ids.length === 0) {
			return error(400, 'ids must be a non-empty array');
		}

		const restored = await batchRestore(session.user.authUserId, ids);
		return json({ restored });
	} catch (err) {
		console.error('[api] POST /api/todos/restore failed:', err);
		return error(500, 'Internal server error');
	}
}
