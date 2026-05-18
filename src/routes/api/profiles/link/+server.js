import { json } from '@sveltejs/kit';
import { addLinkedProfile } from '$lib/server/profileService.js';

/**
 * POST /api/profiles/link — Add the current session user to linked_profiles.
 * Used after "Add Account" OAuth flow to link the new account with existing profiles.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	const session = await event.locals.auth();
	if (!session?.user?.authUserId) {
		console.error('[api/profiles/link] unauthorized: missing session authUserId');
		return json({ success: false }, { status: 401 });
	}

	const ids = addLinkedProfile(event, session.user.authUserId);
	return json({ success: true, linkedAuthUserIds: ids });
}
