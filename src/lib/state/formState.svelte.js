import { createContext } from 'svelte';

class FormState {
	newTitle = $state('');
	newDescription = $state('');
	newDueDate = $state('');
	newPriority = $state('medium');
	newCategory = $state('');
	newTags = $state([]);
	newCustomTag = $state('');
	newRecurring = $state('');
	newCategoryName = $state('');
	showAddCategory = $state(false);
	showForm = $state(true);
	selectedTemplate = $state('None');

	reset() {
		this.newTitle = '';
		this.newDescription = '';
		this.newDueDate = '';
		this.newPriority = 'medium';
		this.newCategory = '';
		this.newTags = [];
		this.newRecurring = '';
		this.selectedTemplate = 'None';
	}

	applyTemplate(template) {
		this.selectedTemplate = template.name;
		this.newTitle = template.title;
		this.newDescription = template.description;
		this.newDueDate = template.dueDate;
		this.newPriority = template.priority;
		this.newCategory = template.category;
		this.newTags = [...template.tags];
		this.newRecurring = '';
	}

	applyQuickAdd(params) {
		if (params.title !== undefined) this.newTitle = params.title;
		if (params.desc !== undefined) this.newDescription = params.desc;
		if (params.due !== undefined) this.newDueDate = params.due;
		if (params.priority !== undefined) {
			if (['high', 'medium', 'low'].includes(params.priority)) {
				this.newPriority = params.priority;
			}
		}
		if (params.category !== undefined) this.newCategory = params.category;
		if (params.tags !== undefined) {
			this.newTags = params.tags
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean);
		}
		this.showForm = true;
		setTimeout(() => document.getElementById('title-input')?.focus(), 50);
	}
}

export const [getFormState, setFormState] = createContext();

export function createFormState() {
	const state = new FormState();
	setFormState(state);
	return state;
}
