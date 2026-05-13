import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks using vi.hoisted so vi.mock factory can reference them ──

const { mockFindOne, mockFindOneAndUpdate, mockCreate } = vi.hoisted(() => ({
	mockFindOne: vi.fn(),
	mockFindOneAndUpdate: vi.fn(),
	mockCreate: vi.fn()
}));

// Mock the db module so connectDB is a no-op
vi.mock('../server/db.js', () => ({
	connectDB: vi.fn().mockResolvedValue({})
}));

// Mock User model using hoisted mock functions
vi.mock('../server/models/User.js', () => ({
	User: {
		findOne: mockFindOne,
		findOneAndUpdate: mockFindOneAndUpdate,
		create: mockCreate
	}
}));

// Import after mocks are set up
import {
	getUserData,
	upsertUser,
	getTodos,
	createTodo,
	updateTodo,
	archiveTodo,
	restoreTodo,
	permanentDeleteTodo,
	batchArchive,
	batchRestore,
	migrateGuestData,
	importData
} from '../server/todoService.js';

/**
 * Build a mock User document factory.
 */
function createMockUser(overrides = {}) {
	const user = {
		authUserId: 'test-user-id',
		email: 'test@example.com',
		name: 'Test User',
		todos: [],
		archivedTodos: [],
		customTags: [],
		tagColors: new Map(),
		darkMode: false,
		lastLoginAt: new Date('2025-01-01'),
		save: vi.fn().mockResolvedValue(true),
		markModified: vi.fn(),
		toObject: vi.fn(),
		...overrides
	};
	// Default toObject returns a plain object representation
	user.toObject.mockReturnValue({
		authUserId: user.authUserId,
		email: user.email,
		name: user.name,
		todos: user.todos,
		archivedTodos: user.archivedTodos,
		customTags: user.customTags,
		tagColors: Object.fromEntries(user.tagColors),
		darkMode: user.darkMode,
		lastLoginAt: user.lastLoginAt
	});
	return user;
}

