const translations = {
    zh: {
        add: "添加",
        addSubtask: "添加子任务",
        all: "全部",
        active: "进行中",
        apiKeyMissing: "缺少 ZEDO API Key。",
        cancel: "取消",
        category: "分类",
        complete: "完成",
        completed: "已完成",
        createTask: "新建任务",
        delete: "删除",
        dueAt: "截止时间",
        editTask: "编辑任务",
        empty: "没有任务。",
        estimatedMinutes: "预计分钟",
        focus: "专注",
        loading: "正在加载任务...",
        newTask: "新建",
        noCategory: "无分类",
        noDueAt: "无截止时间",
        notes: "备注",
        priority: "优先级",
        quickAddPlaceholder: "快速添加，例如：明天 9点 周报 #work !high remind",
        refresh: "刷新",
        reminder: "提醒",
        recurrence: "重复",
        save: "保存",
        searchPlaceholder: "搜索任务...",
        selectTask: "选择任务",
        starred: "标星",
        title: "标题",
        titleRequired: "请输入标题。",
        unstarred: "未标星",
        updated: "已更新",
        priorities: {
            low: "低",
            medium: "中",
            high: "高"
        },
        recurrences: {
            none: "不重复",
            daily: "每天",
            weekly: "每周",
            monthly: "每月"
        }
    },
    en: {
        add: "Add",
        addSubtask: "Add subtask",
        all: "All",
        active: "Active",
        apiKeyMissing: "Missing ZEDO API key.",
        cancel: "Cancel",
        category: "Category",
        complete: "Complete",
        completed: "Done",
        createTask: "New task",
        delete: "Delete",
        dueAt: "Due",
        editTask: "Edit task",
        empty: "No tasks.",
        estimatedMinutes: "Estimated minutes",
        focus: "Focus",
        loading: "Loading tasks...",
        newTask: "New",
        noCategory: "No category",
        noDueAt: "No due date",
        notes: "Notes",
        priority: "Priority",
        quickAddPlaceholder: "Quick add, e.g. tomorrow 9am report #work !high remind",
        refresh: "Refresh",
        reminder: "Reminder",
        recurrence: "Repeat",
        save: "Save",
        searchPlaceholder: "Search tasks...",
        selectTask: "Select a task",
        starred: "Starred",
        title: "Title",
        titleRequired: "Enter a title.",
        unstarred: "Not starred",
        updated: "Updated",
        priorities: {
            low: "Low",
            medium: "Medium",
            high: "High"
        },
        recurrences: {
            none: "Does not repeat",
            daily: "Daily",
            weekly: "Weekly",
            monthly: "Monthly"
        }
    }
};

const priorityValues = ["low", "medium", "high"];
const recurrenceOptions = [
    ["none", null],
    ["daily", { type: "daily", intervalDays: 1 }],
    ["weekly", { type: "weekly", intervalDays: 7 }],
    ["monthly", { type: "monthly", intervalDays: 30 }]
];

export default function(element) {
    new ZedoTodoPanel(element).init();
}

class ZedoTodoPanel {
    constructor(root) {
        this.root = root;
        this.apiKey = root.dataset.apiKey || "";
        this.baseURL = trimTrailingSlash(root.dataset.baseUrl || "");
        this.limit = clampInt(Number(root.dataset.limit), 1, 1000, 100);
        this.language = root.dataset.language === "en" ? "en" : "zh";
        this.t = translations[this.language];
        this.tasks = [];
        this.categories = [];
        this.subtasksByTask = new Map();
        this.filter = "active";
        this.search = "";
        this.selectedTaskId = null;
        this.isCreating = false;
        this.loading = true;
        this.busy = false;
        this.error = null;
    }

    async init() {
        if (!this.apiKey) {
            this.loading = false;
            this.error = this.t.apiKeyMissing;
            this.render();
            return;
        }

        await this.load();
    }

    async load() {
        this.loading = true;
        this.error = null;
        this.render();

        try {
            const response = await this.request(`/tasks?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`);
            this.applyTaskResponse(response);
        } catch (err) {
            this.error = getErrorMessage(err);
        } finally {
            this.loading = false;
            this.render();
        }
    }

