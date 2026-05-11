import { json, error } from '@sveltejs/kit';
import { updateTodo, archiveTodo } from '$lib/server/todoService.js';

/**
 * PUT /api/todos/[id] — Update a todo.
 * Requires authentication.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function PUT(event) {
	try {
		const session = await event.locals.auth();
		if (!session?.user?.authUserId) {
			return error(401, 'Unauthorized');
		}

		const todoId = Number(event.params.id);
		if (isNaN(todoId)) {
			return error(400, 'Invalid todo ID');
		}

		const body = await event.request.json();
		const updated = await updateTodo(session.user.authUserId, todoId, body);
		return json(updated);
	} catch (err) {
		if (err.message === 'Todo not found') {
			return error(404, 'Todo not found');
		}
		console.error('[api] PUT /api/todos/[id] failed:', err);
		return error(500, 'Internal server error');
	}
}

/**
 * DELETE /api/todos/[id] — Archive a todo.
 * Requires authentication.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function DELETE(event) {
	try {
		const session = await event.locals.auth();
		if (!session?.user?.authUserId) {
			return error(401, 'Unauthorized');
		}

		const todoId = Number(event.params.id);
		if (isNaN(todoId)) {
			return error(400, 'Invalid todo ID');
		}

		const archived = await archiveTodo(session.user.authUserId, todoId);
		return json(archived);
	} catch (err) {
		if (err.message === 'Todo not found') {
			return error(404, 'Todo not found');
		}
		console.error('[api] DELETE /api/todos/[id] failed:', err);
		return error(500, 'Internal server error');
	}
}
