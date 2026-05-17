import { connectDB } from './db.js';
import { User } from './models/User.js';
import { ProfileFamily } from './models/ProfileFamily.js';

/**
 * Resolve the effective auth user ID for API reads/writes.
 * If an active profile cookie points to a profile in the same family,
 * that profile becomes the effective identity; otherwise session identity is used.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<string | null>}
 */
export async function resolveEffectiveAuthUserId(event) {
	const session = await event.locals.auth();
	const sessionAuthUserId = session?.user?.authUserId || null;

	if (!sessionAuthUserId) {
		return null;
	}

	const activeProfileId = event.cookies.get('active_profile_id');
	if (!activeProfileId || activeProfileId === sessionAuthUserId) {
		return sessionAuthUserId;
	}

	await connectDB();
	const sessionUser = await User.findOne({ authUserId: sessionAuthUserId }).select('familyId').lean();
	if (!sessionUser?.familyId) {
		return sessionAuthUserId;
	}

	const target = await User.findOne({
		authUserId: activeProfileId,
		familyId: sessionUser.familyId
	})
		.select('_id')
		.lean();

	return target ? activeProfileId : sessionAuthUserId;
}

/**
 * Fetch all profiles in the current user's family.
 * @param {string} authUserId
 * @returns {Promise<Array<{ authUserId: string, email?: string, name?: string, picture?: string, provider?: string, lastUsed?: Date }>>}
 */
export async function getProfilesForUser(authUserId) {
	if (!authUserId) {
		return [];
	}

	await connectDB();
	const user = await User.findOne({ authUserId }).select('familyId').lean();
	if (!user?.familyId) {
		return [];
	}

	const family = await ProfileFamily.findOne({ familyId: user.familyId }).select('profiles').lean();
	return Array.isArray(family?.profiles) ? family.profiles : [];
}

/**
 * Upsert a profile entry into a profile family document.
 * @param {string} familyId
 * @param {{ authUserId: string, email?: string, name?: string, picture?: string, provider?: string }} profileData
 * @returns {Promise<void>}
 */
export async function linkProfileToFamily(familyId, profileData) {
	if (!familyId || !profileData?.authUserId) {
		return;
	}

	await connectDB();
	const now = new Date();

	const normalized = {
		authUserId: profileData.authUserId,
		email: profileData.email || '',
		name: profileData.name || '',
		picture: profileData.picture || '',
		provider: profileData.provider || 'google',
		lastUsed: now
	};

	const updateExisting = await ProfileFamily.updateOne(
		{ familyId, 'profiles.authUserId': normalized.authUserId },
		{
			$set: {
				'profiles.$.email': normalized.email,
				'profiles.$.name': normalized.name,
				'profiles.$.picture': normalized.picture,
				'profiles.$.provider': normalized.provider,
				'profiles.$.lastUsed': normalized.lastUsed
			}
		}
	);

	if (updateExisting.matchedCount > 0) {
		return;
	}

	await ProfileFamily.updateOne(
		{ familyId },
		{
			$setOnInsert: { familyId, createdAt: now },
			$addToSet: { profiles: normalized }
		},
		{ upsert: true }
	);
}

/**
 * Remove a profile entry from a family.
 * @param {string} familyId
 * @param {string} authUserId
 * @returns {Promise<void>}
 */
export async function removeProfileFromFamily(familyId, authUserId) {
	if (!familyId || !authUserId) {
		return;
	}

	await connectDB();
	await ProfileFamily.updateOne(
		{ familyId },
		{
			$pull: {
				profiles: { authUserId }
			}
		}
	);

	// Clear familyId from the removed user so they can no longer
	// switch to other profiles in this family.
	await User.updateOne({ authUserId, familyId }, { $unset: { familyId: '' } });
}

/**
 * Resolve family ID from a session user ID.
 * @param {string} sessionUserId
 * @returns {Promise<string | null>}
 */
export async function resolveFamilyId(sessionUserId) {
	if (!sessionUserId) {
		return null;
	}

	await connectDB();
	const user = await User.findOne({ authUserId: sessionUserId }).select('familyId').lean();
	return user?.familyId || null;
}

/**
 * Move the current session user into an existing family, linking their profile.
 * Used when "Add Account" OAuth flow lands a new user — we retroactively link
 * them to the family of the account that initiated the add.
 * @param {string} sessionAuthUserId — the current session user (the new account)
 * @param {string} targetFamilyId — the family to join
 * @returns {Promise<{ success: boolean, familyId: string }>}
 */
export async function linkUserToFamily(sessionAuthUserId, targetFamilyId) {
	if (!sessionAuthUserId || !targetFamilyId) {
		return { success: false, familyId: '' };
	}

	await connectDB();

	// Get the current user to update their familyId
	const user = await User.findOne({ authUserId: sessionAuthUserId }).lean();
	if (!user) {
		return { success: false, familyId: '' };
	}

	// If user is already in this family, nothing to do
	if (user.familyId === targetFamilyId) {
		return { success: true, familyId: targetFamilyId };
	}

	// Check the target family exists
	const targetFamily = await ProfileFamily.findOne({ familyId: targetFamilyId }).lean();
	if (!targetFamily) {
		return { success: false, familyId: '' };
	}

	// If the user was in a different family, remove them from it
	if (user.familyId && user.familyId !== targetFamilyId) {
		await ProfileFamily.updateOne(
			{ familyId: user.familyId },
			{ $pull: { profiles: { authUserId: sessionAuthUserId } } }
		);
	}

	// Update user's familyId
	await User.updateOne(
		{ authUserId: sessionAuthUserId },
		{ $set: { familyId: targetFamilyId } }
	);

	// Add/update profile in target family
	const now = new Date();
	await ProfileFamily.updateOne(
		{ familyId: targetFamilyId, 'profiles.authUserId': sessionAuthUserId },
		{ $set: { 'profiles.$.lastUsed': now } }
	);

	if ((await ProfileFamily.countDocuments({ familyId: targetFamilyId, 'profiles.authUserId': sessionAuthUserId })) === 0) {
		await ProfileFamily.updateOne(
			{ familyId: targetFamilyId },
			{ $addToSet: { profiles: {
				authUserId: sessionAuthUserId,
				email: user.email || '',
				name: user.name || '',
				picture: user.picture || '',
				provider: user.provider || 'google',
				lastUsed: now
			}}}
		);
	}

	return { success: true, familyId: targetFamilyId };
}
