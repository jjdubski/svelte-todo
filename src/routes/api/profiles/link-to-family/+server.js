import { json } from '@sveltejs/kit';
import { linkUserToFamily } from '$lib/server/profileService.js';

/**
 * POST /api/profiles/link-to-family — Link current session user to a given family.
 * Used after "Add Account" OAuth flow to retroactively link the new account
 * to the family of the account that initiated the add.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	const session = await event.locals.auth();
	if (!session?.user?.authUserId) {
		return json({ success: false, familyId: '' }, { status: 401 });
	}

	try {
		const { familyId } = await event.request.json();
		if (!familyId) {
			return json({ success: false, familyId: '' }, { status: 400 });
		}

		const result = await linkUserToFamily(session.user.authUserId, familyId);
		if (!result.success) {
			return json(result, { status: 404 });
		}

		return json(result);
	} catch {
		return json({ success: false, familyId: '' }, { status: 500 });
	}
}
