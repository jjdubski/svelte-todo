# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: todo.spec.js >> Todo App >> Search/filter tasks
- Location: e2e/todo.spec.js:59:2

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="Search..."]')

```

# Page snapshot

```yaml
- generic [ref=e2]:
    - link "Skip to main content" [ref=e3] [cursor=pointer]:
        - /url: '#main-content'
    - navigation [ref=e4]:
        - generic [ref=e5]:
            - link "Tasks" [ref=e6] [cursor=pointer]:
                - /url: /
            - link "Board" [ref=e7] [cursor=pointer]:
                - /url: /board
            - link "Analytics" [ref=e8] [cursor=pointer]:
                - /url: /stats
            - link "Archived" [ref=e9] [cursor=pointer]:
                - /url: /archived
    - main [ref=e10]:
        - generic [ref=e12]:
            - generic [ref=e13]:
                - heading "Todo List" [level=1] [ref=e14]
                - button "Switch to dark mode" [ref=e15] [cursor=pointer]:
                    - img [ref=e16]
            - generic [ref=e18]:
                - generic [ref=e19]: Ctrl
                - text: +
                - generic [ref=e20]: 'N'
                - text: quick add
            - generic [ref=e21]:
                - generic [ref=e22]:
                    - generic [ref=e23]: '2'
                    - generic [ref=e24]: Active
                - generic [ref=e26]:
                    - generic [ref=e27]: '0'
                    - generic [ref=e28]: Completed
                - generic [ref=e30]:
                    - generic [ref=e31]: '0'
                    - generic [ref=e32]: Overdue
            - generic [ref=e33]:
                - generic [ref=e34]: Choose a template
                - generic [ref=e35]:
                    - button "None" [ref=e36] [cursor=pointer]
                    - button "Meeting" [ref=e37] [cursor=pointer]
                    - button "Errand" [ref=e38] [cursor=pointer]
                    - button "Urgent" [ref=e39] [cursor=pointer]
                    - button "Health" [ref=e40] [cursor=pointer]
                - textbox "Task title" [ref=e41]:
                    - /placeholder: What needs to be done?
                - textbox "Task description" [ref=e42]:
                    - /placeholder: Add details\u2026
                - generic [ref=e43]:
                    - textbox "Due date" [ref=e44]
                    - combobox "Priority" [ref=e45]:
                        - option "High"
                        - option "Medium" [selected]
                        - option "Low"
                    - combobox "Category" [ref=e46]:
                        - option "Category" [selected]
                        - option "Work"
                        - option "Personal"
                        - option "Ideas"
                    - combobox "Recurring" [ref=e47]:
                        - option "Repeat" [selected]
                        - option "Daily"
                        - option "Weekly"
                        - option "Monthly"
                - generic [ref=e48]:
                    - generic [ref=e49]:
                        - generic [ref=e50]: 'Tags:'
                        - button "urgent" [ref=e51] [cursor=pointer]
                        - button "meeting" [ref=e52] [cursor=pointer]
                        - button "home" [ref=e53] [cursor=pointer]
                        - button "shopping" [ref=e54] [cursor=pointer]
                        - button "health" [ref=e55] [cursor=pointer]
                        - button "in-progress" [ref=e56] [cursor=pointer]
                    - generic [ref=e57]:
                        - textbox "Add custom tag\\u2026" [ref=e58]
                        - button "Add custom tag" [ref=e59] [cursor=pointer]: +
                - button "+ Add subtask" [ref=e61] [cursor=pointer]
                - button "Add Task" [active] [ref=e62] [cursor=pointer]:
                    - img [ref=e63]
                    - text: Add Task
            - button "Toggle add form" [ref=e64] [cursor=pointer]:
                - img [ref=e65]
            - generic [ref=e67]:
                - generic [ref=e68]:
                    - img [ref=e69]
                    - searchbox "Search tasks" [ref=e72]
                - combobox "Filter by status" [ref=e73] [cursor=pointer]:
                    - option "All" [selected]
                    - option "Active"
                    - option "Done"
                - combobox "Filter by priority" [ref=e74] [cursor=pointer]:
                    - option "Priority" [selected]
                    - option "High"
                    - option "Medium"
                    - option "Low"
                - combobox "Sort by" [ref=e75] [cursor=pointer]:
                    - option "Sort" [selected]
                    - option "Priority"
                    - option "Date"
                    - option "A-Z"
                    - option "Z-A"
                    - option "Category"
                - button "Toggle select mode" [ref=e77] [cursor=pointer]:
                    - img [ref=e78]
            - button "Filter by date" [ref=e82] [cursor=pointer]:
                - img [ref=e83]
                - text: Filter by date
            - generic [ref=e85]:
                - button "All" [ref=e86] [cursor=pointer]
                - button "Work" [ref=e87] [cursor=pointer]
                - button "Personal" [ref=e88] [cursor=pointer]
                - button "Ideas" [ref=e89] [cursor=pointer]
                - button "+" [ref=e90] [cursor=pointer]
            - generic [ref=e91]:
                - generic [ref=e92]: 'Tags:'
                - button "urgent" [ref=e93] [cursor=pointer]
                - button "meeting" [ref=e94] [cursor=pointer]
                - button "home" [ref=e95] [cursor=pointer]
                - button "shopping" [ref=e96] [cursor=pointer]
                - button "health" [ref=e97] [cursor=pointer]
                - button "in-progress" [ref=e98] [cursor=pointer]
            - list [ref=e99]:
                - listitem [ref=e101]:
                    - generic "Drag to reorder" [ref=e102]
                    - generic [ref=e107]:
                        - checkbox "Mark as complete" [ref=e108] [cursor=pointer]
                        - generic [ref=e109]:
                            - generic [ref=e110]:
                                - heading "Buy groceries" [level=3] [ref=e111]
                                - generic [ref=e113]: medium
                            - generic [ref=e114]:
                                - button "+ Subtask" [ref=e115] [cursor=pointer]
                                - generic [ref=e116]:
                                    - button "Share task" [ref=e117] [cursor=pointer]:
                                        - img [ref=e118]
                                    - button "Edit task" [ref=e119] [cursor=pointer]:
                                        - img [ref=e120]
                                    - button "Delete task" [ref=e121] [cursor=pointer]:
                                        - img [ref=e122]
                - listitem [ref=e124]:
                    - generic "Drag to reorder" [ref=e125]
                    - generic [ref=e130]:
                        - checkbox "Mark as complete" [ref=e131] [cursor=pointer]
                        - generic [ref=e132]:
                            - generic [ref=e133]:
                                - heading "Read a book" [level=3] [ref=e134]
                                - generic [ref=e136]: medium
                            - generic [ref=e137]:
                                - button "+ Subtask" [ref=e138] [cursor=pointer]
                                - generic [ref=e139]:
                                    - button "Share task" [ref=e140] [cursor=pointer]:
                                        - img [ref=e141]
                                    - button "Edit task" [ref=e142] [cursor=pointer]:
                                        - img [ref=e143]
                                    - button "Delete task" [ref=e144] [cursor=pointer]:
                                        - img [ref=e145]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   |
  3   | test.describe('Todo App', () => {
  4   | 	test.beforeEach(async ({ page }) => {
  5   | 		// Clear localStorage to start fresh
  6   | 		await page.goto('/');
  7   | 		await page.evaluate(() => localStorage.clear());
  8   | 		await page.reload();
  9   | 	});
  10  |
  11  | 	test('Basic CRUD: add, complete, delete task', async ({ page }) => {
  12  | 		// Page title is visible
  13  | 		await expect(page.locator('h1')).toHaveText('Todo List');
  14  |
  15  | 		// Type a task title and click Add Task
  16  | 		const titleInput = page.locator('#title-input');
  17  | 		await titleInput.fill('Buy groceries');
  18  | 		await page.locator('button', { hasText: 'Add Task' }).click();
  19  |
  20  | 		// Verify the task appears in the list
  21  | 		await expect(page.locator('h3.todo-title')).toHaveText('Buy groceries');
  22  |
  23  | 		// Click the checkbox — verify it gets marked complete (strikethrough)
  24  | 		const checkbox = page.locator('.todo-check').first();
  25  | 		await checkbox.click();
  26  |
  27  | 		// The todo card should get the 'completed' class
  28  | 		const todoCard = page.locator('.todo-card').first();
  29  | 		await expect(todoCard).toHaveClass(/completed/);
  30  |
  31  | 		// Click delete button — verify task is removed
  32  | 		const deleteBtn = page.locator('[aria-label="Delete task"]').first();
  33  | 		await deleteBtn.click();
  34  |
  35  | 		// Verify task is removed
  36  | 		await expect(page.locator('h3.todo-title')).toHaveCount(0);
  37  |
  38  | 		// Verify "Undo" toast appears
  39  | 		const undoToast = page.locator('button', { hasText: 'Undo' });
  40  | 		await expect(undoToast).toBeVisible();
  41  | 	});
  42  |
  43  | 	test('Dark mode toggle', async ({ page }) => {
  44  | 		// Click the dark mode toggle button (initially "Switch to dark mode")
  45  | 		const darkToggle = page.locator('[aria-label="Switch to dark mode"]');
  46  | 		await darkToggle.click();
  47  |
  48  | 		// Verify dark class is applied to <html>
  49  | 		await expect(page.locator('html')).toHaveClass(/dark/);
  50  |
  51  | 		// Toggle back
  52  | 		const lightToggle = page.locator('[aria-label="Switch to light mode"]');
  53  | 		await lightToggle.click();
  54  |
  55  | 		// Verify dark class is removed
  56  | 		await expect(page.locator('html')).not.toHaveClass(/dark/);
  57  | 	});
  58  |
  59  | 	test('Search/filter tasks', async ({ page }) => {
  60  | 		// Add two tasks with different titles
  61  | 		const titleInput = page.locator('#title-input');
  62  |
  63  | 		await titleInput.fill('Buy groceries');
  64  | 		await page.locator('button', { hasText: 'Add Task' }).click();
  65  |
  66  | 		await titleInput.fill('Read a book');
  67  | 		await page.locator('button', { hasText: 'Add Task' }).click();
  68  |
  69  | 		// Both tasks should be visible
  70  | 		await expect(page.locator('h3.todo-title')).toHaveCount(2);
  71  |
  72  | 		// Type in search box
  73  | 		const searchInput = page.locator('input[placeholder="Search..."]');
> 74  | 		await searchInput.fill('groceries');
      |                     ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  75  |
  76  | 		// Verify only matching task is visible
  77  | 		await expect(page.locator('h3.todo-title')).toHaveCount(1);
  78  | 		await expect(page.locator('h3.todo-title')).toHaveText('Buy groceries');
  79  |
  80  | 		// Clear search
  81  | 		await searchInput.fill('');
  82  |
  83  | 		// Both should be visible again
  84  | 		await expect(page.locator('h3.todo-title')).toHaveCount(2);
  85  | 	});
  86  |
  87  | 	test('Navigation', async ({ page }) => {
  88  | 		// Navigate to Board page
  89  | 		await page.locator('a.nav-link', { hasText: 'Board' }).click();
  90  | 		await expect(page).toHaveURL(/\/board/);
  91  | 		// Verify Kanban board page loads with "Pending" column header
  92  | 		await expect(page.locator('h3', { hasText: 'Pending' })).toBeVisible();
  93  |
  94  | 		// Navigate to Analytics page
  95  | 		await page.locator('a.nav-link', { hasText: 'Analytics' }).click();
  96  | 		await expect(page).toHaveURL(/\/stats/);
  97  | 		// Verify analytics page loads with "Completion Rate"
  98  | 		await expect(page.locator('h3', { hasText: 'Completion Rate' })).toBeVisible();
  99  |
  100 | 		// Navigate back to Tasks
  101 | 		await page.locator('a.nav-link', { hasText: 'Tasks' }).click();
  102 | 		await expect(page).toHaveURL(/\/$/);
  103 | 		// Verify main list is visible (the add form)
  104 | 		await expect(page.locator('#title-input')).toBeVisible();
  105 | 	});
  106 |
  107 | 	test('Drag handles visible when sort is manual', async ({ page }) => {
  108 | 		// Add a task so there's something to see
  109 | 		const titleInput = page.locator('#title-input');
  110 | 		await titleInput.fill('Task one');
  111 | 		await page.locator('button', { hasText: 'Add Task' }).click();
  112 |
  113 | 		// Verify drag handle exists (visible when sortBy is 'manual' by default)
  114 | 		const dragHandle = page.locator('[aria-label="Drag to reorder"]');
  115 | 		await expect(dragHandle).toBeVisible();
  116 | 	});
  117 |
  118 | 	test('Stats bar shows correct counts', async ({ page }) => {
  119 | 		// Add two tasks
  120 | 		const titleInput = page.locator('#title-input');
  121 |
  122 | 		await titleInput.fill('Task A');
  123 | 		await page.locator('button', { hasText: 'Add Task' }).click();
  124 |
  125 | 		await titleInput.fill('Task B');
  126 | 		await page.locator('button', { hasText: 'Add Task' }).click();
  127 |
  128 | 		// Stats bar should show "2" active
  129 | 		await expect(page.locator('text=Active')).toBeVisible();
  130 | 		// We should see 2 active
  131 | 		const activeStat = page.locator('text=Active').first().locator('..');
  132 | 		await expect(activeStat.locator('span').first()).toHaveText('2');
  133 |
  134 | 		// Complete one task
  135 | 		const checkbox = page.locator('.todo-check').first();
  136 | 		await checkbox.click();
  137 |
  138 | 		// Should now show 1 active and 1 completed
  139 | 		await page.waitForTimeout(500); // Allow spring animation to settle
  140 | 		const statsText = await page.locator('text=Completed').first().locator('..').locator('span').first().textContent();
  141 | 		// The completed span should show "1" (could be "1" or "0" briefly due to spring)
  142 | 		expect(['1', '0']).toContain(statsText);
  143 | 	});
  144 | });
  145 |
```