describe('todoService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getUserData', () => {
		it('returns user data when user exists', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			const result = await getUserData('test-user-id');

			expect(mockFindOne).toHaveBeenCalledWith({ authUserId: 'test-user-id' });
			expect(mockUser.save).toHaveBeenCalled();
			expect(result.authUserId).toBe('test-user-id');
		});

		it('creates user if not found', async () => {
			mockFindOne.mockResolvedValueOnce(null);
			const newUser = createMockUser({ todos: [] });
			mockCreate.mockResolvedValue(newUser);

			const result = await getUserData('new-user');

			expect(mockCreate).toHaveBeenCalledWith({ authUserId: 'new-user' });
			expect(newUser.save).toHaveBeenCalled();
		});

		it('updates lastLoginAt on each call', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await getUserData('test-user-id');

			expect(mockUser.lastLoginAt).toBeInstanceOf(Date);
			expect(mockUser.save).toHaveBeenCalled();
		});
	});

	describe('upsertUser', () => {
		it('updates user with profile data', async () => {
			const profile = {
				email: 'new@example.com',
				name: 'New Name',
				picture: 'pic.jpg',
				provider: 'google'
			};
			const mockUser = createMockUser({ email: 'new@example.com', name: 'New Name' });
			mockFindOneAndUpdate.mockResolvedValue(mockUser);

			const result = await upsertUser('test-user-id', profile);

			expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
				{ authUserId: 'test-user-id' },
				expect.objectContaining({
					$set: expect.objectContaining({
						email: 'new@example.com',
						name: 'New Name',
						picture: 'pic.jpg',
						provider: 'google'
					})
				}),
				expect.objectContaining({ upsert: true, returnDocument: 'after' })
			);
			expect(result.email).toBe('new@example.com');
		});

		it('creates user on first login via upsert', async () => {
			const profile = { email: 'first@example.com', name: 'First User' };
			const newUser = createMockUser({ email: 'first@example.com', name: 'First User' });
			mockFindOneAndUpdate.mockResolvedValue(newUser);

			const result = await upsertUser('new-user-id', profile);

			expect(mockFindOneAndUpdate).toHaveBeenCalled();
			expect(result.email).toBe('first@example.com');
		});
	});

	describe('getTodos', () => {
		it('returns todos and user settings', async () => {
			const mockUser = createMockUser({
				todos: [{ id: '1', title: 'Task 1', completed: false, createdAt: '2025-01-01' }],
				archivedTodos: [{ id: '2', title: 'Archived 1', completed: true, createdAt: '2025-01-01' }],
				darkMode: true
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await getTodos('test-user-id');

			expect(result.todos).toHaveLength(1);
			expect(result.todos[0].title).toBe('Task 1');
			expect(result.archivedTodos).toHaveLength(1);
			expect(result.darkMode).toBe(true);
			// nextId should NOT be in the response
			expect(result).not.toHaveProperty('nextId');
		});

		it('throws when user is not found', async () => {
			mockFindOne.mockResolvedValue(null);

			await expect(getTodos('nonexistent')).rejects.toThrow('User not found');
		});
	});

	describe('createTodo', () => {
		it('creates a todo with the provided UUID id', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			const uuid = '550e8400-e29b-41d4-a716-446655440000';
			const todoData = { id: uuid, title: 'New Task', priority: 'high', category: 'Work' };
			const result = await createTodo('test-user-id', todoData);

			expect(result.id).toBe(uuid);
			expect(result.title).toBe('New Task');
			expect(result.completed).toBe(false);
			expect(result.createdAt).toBeTruthy();
			expect(mockUser.todos).toHaveLength(1);
			expect(mockUser.save).toHaveBeenCalled();
		});

		it('generates a UUID id when none is provided', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			const todoData = { title: 'No ID Task', priority: 'medium' };
			const result = await createTodo('test-user-id', todoData);

			expect(result.id).toBeTruthy();
			expect(typeof result.id).toBe('string');
			expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
			expect(result.title).toBe('No ID Task');
			expect(mockUser.todos).toHaveLength(1);
			expect(mockUser.save).toHaveBeenCalled();
		});

		it('throws when user is not found', async () => {
			mockFindOne.mockResolvedValue(null);

			await expect(createTodo('nonexistent', { title: 'Test' })).rejects.toThrow('User not found');
		});
	});

	describe('updateTodo', () => {
		it('updates fields on an existing todo', async () => {
			const mockUser = createMockUser({
				todos: [{ id: '1', title: 'Old Title', completed: false, createdAt: '2025-01-01' }]
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await updateTodo('test-user-id', '1', {
				title: 'New Title',
				priority: 'high'
			});

			expect(result.title).toBe('New Title');
			expect(result.priority).toBe('high');
			expect(mockUser.save).toHaveBeenCalled();
		});

		it('throws when todo is not found', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await expect(updateTodo('test-user-id', '999', { title: 'Nope' })).rejects.toThrow('Todo not found');
		});

		it('throws when user is not found', async () => {
			mockFindOne.mockResolvedValue(null);

			await expect(updateTodo('nonexistent', '1', { title: 'Nope' })).rejects.toThrow('User not found');
		});
	});

	describe('archiveTodo', () => {
		it('moves a todo from todos to archivedTodos', async () => {
			const mockUser = createMockUser({
				todos: [{ id: '1', title: 'To Archive', completed: false, createdAt: '2025-01-01' }]
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await archiveTodo('test-user-id', '1');

			expect(result.title).toBe('To Archive');
			expect(mockUser.todos).toHaveLength(0);
			expect(mockUser.archivedTodos).toHaveLength(1);
			expect(mockUser.archivedTodos[0].title).toBe('To Archive');
			expect(mockUser.save).toHaveBeenCalled();
		});

		it('throws when todo is not found', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await expect(archiveTodo('test-user-id', '999')).rejects.toThrow('Todo not found');
		});
	});

	describe('restoreTodo', () => {
		it('moves a todo from archivedTodos back to todos', async () => {
			const mockUser = createMockUser({
				archivedTodos: [{ id: '1', title: 'To Restore', completed: true, createdAt: '2025-01-01' }]
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await restoreTodo('test-user-id', '1');

			expect(result.title).toBe('To Restore');
			expect(mockUser.archivedTodos).toHaveLength(0);
			expect(mockUser.todos).toHaveLength(1);
			expect(mockUser.todos[0].title).toBe('To Restore');
			expect(mockUser.save).toHaveBeenCalled();
		});

		it('throws when todo is not found in archived', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await expect(restoreTodo('test-user-id', '999')).rejects.toThrow('Todo not found');
		});
	});

	describe('permanentDeleteTodo', () => {
		it('removes a todo from archivedTodos', async () => {
			const mockUser = createMockUser({
				archivedTodos: [{ id: '1', title: 'To Delete', completed: true, createdAt: '2025-01-01' }]
			});
			mockFindOne.mockResolvedValue(mockUser);

			await permanentDeleteTodo('test-user-id', '1');

			expect(mockUser.archivedTodos).toHaveLength(0);
			expect(mockUser.save).toHaveBeenCalled();
		});

		it('throws when todo is not found in archived', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await expect(permanentDeleteTodo('test-user-id', '999')).rejects.toThrow('Todo not found');
		});
	});

	describe('batchArchive', () => {
		it('archives multiple todos at once', async () => {
			const mockUser = createMockUser({
				todos: [
					{ id: '1', title: 'Task A', completed: false, createdAt: '2025-01-01' },
					{ id: '2', title: 'Task B', completed: false, createdAt: '2025-01-01' },
					{ id: '3', title: 'Task C', completed: false, createdAt: '2025-01-01' }
				]
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await batchArchive('test-user-id', ['1', '3']);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.title)).toEqual(['Task A', 'Task C']);
			expect(mockUser.todos).toHaveLength(1);
			expect(mockUser.todos[0].title).toBe('Task B');
			expect(mockUser.archivedTodos).toHaveLength(2);
			expect(mockUser.save).toHaveBeenCalled();
		});
	});

	describe('batchRestore', () => {
		it('restores multiple archived todos at once', async () => {
			const mockUser = createMockUser({
				archivedTodos: [
					{ id: '1', title: 'Archived A', completed: true, createdAt: '2025-01-01' },
					{ id: '2', title: 'Archived B', completed: true, createdAt: '2025-01-01' },
					{ id: '3', title: 'Archived C', completed: true, createdAt: '2025-01-01' }
				]
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await batchRestore('test-user-id', ['1', '3']);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.title)).toEqual(['Archived A', 'Archived C']);
			expect(mockUser.archivedTodos).toHaveLength(1);
			expect(mockUser.archivedTodos[0].title).toBe('Archived B');
			expect(mockUser.todos).toHaveLength(2);
			expect(mockUser.save).toHaveBeenCalled();
		});
	});

	describe('migrateGuestData', () => {
		it('merges guest todos and custom tags into existing user', async () => {
			const mockUser = createMockUser({
				todos: [{ id: '1', title: 'Existing', completed: false, createdAt: '2025-01-01' }],
				customTags: ['urgent'],
				tagColors: new Map(Object.entries({ urgent: '#ff0000' }))
			});
			mockFindOne.mockResolvedValue(mockUser);

			const guestData = {
				todos: [{ id: '100', title: 'Guest Task', completed: false, createdAt: '2025-01-01' }],
				archivedTodos: [{ id: '200', title: 'Guest Archived', completed: true, createdAt: '2025-01-01' }],
				customTags: ['home', 'shopping'],
				tagColors: { home: '#ff0', shopping: '#f0f' }
			};

			const result = await migrateGuestData('test-user-id', guestData);

			// Should have both existing and guest todos
			expect(mockUser.todos).toHaveLength(2);
			expect(mockUser.archivedTodos).toHaveLength(1);
			// Custom tags merged (dedup)
			expect(mockUser.customTags).toContain('urgent');
			expect(mockUser.customTags).toContain('home');
			expect(mockUser.customTags).toContain('shopping');
			// Tag colors merged
			expect(mockUser.tagColors.get('urgent')).toBe('#ff0000');
			expect(mockUser.tagColors.get('home')).toBe('#ff0');
			expect(mockUser.save).toHaveBeenCalled();
			expect(result).toBeTruthy();
		});

		it('remaps guest IDs that conflict with existing user IDs using UUIDs', async () => {
			const mockUser = createMockUser({
				todos: [{ id: '1', title: 'Existing', completed: false, createdAt: '2025-01-01' }],
				archivedTodos: [
					{
						id: '2',
						title: 'Archived Existing',
						completed: true,
						createdAt: '2025-01-01'
					}
				]
			});
			mockFindOne.mockResolvedValue(mockUser);

			await migrateGuestData('test-user-id', {
				todos: [{ id: '1', title: 'Guest Duplicate', completed: false, createdAt: '2025-01-02' }],
				archivedTodos: [
					{
						id: '2',
						title: 'Guest Archived Duplicate',
						completed: true,
						createdAt: '2025-01-03'
					}
				]
			});

			expect(mockUser.todos).toHaveLength(2);
			expect(mockUser.archivedTodos).toHaveLength(2);

			const allIds = [...mockUser.todos, ...mockUser.archivedTodos].map((t) => t.id);
			expect(new Set(allIds).size).toBe(allIds.length);
			// The duplicates should have been remapped to UUIDs
			for (const id of allIds) {
				expect(typeof id).toBe('string');
			}
		});

		it('handles empty guest data gracefully', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await migrateGuestData('test-user-id', {});

			expect(mockUser.todos).toHaveLength(0);
			expect(mockUser.save).toHaveBeenCalled();
		});
	});

	describe('importData', () => {
		function createMockUser() {
			const tagColors = new Map();
			tagColors.set('urgent', '#ef4444');
			return {
				todos: [{ id: '1', title: 'Existing Todo', completed: false, createdAt: '2024-01-01' }],
				archivedTodos: [
					{
						id: 'a1',
						title: 'Existing Archived',
						completed: true,
						createdAt: '2024-01-01'
					}
				],
				customTags: ['work'],
				tagColors,
				save: vi.fn().mockResolvedValue({}),
				markModified: vi.fn(),
				toObject: vi.fn().mockReturnValue({})
			};
		}

		it('updates existing todos by ID', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await importData('test-user-id', {
				todos: [{ id: '1', title: 'Updated Title', completed: true, createdAt: '2024-01-01' }]
			});

			expect(mockUser.todos).toHaveLength(1);
			expect(mockUser.todos[0].title).toBe('Updated Title');
			expect(mockUser.todos[0].completed).toBe(true);
			expect(mockUser.save).toHaveBeenCalled();
		});

		it('adds new todos', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await importData('test-user-id', {
				todos: [{ id: '2', title: 'New Todo', completed: false, createdAt: '2024-01-02' }]
			});

			expect(mockUser.todos).toHaveLength(2);
			expect(mockUser.todos.find((t) => t.id === '2').title).toBe('New Todo');
		});

		it('updates existing archived todos by ID', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await importData('test-user-id', {
				archivedTodos: [
					{
						id: 'a1',
						title: 'Updated Archived',
						completed: true,
						createdAt: '2024-01-01'
					}
				]
			});

			expect(mockUser.archivedTodos).toHaveLength(1);
			expect(mockUser.archivedTodos[0].title).toBe('Updated Archived');
		});

		it('adds new archived todos', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await importData('test-user-id', {
				archivedTodos: [{ id: 'a2', title: 'New Archived', completed: true, createdAt: '2024-01-02' }]
			});

			expect(mockUser.archivedTodos).toHaveLength(2);
			expect(mockUser.archivedTodos.find((t) => t.id === 'a2').title).toBe('New Archived');
		});

		it('merges custom tags and tag colors', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await importData('test-user-id', {
				todos: [],
				customTags: ['newtag'],
				tagColors: { newtag: '#ff00ff' }
			});

			expect(mockUser.customTags).toEqual(['work', 'newtag']);
			expect(mockUser.tagColors.get('newtag')).toBe('#ff00ff');
			expect(mockUser.tagColors.get('urgent')).toBe('#ef4444');
		});

		it('skips invalid todo entries', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await importData('test-user-id', {
				todos: [null, { id: '2', title: 'Valid' }, { noId: true, title: 'Missing ID' }, { id: '3' }]
			});

			expect(mockUser.todos).toHaveLength(2);
			expect(mockUser.todos.find((t) => t.id === '2').title).toBe('Valid');
		});
	});
});
