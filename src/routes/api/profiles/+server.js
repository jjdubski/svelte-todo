import { json } from '@sveltejs/kit';
import { getProfilesForUser } from '$lib/server/profileService.js';

/**
 * GET /api/profiles — list profiles in current family.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function GET(event) {
	const session = await event.locals.auth();
	if (!session?.user?.authUserId) return json([]);
	const profiles = await getProfilesForUser(session.user.authUserId);
	return json(profiles);
}

/**
 * POST /api/profiles — switch active profile via cookie.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	const session = await event.locals.auth();
	if (!session?.user?.authUserId) return new Response(null, { status: 401 });

	const { targetAuthUserId } = await event.request.json();

	if (!targetAuthUserId) {
		// Clear active profile → use default
		event.cookies.delete('active_profile_id', { path: '/' });
		return json({ targetAuthUserId: null });
	}

	// Verify target is in same family
	const profiles = await getProfilesForUser(session.user.authUserId);
	const target = profiles.find((p) => p.authUserId === targetAuthUserId);
	if (!target) return new Response(null, { status: 404 });

	// Set active_profile_id cookie
	event.cookies.set('active_profile_id', targetAuthUserId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});

	return json({ targetAuthUserId, profile: target });
}
