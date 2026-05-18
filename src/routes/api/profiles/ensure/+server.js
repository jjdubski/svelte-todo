import { json } from '@sveltejs/kit';
import { ensureLinkedProfilesCookie } from '$lib/server/profileService.js';

/**
 * POST /api/profiles/ensure — ensure linked_profiles cookie exists.
 * Creates one seeded with the current session user if none exists.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	const session = await event.locals.auth();
	if (!session?.user?.authUserId) {
		console.error('[api/profiles/ensure] unauthorized: missing session authUserId');
		return new Response(null, { status: 401 });
	}

	const ids = ensureLinkedProfilesCookie(event, session.user.authUserId);
	return json({ linkedAuthUserIds: ids });
}
