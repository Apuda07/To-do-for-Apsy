const STORAGE_KEY = 'todoLists';
const LEGACY_STORAGE_KEY = 'todos';
const TAG_STORAGE_KEY = 'todoTags';
const DEFAULT_TAGS = [
    { name: 'Work', color: '#8eb8d8' },
    { name: 'Home', color: '#91bd9b' },
    { name: 'Hobby', color: '#b39ad6' }
];
const TAG_COLORS = ['#e5aa7b', '#df8f9a', '#82b9b1', '#d4b65f', '#8d78b5', '#7e9dc8'];
const listForm = document.getElementById('listForm');
const listTitle = document.getElementById('listTitle');
const listDate = document.getElementById('listDate');
const listDialog = document.getElementById('listDialog');
const settingsDialog = document.getElementById('settingsDialog');
const editListsDialog = document.getElementById('editListsDialog');
const editListForm = document.getElementById('editListForm');
const editListSelect = document.getElementById('editListSelect');
const editListTitle = document.getElementById('editListTitle');
const editListDate = document.getElementById('editListDate');
const settingsMenu = document.getElementById('settingsMenu');
const settingsMenuButton = document.getElementById('toggleSettingsMenu');
const tagForm = document.getElementById('tagForm');
const tagName = document.getElementById('tagName');
const tagColor = document.getElementById('tagColor');
const tagChips = document.getElementById('tagChips');
const listsElement = document.getElementById('lists');
const editTaskDialog = document.getElementById('editTaskDialog');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskText = document.getElementById('editTaskText');
const editTaskTag = document.getElementById('editTaskTag');
let editingTask = null;

function todayAsDateInputValue() {
    const date = new Date();
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

function loadLists() {
    const savedLists = localStorage.getItem(STORAGE_KEY);
    if (savedLists !== null) {
        return JSON.parse(savedLists);
    }

    const legacyTodos = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]');
    if (!Array.isArray(legacyTodos) || legacyTodos.length === 0) {
        return [];
    }

    return [{
        title: 'My Todo List',
        date: todayAsDateInputValue(),
        todos: legacyTodos
    }];
}

let lists = loadLists();
let tags = loadTags();

function saveLists() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

function saveTags() {
    localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(tags));
}

function loadTags() {
    const savedTags = localStorage.getItem(TAG_STORAGE_KEY);
    const availableTags = savedTags === null ? [...DEFAULT_TAGS] : JSON.parse(savedTags);
    const knownNames = new Set(availableTags.map((tag) => tag.name.toLocaleLowerCase()));

    lists.forEach((list) => {
        list.todos.forEach((todo) => {
            const name = todo.tag?.trim();
            if (!name || knownNames.has(name.toLocaleLowerCase())) return;
            availableTags.push({
                name,
                color: TAG_COLORS[availableTags.length % TAG_COLORS.length]
            });
            knownNames.add(name.toLocaleLowerCase());
        });
    });

    if (savedTags === null || availableTags.length !== JSON.parse(savedTags || '[]').length) {
        localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(availableTags));
    }
    return availableTags;
}

