/// <reference types="@auth/sveltekit" />

import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';
import Apple from '@auth/core/providers/apple';
import Credentials from '@auth/core/providers/credentials';
import { upsertUser } from './todoService.js';
import { connectDB } from './db.js';
import { User } from './models/User.js';
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
 * Profile linking is managed via the `linked_profiles` HttpOnly cookie.
 */
export const { handle } = SvelteKitAuth({
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
			: []),
		Credentials({
			id: 'account-switch',
			name: 'Account Switcher',
			credentials: {
				targetAuthUserId: { label: 'Target User ID', type: 'text' }
			},
			/**
			 * Authorize a profile switch. The calling endpoint (POST /api/profiles)
			 * already verified the target is in the linked_profiles cookie — we just
			 * resolve the user and return their profile to mint a new session.
			 * @param {Record<string, string> | undefined} credentials
			 * @returns {Promise<import('@auth/core/types').User | null>}
			 */
			async authorize(credentials) {
				if (!credentials?.targetAuthUserId) {
					console.error('[auth] account-switch authorize missing targetAuthUserId');
					return null;
				}

				await connectDB();
				const user = await User.findOne({ authUserId: credentials.targetAuthUserId })
					.select('authUserId name email picture provider')
					.lean();

				if (!user) {
					console.error('[auth] account-switch authorize user not found', {
						targetAuthUserId: credentials.targetAuthUserId
					});
					return null;
				}

				return {
					id: user.authUserId,
					authUserId: user.authUserId,
					name: user.name || '',
					email: user.email || '',
					image: user.picture || '',
					provider: user.provider || 'google'
				};
			}
		})
	],
	secret: AUTH_SECRET,
	trustHost: true,
	callbacks: {
		/**
		 * JWT callback — attach authUserId and provider to the token.
		 * @param {{ token: AuthJWT, account: import('@auth/core/types').Account | null, profile?: import('@auth/core/types').Profile, user?: import('@auth/core/types').User & { authUserId?: string, provider?: string }, request?: Request }} params
		 * @returns {Promise<AuthJWT>}
		 */
		async jwt({ token, account, user }) {
			if (account) {
				// OAuth provider sign-in (Google, Apple)
				token.authUserId = account.providerAccountId;
				token.provider = account.provider;
			} else if (user) {
				// Credentials provider (account-switch).
				const switchedAuthUserId = user.authUserId || user.id;
				if (switchedAuthUserId) {
					token.authUserId = switchedAuthUserId;
					token.provider = user.provider || 'google';
				} else {
					console.error('[auth] account-switch jwt missing switchedAuthUserId on user payload', { user });
				}
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
					if (msg.includes('MongoDB') || msg.includes('connect')) {
						console.error('[auth] Full error:', err);
					}
				}
			}
			return session;
		}
	}
});
