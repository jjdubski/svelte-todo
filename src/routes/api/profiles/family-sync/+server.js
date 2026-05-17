import { json } from '@sveltejs/kit';
import { resolveFamilyId } from '$lib/server/profileService.js';

/**
 * POST /api/profiles/family-sync — mirror family ID into HttpOnly cookie.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	const session = await event.locals.auth();
	if (!session?.user?.authUserId) return new Response(null, { status: 401 });

	const familyId = session.user.familyId || (await resolveFamilyId(session.user.authUserId));
	if (!familyId) return new Response(null, { status: 404 });

	// Set HttpOnly cookie so subsequent "Add Account" OAuth flows carry this cookie
	event.cookies.set('profile_family_id', familyId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 365 * 2 // 2 years
	});

	return json({ familyId });
}