function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function formatListDate(dateValue) {
    const date = new Date(`${dateValue}T00:00:00`);
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function renderTagSettings() {
    tagChips.replaceChildren();
    tags.forEach((tag) => {
        const chip = createElement('span', 'available-tag', tag.name);
        chip.style.setProperty('--tag-color', tag.color);
        tagChips.appendChild(chip);
    });
}

function populateTagOptions(select, selectedTag = '') {
    select.replaceChildren();
    const noTagOption = createElement('option', '', 'No tag');
    noTagOption.value = '';
    select.appendChild(noTagOption);
    tags.forEach((tag) => {
        const option = createElement('option', '', tag.name);
        option.value = tag.name;
        select.appendChild(option);
    });
    const matchingTag = tags.find((tag) =>
        tag.name.toLocaleLowerCase() === selectedTag.toLocaleLowerCase()
    );
    select.value = matchingTag ? matchingTag.name : '';
}

function renderLists() {
    listsElement.replaceChildren();

    if (lists.length === 0) {
        const emptyState = createElement('div', 'empty-state');
        emptyState.append(
            createElement('strong', '', 'Your plans start here'),
            createElement('p', '', 'Create a list with a title and date to get started.')
        );
        listsElement.appendChild(emptyState);
        return;
    }

    lists.forEach((list, listIndex) => {
        const card = createElement('article', 'list-card');
        const header = createElement('header', 'list-card-header');
        const headingGroup = document.createElement('div');
        const heading = createElement('h2', '', list.title);
        const date = createElement('p', 'list-date', formatListDate(list.date));
        const deleteListButton = createElement('button', 'delete-list-button', 'Delete list');
        deleteListButton.type = 'button';
        deleteListButton.dataset.action = 'delete-list';
        deleteListButton.dataset.listIndex = listIndex;
        deleteListButton.setAttribute('aria-label', `Delete list ${list.title}`);

        headingGroup.append(heading, date);
        header.append(headingGroup, deleteListButton);

        const taskForm = document.createElement('form');
        taskForm.className = 'task-form';
        taskForm.dataset.listIndex = listIndex;
        taskForm.id = `task-form-${listIndex}`;
        taskForm.hidden = true;

        const showTaskButton = createElement('button', 'add-task-button', '+ Add task');
        showTaskButton.type = 'button';
        showTaskButton.dataset.action = 'show-task-form';
        showTaskButton.dataset.listIndex = listIndex;
        showTaskButton.setAttribute('aria-expanded', 'false');
        showTaskButton.setAttribute('aria-controls', taskForm.id);

        const taskInput = document.createElement('input');
        taskInput.type = 'text';
        taskInput.name = 'task';
        taskInput.placeholder = 'Add a task...';
        taskInput.maxLength = 200;
        taskInput.setAttribute('aria-label', `Add a task to ${list.title}`);
        taskInput.required = true;

        const tagSelect = document.createElement('select');
        tagSelect.name = 'tag';
        tagSelect.className = 'tag-select';
        tagSelect.setAttribute('aria-label', `Optional tag for a task in ${list.title}`);
        populateTagOptions(tagSelect);
        tagSelect.options[0].textContent = 'Tag';

        const addTaskButton = createElement('button', 'primary-button', 'Add');
        addTaskButton.type = 'submit';
        taskForm.append(taskInput, tagSelect, addTaskButton);

        const taskList = createElement('ul', 'task-list');
        list.todos.forEach((todo, todoIndex) => {
            const task = createElement('li', `task-item${todo.completed ? ' completed' : ''}`);
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = todo.completed;
            checkbox.dataset.action = 'toggle-task';
            checkbox.dataset.listIndex = listIndex;
            checkbox.dataset.todoIndex = todoIndex;
            checkbox.setAttribute('aria-label', `Mark ${todo.text} ${todo.completed ? 'incomplete' : 'complete'}`);

            const text = createElement('button', 'task-text', todo.text);
            text.type = 'button';
            text.dataset.action = 'edit-task';
            text.dataset.listIndex = listIndex;
            text.dataset.todoIndex = todoIndex;
            text.setAttribute('aria-label', `Edit task ${todo.text}`);
            if (todo.tag) {
                const tag = createElement('span', 'task-tag', todo.tag);
                const tagConfig = tags.find((availableTag) =>
                    availableTag.name.toLocaleLowerCase() === todo.tag.toLocaleLowerCase()
                );
                if (tagConfig) tag.style.setProperty('--tag-color', tagConfig.color);
                task.append(checkbox, text, tag);
            } else {
                task.append(checkbox, text);
            }

            const deleteTaskButton = createElement('button', 'delete-task-button', '×');
            deleteTaskButton.type = 'button';
            deleteTaskButton.dataset.action = 'delete-task';
            deleteTaskButton.dataset.listIndex = listIndex;
            deleteTaskButton.dataset.todoIndex = todoIndex;
            deleteTaskButton.setAttribute('aria-label', `Delete task ${todo.text}`);

            task.append(deleteTaskButton);
            taskList.appendChild(task);
        });

        card.append(header, taskList, showTaskButton, taskForm);
        listsElement.appendChild(card);
    });
}

listDate.value = todayAsDateInputValue();
renderTagSettings();

document.getElementById('openListDialog').addEventListener('click', () => {
    listDialog.showModal();
    listTitle.focus();
});

function closeSettingsMenu() {
    settingsMenu.hidden = true;
    settingsMenuButton.setAttribute('aria-expanded', 'false');
}

function updateEditListFields() {
    const listIndex = Number(editListSelect.value);
    const list = lists[listIndex];
    const hasLists = Boolean(list);
    editListTitle.disabled = !hasLists;
    editListDate.disabled = !hasLists;
    editListForm.querySelector('button[type="submit"]').disabled = !hasLists;
    if (hasLists) {
        editListTitle.value = list.title;
        editListDate.value = list.date;
    } else {
        editListTitle.value = '';
        editListDate.value = '';
    }
}

function openEditListsDialog() {
    editListSelect.replaceChildren();
    lists.forEach((list, index) => {
        const option = createElement('option', '', list.title);
        option.value = index;
        editListSelect.appendChild(option);
    });
    if (lists.length === 0) {
        const option = createElement('option', '', 'Create a list first');
        option.value = '';
        editListSelect.appendChild(option);
    }
    updateEditListFields();
    editListsDialog.showModal();
}

settingsMenuButton.addEventListener('click', () => {
    const isOpen = !settingsMenu.hidden;
    settingsMenu.hidden = isOpen;
    settingsMenuButton.setAttribute('aria-expanded', String(!isOpen));
});

settingsMenu.addEventListener('click', (event) => {
    const button = event.target.closest('[data-settings-action]');
    if (!button) return;
    closeSettingsMenu();
    if (button.dataset.settingsAction === 'edit-lists') {
        openEditListsDialog();
    } else if (button.dataset.settingsAction === 'edit-tags') {
        settingsDialog.showModal();
    }
});

document.addEventListener('click', (event) => {
    if (!event.target.closest('.settings-menu-container')) closeSettingsMenu();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSettingsMenu();
});

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog').close());
});