    applyTaskResponse(response) {
        const tasks = getFirstArray(response, [
            "tasks",
            "todos",
            "items",
            "data.tasks",
            "data.todos",
            "data.items"
        ]);
        const categories = getFirstArray(response, [
            "categories",
            "data.categories"
        ]);
        const subtasks = getFirstArray(response, [
            "subtasks",
            "todoSubtasks",
            "data.subtasks",
            "data.todoSubtasks"
        ]);

        this.categories = categories.map(normalizeCategory).filter(category => category.id);
        this.tasks = tasks.map(normalizeTask).filter(task => task.id);
        this.subtasksByTask = new Map();

        for (const task of this.tasks) {
            this.subtasksByTask.set(task.id, task.subtasks);
        }

        for (const subtask of subtasks.map(normalizeSubtask).filter(item => item.id && item.todoId)) {
            const collection = this.subtasksByTask.get(subtask.todoId) || [];
            collection.push(subtask);
            this.subtasksByTask.set(subtask.todoId, collection);
        }

        for (const task of this.tasks) {
            this.subtasksByTask.set(task.id, uniqueSubtasks(this.sortedSubtasks(task.id)));
            task.subtasks = this.sortedSubtasks(task.id);
        }
    }

    async request(path, options = {}) {
        const headers = {
            "Authorization": `Bearer ${this.apiKey}`,
            "Accept": "application/json",
            ...(options.headers || {})
        };

        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(`${this.baseURL}${path}`, {
            ...options,
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body)
        });

        const text = await response.text();
        let payload = null;

        if (text.trim() !== "") {
            try {
                payload = JSON.parse(text);
            } catch {
                payload = { error: text };
            }
        }

        if (!response.ok) {
            const message = payload && (payload.error || payload.message) ? payload.error || payload.message : response.statusText;
            throw new Error(`${response.status} ${message}`);
        }

