import { connectDB } from './db.js';
import { User } from './models/User.js';

/**
 * Get a user document by authUserId. Throws if not found.
 * @param {string} authUserId
 * @returns {Promise<import('mongoose').Document>}
 */
async function _getUser(authUserId) {
	await connectDB();
	const user = await User.findOne({ authUserId });
	if (!user) {
		throw new Error('User not found');
	}
	return user;
}

/**
 * Get or create a user document, return full user data as a plain object.
 * Updates lastLoginAt on each call.
 * @param {string} authUserId
 * @returns {Promise<Record<string, any>>}
 */
export async function getUserData(authUserId) {
	await connectDB();
	let user = await User.findOne({ authUserId });
	if (!user) {
		user = await User.create({ authUserId });
	}
	user.lastLoginAt = new Date();
	await user.save();
	return user.toObject();
}

/**
 * Update or create user on first login (from Auth.js callback).
 * Used by the Auth.js session callback to sync profile data.
 * @param {string} authUserId
 * @param {Object} profile
 * @param {string} [profile.email]
 * @param {string} [profile.name]
 * @param {string} [profile.picture]
 * @param {string} [profile.provider]
 * @returns {Promise<Record<string, any>>}
 */
export async function upsertUser(authUserId, profile) {
	await connectDB();
	const update = {
		lastLoginAt: new Date(),
		...(profile.email && { email: profile.email }),
		...(profile.name && { name: profile.name }),
		...(profile.picture && { picture: profile.picture }),
		...(profile.provider && { provider: profile.provider })
	};
	const user = await User.findOneAndUpdate(
		{ authUserId },
		{ $set: update, $setOnInsert: { createdAt: new Date() } },
		{ upsert: true, returnDocument: 'after' }
	);
	return user.toObject();
}

/**
 * Get all todos and user settings for a given user.
 * @param {string} authUserId
 * @returns {Promise<{ todos: Array, archivedTodos: Array, nextId: number, categories: string[], categoryColors: Record<string,string>, availableTags: string[], tagColors: Record<string,string>, templates: Array, darkMode: boolean }>}
 */
export async function getTodos(authUserId) {
	const user = await _getUser(authUserId);
	return {
		todos: user.todos || [],
		archivedTodos: user.archivedTodos || [],
		nextId: user.nextId,
		categories: user.categories,
		categoryColors: Object.fromEntries(user.categoryColors || new Map()),
		availableTags: user.availableTags,
		tagColors: Object.fromEntries(user.tagColors || new Map()),
		templates: user.templates,
		darkMode: user.darkMode
	};
}

/**
 * Create a new todo for the user.
 * @param {string} authUserId
 * @param {Object} todoData - The todo fields (title, description, etc.)
 * @returns {Promise<Object>} The created todo
 */
export async function createTodo(authUserId, todoData) {
	const user = await _getUser(authUserId);
	const todo = {
		id: user.nextId,
		...todoData,
		completed: false,
		createdAt: new Date().toISOString()
	};
	user.todos.push(todo);
	user.nextId += 1;
	await user.save();
	return todo;
}

/**
 * Update an existing todo by ID.
 * @param {string} authUserId
 * @param {number} todoId
 * @param {Object} updates - Fields to update on the todo
 * @returns {Promise<Object>} The updated todo
 */
export async function updateTodo(authUserId, todoId, updates) {
	const user = await _getUser(authUserId);
	const idx = user.todos.findIndex((/** @type {any} */ t) => t.id === todoId);
	if (idx === -1) throw new Error('Todo not found');
	Object.assign(user.todos[idx], updates);
	await user.save();
	return user.todos[idx];
}

/**
 * Archive (soft-delete) a todo by moving it from todos to archivedTodos.
 * @param {string} authUserId
 * @param {number} todoId
 * @returns {Promise<Object>} The archived todo
 */
export async function archiveTodo(authUserId, todoId) {
	const user = await _getUser(authUserId);
	const idx = user.todos.findIndex((/** @type {any} */ t) => t.id === todoId);
	if (idx === -1) throw new Error('Todo not found');
	const [todo] = user.todos.splice(idx, 1);
	user.archivedTodos.push(todo);
	await user.save();
	return todo;
}

/**
 * Restore a todo from archivedTodos back to todos.
 * @param {string} authUserId
 * @param {number} todoId
 * @returns {Promise<Object>} The restored todo
 */
