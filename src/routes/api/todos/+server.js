import { json, error } from '@sveltejs/kit';
import { getTodos, createTodo } from '$lib/server/todoService.js';
import { resolveEffectiveAuthUserId } from '$lib/server/profileService.js';

/**
 * GET /api/todos — Fetch all user data (todos, archived, settings).
 * Requires authentication.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function GET(event) {
	try {
		const authUserId = await resolveEffectiveAuthUserId(event);
		if (!authUserId) {
			return error(401, 'Unauthorized');
		}

		const data = await getTodos(authUserId);
		return json(data);
	} catch (err) {
		console.error('[api] GET /api/todos failed:', err);
		return error(500, 'Internal server error');
	}
}

/**
 * POST /api/todos — Create a new todo.
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
		const todo = await createTodo(authUserId, body);
		return json(todo, { status: 201 });
	} catch (err) {
		console.error('[api] POST /api/todos failed:', err);
		return error(500, 'Internal server error');
	}
}
