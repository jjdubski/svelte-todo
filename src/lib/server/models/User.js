import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * @typedef {Object} TodoSubtask
 * @property {string} text
 * @property {boolean} done
 */

/**
 * @typedef {Object} TodoItem
 * @property {number} id
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
		createdAt: { type: Date, default: Date.now },
		lastLoginAt: { type: Date, default: Date.now },
		nextId: { type: Number, default: 1 },
		todos: { type: [Schema.Types.Mixed], default: [] },
		archivedTodos: { type: [Schema.Types.Mixed], default: [] },
		categories: {
			type: [String],
			default: ['Work', 'Personal', 'Ideas']
		},
		categoryColors: {
			type: Map,
			of: String,
			default: {
				Work: '#3b82f6',
				Personal: '#22c55e',
				Ideas: '#a855f7'
			}
		},
		availableTags: {
			type: [String],
			default: ['urgent', 'meeting', 'home', 'shopping', 'health', 'in-progress']
		},
		tagColors: {
			type: Map,
			of: String,
			default: {
				urgent: '#ef4444',
				meeting: '#f59e0b',
				home: '#06b6d4',
				shopping: '#ec4899',
				health: '#22c55e',
				'in-progress': '#f97316'
			}
		},
		templates: {
			type: [Schema.Types.Mixed],
			default: [
				{
					name: 'None',
					title: '',
					description: '',
					dueDate: '',
					priority: 'medium',
					category: '',
					tags: []
				},
				{
					name: 'Meeting',
					title: 'Meeting with ',
					description: 'Discuss ',
					dueDate: '',
					priority: 'medium',
					category: 'Work',
					tags: ['meeting']
				},
				{
					name: 'Errand',
					title: '',
					description: 'Buy ',
					dueDate: '',
					priority: 'low',
					category: 'Personal',
					tags: ['shopping']
				},
				{
					name: 'Urgent',
					title: 'URGENT: ',
					description: '',
					dueDate: '',
					priority: 'high',
					category: 'Work',
					tags: ['urgent']
				},
				{
					name: 'Health',
					title: 'Workout: ',
					description: '',
					dueDate: '',
					priority: 'medium',
					category: 'Personal',
					tags: ['health']
				}
			]
		},
		darkMode: { type: Boolean, default: false }
	},
	{
		// Minimize version key noise
		versionKey: false
	}
);

/** @type {import('mongoose').Model} */
export const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