export async function restoreTodo(authUserId, todoId) {
	const user = await _getUser(authUserId);
	const idx = user.archivedTodos.findIndex((/** @type {any} */ t) => t.id === todoId);
	if (idx === -1) throw new Error('Todo not found');
	const [todo] = user.archivedTodos.splice(idx, 1);
	user.todos.push(todo);
	await user.save();
	return todo;
}

/**
 * Permanently delete a todo from archivedTodos.
 * @param {string} authUserId
 * @param {number} todoId
 * @returns {Promise<void>}
 */
export async function permanentDeleteTodo(authUserId, todoId) {
	const user = await _getUser(authUserId);
	const idx = user.archivedTodos.findIndex((/** @type {any} */ t) => t.id === todoId);
	if (idx === -1) throw new Error('Todo not found');
	user.archivedTodos.splice(idx, 1);
	await user.save();
}

/**
 * Batch archive multiple todos.
 * @param {string} authUserId
 * @param {number[]} todoIds
 * @returns {Promise<Object[]>} The archived todos
 */
export async function batchArchive(authUserId, todoIds) {
	const user = await _getUser(authUserId);
	const archived = [];
	user.todos = user.todos.filter((/** @type {any} */ t) => {
		if (todoIds.includes(t.id)) {
			archived.push(t);
			return false;
		}
		return true;
	});
	user.archivedTodos.push(...archived);
	await user.save();
	return archived;
}

/**
 * Batch restore multiple todos from archived to active.
 * @param {string} authUserId
 * @param {number[]} todoIds
 * @returns {Promise<Object[]>} The restored todos
 */
export async function batchRestore(authUserId, todoIds) {
	const user = await _getUser(authUserId);
	const restored = [];
	user.archivedTodos = user.archivedTodos.filter((/** @type {any} */ t) => {
		if (todoIds.includes(t.id)) {
			restored.push(t);
			return false;
		}
		return true;
	});
	user.todos.push(...restored);
	await user.save();
	return restored;
}

/**
 * Migrate guest localStorage data into the user's MongoDB document.
 * Merges todos, archivedTodos, categories, tags, and settings.
 * @param {string} authUserId
 * @param {Object} guestData - The guest data object from localStorage
 * @returns {Promise<Record<string, any>>} The updated user document as a plain object
 */
export async function migrateGuestData(authUserId, guestData) {
	const user = await _getUser(authUserId);

	// Merge todos
	if (Array.isArray(guestData.todos)) {
		user.todos.push(...guestData.todos);
	}

	// Merge archivedTodos
	if (Array.isArray(guestData.archivedTodos)) {
		user.archivedTodos.push(...guestData.archivedTodos);
	}

	// Merge categories (dedup)
	if (Array.isArray(guestData.categories)) {
		const existingCategories = new Set(user.categories);
		for (const cat of guestData.categories) {
			if (!existingCategories.has(cat)) {
				user.categories.push(cat);
				existingCategories.add(cat);
			}
		}
	}

	// Merge category colors
	if (guestData.categoryColors && typeof guestData.categoryColors === 'object') {
		for (const [key, value] of Object.entries(guestData.categoryColors)) {
			user.categoryColors.set(key, value);
		}
	}

	// Merge tags (dedup)
	if (Array.isArray(guestData.availableTags)) {
		const existingTags = new Set(user.availableTags);
		for (const tag of guestData.availableTags) {
			if (!existingTags.has(tag)) {
				user.availableTags.push(tag);
				existingTags.add(tag);
			}
		}
	}

	// Merge tag colors
	if (guestData.tagColors && typeof guestData.tagColors === 'object') {
		for (const [key, value] of Object.entries(guestData.tagColors)) {
			user.tagColors.set(key, value);
		}
	}

	// Merge templates (replace with guest templates if provided)
	if (Array.isArray(guestData.templates)) {
		user.templates = guestData.templates;
	}

	// Update nextId if guest data has higher IDs
	const maxGuestId = Math.max(
		0,
		...(Array.isArray(guestData.todos)
			? guestData.todos.map((/** @type {any} */ t) => t.id || 0)
			: []),
		...(Array.isArray(guestData.archivedTodos)
			? guestData.archivedTodos.map((/** @type {any} */ t) => t.id || 0)
			: [])
	);
	if (maxGuestId >= user.nextId) {
		user.nextId = maxGuestId + 1;
	}

	await user.save();
	return user.toObject();
}
