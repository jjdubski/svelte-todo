import { json } from '@sveltejs/kit';
import { resolveFamilyId, removeProfileFromFamily } from '$lib/server/profileService.js';

/**
 * DELETE /api/profiles/[authUserId] — remove a profile from family.
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

	const familyId = await resolveFamilyId(session.user.authUserId);
	if (!familyId) return new Response(null, { status: 404 });

	await removeProfileFromFamily(familyId, targetAuthUserId);
	return json({ success: true });
}
