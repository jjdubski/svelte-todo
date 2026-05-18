import { json } from '@sveltejs/kit';
import { parseString as parseSetCookie, splitCookiesString } from 'set-cookie-parser';
import { connectDB } from '$lib/server/db.js';
import { User } from '$lib/server/models/User.js';
import { getLinkedProfiles, getProfilesForIds } from '$lib/server/profileService.js';

/**
 * GET /api/profiles — list linked profiles with full details.
 * Lazily creates the linked_profiles cookie if it doesn't exist.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function GET(event) {
	const session = await event.locals.auth();
	if (!session?.user?.authUserId) return json([]);

	const linkedIds = getLinkedProfiles(event);
	if (linkedIds.length === 0) {
		// First time — seed cookie with current user
		const { ensureLinkedProfilesCookie } = await import('$lib/server/profileService.js');
		ensureLinkedProfilesCookie(event, session.user.authUserId);
		return json([await _buildCurrentProfile(session)]);
	}

	const profiles = await getProfilesForIds(linkedIds);
	return json(profiles);
}

/**
 * POST /api/profiles — switch active profile by mutating Auth.js session server-side.
 * Calls /auth/callback/account-switch from the server and forwards set-cookie headers
 * to the current response so the browser session switches without client CSRF handling.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	const session = await event.locals.auth();
	if (!session?.user?.authUserId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	let payload;
	try {
		payload = await event.request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
	}

	const targetAuthUserId = payload?.targetAuthUserId;
	const callbackUrl = payload?.callbackUrl || '/profiles';

	if (!targetAuthUserId) {
		return json({ success: false, error: 'Missing targetAuthUserId' }, { status: 400 });
	}

	const linkedIds = getLinkedProfiles(event);
	if (linkedIds.length === 0) {
		return json({ success: false, error: 'No linked profiles found' }, { status: 404 });
	}

	if (!linkedIds.includes(targetAuthUserId)) {
		return json({ success: false, error: 'Target profile not linked' }, { status: 404 });
	}

	await connectDB();
	const target = await User.findOne({ authUserId: targetAuthUserId }).select('authUserId').lean();
	if (!target) {
		return json({ success: false, error: 'Target profile not found' }, { status: 404 });
	}

	const authBody = new URLSearchParams({
		targetAuthUserId,
		callbackUrl,
		json: 'true'
	});

	const authRes = await event.fetch('/auth/callback/account-switch', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'X-Auth-Return-Redirect': '1',
			Accept: 'application/json'
		},
		body: authBody
	});

	// Forward set-cookie headers from Auth.js callback response to browser.
	const rawSetCookies =
		typeof authRes.headers.getSetCookie === 'function'
			? authRes.headers.getSetCookie()
			: splitCookiesString(authRes.headers.get('set-cookie') || '');

	for (const rawCookie of rawSetCookies) {
		const parsed = parseSetCookie(rawCookie);
		if (!parsed?.name) continue;

		event.cookies.set(parsed.name, parsed.value || '', {
			path: parsed.path || '/',
			httpOnly: parsed.httpOnly,
			sameSite: /** @type {'lax' | 'strict' | 'none' | undefined} */ (
				typeof parsed.sameSite === 'string' ? parsed.sameSite.toLowerCase() : parsed.sameSite
			),
			secure: parsed.secure,
			maxAge: parsed.maxAge,
			expires: parsed.expires
		});
	}

	let authData = null;
	try {
		authData = await authRes.json();
	} catch {
		authData = null;
	}

	if (!authRes.ok) {
		return json(
			{ success: false, error: 'Auth callback failed', status: authRes.status, authData },
			{ status: authRes.status }
		);
	}

	if (authData?.url && authData.url.includes('/auth/signin')) {
		return json(
			{
				success: false,
				error: 'Auth callback redirected to signin (session not switched)',
				status: authRes.status,
				authData
			},
			{ status: 400 }
		);
	}

	return json({ success: true, authData });
}

/**
 * Build a profile entry from the current session.
 * @param {import('@auth/sveltekit').Session} session
 * @returns {Promise<import('$lib/server/profileService.js').ProfileEntry>}
 */
async function _buildCurrentProfile(session) {
	return {
		authUserId: session.user?.authUserId || '',
		email: session.user?.email || '',
		name: session.user?.name || '',
		picture: session.user?.picture || '',
		provider: session.user?.provider || 'google',
		lastUsed: new Date().toISOString()
	};
}
