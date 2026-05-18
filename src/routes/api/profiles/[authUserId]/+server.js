import { json } from '@sveltejs/kit';
import { getLinkedProfiles, setLinkedProfiles } from '$lib/server/profileService.js';

/**
 * DELETE /api/profiles/[authUserId] — remove a profile from linked_profiles.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function DELETE(event) {
	const session = await event.locals.auth();
	if (!session?.user?.authUserId) return new Response(null, { status: 401 });

	const targetAuthUserId = event.params.authUserId;
	if (!targetAuthUserId) return new Response(null, { status: 400 });

	// Prevent removing yourself
	if (targetAuthUserId === session.user.authUserId) return new Response(null, { status: 400 });

	const ids = getLinkedProfiles(event);
	const updated = ids.filter((id) => id !== targetAuthUserId);

	if (updated.length === ids.length) {
		return json({ success: false, error: 'Profile not found in linked list' }, { status: 404 });
	}

	setLinkedProfiles(event, updated);
	return json({ success: true });
}
