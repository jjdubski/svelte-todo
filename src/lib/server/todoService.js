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
 * @returns {Promise<{ todos: Array, archivedTodos: Array, nextId: number, customTags: string[], tagColors: Record<string,string>, darkMode: boolean }>}
 */
export async function getTodos(authUserId) {
	const user = await _getUser(authUserId);
	return {
		todos: user.todos || [],
		archivedTodos: user.archivedTodos || [],
		nextId: user.nextId,
		customTags: user.customTags || [],
		tagColors: Object.fromEntries(user.tagColors || new Map()),
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
	 * Assign a unique positive numeric ID for migrated todos.
	 * Preserves incoming ID when possible; remaps collisions.
	 * @param {any} incomingId
	 * @returns {number}
	 */
	const assignUniqueId = (incomingId) => {
		const parsed =
			typeof incomingId === 'number' && Number.isInteger(incomingId) && incomingId > 0
				? incomingId
				: null;

		if (parsed !== null && !usedIds.has(parsed)) {
			usedIds.add(parsed);
			if (parsed >= user.nextId) {
				user.nextId = parsed + 1;
			}
			return parsed;
		}

		let id = user.nextId;
		while (usedIds.has(id)) {
			id += 1;
		}
		usedIds.add(id);
		user.nextId = id + 1;
		return id;
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

	await user.save();
	return user.toObject();
}
