import mongoose from 'mongoose';

const { Schema } = mongoose;

const profileFamilySchema = new Schema(
	{
		familyId: { type: String, required: true, unique: true, index: true },
		profiles: [
			{
				authUserId: { type: String, required: true },
				email: String,
				name: String,
				picture: String,
				provider: String,
				lastUsed: { type: Date, default: Date.now }
			}
		],
		createdAt: { type: Date, default: Date.now }
	},
	{ versionKey: false }
);

export const ProfileFamily =
	mongoose.models.ProfileFamily || mongoose.model('ProfileFamily', profileFamilySchema);

export default ProfileFamily;
