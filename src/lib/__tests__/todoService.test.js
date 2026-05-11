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
	migrateGuestData
} from '../server/todoService.js';

/**
 * Build a mock User document factory.
 */
function createMockUser(overrides = {}) {
	const user = {
		authUserId: 'test-user-id',
		email: 'test@example.com',
		name: 'Test User',
		nextId: 1,
		todos: [],
		archivedTodos: [],
		categories: ['Work', 'Personal'],
		categoryColors: new Map(Object.entries({ Work: '#3b82f6', Personal: '#22c55e' })),
		availableTags: ['urgent'],
		tagColors: new Map(Object.entries({ urgent: '#ef4444' })),
		templates: [],
		darkMode: false,
		lastLoginAt: new Date('2025-01-01'),
		save: vi.fn().mockResolvedValue(true),
		toObject: vi.fn(),
		...overrides
	};
	// Default toObject returns a plain object representation
	user.toObject.mockReturnValue({
		authUserId: user.authUserId,
		email: user.email,
		name: user.name,
		nextId: user.nextId,
		todos: user.todos,
		archivedTodos: user.archivedTodos,
		categories: user.categories,
		categoryColors: Object.fromEntries(user.categoryColors),
		availableTags: user.availableTags,
		tagColors: Object.fromEntries(user.tagColors),
		templates: user.templates,
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
			const newUser = createMockUser({ nextId: 1, todos: [] });
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
				todos: [{ id: 1, title: 'Task 1', completed: false, createdAt: '2025-01-01' }],
				archivedTodos: [{ id: 2, title: 'Archived 1', completed: true, createdAt: '2025-01-01' }],
				nextId: 3,
				darkMode: true
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await getTodos('test-user-id');

			expect(result.todos).toHaveLength(1);
			expect(result.todos[0].title).toBe('Task 1');
			expect(result.archivedTodos).toHaveLength(1);
			expect(result.nextId).toBe(3);
			expect(result.categories).toEqual(['Work', 'Personal']);
			expect(result.darkMode).toBe(true);
		});

		it('throws when user is not found', async () => {
			mockFindOne.mockResolvedValue(null);

			await expect(getTodos('nonexistent')).rejects.toThrow('User not found');
		});
	});

	describe('createTodo', () => {
		it('creates a todo with auto-incremented id', async () => {
			const mockUser = createMockUser({ nextId: 5 });
			mockFindOne.mockResolvedValue(mockUser);

			const todoData = { title: 'New Task', priority: 'high', category: 'Work' };
			const result = await createTodo('test-user-id', todoData);

			expect(result.id).toBe(5);
			expect(result.title).toBe('New Task');
			expect(result.completed).toBe(false);
			expect(result.createdAt).toBeTruthy();
			expect(mockUser.nextId).toBe(6);
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
				todos: [{ id: 1, title: 'Old Title', completed: false, createdAt: '2025-01-01' }]
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await updateTodo('test-user-id', 1, {
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

			await expect(updateTodo('test-user-id', 999, { title: 'Nope' })).rejects.toThrow(
				'Todo not found'
			);
		});

		it('throws when user is not found', async () => {
			mockFindOne.mockResolvedValue(null);

			await expect(updateTodo('nonexistent', 1, { title: 'Nope' })).rejects.toThrow(
				'User not found'
			);
		});
	});

	describe('archiveTodo', () => {
		it('moves a todo from todos to archivedTodos', async () => {
			const mockUser = createMockUser({
				todos: [{ id: 1, title: 'To Archive', completed: false, createdAt: '2025-01-01' }]
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await archiveTodo('test-user-id', 1);

			expect(result.title).toBe('To Archive');
			expect(mockUser.todos).toHaveLength(0);
			expect(mockUser.archivedTodos).toHaveLength(1);
			expect(mockUser.archivedTodos[0].title).toBe('To Archive');
			expect(mockUser.save).toHaveBeenCalled();
		});

		it('throws when todo is not found', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await expect(archiveTodo('test-user-id', 999)).rejects.toThrow('Todo not found');
		});
	});

	describe('restoreTodo', () => {
		it('moves a todo from archivedTodos back to todos', async () => {
			const mockUser = createMockUser({
				archivedTodos: [{ id: 1, title: 'To Restore', completed: true, createdAt: '2025-01-01' }]
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await restoreTodo('test-user-id', 1);

			expect(result.title).toBe('To Restore');
			expect(mockUser.archivedTodos).toHaveLength(0);
			expect(mockUser.todos).toHaveLength(1);
			expect(mockUser.todos[0].title).toBe('To Restore');
			expect(mockUser.save).toHaveBeenCalled();
		});

		it('throws when todo is not found in archived', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await expect(restoreTodo('test-user-id', 999)).rejects.toThrow('Todo not found');
		});
	});

	describe('permanentDeleteTodo', () => {
		it('removes a todo from archivedTodos', async () => {
			const mockUser = createMockUser({
				archivedTodos: [{ id: 1, title: 'To Delete', completed: true, createdAt: '2025-01-01' }]
			});
			mockFindOne.mockResolvedValue(mockUser);

			await permanentDeleteTodo('test-user-id', 1);

			expect(mockUser.archivedTodos).toHaveLength(0);
			expect(mockUser.save).toHaveBeenCalled();
		});

		it('throws when todo is not found in archived', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await expect(permanentDeleteTodo('test-user-id', 999)).rejects.toThrow('Todo not found');
		});
	});

	describe('batchArchive', () => {
		it('archives multiple todos at once', async () => {
			const mockUser = createMockUser({
				todos: [
					{ id: 1, title: 'Task A', completed: false, createdAt: '2025-01-01' },
					{ id: 2, title: 'Task B', completed: false, createdAt: '2025-01-01' },
					{ id: 3, title: 'Task C', completed: false, createdAt: '2025-01-01' }
				]
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await batchArchive('test-user-id', [1, 3]);

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
					{ id: 1, title: 'Archived A', completed: true, createdAt: '2025-01-01' },
					{ id: 2, title: 'Archived B', completed: true, createdAt: '2025-01-01' },
					{ id: 3, title: 'Archived C', completed: true, createdAt: '2025-01-01' }
				]
			});
			mockFindOne.mockResolvedValue(mockUser);

			const result = await batchRestore('test-user-id', [1, 3]);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.title)).toEqual(['Archived A', 'Archived C']);
			expect(mockUser.archivedTodos).toHaveLength(1);
			expect(mockUser.archivedTodos[0].title).toBe('Archived B');
			expect(mockUser.todos).toHaveLength(2);
			expect(mockUser.save).toHaveBeenCalled();
		});
	});

	describe('migrateGuestData', () => {
		it('merges guest todos and settings into existing user', async () => {
			const mockUser = createMockUser({
				todos: [{ id: 1, title: 'Existing', completed: false, createdAt: '2025-01-01' }],
				categories: ['Work'],
				categoryColors: new Map(Object.entries({ Work: '#ff0000' })),
				availableTags: ['urgent'],
				tagColors: new Map(Object.entries({ urgent: '#ff0000' })),
				nextId: 10
			});
			mockFindOne.mockResolvedValue(mockUser);

			const guestData = {
				todos: [{ id: 100, title: 'Guest Task', completed: false, createdAt: '2025-01-01' }],
				archivedTodos: [
					{ id: 200, title: 'Guest Archived', completed: true, createdAt: '2025-01-01' }
				],
				categories: ['Personal', 'Health'],
				categoryColors: { Personal: '#00ff00', Health: '#0000ff' },
				availableTags: ['home', 'shopping'],
				tagColors: { home: '#ff0', shopping: '#f0f' },
				templates: [{ name: 'Meeting' }]
			};

			const result = await migrateGuestData('test-user-id', guestData);

			// Should have both existing and guest todos
			expect(mockUser.todos).toHaveLength(2);
			expect(mockUser.archivedTodos).toHaveLength(1);
			// Categories should be merged (dedup)
			expect(mockUser.categories).toContain('Work');
			expect(mockUser.categories).toContain('Personal');
			expect(mockUser.categories).toContain('Health');
			// Category colors merged
			expect(mockUser.categoryColors.get('Work')).toBe('#ff0000');
			expect(mockUser.categoryColors.get('Personal')).toBe('#00ff00');
			// Tags merged (dedup)
			expect(mockUser.availableTags).toContain('urgent');
			expect(mockUser.availableTags).toContain('home');
			// Templates replaced with guest templates
			expect(mockUser.templates).toEqual([{ name: 'Meeting' }]);
			// nextId updated if guest IDs are higher
			expect(mockUser.nextId).toBe(201);
			expect(mockUser.save).toHaveBeenCalled();
			expect(result).toBeTruthy();
		});

		it('does not update nextId if guest IDs are lower', async () => {
			const mockUser = createMockUser({ nextId: 50 });
			mockFindOne.mockResolvedValue(mockUser);

			const guestData = {
				todos: [{ id: 10, title: 'Low ID', completed: false, createdAt: '2025-01-01' }]
			};

			await migrateGuestData('test-user-id', guestData);

			expect(mockUser.nextId).toBe(50);
		});

		it('handles empty guest data gracefully', async () => {
			const mockUser = createMockUser();
			mockFindOne.mockResolvedValue(mockUser);

			await migrateGuestData('test-user-id', {});

			expect(mockUser.todos).toHaveLength(0);
			expect(mockUser.save).toHaveBeenCalled();
		});
	});
});