document.querySelectorAll('.app-dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });
});

listForm.addEventListener('submit', (event) => {
    event.preventDefault();
    lists.push({
        title: listTitle.value.trim(),
        date: listDate.value,
        todos: []
    });
    saveLists();
    renderLists();
    listForm.reset();
    listDate.value = todayAsDateInputValue();
    listDialog.close();
    listTitle.focus();
});

editListSelect.addEventListener('change', updateEditListFields);

editListForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const list = lists[Number(editListSelect.value)];
    if (!list) return;

    list.title = editListTitle.value.trim();
    list.date = editListDate.value;
    saveLists();
    renderLists();
    editListsDialog.close();
});

editTaskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = editTaskText.value.trim();
    if (!text) {
        editTaskText.setCustomValidity('Enter a task.');
        editTaskText.reportValidity();
        return;
    }

    const { listIndex, todoIndex } = editingTask;
    const todo = lists[listIndex].todos[todoIndex];
    todo.text = text;
    todo.tag = editTaskTag.value;
    saveLists();
    renderLists();
    editTaskDialog.close();
    listsElement.querySelector(
        `[data-action="edit-task"][data-list-index="${listIndex}"][data-todo-index="${todoIndex}"]`
    ).focus();
});

editTaskText.addEventListener('input', () => editTaskText.setCustomValidity(''));
editTaskDialog.addEventListener('close', () => {
    editingTask = null;
});

tagForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = tagName.value.trim();
    if (!name || tags.some((tag) => tag.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        tagName.setCustomValidity(name ? 'This tag already exists.' : 'Enter a tag name.');
        tagName.reportValidity();
        return;
    }

    tags.push({ name, color: tagColor.value });
    saveTags();
    renderTagSettings();
    renderLists();
    tagForm.reset();
    tagColor.value = TAG_COLORS[tags.length % TAG_COLORS.length];
    tagName.focus();
});

tagName.addEventListener('input', () => tagName.setCustomValidity(''));

listsElement.addEventListener('submit', (event) => {
    if (!event.target.matches('.task-form')) return;
    event.preventDefault();

    const listIndex = Number(event.target.dataset.listIndex);
    const input = event.target.elements.task;
    const tagSelect = event.target.elements.tag;
    const text = input.value.trim();
    if (!text) return;

    lists[listIndex].todos.push({
        text,
        tag: tagSelect.value,
        completed: false
    });
    saveLists();
    renderLists();
    listsElement.querySelector(`.add-task-button[data-list-index="${listIndex}"]`).focus();
});

listsElement.addEventListener('change', (event) => {
    if (event.target.dataset.action !== 'toggle-task') return;
    const { listIndex, todoIndex } = event.target.dataset;
    lists[listIndex].todos[todoIndex].completed = event.target.checked;
    saveLists();
    renderLists();
});

listsElement.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const listIndex = Number(button.dataset.listIndex);
    if (button.dataset.action === 'edit-task') {
        const todoIndex = Number(button.dataset.todoIndex);
        const todo = lists[listIndex].todos[todoIndex];
        editingTask = { listIndex, todoIndex };
        editTaskText.value = todo.text;
        editTaskText.setCustomValidity('');
        populateTagOptions(editTaskTag, todo.tag || '');
        editTaskDialog.showModal();
        editTaskText.focus();
        return;
    } else if (button.dataset.action === 'show-task-form') {
        const form = document.getElementById(button.getAttribute('aria-controls'));
        form.hidden = !form.hidden;
        button.setAttribute('aria-expanded', String(!form.hidden));
        if (!form.hidden) form.elements.task.focus();
        return;
    } else if (button.dataset.action === 'delete-list') {
        lists.splice(listIndex, 1);
    } else if (button.dataset.action === 'delete-task') {
        lists[listIndex].todos.splice(Number(button.dataset.todoIndex), 1);
    } else {
        return;
    }

    saveLists();
    renderLists();
});

renderLists();
