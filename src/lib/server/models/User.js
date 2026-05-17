import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * @typedef {Object} TodoSubtask
 * @property {string} text
 * @property {boolean} done
 */

/**
 * @typedef {Object} TodoItem
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {string} [dueDate]
 * @property {string} [priority]
 * @property {string} [category]
 * @property {string[]} [tags]
 * @property {string} [recurring]
 * @property {TodoSubtask[]} [subtasks]
 * @property {boolean} completed
 * @property {string} [completedAt]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Template
 * @property {string} name
 * @property {string} title
 * @property {string} [description]
 * @property {string} [dueDate]
 * @property {string} [priority]
 * @property {string} [category]
 * @property {string[]} [tags]
 */

/**
 * Mongoose schema for a user document.
 * Stores auth data and embedded todos for single-query reads.
 */
const userSchema = new Schema(
	{
		authUserId: {
			type: String,
			required: true,
			unique: true,
			index: true
		},
		email: { type: String },
		name: { type: String },
		picture: { type: String },
		provider: { type: String },
		familyId: { type: String, index: true },
		accessToken: { type: String },
		refreshToken: { type: String },
		createdAt: { type: Date, default: Date.now },
		lastLoginAt: { type: Date, default: Date.now },
		todos: { type: [Schema.Types.Mixed], default: [] },
		archivedTodos: { type: [Schema.Types.Mixed], default: [] },
		customTags: {
			type: [String],
			default: []
		},
		tagColors: {
			type: Map,
			of: String,
			default: {}
		},
		darkMode: { type: Boolean, default: false },
		settings: { type: Schema.Types.Mixed, default: {} }
	},
	{
		// Minimize version key noise
		versionKey: false
	}
);

/** @type {import('mongoose').Model} */
export const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
