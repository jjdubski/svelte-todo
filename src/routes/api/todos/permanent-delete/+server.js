import { json, error } from '@sveltejs/kit';
import { permanentDeleteTodo } from '$lib/server/todoService.js';

/**
 * POST /api/todos/permanent-delete — Permanently delete an archived todo.
 * Requires authentication.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	try {
		const session = await event.locals.auth();
		const authUserId = session?.user?.authUserId || null;
		if (!authUserId) {
			return error(401, 'Unauthorized');
		}

		const body = await event.request.json();
		const { id } = body;

		if (id === undefined || id === null) {
			return error(400, 'id is required');
		}

		await permanentDeleteTodo(authUserId, id);
		return json({ success: true });
	} catch (err) {
		if (err.message === 'Todo not found') {
			return error(404, 'Todo not found');
		}
		console.error('[api] POST /api/todos/permanent-delete failed:', err);
		return error(500, 'Internal server error');
	}
}
