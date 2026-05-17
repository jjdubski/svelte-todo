import { json, error } from '@sveltejs/kit';
import { upsertUser, migrateGuestData } from '$lib/server/todoService.js';
import { resolveEffectiveAuthUserId } from '$lib/server/profileService.js';

/**
 * POST /api/todos/migrate — Import guest localStorage data into the user's account.
 * Requires authentication. Called after a guest user signs in.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	try {
		const authUserId = await resolveEffectiveAuthUserId(event);
		if (!authUserId) {
			return error(401, 'Unauthorized');
		}

		const session = await event.locals.auth();

		const guestData = await event.request.json();

		if (!guestData || typeof guestData !== 'object') {
			return error(400, 'Invalid guest data');
		}

		// First ensure the user exists (upsert), then migrate data
		const upsertProfile =
			session?.user?.authUserId === authUserId
				? {
						email: session.user.email,
						name: session.user.name,
						picture: session.user.picture,
						provider: session.user.provider
					}
				: {};

		await upsertUser(authUserId, {
			...upsertProfile
		});

		const userData = await migrateGuestData(authUserId, guestData);
		return json(userData);
	} catch (err) {
		console.error('[api] POST /api/todos/migrate failed:', err);
		return error(500, 'Internal server error');
	}
}
