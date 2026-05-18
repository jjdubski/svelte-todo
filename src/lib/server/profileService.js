import { connectDB } from './db.js';
import { User } from './models/User.js';

const COOKIE_NAME = 'linked_profiles';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

/** @typedef {{ authUserId: string, email?: string, name?: string, picture?: string, provider?: string, lastUsed?: string }} ProfileEntry */

/**
 * Parse the linked_profiles cookie value into an array of authUserId strings.
 * @param {string | null | undefined} cookieValue
 * @returns {string[]}
 */
function parseLinkedProfiles(cookieValue) {
	if (!cookieValue) return [];
	try {
		const parsed = JSON.parse(cookieValue);
		return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' && id) : [];
	} catch {
		return [];
	}
}

/**
 * Common cookie options for linked_profiles.
 * @param {boolean} secure
 * @returns {import('@sveltejs/kit').CookieSerializeOptions}
 */
function cookieOpts(secure) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: COOKIE_MAX_AGE
	};
}

/**
 * Read the linked_profiles cookie from a request event.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {string[]}
 */
export function getLinkedProfiles(event) {
	return parseLinkedProfiles(event.cookies.get(COOKIE_NAME));
}

/**
 * Set the linked_profiles cookie on a response.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string[]} authUserIds
 */
export function setLinkedProfiles(event, authUserIds) {
	const value = JSON.stringify(authUserIds.filter((id) => id));
	event.cookies.set(COOKIE_NAME, value, cookieOpts(process.env.NODE_ENV === 'production'));
}

/**
 * Add an authUserId to the linked_profiles cookie if not already present.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string} authUserId
 * @returns {string[]} The updated list
 */
export function addLinkedProfile(event, authUserId) {
	const ids = getLinkedProfiles(event);
	if (!ids.includes(authUserId)) {
		ids.push(authUserId);
	}
	setLinkedProfiles(event, ids);
	return ids;
}

/**
 * Remove an authUserId from the linked_profiles cookie.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string} authUserId
 * @returns {string[]} The updated list
 */
export function removeLinkedProfile(event, authUserId) {
	const ids = getLinkedProfiles(event).filter((id) => id !== authUserId);
	setLinkedProfiles(event, ids);
	return ids;
}

/**
 * Ensure a linked_profiles cookie exists for the current session user.
 * If no cookie exists, creates one with just the current user.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string} sessionAuthUserId
 * @returns {string[]} The profile list
 */
export function ensureLinkedProfilesCookie(event, sessionAuthUserId) {
	const ids = getLinkedProfiles(event);
	if (ids.length === 0) {
		setLinkedProfiles(event, [sessionAuthUserId]);
		return [sessionAuthUserId];
	}
	if (!ids.includes(sessionAuthUserId)) {
		ids.push(sessionAuthUserId);
		setLinkedProfiles(event, ids);
	}
	return ids;
}

/**
 * Fetch full profile details for all authUserIds in the linked_profiles cookie.
 * @param {string[]} authUserIds
 * @returns {Promise<ProfileEntry[]>}
 */
export async function getProfilesForIds(authUserIds) {
	if (!authUserIds.length) return [];

	await connectDB();
	const users = await User.find({ authUserId: { $in: authUserIds } })
		.select('authUserId email name picture provider')
		.lean();

	return users.map((u) => ({
		authUserId: u.authUserId,
		email: u.email || '',
		name: u.name || '',
		picture: u.picture || '',
		provider: u.provider || 'google',
		lastUsed: u.lastLoginAt?.toISOString?.() || ''
	}));
}
