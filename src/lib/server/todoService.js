import { randomUUID } from 'node:crypto';
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
 * Deep-merge settings while skipping null/undefined values.
 * Arrays are replaced wholesale.
 * @param {Record<string, any>} base
 * @param {Record<string, any>} incoming
 * @returns {Record<string, any>}
 */
function _mergeSettings(base, incoming) {
	const result = { ...(base || {}) };

	for (const [key, value] of Object.entries(incoming || {})) {
		if (value === null || value === undefined) continue;
		if (Array.isArray(value)) {
			result[key] = value;
			continue;
		}
		if (typeof value === 'object') {
			const current =
				result[key] && typeof result[key] === 'object' && !Array.isArray(result[key]) ? result[key] : {};
			result[key] = _mergeSettings(current, value);
			continue;
		}
		result[key] = value;
	}

	return result;
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
 * @returns {Promise<{ todos: Array, archivedTodos: Array, customTags: string[], tagColors: Record<string,string>, darkMode: boolean, settings: Record<string, any> }>}
 */
export async function getTodos(authUserId) {
	const user = await _getUser(authUserId);

	// Deduplicate todos by ID to clean up any existing corrupt data
	const seen = new Set();
	const dedupedTodos = (user.todos || []).filter((t) => {
		if (seen.has(t.id)) return false;
		seen.add(t.id);
		return true;
	});
	if (dedupedTodos.length !== (user.todos || []).length) {
		user.todos = dedupedTodos;
		await user.save();
	}

	const archivedSeen = new Set();
	const dedupedArchived = (user.archivedTodos || []).filter((t) => {
		if (archivedSeen.has(t.id)) return false;
		archivedSeen.add(t.id);
		return true;
	});
	if (dedupedArchived.length !== (user.archivedTodos || []).length) {
		user.archivedTodos = dedupedArchived;
		await user.save();
	}

	return {
		todos: dedupedTodos,
		archivedTodos: dedupedArchived,
		customTags: user.customTags || [],
		tagColors: Object.fromEntries(user.tagColors || new Map()),
		darkMode: user.darkMode,
		settings: user.settings || {}
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

	// Prevent duplicate IDs — if a todo with this ID already exists, return it
	if (todoData.id) {
		const existing = user.todos.find((t) => t.id === todoData.id);
		if (existing) {
			return existing;
		}
	}

	const todo = {
		...todoData,
		id: todoData.id || randomUUID(),
		completed: false,
		createdAt: new Date().toISOString()
	};
	user.todos.push(todo);
	await user.save();
	return todo;
}

/**
 * Update an existing todo by ID.
 * @param {string} authUserId
 * @param {string} todoId
 * @param {Object} updates - Fields to update on the todo
 * @returns {Promise<Object>} The updated todo
 */
export async function updateTodo(authUserId, todoId, updates) {
	const user = await _getUser(authUserId);
	const idx = user.todos.findIndex((/** @type {any} */ t) => t.id === todoId);
	if (idx === -1) throw new Error('Todo not found');
	Object.assign(user.todos[idx], updates);
	user.markModified('todos');
	await user.save();
	return user.todos[idx];
}

/**
 * Archive (soft-delete) a todo by moving it from todos to archivedTodos.
 * @param {string} authUserId
 * @param {string} todoId
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
 * @param {string} todoId
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
 * @param {string} todoId
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
 * @param {string[]} todoIds
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
 * Batch restore multiple archived todos from archived to active.
 * @param {string} authUserId
 * @param {string[]} todoIds
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
 * Update the dark mode preference for a user.
 * @param {string} authUserId
 * @param {boolean} darkMode
 * @returns {Promise<Record<string, any>>}
 */
export async function updateDarkMode(authUserId, darkMode) {
	const user = await _getUser(authUserId);
	user.darkMode = darkMode;
	await user.save();
	return user.toObject();
}

/**
 * Merge settings payload into user's stored settings.
 * @param {string} authUserId
 * @param {Record<string, any>} settings
 * @returns {Promise<Record<string, any>>}
 */
export async function updateSettings(authUserId, settings) {
	const user = await _getUser(authUserId);
	const current = user.settings && typeof user.settings === 'object' ? user.settings : {};
	user.settings = _mergeSettings(current, settings);
	await user.save();
	return user.toObject();
}

/**
 * Get settings object for a user.
 * @param {string} authUserId
 * @returns {Promise<Record<string, any>>}
 */
export async function getSettings(authUserId) {
	const user = await _getUser(authUserId);
	return user.settings && typeof user.settings === 'object' ? user.settings : {};
}

/**
 * Bulk-import data (todos, archivedTodos, customTags, tagColors) into the user's document.
 * Existing items are updated by matching ID; new items are appended.
 * @param {string} authUserId
 * @param {{ todos?: Array, archivedTodos?: Array, customTags?: string[], tagColors?: Record<string,string>, settings?: Record<string, any> }} data
 * @returns {Promise<Record<string, any>>} The updated user document as a plain object
 */
export async function importData(authUserId, data) {
	const user = await _getUser(authUserId);

	if (Array.isArray(data.todos)) {
		for (const todo of data.todos) {
			if (!todo || !todo.id || !todo.title) continue;
			const existing = user.todos.find((t) => t.id === todo.id);
			if (existing) {
				Object.assign(existing, todo);
			} else {
				user.todos.push({ ...todo });
			}
		}
		user.markModified('todos');
	}

	if (Array.isArray(data.archivedTodos)) {
		for (const todo of data.archivedTodos) {
			if (!todo || !todo.id || !todo.title) continue;
			const existing = user.archivedTodos.find((t) => t.id === todo.id);
			if (existing) {
				Object.assign(existing, todo);
			} else {
				user.archivedTodos.push({ ...todo });
			}
		}
		user.markModified('archivedTodos');
	}

	if (Array.isArray(data.customTags)) {
		const existing = new Set(user.customTags);
		for (const tag of data.customTags) {
			if (!existing.has(tag)) {
				user.customTags.push(tag);
				existing.add(tag);
			}
		}
	}

	if (data.tagColors && typeof data.tagColors === 'object') {
		for (const [key, value] of Object.entries(data.tagColors)) {
			user.tagColors.set(key, value);
		}
	}

	if (data.settings && typeof data.settings === 'object') {
		const current = user.settings && typeof user.settings === 'object' ? user.settings : {};
		user.settings = _mergeSettings(current, data.settings);
	}

	await user.save();
	return user.toObject();
}

/**
 * Migrate guest localStorage data into the user's MongoDB document.
 * Merges todos, archivedTodos, customTags, and tag colors.
 * @param {string} authUserId
 * @param {Object} guestData - The guest data object from localStorage
 * @returns {Promise<Record<string, any>>} The updated user document as a plain object
 */
export async function migrateGuestData(authUserId, guestData) {
	const user = await _getUser(authUserId);
	const usedIds = new Set([
		...(Array.isArray(user.todos) ? user.todos.map((t) => t.id) : []),
		...(Array.isArray(user.archivedTodos) ? user.archivedTodos.map((t) => t.id) : [])
	]);

	/**
	 * Assign a unique ID for migrated todos.
	 * Preserves incoming ID when possible; remaps collisions with a UUID.
	 * @param {string} incomingId
	 * @returns {string}
	 */
	const assignUniqueId = (incomingId) => {
		const id = incomingId;

		if (!usedIds.has(id)) {
			usedIds.add(id);
			return id;
		}

		// Collision: generate a new UUID
		let newId;
		do {
			newId = randomUUID();
		} while (usedIds.has(newId));
		usedIds.add(newId);
		return newId;
	};

	/**
	 * @param {any[]} source
	 * @param {any[]} target
	 */
	const mergeTodos = (source, target) => {
		for (const todo of source) {
			if (!todo || typeof todo !== 'object') continue;
			target.push({ ...todo, id: assignUniqueId(todo.id) });
		}
	};

	// Merge todos
	if (Array.isArray(guestData.todos)) {
		mergeTodos(guestData.todos, user.todos);
	}

	// Merge archivedTodos
	if (Array.isArray(guestData.archivedTodos)) {
		mergeTodos(guestData.archivedTodos, user.archivedTodos);
	}

	// Merge custom tags (dedup)
	if (Array.isArray(guestData.customTags)) {
		const existing = new Set(user.customTags);
		for (const tag of guestData.customTags) {
			if (!existing.has(tag)) {
				user.customTags.push(tag);
				existing.add(tag);
			}
		}
	}

	// Merge tag colors (only for custom tags)
	if (guestData.tagColors && typeof guestData.tagColors === 'object') {
		for (const [key, value] of Object.entries(guestData.tagColors)) {
			user.tagColors.set(key, value);
		}
	}

	// Persist dark mode preference from guest data
	if (typeof guestData.darkMode === 'boolean') {
		user.darkMode = guestData.darkMode;
	}

	if (guestData.settings && typeof guestData.settings === 'object') {
		const current = user.settings && typeof user.settings === 'object' ? user.settings : {};
		user.settings = _mergeSettings(current, guestData.settings);
	}

	await user.save();
	return user.toObject();
}