        return payload || {};
    }

    async runMutation(callback) {
        if (this.busy) return;

        this.busy = true;
        this.error = null;
        this.render();

        try {
            await callback();
            await this.load();
        } catch (err) {
            this.error = getErrorMessage(err);
            this.render();
        } finally {
            this.busy = false;
            this.render();
        }
    }

    async quickAdd(text) {
        const value = text.trim();
        if (!value) return;

        await this.runMutation(async () => {
            await this.request("/tasks/quick-add", {
                method: "POST",
                body: {
                    text: value,
                    utcOffsetMinutes: -new Date().getTimezoneOffset()
                }
            });
        });
    }

    async saveTaskFromForm(form) {
        const formData = new FormData(form);
        const title = String(formData.get("title") || "").trim();
        if (!title) {
            this.error = this.t.titleRequired;
            this.render();
            return;
        }

        const taskId = String(formData.get("taskId") || "");
        const now = new Date().toISOString();
        const dueAt = datetimeLocalToISOString(String(formData.get("dueAt") || ""));
        const recurrence = recurrenceFromKey(String(formData.get("recurrence") || "none"));
        const estimatedMinutes = Number(formData.get("estimatedMinutes"));
        const payload = {
            title,
            notes: String(formData.get("notes") || "").trim(),
            priority: normalizePriority(String(formData.get("priority") || "medium")),
            focusEnabled: formData.get("focusEnabled") === "on",
            starred: formData.get("starred") === "on",
            reminderEnabled: formData.get("reminderEnabled") === "on",
            recurrence,
            completed: formData.get("completed") === "on",
            updatedAt: now
        };

        const categoryId = String(formData.get("categoryId") || "").trim();
        if (categoryId) payload.categoryId = categoryId;
        if (dueAt) payload.dueAt = dueAt;
        if (Number.isFinite(estimatedMinutes) && estimatedMinutes > 0) payload.estimatedMinutes = Math.round(estimatedMinutes);
        if (payload.completed) {
            payload.completedAt = now;
        } else {
            payload.completedAt = null;
        }

        await this.runMutation(async () => {
            if (taskId) {
                await this.request(`/tasks/${encodeURIComponent(taskId)}`, {
                    method: "PATCH",
                    body: payload
                });
            } else {
                await this.request("/tasks", {
                    method: "POST",
                    body: {
                        ...payload,
                        createdAt: now
                    }
                });
            }
            this.selectedTaskId = taskId || null;
            this.isCreating = false;
        });
    }

    async patchTask(taskId, payload) {
        await this.runMutation(async () => {
            await this.request(`/tasks/${encodeURIComponent(taskId)}`, {
                method: "PATCH",
                body: {
                    ...payload,
                    updatedAt: new Date().toISOString()
                }
            });
        });
    }

    async deleteTask(taskId) {
        await this.runMutation(async () => {
            await this.request(`/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
            if (this.selectedTaskId === taskId) {
                this.selectedTaskId = null;
            }
        });
    }

    async addSubtask(taskId, title) {
        const value = title.trim();
        if (!value) return;

        const order = this.sortedSubtasks(taskId).length;
        await this.runMutation(async () => {
            await this.request(`/tasks/${encodeURIComponent(taskId)}/subtasks`, {
                method: "POST",
                body: { title: value, order }
            });
        });
    }

    async patchSubtask(taskId, subtaskId, payload) {
        await this.runMutation(async () => {
            await this.request(`/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`, {
                method: "PATCH",
                body: {
                    ...payload,
                    updatedAt: new Date().toISOString()
                }
            });
        });
    }

    async deleteSubtask(taskId, subtaskId) {
        await this.runMutation(async () => {
            await this.request(`/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`, {
                method: "DELETE"
            });
        });
    }

    async moveSubtask(taskId, subtaskId, direction) {
        const subtasks = this.sortedSubtasks(taskId);
        const index = subtasks.findIndex(subtask => subtask.id === subtaskId);
        const targetIndex = index + direction;
        if (index < 0 || targetIndex < 0 || targetIndex >= subtasks.length) return;

        const current = subtasks[index];
        const target = subtasks[targetIndex];
        await this.runMutation(async () => {
            await Promise.all([
                this.request(`/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(current.id)}`, {
                    method: "PATCH",
                    body: { order: target.order, updatedAt: new Date().toISOString() }
                }),
                this.request(`/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(target.id)}`, {
                    method: "PATCH",
                    body: { order: current.order, updatedAt: new Date().toISOString() }
                })
            ]);
        });
    }

    filteredTasks() {
        const query = this.search.trim().toLowerCase();
        return this.tasks
            .filter(task => {
                if (this.filter === "active" && task.completed) return false;
                if (this.filter === "completed" && !task.completed) return false;
                if (!query) return true;
                return [
                    task.title,
                    task.notes,
                    this.categoryName(task.categoryId),
                    ...this.sortedSubtasks(task.id).map(subtask => subtask.title)
                ].join(" ").toLowerCase().includes(query);
            })
            .sort(compareTasks);
    }

    selectedTask() {
        if (this.isCreating) return null;
        return this.tasks.find(task => task.id === this.selectedTaskId) || null;
    }

    sortedSubtasks(taskId) {
        return [...(this.subtasksByTask.get(taskId) || [])].sort(compareSubtasks);
    }

    categoryName(categoryId) {
        if (!categoryId) return "";
        const category = this.categories.find(item => item.id === categoryId);
        return category ? category.title : categoryId;
    }

    render() {
        this.root.innerHTML = "";
        this.root.append(this.renderToolbar());

        if (this.error) {
            this.root.append(el("div", { className: "zedo-todo-error color-negative" }, this.error));
        }

        if (this.loading) {
            this.root.append(el("div", { className: "zedo-todo-loading color-subdue" }, this.t.loading));
            return;
        }

        const body = el("div", { className: "zedo-todo-body" },
            this.renderTaskList(),
            this.renderTaskEditor()
        );
        this.root.append(body);
    }

    renderToolbar() {
        const quickInput = el("input", {
            className: "zedo-todo-quick-input",
            type: "text",
            placeholder: this.t.quickAddPlaceholder,
            disabled: this.busy
        });

        const quickForm = el("form", { className: "zedo-todo-quick-form" },
            quickInput,
            el("button", { className: "zedo-todo-primary-button", type: "submit", disabled: this.busy }, this.t.add)
        );
        quickForm.addEventListener("submit", event => {
            event.preventDefault();
            const value = quickInput.value;
            quickInput.value = "";
            this.quickAdd(value);
        });

        const searchInput = el("input", {
            className: "zedo-todo-search",
            type: "search",
            placeholder: this.t.searchPlaceholder,
            value: this.search
        });
        searchInput.addEventListener("input", event => {
            this.search = event.target.value;
            this.render();
        });

        const filterButtons = el("div", { className: "zedo-todo-filters", role: "group" },
            this.filterButton("all", this.t.all),
            this.filterButton("active", this.t.active),
            this.filterButton("completed", this.t.completed)
        );

        const refreshButton = el("button", {
            className: "zedo-todo-icon-button",
            type: "button",
            title: this.t.refresh,
            "aria-label": this.t.refresh,
            disabled: this.busy
        }, refreshIcon());
        refreshButton.addEventListener("click", () => this.load());

        const newButton = el("button", {
            className: "zedo-todo-secondary-button",
            type: "button",
            disabled: this.busy
        }, this.t.newTask);
        newButton.addEventListener("click", () => {
            this.isCreating = true;
            this.selectedTaskId = null;
            this.render();
        });

        return el("div", { className: "zedo-todo-toolbar" },
            quickForm,
            el("div", { className: "zedo-todo-controls" }, searchInput, filterButtons, newButton, refreshButton)
        );
    }

    filterButton(value, label) {
        const button = el("button", {
            className: "zedo-todo-filter-button",
            type: "button",
            "aria-pressed": this.filter === value ? "true" : "false"
        }, label);
        button.addEventListener("click", () => {
            this.filter = value;
            this.render();
        });
        return button;
    }

    renderTaskList() {
        const tasks = this.filteredTasks();
        const list = el("div", { className: "zedo-todo-list" });

        if (tasks.length === 0) {
            list.append(el("div", { className: "zedo-todo-empty color-subdue" }, this.t.empty));
            return list;
        }

        for (const task of tasks) {
            list.append(this.renderTaskItem(task));
        }

        return list;
    }

    renderTaskItem(task) {
        const checkbox = el("input", {
            className: "zedo-todo-checkbox",
            type: "checkbox",
            checked: task.completed,
            "aria-label": this.t.complete,
            disabled: this.busy
        });
        checkbox.addEventListener("change", () => {
            this.patchTask(task.id, {
                completed: checkbox.checked,
                completedAt: checkbox.checked ? new Date().toISOString() : null
            });
        });

        const starButton = el("button", {
            className: "zedo-todo-star-button",
            type: "button",
            title: task.starred ? this.t.starred : this.t.unstarred,
            "aria-label": task.starred ? this.t.starred : this.t.unstarred,
            "aria-pressed": task.starred ? "true" : "false",
            disabled: this.busy
        }, task.starred ? "★" : "☆");
        starButton.addEventListener("click", () => this.patchTask(task.id, { starred: !task.starred }));

        const titleButton = el("button", {
            className: "zedo-todo-task-title",
            type: "button"
        }, task.title || "(untitled)");
        titleButton.addEventListener("click", () => {
            this.selectedTaskId = task.id;
            this.isCreating = false;
            this.render();
        });

        const subtasks = this.sortedSubtasks(task.id);
        const completedSubtasks = subtasks.filter(subtask => subtask.completed).length;
        const meta = [
            formatDueAt(task.dueAt, this.language) || this.t.noDueAt,
            this.categoryName(task.categoryId) || this.t.noCategory,
            this.t.priorities[task.priority] || task.priority
        ];
        if (subtasks.length > 0) {
            meta.push(`${completedSubtasks}/${subtasks.length}`);
        }

        const deleteButton = el("button", {
            className: "zedo-todo-delete-button",
            type: "button",
            title: this.t.delete,
            "aria-label": this.t.delete,
            disabled: this.busy
        }, trashIcon());
        deleteButton.addEventListener("click", () => this.deleteTask(task.id));

        return el("article", {
            className: `zedo-todo-task${task.completed ? " is-completed" : ""}${this.selectedTaskId === task.id ? " is-selected" : ""}`
        },
            checkbox,
            el("div", { className: "zedo-todo-task-main" },
                el("div", { className: "zedo-todo-task-heading" }, titleButton, starButton),
                el("div", { className: "zedo-todo-task-meta" }, ...meta.map(item => el("span", {}, item)))
            ),
            deleteButton
        );
    }

    renderTaskEditor() {
        if (!this.isCreating && !this.selectedTask()) {
            return el("aside", { className: "zedo-todo-detail zedo-todo-detail-empty color-subdue" },
                this.t.selectTask
            );
        }

        const task = this.selectedTask();
        const form = el("form", { className: "zedo-todo-detail" },
            el("input", { type: "hidden", name: "taskId", value: task ? task.id : "" }),
            el("div", { className: "zedo-todo-detail-header" },
                el("div", { className: "zedo-todo-detail-title" }, task ? this.t.editTask : this.t.createTask),
                el("button", { className: "zedo-todo-icon-button", type: "button", "aria-label": this.t.cancel, title: this.t.cancel }, "×")
                    .tap(button => button.addEventListener("click", () => {
                        this.isCreating = false;
                        this.selectedTaskId = null;
                        this.render();
                    }))
            ),
            this.renderTextField("title", this.t.title, task ? task.title : "", true),
            this.renderTextarea("notes", this.t.notes, task ? task.notes : ""),
            el("div", { className: "zedo-todo-field-grid" },
                this.renderSelect("categoryId", this.t.category, task ? task.categoryId : "", [
                    ["", this.t.noCategory],
                    ...this.categories.map(category => [category.id, category.title])
                ]),
                this.renderSelect("priority", this.t.priority, task ? task.priority : "medium",
                    priorityValues.map(priority => [priority, this.t.priorities[priority]])
                ),
                this.renderDateTimeField("dueAt", this.t.dueAt, task ? task.dueAt : ""),
                this.renderNumberField("estimatedMinutes", this.t.estimatedMinutes, task ? task.estimatedMinutes : null),
                this.renderSelect("recurrence", this.t.recurrence, recurrenceKey(task ? task.recurrence : null),
                    recurrenceOptions.map(([key]) => [key, this.t.recurrences[key]])
                )
            ),
            el("div", { className: "zedo-todo-check-row" },
                this.renderCheckbox("completed", this.t.completed, task ? task.completed : false),
                this.renderCheckbox("starred", this.t.starred, task ? task.starred : false),
                this.renderCheckbox("focusEnabled", this.t.focus, task ? task.focusEnabled : false),
                this.renderCheckbox("reminderEnabled", this.t.reminder, task ? task.reminderEnabled : false)
            ),
            task ? this.renderSubtasks(task) : "",
            el("div", { className: "zedo-todo-detail-actions" },
                el("button", { className: "zedo-todo-primary-button", type: "submit", disabled: this.busy }, this.t.save),
                task ? el("button", { className: "zedo-todo-danger-button", type: "button", disabled: this.busy }, this.t.delete)
                    .tap(button => button.addEventListener("click", () => this.deleteTask(task.id))) : ""
            )
        );

        form.addEventListener("submit", event => {
            event.preventDefault();
            this.saveTaskFromForm(form);
        });

        return form;
    }

    renderTextField(name, label, value, required = false) {
        return el("label", { className: "zedo-todo-field" },
            el("span", {}, label),
            el("input", { type: "text", name, value, required })
        );
    }

    renderTextarea(name, label, value) {
        return el("label", { className: "zedo-todo-field" },
            el("span", {}, label),
            el("textarea", { name, rows: "3" }, value)
        );
    }

    renderDateTimeField(name, label, value) {
        return el("label", { className: "zedo-todo-field" },
            el("span", {}, label),
            el("input", { type: "datetime-local", name, value: isoToDatetimeLocal(value) })
        );
    }

    renderNumberField(name, label, value) {
        return el("label", { className: "zedo-todo-field" },
            el("span", {}, label),
            el("input", { type: "number", min: "0", step: "1", name, value: value || "" })
        );
    }

    renderSelect(name, label, value, options) {
        return el("label", { className: "zedo-todo-field" },
            el("span", {}, label),
            el("select", { name },
                ...options.map(([optionValue, optionLabel]) => el("option", {
                    value: optionValue,
                    selected: optionValue === value
                }, optionLabel))
            )
        );
    }

    renderCheckbox(name, label, checked) {
        return el("label", { className: "zedo-todo-check" },
            el("input", { type: "checkbox", name, checked }),
            el("span", {}, label)
        );
    }

    renderSubtasks(task) {
        const subtasks = this.sortedSubtasks(task.id);
        const addInput = el("input", { type: "text", placeholder: this.t.addSubtask, disabled: this.busy });
        const addContainer = el("div", { className: "zedo-todo-subtask-add" },
            addInput,
            el("button", { className: "zedo-todo-secondary-button", type: "button", disabled: this.busy }, this.t.add)
        );
        addContainer.querySelector("button").addEventListener("click", () => {
            const value = addInput.value;
            addInput.value = "";
            this.addSubtask(task.id, value);
        });
        addInput.addEventListener("keydown", event => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const value = addInput.value;
            addInput.value = "";
            this.addSubtask(task.id, value);
        });

        return el("div", { className: "zedo-todo-subtasks" },
            el("div", { className: "zedo-todo-subtask-list" },
                ...subtasks.map((subtask, index) => this.renderSubtask(task.id, subtask, index, subtasks.length))
            ),
            addContainer
        );
    }

    renderSubtask(taskId, subtask, index, total) {
        const checkbox = el("input", {
            className: "zedo-todo-checkbox",
            type: "checkbox",
            checked: subtask.completed,
            disabled: this.busy
        });
        checkbox.addEventListener("change", () => this.patchSubtask(taskId, subtask.id, { completed: checkbox.checked }));

        const titleInput = el("input", {
            className: "zedo-todo-subtask-title",
            type: "text",
            value: subtask.title,
            disabled: this.busy
        });
        titleInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                titleInput.blur();
            }
        });
        titleInput.addEventListener("blur", () => {
            const nextTitle = titleInput.value.trim();
            if (nextTitle && nextTitle !== subtask.title) {
                this.patchSubtask(taskId, subtask.id, { title: nextTitle });
            } else {
                titleInput.value = subtask.title;
            }
        });

        const upButton = el("button", { className: "zedo-todo-icon-button", type: "button", disabled: this.busy || index === 0, title: "Up" }, "↑");
        upButton.addEventListener("click", () => this.moveSubtask(taskId, subtask.id, -1));
        const downButton = el("button", { className: "zedo-todo-icon-button", type: "button", disabled: this.busy || index === total - 1, title: "Down" }, "↓");
        downButton.addEventListener("click", () => this.moveSubtask(taskId, subtask.id, 1));
        const deleteButton = el("button", { className: "zedo-todo-icon-button", type: "button", disabled: this.busy, title: this.t.delete }, "×");
        deleteButton.addEventListener("click", () => this.deleteSubtask(taskId, subtask.id));

        return el("div", { className: `zedo-todo-subtask${subtask.completed ? " is-completed" : ""}` },
            checkbox,
            titleInput,
            upButton,
            downButton,
            deleteButton
        );
    }
}

function el(tag, attrs = {}, ...children) {
    const element = document.createElement(tag);

    for (const [name, value] of Object.entries(attrs || {})) {
        if (value === false || value === null || value === undefined) continue;

        if (name === "className") {
            element.className = value;
        } else if (name === "checked" || name === "disabled" || name === "required" || name === "selected") {
            element[name] = Boolean(value);
        } else {
            element.setAttribute(name, value);
        }
    }

    for (const child of children.flat()) {
        if (child === null || child === undefined || child === "") continue;
        element.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }

    element.tap = function(callback) {
        callback(element);
        return element;
    };

    return element;
}

function refreshIcon() {
    const svg = svgElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" });
    svg.append(
        svgElement("path", { d: "M21 12a9 9 0 0 1-15.6 6.1" }),
        svgElement("path", { d: "M3 12A9 9 0 0 1 18.6 5.9" }),
        svgElement("path", { d: "M18.5 2.8v3.4h-3.4" }),
        svgElement("path", { d: "M5.5 21.2v-3.4h3.4" })
    );
    return svg;
}

function trashIcon() {
    const svg = svgElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" });
    svg.append(
        svgElement("path", { d: "M3 6h18" }),
        svgElement("path", { d: "M8 6V4h8v2" }),
        svgElement("path", { d: "M6 6l1 15h10l1-15" })
    );
    return svg;
}

function svgElement(tag, attrs) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [name, value] of Object.entries(attrs)) {
        element.setAttribute(name, value);
    }
    return element;
}

function getByPath(value, path) {
    return path.split(".").reduce((current, key) => current && current[key], value);
}

function getFirstArray(value, paths) {
    for (const path of paths) {
        const result = getByPath(value, path);
        if (Array.isArray(result)) return result;
    }
    return Array.isArray(value) ? value : [];
}

function normalizeTask(task) {
    const normalized = {
        id: stringValue(task.id),
        title: stringValue(task.title),
        notes: stringValue(task.notes ?? task.subtitle),
        categoryId: stringValue(task.categoryId ?? task.category_id),
        priority: normalizePriority(stringValue(task.priority || "medium")),
        focusEnabled: Boolean(task.focusEnabled ?? task.focus_enabled),
        starred: Boolean(task.starred),
        dueAt: stringValue(task.dueAt ?? task.due_at),
        reminderEnabled: Boolean(task.reminderEnabled ?? task.reminder_enabled),
        recurrence: task.recurrence || null,
        estimatedMinutes: task.estimatedMinutes ?? task.estimated_minutes ?? null,
        completed: Boolean(task.completed),
        completedAt: stringValue(task.completedAt ?? task.completed_at),
        createdAt: stringValue(task.createdAt ?? task.created_at),
        updatedAt: stringValue(task.updatedAt ?? task.updated_at),
        subtasks: []
    };

    normalized.subtasks = getFirstArray(task, ["subtasks", "todoSubtasks"]).map(subtask => normalizeSubtask({ ...subtask, todoId: subtask.todoId || normalized.id }));

    return normalized;
}

function normalizeSubtask(subtask) {
    return {
        id: stringValue(subtask.id),
        todoId: stringValue(subtask.todoId ?? subtask.todo_id ?? subtask.taskId ?? subtask.task_id),
        title: stringValue(subtask.title),
        completed: Boolean(subtask.completed),
        order: Number.isFinite(Number(subtask.order)) ? Number(subtask.order) : 0,
        deletedAt: stringValue(subtask.deletedAt ?? subtask.deleted_at)
    };
}

function normalizeCategory(category) {
    return {
        id: stringValue(category.id),
        title: stringValue(category.title ?? category.name ?? category.id)
    };
}

function normalizePriority(priority) {
    return priorityValues.includes(priority) ? priority : "medium";
}

function stringValue(value) {
    return value === null || value === undefined ? "" : String(value);
}

function recurrenceKey(value) {
    if (!value || typeof value !== "object") return "none";
    if (value.type === "daily" || value.intervalDays === 1) return "daily";
    if (value.type === "weekly" || value.intervalDays === 7) return "weekly";
    if (value.type === "monthly" || value.intervalDays === 30) return "monthly";
    return "none";
}

function recurrenceFromKey(key) {
    const option = recurrenceOptions.find(([value]) => value === key);
    return option ? option[1] : null;
}

function compareSubtasks(a, b) {
    return a.order - b.order || a.title.localeCompare(b.title);
}

function uniqueSubtasks(subtasks) {
    const seen = new Set();
    const unique = [];

    for (const subtask of subtasks) {
        const key = subtask.id || `${subtask.todoId}:${subtask.order}:${subtask.title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(subtask);
    }

    return unique;
}

function compareTasks(a, b) {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.starred !== b.starred) return a.starred ? -1 : 1;

    const aDue = dateSortValue(a.dueAt);
    const bDue = dateSortValue(b.dueAt);
    if (aDue !== bDue) return aDue - bDue;

    return dateSortValue(b.updatedAt || b.createdAt) - dateSortValue(a.updatedAt || a.createdAt);
}

function dateSortValue(value) {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function formatDueAt(value, language) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function isoToDatetimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function datetimeLocalToISOString(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function trimTrailingSlash(value) {
    return value.replace(/\/+$/, "");
}

function clampInt(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, Math.round(value)));
}

function getErrorMessage(err) {
    return err && err.message ? err.message : String(err);
}
