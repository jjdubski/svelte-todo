/// <reference types="@auth/sveltekit" />

import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';
import Apple from '@auth/core/providers/apple';
import { upsertUser } from './todoService.js';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET } from '$env/static/private';
import { env } from '$env/dynamic/private';

const APPLE_CLIENT_ID = env.APPLE_CLIENT_ID;
const APPLE_TEAM_ID = env.APPLE_TEAM_ID;
const APPLE_KEY_ID = env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY = env.APPLE_PRIVATE_KEY;

/**
 * @typedef {import('@auth/core/types').Session & { user: { authUserId?: string, provider?: string } }} AuthSession
 * @typedef {import('@auth/core/types').JWT & { authUserId?: string, provider?: string }} AuthJWT
 */

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
		 * @param {{ token: AuthJWT, account: import('@auth/core/types').Account | null, profile?: import('@auth/core/types').Profile }} params
		 * @returns {Promise<AuthJWT>}
		 */
		async jwt({ token, account }) {
			if (account) {
				token.authUserId = account.providerAccountId;
				token.provider = account.provider;
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
