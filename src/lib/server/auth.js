/// <reference types="@auth/sveltekit" />

import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';
import Apple from '@auth/core/providers/apple';
import { upsertUser } from './todoService.js';
import { connectDB } from './db.js';
import { User } from './models/User.js';
import { linkProfileToFamily } from './profileService.js';
import { randomUUID } from 'node:crypto';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET } from '$env/static/private';
import { env } from '$env/dynamic/private';

const APPLE_CLIENT_ID = env.APPLE_CLIENT_ID;
const APPLE_TEAM_ID = env.APPLE_TEAM_ID;
const APPLE_KEY_ID = env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY = env.APPLE_PRIVATE_KEY;

/**
 * @typedef {import('@auth/core/types').Session & { user: { authUserId?: string, provider?: string, familyId?: string } }} AuthSession
 * @typedef {import('@auth/core/types').JWT & { authUserId?: string, provider?: string, familyId?: string }} AuthJWT
 */

/**
 * Parse a cookie value by name from a cookie header string.
 * @param {string | null} cookieHeader
 * @param {string} name
 * @returns {string | null}
 */
function parseCookie(cookieHeader, name) {
	if (!cookieHeader) return null;
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Auth.js configuration for SvelteKit.
 * Provides Google and Apple OAuth providers with JWT session strategy.
 * The upsertUser callback creates/updates the MongoDB user document on sign-in.
 */
export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Google({
			clientId: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET
		}),
		...(APPLE_CLIENT_ID
			? [
					Apple({
						clientId: APPLE_CLIENT_ID,
						teamId: APPLE_TEAM_ID,
						keyId: APPLE_KEY_ID,
						privateKey: APPLE_PRIVATE_KEY
					})
				]
			: [])
	],
	secret: AUTH_SECRET,
	trustHost: true,
	callbacks: {
		/**
		 * JWT callback — attach authUserId and provider to the token.
		 * @param {{ token: AuthJWT, account: import('@auth/core/types').Account | null, profile?: import('@auth/core/types').Profile, request?: Request }} params
		 * @returns {Promise<AuthJWT>}
		 */
		async jwt({ token, account, profile, request }) {
			if (account) {
				await connectDB();

				token.authUserId = account.providerAccountId;
				token.provider = account.provider;

				// Determine familyId: check cookie first, then existing user, then generate
				let familyId = request
					? parseCookie(request.headers.get('cookie') || '', 'profile_family_id')
					: null;

				if (!familyId) {
					const existingUser = await User.findOne({ authUserId: token.authUserId }).select('familyId').lean();
					familyId = existingUser?.familyId;
				}

				if (!familyId) {
					familyId = randomUUID();
				}

				token.familyId = familyId;

				// Save familyId + tokens to User document
				await User.updateOne(
					{ authUserId: token.authUserId },
					{
						$set: {
							familyId,
							accessToken: account.access_token,
							refreshToken: account.refresh_token
						}
					},
					{ upsert: true }
				);

				// Link/add to ProfileFamily
				await linkProfileToFamily(familyId, {
					authUserId: token.authUserId,
					email: profile?.email || '',
					name: profile?.name || '',
					picture: profile?.picture || '',
					provider: account.provider || 'google'
				});
			}
			return token;
		},

		/**
		 * Session callback — attach authUserId and provider to the session user.
		 * Also upserts the user document in MongoDB on sign-in.
		 * @param {{ session: AuthSession, token: AuthJWT }} params
		 * @returns {Promise<AuthSession>}
		 */
		async session({ session, token }) {
			if (session.user && token.authUserId) {
				session.user.authUserId = token.authUserId;
				session.user.provider = token.provider;
				session.user.familyId = token.familyId;

				// Upsert user document in MongoDB (create on first login, update on subsequent)
				try {
					await upsertUser(token.authUserId, {
						email: session.user.email,
						name: session.user.name,
						picture: session.user.picture,
						provider: token.provider
					});
				} catch (err) {
					const msg = /** @type {Error} */ (err).message || '';
					console.error('[auth] Failed to upsert user:', msg);
					// If this is a MongoDB connection issue, log the full error for debugging.
					if (msg.includes('MongoDB') || msg.includes('connect')) {
						console.error('[auth] Full error:', err);
					}
				}
			}
			return session;
		}
	}
});
