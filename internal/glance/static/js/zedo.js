const priorityValues = ["low", "medium", "high"];
const collectionValues = ["tasks", "memory", "habits", "anniversaries"];
const recurrenceOptions = [
    ["none", null],
    ["daily", { type: "daily", intervalDays: 1 }],
    ["weekly", { type: "weekly", intervalDays: 7 }],
    ["monthly", { type: "monthly", intervalDays: 30 }]
];

const translations = {
    zh: {
        active: "进行中",
        add: "添加",
        addCard: "新建卡片",
        addDeck: "新建卡组",
        addSubtask: "添加子任务",
        all: "全部",
        anniversaries: "纪念日",
        apiKeyMissing: "缺少 ZEDO API Key。",
        apply: "应用",
        back: "返回",
        cardBack: "背面",
        breakMinutes: "休息分钟",
        cancel: "取消",
        cards: "卡片",
        categories: "分类",
        category: "分类",
        checkIn: "打卡",
        color: "颜色",
        complete: "完成",
        completed: "已完成",
        create: "新建",
        createAnniversary: "新建纪念日",
        createCategory: "新建分类",
        createHabit: "新建习惯",
        createSession: "记录专注",
        createTask: "新建任务",
        daily: "每日",
        date: "日期",
        deck: "卡组",
        decks: "卡组",
        delete: "删除",
        description: "描述",
        dueAt: "截止时间",
        edit: "编辑",
        empty: "暂无数据。",
        estimatedMinutes: "预计分钟",
        focus: "专注",
        focusMinutes: "专注分钟",
        focusSessions: "专注记录",
        forgot: "忘记",
        frequency: "频率",
        front: "正面",
        habits: "习惯",
        icon: "图标",
        loading: "正在加载 ZEDO...",
        memory: "记忆",
        name: "名称",
        newCard: "新建卡片",
        newDeck: "新建卡组",
        noCategory: "无分类",
        noDueAt: "无截止时间",
        notes: "备注",
        parse: "解析",
        pause: "暂停",
        priority: "优先级",
        quickAddPlaceholder: "智能新建，例如：明天 9点 交周报 #工作 !高",
        refresh: "刷新",
        reminder: "提醒",
        remember: "记住",
        repeat: "重复",
        repeatRounds: "重复轮数",
        reset: "重置",
        resume: "继续",
        reviewDaily: "每日回顾",
        reviewWeekly: "每周回顾",
        save: "保存",
        schedule: "日程",
        scheduleOverrides: "日程覆盖",
        search: "搜索...",
        selectItem: "选择一项",
        start: "开始",
        startedAt: "开始时间",
        stats: "统计",
        stop: "停止",
        subtasks: "子任务",
        tasks: "任务",
        title: "标题",
        titleRequired: "请输入标题。",
        today: "今天",
        undo: "撤销",
        updated: "已更新",
        weekly: "每周",
        workMinutes: "工作分钟",
        priorities: { low: "低", medium: "中", high: "高" },
        recurrences: { none: "不重复", daily: "每天", weekly: "每周", monthly: "每月" },
        statuses: { due: "待复习", mastered: "已掌握", active: "活跃" }
    },
    en: {
        active: "Active",
        add: "Add",
        addCard: "New card",
        addDeck: "New deck",
        addSubtask: "Add subtask",
        all: "All",
        anniversaries: "Anniversaries",
        apiKeyMissing: "Missing ZEDO API key.",
        apply: "Apply",
        back: "Back",
        cardBack: "Back",
        breakMinutes: "Break minutes",
        cancel: "Cancel",
        cards: "Cards",
        categories: "Categories",
        category: "Category",
        checkIn: "Check in",
        color: "Color",
        complete: "Complete",
        completed: "Done",
        create: "Create",
        createAnniversary: "New anniversary",
        createCategory: "New category",
        createHabit: "New habit",
        createSession: "Log focus",
        createTask: "New task",
        daily: "Daily",
        date: "Date",
        deck: "Deck",
        decks: "Decks",
        delete: "Delete",
        description: "Description",
        dueAt: "Due",
        edit: "Edit",
        empty: "No data.",
        estimatedMinutes: "Estimated minutes",
        focus: "Focus",
        focusMinutes: "Focus minutes",
        focusSessions: "Focus sessions",
        forgot: "Forgot",
        frequency: "Frequency",
        front: "Front",
        habits: "Habits",
        icon: "Icon",
        loading: "Loading ZEDO...",
        memory: "Memory",
        name: "Name",
        newCard: "New card",
        newDeck: "New deck",
        noCategory: "No category",
        noDueAt: "No due date",
        notes: "Notes",
        parse: "Parse",
        pause: "Pause",
        priority: "Priority",
        quickAddPlaceholder: "Quick add, e.g. tomorrow 9am report #work !high",
        refresh: "Refresh",
        reminder: "Reminder",
        remember: "Remember",
        repeat: "Repeat",
        repeatRounds: "Repeat rounds",
        reset: "Reset",
        resume: "Resume",
        reviewDaily: "Daily review",
        reviewWeekly: "Weekly review",
        save: "Save",
        schedule: "Schedule",
        scheduleOverrides: "Schedule overrides",
        search: "Search...",
        selectItem: "Select an item",
        start: "Start",
        startedAt: "Started at",
        stats: "Stats",
        stop: "Stop",
        subtasks: "Subtasks",
        tasks: "Tasks",
        title: "Title",
        titleRequired: "Enter a title.",
        today: "Today",
        undo: "Undo",
        updated: "Updated",
        weekly: "Weekly",
        workMinutes: "Work minutes",
        priorities: { low: "Low", medium: "Medium", high: "High" },
        recurrences: { none: "Does not repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly" },
        statuses: { due: "Due", mastered: "Mastered", active: "Active" }
    }
};

export default function(root) {
    createPanel(root).init();
}

function createPanel(root) {
    const module = root.dataset.module || "tasks";
    const constructors = {
        today: ZedoTodayPanel,
        tasks: ZedoTasksPanel,
        categories: ZedoCategoriesPanel,
        memory: ZedoMemoryPanel,
        habits: ZedoHabitsPanel,
        focus: ZedoFocusPanel,
        anniversaries: ZedoAnniversariesPanel,
        stats: ZedoStatsPanel,
        review: ZedoReviewPanel,
        schedule: ZedoSchedulePanel
    };
    const Constructor = constructors[module] || ZedoTasksPanel;
    return new Constructor(root);
}

class ZedoPanel {
    constructor(root) {
        this.root = root;
        this.module = root.dataset.module || "tasks";
        this.apiKey = root.dataset.apiKey || "";
        this.baseURL = trimTrailingSlash(root.dataset.baseUrl || "");
        this.limit = clampInt(Number(root.dataset.limit), 1, 1000, 100);
        this.language = root.dataset.language === "en" ? "en" : "zh";
        this.t = translations[this.language];
        this.sections = csvList(root.dataset.sections, collectionValues);
        this.collections = csvList(root.dataset.collections, collectionValues);
        this.mode = root.dataset.mode === "weekly" ? "weekly" : "daily";
        this.date = root.dataset.date || "today";
        this.loading = true;
        this.busy = false;
        this.error = null;
        this.search = "";
        this.searchFocused = false;
        this.searchSelectionStart = null;
        this.searchSelectionEnd = null;
        this.searchComposing = false;
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
            await this.fetchData();
        } catch (err) {
            this.error = getErrorMessage(err);
        } finally {
            this.loading = false;
            this.render();
        }
    }

    async fetchData() {}

    render() {
        this.root.innerHTML = "";
        this.root.append(this.renderToolbar());
        if (this.error) this.root.append(el("div", { className: "zedo-error color-negative" }, this.error));
        if (this.loading) {
            this.root.append(el("div", { className: "zedo-loading color-subdue" }, this.t.loading));
            return;
        }
        this.root.append(this.renderContent());
        this.restoreSearchFocus();
    }

    renderToolbar() {
        const search = this.renderSearch();
        const refresh = iconButton("refresh", this.t.refresh, () => this.load(), this.busy);
        return el("div", { className: "zedo-toolbar" }, search, refresh);
    }

    renderSearch() {
        const input = el("input", {
            className: "zedo-input zedo-search",
            type: "search",
            placeholder: this.t.search,
            value: this.search
        });
        input.addEventListener("compositionstart", () => {
            this.searchComposing = true;
        });
        input.addEventListener("compositionend", event => {
            this.searchComposing = false;
            this.search = event.target.value;
            this.saveSearchSelection(event.target);
            this.render();
        });
        input.addEventListener("input", event => {
            this.search = event.target.value;
            this.saveSearchSelection(event.target);
            if (this.searchComposing || event.isComposing) return;
            this.render();
        });
        return input;
    }

    saveSearchSelection(input) {
        this.searchFocused = true;
        this.searchSelectionStart = input.selectionStart;
        this.searchSelectionEnd = input.selectionEnd;
    }

    restoreSearchFocus() {
        if (!this.searchFocused) return;
        const input = this.root.querySelector(".zedo-search");
        if (!input) return;
        input.focus();
        if (this.searchSelectionStart !== null && this.searchSelectionEnd !== null) {
            input.setSelectionRange(this.searchSelectionStart, this.searchSelectionEnd);
        }
    }

    renderContent() {
        return emptyState(this.t.empty);
    }

    async request(path, options = {}) {
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: "application/json",
            ...(options.headers || {})
        };
        if (options.body !== undefined) headers["Content-Type"] = "application/json";

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

    async mutate(callback) {
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

    getList(response, names) {
        return getFirstArray(response, [
            ...names,
            ...names.map(name => `data.${name}`),
            "data"
        ]);
    }

    nowPayload(extra = {}) {
        return {
            ...extra,
            updatedAt: new Date().toISOString()
        };
    }

    label(text) {
        return el("span", { className: "zedo-label" }, text);
    }
}

class ZedoTasksPanel extends ZedoPanel {
    constructor(root) {
        super(root);
        this.tasks = [];
        this.categories = [];
        this.subtasksByTask = new Map();
        this.filter = "active";
        this.selectedId = null;
        this.creating = false;
        this.parsedQuickAdd = null;
    }

    async fetchData() {
        const response = await this.request(`/tasks?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`);
        this.applyTaskResponse(response);
    }

    applyTaskResponse(response) {
        this.categories = this.getList(response, ["categories"]).map(normalizeCategory).filter(item => item.id);
        this.tasks = this.getList(response, ["tasks", "todos", "items"]).map(normalizeTask).filter(item => item.id);
        const subtasks = this.getList(response, ["subtasks", "todoSubtasks"]).map(normalizeSubtask).filter(item => item.id && item.todoId);
        this.subtasksByTask = new Map();

        for (const task of this.tasks) this.subtasksByTask.set(task.id, task.subtasks);
        for (const subtask of subtasks) {
            const collection = this.subtasksByTask.get(subtask.todoId) || [];
            collection.push(subtask);
            this.subtasksByTask.set(subtask.todoId, collection);
        }
        for (const task of this.tasks) {
            this.subtasksByTask.set(task.id, uniqueSubtasks(this.sortedSubtasks(task.id)));
            task.subtasks = this.sortedSubtasks(task.id);
        }
    }

    renderToolbar() {
        const quickInput = el("input", {
            className: "zedo-input zedo-grow",
            type: "text",
            placeholder: this.t.quickAddPlaceholder,
            disabled: this.busy
        });
        const quickForm = el("form", { className: "zedo-form-row" },
            quickInput,
            button(this.t.add, "primary", this.busy),
            button(this.t.parse, "secondary", this.busy, "button")
        );
        onFormSubmit(quickForm, () => {
            const value = quickInput.value;
            quickInput.value = "";
            this.quickAdd(value);
        });
        quickForm.querySelector("button[type='button']").addEventListener("click", () => this.parseQuickAdd(quickInput.value));

        const search = this.renderSearch();
        const filters = segmented([
            ["all", this.t.all],
            ["active", this.t.active],
            ["completed", this.t.completed]
        ], this.filter, value => {
            this.filter = value;
            this.render();
        });
        const create = button(this.t.createTask, "secondary", this.busy, "button");
        create.addEventListener("click", () => {
            this.creating = true;
            this.selectedId = null;
            this.render();
        });
        const refresh = iconButton("refresh", this.t.refresh, () => this.load(), this.busy);
        return el("div", { className: "zedo-toolbar" },
            quickForm,
            this.parsedQuickAdd ? this.renderParsePreview() : "",
            el("div", { className: "zedo-controls" }, search, filters, create, refresh)
        );
    }

    renderParsePreview() {
        const parsed = this.parsedQuickAdd;
        const chips = [
            parsed.title,
            parsed.dueAt ? formatDateTime(parsed.dueAt, this.language) : "",
            parsed.categoryId || parsed.category || "",
            parsed.priority || ""
        ].filter(Boolean);
        return el("div", { className: "zedo-parse-preview" }, ...chips.map(item => pill(item)));
    }

    renderContent() {
        return el("div", { className: "zedo-master-detail" }, this.renderList(), this.renderEditor());
    }

    renderList() {
        const tasks = this.filteredTasks();
        if (tasks.length === 0) return emptyState(this.t.empty);
        return el("div", { className: "zedo-list" }, ...tasks.map(task => this.renderTask(task)));
    }

    renderTask(task) {
        const checkbox = el("input", { className: "zedo-checkbox", type: "checkbox", checked: task.completed, disabled: this.busy, "aria-label": this.t.complete });
        checkbox.addEventListener("change", () => this.patchTask(task.id, {
            completed: checkbox.checked,
            completedAt: checkbox.checked ? new Date().toISOString() : null
        }));
        const title = el("button", { className: "zedo-item-title", type: "button" }, task.title || "(untitled)");
        title.addEventListener("click", () => {
            this.creating = false;
            this.selectedId = task.id;
            this.render();
        });
        const star = el("button", { className: "zedo-star", type: "button", "aria-pressed": task.starred ? "true" : "false", disabled: this.busy }, task.starred ? "★" : "☆");
        star.addEventListener("click", () => this.patchTask(task.id, { starred: !task.starred }));
        const subtasks = this.sortedSubtasks(task.id);
        const done = subtasks.filter(item => item.completed).length;
        const meta = [
            formatDateTime(task.dueAt, this.language) || this.t.noDueAt,
            this.categoryName(task.categoryId) || this.t.noCategory,
            this.t.priorities[task.priority] || task.priority,
            subtasks.length ? `${done}/${subtasks.length}` : ""
        ].filter(Boolean);
        return el("article", { className: `zedo-item${task.completed ? " is-completed" : ""}${this.selectedId === task.id ? " is-selected" : ""}` },
            checkbox,
            el("div", { className: "zedo-item-main" },
                el("div", { className: "zedo-title-row" }, title, star),
                el("div", { className: "zedo-meta" }, ...meta.map(pill))
            ),
            iconButton("trash", this.t.delete, () => this.deleteTask(task.id), this.busy)
        );
    }

    renderEditor() {
        if (!this.creating && !this.selectedTask()) return el("aside", { className: "zedo-detail zedo-empty color-subdue" }, this.t.selectItem);
        const task = this.selectedTask();
        const form = el("form", { className: "zedo-detail" },
            hidden("taskId", task ? task.id : ""),
            el("div", { className: "zedo-detail-header" },
                el("div", { className: "zedo-detail-title" }, task ? this.t.edit : this.t.createTask),
                iconButton("x", this.t.cancel, () => {
                    this.creating = false;
                    this.selectedId = null;
                    this.render();
                }, false)
            ),
            textField("title", this.t.title, task ? task.title : "", true),
            textareaField("notes", this.t.notes, task ? task.notes : ""),
            el("div", { className: "zedo-field-grid" },
                selectField("categoryId", this.t.category, task ? task.categoryId : "", [["", this.t.noCategory], ...this.categories.map(category => [category.id, category.title])]),
                selectField("priority", this.t.priority, task ? task.priority : "medium", priorityValues.map(value => [value, this.t.priorities[value]])),
                datetimeField("dueAt", this.t.dueAt, task ? task.dueAt : ""),
                numberField("estimatedMinutes", this.t.estimatedMinutes, task ? task.estimatedMinutes : ""),
                selectField("recurrence", this.t.repeat, recurrenceKey(task ? task.recurrence : null), recurrenceOptions.map(([key]) => [key, this.t.recurrences[key]]))
            ),
            el("div", { className: "zedo-check-row" },
                checkField("completed", this.t.completed, task ? task.completed : false),
                checkField("starred", "★", task ? task.starred : false),
                checkField("focusEnabled", this.t.focus, task ? task.focusEnabled : false),
                checkField("reminderEnabled", this.t.reminder, task ? task.reminderEnabled : false)
            ),
            task ? this.renderSubtasks(task) : "",
            el("div", { className: "zedo-actions" },
                button(this.t.save, "primary", this.busy),
                task ? button(this.t.delete, "danger", this.busy, "button").tap(item => item.addEventListener("click", () => this.deleteTask(task.id))) : ""
            )
        );
        onFormSubmit(form, () => {
            this.saveTask(form);
        });
        return form;
    }

    renderSubtasks(task) {
        const input = el("input", { className: "zedo-input zedo-grow", type: "text", placeholder: this.t.addSubtask, disabled: this.busy });
        const add = button(this.t.add, "secondary", this.busy, "button");
        const submit = () => {
            const value = input.value;
            input.value = "";
            this.addSubtask(task.id, value);
        };
        add.addEventListener("click", submit);
        input.addEventListener("keydown", event => {
            if (event.key === "Enter" && !isComposingEvent(event)) {
                event.preventDefault();
                submit();
            }
        });
        return el("section", { className: "zedo-section" },
            el("div", { className: "zedo-section-title" }, this.t.subtasks),
            el("div", { className: "zedo-subtasks" }, ...this.sortedSubtasks(task.id).map((subtask, index, list) => this.renderSubtask(task.id, subtask, index, list.length))),
            el("div", { className: "zedo-form-row" }, input, add)
        );
    }

    renderSubtask(taskId, subtask, index, total) {
        const checkbox = el("input", { className: "zedo-checkbox", type: "checkbox", checked: subtask.completed, disabled: this.busy });
        checkbox.addEventListener("change", () => this.patchSubtask(taskId, subtask.id, { completed: checkbox.checked }));
        const title = el("input", { className: "zedo-input zedo-grow", type: "text", value: subtask.title, disabled: this.busy });
        title.addEventListener("keydown", event => {
            if (event.key === "Enter" && !isComposingEvent(event)) {
                event.preventDefault();
                title.blur();
            }
        });
        title.addEventListener("blur", () => {
            const value = title.value.trim();
            if (value && value !== subtask.title) this.patchSubtask(taskId, subtask.id, { title: value });
            else title.value = subtask.title;
        });
        return el("div", { className: `zedo-subtask${subtask.completed ? " is-completed" : ""}` },
            checkbox,
            title,
            iconButton("up", "Up", () => this.moveSubtask(taskId, subtask.id, -1), this.busy || index === 0),
            iconButton("down", "Down", () => this.moveSubtask(taskId, subtask.id, 1), this.busy || index === total - 1),
            iconButton("x", this.t.delete, () => this.deleteSubtask(taskId, subtask.id), this.busy)
        );
    }

    async quickAdd(text) {
        const value = text.trim();
        if (!value) return;
        await this.mutate(() => this.request("/tasks/quick-add", {
            method: "POST",
            body: { text: value, utcOffsetMinutes: -new Date().getTimezoneOffset() }
        }));
    }

    async parseQuickAdd(text) {
        const value = text.trim();
        if (!value) return;
        await this.mutate(async () => {
            this.parsedQuickAdd = await this.request("/smart-create/parse", {
                method: "POST",
                body: { text: value, utcOffsetMinutes: -new Date().getTimezoneOffset() }
            });
        });
    }

    async saveTask(form) {
        const data = new FormData(form);
        const title = stringValue(data.get("title")).trim();
        if (!title) {
            this.error = this.t.titleRequired;
            this.render();
            return;
        }
        const taskId = stringValue(data.get("taskId"));
        const now = new Date().toISOString();
        const dueAt = datetimeLocalToISOString(stringValue(data.get("dueAt")));
        const estimatedMinutes = Number(data.get("estimatedMinutes"));
        const payload = {
            title,
            notes: stringValue(data.get("notes")).trim(),
            priority: normalizePriority(stringValue(data.get("priority") || "medium")),
            focusEnabled: data.get("focusEnabled") === "on",
            starred: data.get("starred") === "on",
            reminderEnabled: data.get("reminderEnabled") === "on",
            recurrence: recurrenceFromKey(stringValue(data.get("recurrence") || "none")),
            completed: data.get("completed") === "on",
            updatedAt: now
        };
        const categoryId = stringValue(data.get("categoryId")).trim();
        if (categoryId) payload.categoryId = categoryId;
        if (dueAt) payload.dueAt = dueAt;
        if (Number.isFinite(estimatedMinutes) && estimatedMinutes > 0) payload.estimatedMinutes = Math.round(estimatedMinutes);
        payload.completedAt = payload.completed ? now : null;

        await this.mutate(async () => {
            if (taskId) await this.request(`/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body: payload });
            else await this.request("/tasks", { method: "POST", body: { ...payload, createdAt: now } });
            this.creating = false;
            this.selectedId = taskId || null;
        });
    }

    patchTask(id, payload) {
        return this.mutate(() => this.request(`/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: this.nowPayload(payload) }));
    }

    deleteTask(id) {
        return this.mutate(async () => {
            await this.request(`/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
            if (this.selectedId === id) this.selectedId = null;
        });
    }

    addSubtask(taskId, title) {
        const value = title.trim();
        if (!value) return Promise.resolve();
        return this.mutate(() => this.request(`/tasks/${encodeURIComponent(taskId)}/subtasks`, {
            method: "POST",
            body: { title: value, order: this.sortedSubtasks(taskId).length }
        }));
    }

    patchSubtask(taskId, subtaskId, payload) {
        return this.mutate(() => this.request(`/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`, {
            method: "PATCH",
            body: this.nowPayload(payload)
        }));
    }

    deleteSubtask(taskId, subtaskId) {
        return this.mutate(() => this.request(`/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`, { method: "DELETE" }));
    }

    moveSubtask(taskId, subtaskId, direction) {
        const subtasks = this.sortedSubtasks(taskId);
        const index = subtasks.findIndex(item => item.id === subtaskId);
        const targetIndex = index + direction;
        if (index < 0 || targetIndex < 0 || targetIndex >= subtasks.length) return Promise.resolve();
        const current = subtasks[index];
        const target = subtasks[targetIndex];
        return this.mutate(() => Promise.all([
            this.request(`/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(current.id)}`, { method: "PATCH", body: this.nowPayload({ order: target.order }) }),
            this.request(`/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(target.id)}`, { method: "PATCH", body: this.nowPayload({ order: current.order }) })
        ]));
    }

    filteredTasks() {
        const query = this.search.trim().toLowerCase();
        return this.tasks.filter(task => {
            if (this.filter === "active" && task.completed) return false;
            if (this.filter === "completed" && !task.completed) return false;
            if (!query) return true;
            return [task.title, task.notes, this.categoryName(task.categoryId), ...this.sortedSubtasks(task.id).map(item => item.title)]
                .join(" ").toLowerCase().includes(query);
        }).sort(compareTasks);
    }

    selectedTask() {
        return this.creating ? null : this.tasks.find(task => task.id === this.selectedId) || null;
    }

    sortedSubtasks(taskId) {
        return [...(this.subtasksByTask.get(taskId) || [])].filter(item => !item.deletedAt).sort(compareSubtasks);
    }

    categoryName(id) {
        if (!id) return "";
        return (this.categories.find(item => item.id === id) || {}).title || id;
    }
}

class ZedoCategoriesPanel extends ZedoPanel {
    constructor(root) {
        super(root);
        this.categories = [];
        this.editing = null;
    }

    async fetchData() {
        const response = await this.request(`/categories?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`);
        this.categories = this.getList(response, ["categories", "items"]).map(normalizeCategory).filter(item => item.id);
    }

    renderContent() {
        return el("div", { className: "zedo-stack" },
            this.renderCategoryForm(),
            this.categories.length ? el("div", { className: "zedo-list" }, ...this.filteredCategories().map(item => this.renderCategory(item))) : emptyState(this.t.empty)
        );
    }

    renderCategoryForm() {
        const category = this.editing;
        const form = el("form", { className: "zedo-detail" },
            hidden("id", category ? category.id : ""),
            el("div", { className: "zedo-detail-title" }, category ? this.t.edit : this.t.createCategory),
            el("div", { className: "zedo-field-grid" },
                textField("title", this.t.title, category ? category.title : "", true),
                textField("icon", this.t.icon, category ? category.icon : ""),
                textField("color", this.t.color, category ? category.color : "")
            ),
            el("div", { className: "zedo-actions" },
                button(this.t.save, "primary", this.busy),
                category ? button(this.t.cancel, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                    this.editing = null;
                    this.render();
                })) : ""
            )
        );
        onFormSubmit(form, () => {
            this.saveCategory(form);
        });
        return form;
    }

    renderCategory(category) {
        return el("article", { className: "zedo-item" },
            swatch(category.color),
            el("div", { className: "zedo-item-main" },
                el("div", { className: "zedo-item-title" }, category.title || category.id),
                el("div", { className: "zedo-meta" }, category.icon ? pill(category.icon) : "", category.id ? pill(category.id) : "")
            ),
            iconButton("edit", this.t.edit, () => {
                this.editing = category;
                this.render();
            }, this.busy),
            iconButton("trash", this.t.delete, () => this.deleteCategory(category.id), this.busy)
        );
    }

    filteredCategories() {
        const query = this.search.trim().toLowerCase();
        if (!query) return this.categories;
        return this.categories.filter(item => [item.title, item.id, item.icon, item.color].join(" ").toLowerCase().includes(query));
    }

    saveCategory(form) {
        const data = new FormData(form);
        const id = stringValue(data.get("id"));
        const payload = this.nowPayload({
            title: stringValue(data.get("title")).trim(),
            icon: stringValue(data.get("icon")).trim(),
            color: stringValue(data.get("color")).trim()
        });
        if (!payload.title) {
            this.error = this.t.titleRequired;
            this.render();
            return;
        }
        return this.mutate(async () => {
            if (id) await this.request(`/categories/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
            else await this.request("/categories", { method: "POST", body: { ...payload, createdAt: new Date().toISOString() } });
            this.editing = null;
        });
    }

    deleteCategory(id) {
        return this.mutate(() => this.request(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" }));
    }
}

class ZedoMemoryPanel extends ZedoPanel {
    constructor(root) {
        super(root);
        this.decks = [];
        this.cards = [];
        this.filter = "all";
        this.editingDeck = null;
        this.editingCard = null;
        this.reviewingCard = null;
    }

    async fetchData() {
        const [deckResponse, cardResponse] = await Promise.all([
            this.request(`/memory/decks?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`),
            this.request(`/memory/cards?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`)
        ]);
        this.decks = this.getList(deckResponse, ["memoryDecks", "decks", "items"]).map(normalizeDeck).filter(item => item.id);
        this.cards = this.getList(cardResponse, ["memoryCards", "cards", "items"]).map(normalizeCard).filter(item => item.id);
    }

    renderToolbar() {
        return el("div", { className: "zedo-toolbar" },
            el("div", { className: "zedo-controls" },
                this.renderSearch(),
                segmented([["all", this.t.all], ["due", this.t.statuses.due], ["mastered", this.t.statuses.mastered]], this.filter, value => {
                    this.filter = value;
                    this.render();
                }),
                button(this.t.newDeck, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                    this.editingDeck = {};
                    this.editingCard = null;
                    this.render();
                })),
                button(this.t.newCard, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                    this.editingCard = {};
                    this.editingDeck = null;
                    this.render();
                })),
                iconButton("refresh", this.t.refresh, () => this.load(), this.busy)
            )
        );
    }

    renderContent() {
        if (this.reviewingCard) return this.renderReview(this.reviewingCard);
        return el("div", { className: "zedo-master-detail" },
            el("div", { className: "zedo-stack" },
                this.decks.length ? el("section", { className: "zedo-section" }, el("div", { className: "zedo-section-title" }, this.t.decks), ...this.decks.map(deck => this.renderDeck(deck))) : "",
                this.filteredCards().length ? el("div", { className: "zedo-list" }, ...this.filteredCards().map(card => this.renderCard(card))) : emptyState(this.t.empty)
            ),
            this.renderMemoryEditor()
        );
    }

    renderDeck(deck) {
        const count = this.cards.filter(card => card.deckId === deck.id).length;
        return el("article", { className: "zedo-item zedo-compact-item" },
            el("div", { className: "zedo-item-main" }, el("div", { className: "zedo-item-title" }, deck.title), el("div", { className: "zedo-meta" }, pill(`${count} ${this.t.cards}`))),
            iconButton("edit", this.t.edit, () => {
                this.editingDeck = deck;
                this.editingCard = null;
                this.render();
            }, this.busy),
            iconButton("trash", this.t.delete, () => this.deleteDeck(deck.id), this.busy)
        );
    }

    renderCard(card) {
        return el("article", { className: "zedo-item" },
            el("div", { className: "zedo-item-main" },
                el("button", { className: "zedo-item-title", type: "button" }, card.front || "(blank)").tap(item => item.addEventListener("click", () => {
                    this.editingCard = card;
                    this.editingDeck = null;
                    this.render();
                })),
                el("div", { className: "zedo-meta" },
                    pill(this.deckName(card.deckId)),
                    card.nextReviewAt ? pill(formatDateTime(card.nextReviewAt, this.language)) : "",
                    card.status ? pill(this.t.statuses[card.status] || card.status) : ""
                )
            ),
            button(this.t.edit, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                this.editingCard = card;
                this.render();
            })),
            button(this.t.statuses.due, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                this.reviewingCard = card;
                this.render();
            })),
            iconButton("trash", this.t.delete, () => this.deleteCard(card.id), this.busy)
        );
    }

    renderMemoryEditor() {
        if (this.editingDeck) return this.renderDeckForm();
        if (this.editingCard) return this.renderCardForm();
        return el("aside", { className: "zedo-detail zedo-empty color-subdue" }, this.t.selectItem);
    }

    renderDeckForm() {
        const deck = this.editingDeck;
        const form = el("form", { className: "zedo-detail" },
            hidden("id", deck.id || ""),
            el("div", { className: "zedo-detail-title" }, deck.id ? this.t.edit : this.t.newDeck),
            textField("title", this.t.title, deck.title || "", true),
            el("div", { className: "zedo-actions" }, button(this.t.save, "primary", this.busy), button(this.t.cancel, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                this.editingDeck = null;
                this.render();
            })))
        );
        onFormSubmit(form, () => {
            this.saveDeck(form);
        });
        return form;
    }

    renderCardForm() {
        const card = this.editingCard;
        const form = el("form", { className: "zedo-detail" },
            hidden("id", card.id || ""),
            el("div", { className: "zedo-detail-title" }, card.id ? this.t.edit : this.t.newCard),
            textareaField("front", this.t.front, card.front || "", true),
            textareaField("back", this.t.cardBack, card.back || "", true),
            textareaField("notes", this.t.notes, card.notes || ""),
            el("div", { className: "zedo-field-grid" },
                selectField("deckId", this.t.deck, card.deckId || "", [["", this.t.noCategory], ...this.decks.map(deck => [deck.id, deck.title])]),
                numberField("repeatRounds", this.t.repeatRounds, card.repeatRounds || 1),
                datetimeField("nextReviewAt", this.t.dueAt, card.nextReviewAt || ""),
                numberField("estimatedMinutes", this.t.estimatedMinutes, card.estimatedMinutes || "")
            ),
            el("div", { className: "zedo-check-row" }, checkField("reminderEnabled", this.t.reminder, card.reminderEnabled || false)),
            el("div", { className: "zedo-actions" }, button(this.t.save, "primary", this.busy), button(this.t.cancel, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                this.editingCard = null;
                this.render();
            })))
        );
        onFormSubmit(form, () => {
            this.saveCard(form);
        });
        return form;
    }

    renderReview(card) {
        return el("div", { className: "zedo-review-card" },
            el("div", { className: "zedo-detail-title" }, card.front),
            el("div", { className: "zedo-review-answer" }, card.back),
            card.notes ? el("p", { className: "color-subdue" }, card.notes) : "",
            el("div", { className: "zedo-actions" },
                button(this.t.forgot, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => this.reviewCard(card, false))),
                button(this.t.remember, "primary", this.busy, "button").tap(item => item.addEventListener("click", () => this.reviewCard(card, true))),
                button(this.t.cancel, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                    this.reviewingCard = null;
                    this.render();
                }))
            )
        );
    }

    filteredCards() {
        const query = this.search.trim().toLowerCase();
        return this.cards.filter(card => {
            if (this.filter === "due" && !isDue(card.nextReviewAt)) return false;
            if (this.filter === "mastered" && card.status !== "mastered") return false;
            if (!query) return true;
            return [card.front, card.back, card.notes, this.deckName(card.deckId)].join(" ").toLowerCase().includes(query);
        }).sort((a, b) => dateSortValue(a.nextReviewAt) - dateSortValue(b.nextReviewAt));
    }

    deckName(id) {
        return (this.decks.find(deck => deck.id === id) || {}).title || id || this.t.noCategory;
    }

    saveDeck(form) {
        const data = new FormData(form);
        const id = stringValue(data.get("id"));
        const payload = this.nowPayload({ title: stringValue(data.get("title")).trim() });
        if (!payload.title) return;
        return this.mutate(async () => {
            if (id) await this.request(`/memory/decks/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
            else await this.request("/memory/decks", { method: "POST", body: { ...payload, createdAt: new Date().toISOString() } });
            this.editingDeck = null;
        });
    }

    deleteDeck(id) {
        return this.mutate(() => this.request(`/memory/decks/${encodeURIComponent(id)}`, { method: "DELETE" }));
    }

    saveCard(form) {
        const data = new FormData(form);
        const id = stringValue(data.get("id"));
        const nextReviewAt = datetimeLocalToISOString(stringValue(data.get("nextReviewAt")));
        const estimatedMinutes = Number(data.get("estimatedMinutes"));
        const payload = this.nowPayload({
            front: stringValue(data.get("front")).trim(),
            back: stringValue(data.get("back")).trim(),
            notes: stringValue(data.get("notes")).trim(),
            deckId: stringValue(data.get("deckId")).trim(),
            repeatRounds: clampInt(Number(data.get("repeatRounds")), 1, 99, 1),
            reminderEnabled: data.get("reminderEnabled") === "on"
        });
        if (nextReviewAt) payload.nextReviewAt = nextReviewAt;
        if (Number.isFinite(estimatedMinutes) && estimatedMinutes > 0) payload.estimatedMinutes = Math.round(estimatedMinutes);
        if (!payload.front || !payload.back) return;
        return this.mutate(async () => {
            if (id) await this.request(`/memory/cards/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
            else await this.request("/memory/cards", { method: "POST", body: { ...payload, createdAt: new Date().toISOString() } });
            this.editingCard = null;
        });
    }

    deleteCard(id) {
        return this.mutate(() => this.request(`/memory/cards/${encodeURIComponent(id)}`, { method: "DELETE" }));
    }

    reviewCard(card, remembered) {
        const next = new Date();
        next.setDate(next.getDate() + (remembered ? 3 : 1));
        return this.mutate(async () => {
            await this.request(`/memory/cards/${encodeURIComponent(card.id)}`, {
                method: "PATCH",
                body: this.nowPayload({
                    status: remembered ? "active" : "due",
                    nextReviewAt: next.toISOString()
                })
            });
            this.reviewingCard = null;
        });
    }
}

class ZedoHabitsPanel extends ZedoPanel {
    constructor(root) {
        super(root);
        this.habits = [];
        this.completions = [];
        this.overrides = [];
        this.editing = null;
        this.editingOverride = null;
    }

    async fetchData() {
        const response = await this.request(`/habits?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`);
        this.habits = this.getList(response, ["habits", "items"]).map(normalizeHabit).filter(item => item.id);
        const nestedCompletions = this.getList(response, ["habitCompletions", "completions"]).map(normalizeCompletion);
        this.completions = nestedCompletions;
        this.overrides = this.getList(response, ["habitScheduleOverrides", "scheduleOverrides", "overrides"]).map(normalizeOverride);
        await this.loadHabitChildren();
    }

    async loadHabitChildren() {
        const completions = [...this.completions];
        const overrides = [...this.overrides];
        await Promise.all(this.habits.map(async habit => {
            try {
                const [completionResponse, overrideResponse] = await Promise.all([
                    this.request(`/habits/${encodeURIComponent(habit.id)}/completions?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`),
                    this.request(`/habits/${encodeURIComponent(habit.id)}/schedule-overrides?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`)
                ]);
                completions.push(...this.getList(completionResponse, ["habitCompletions", "completions", "items"]).map(item => normalizeCompletion({ ...item, habitId: item.habitId || habit.id })));
                overrides.push(...this.getList(overrideResponse, ["habitScheduleOverrides", "scheduleOverrides", "overrides", "items"]).map(item => normalizeOverride({ ...item, habitId: item.habitId || habit.id })));
            } catch {}
        }));
        this.completions = uniqueById(completions);
        this.overrides = uniqueById(overrides);
    }

    renderToolbar() {
        return el("div", { className: "zedo-toolbar" },
            el("div", { className: "zedo-controls" },
                this.renderSearch(),
                button(this.t.createHabit, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                    this.editing = {};
                    this.render();
                })),
                iconButton("refresh", this.t.refresh, () => this.load(), this.busy)
            )
        );
    }

    renderContent() {
        return el("div", { className: "zedo-master-detail" },
            this.filteredHabits().length ? el("div", { className: "zedo-list" }, ...this.filteredHabits().map(habit => this.renderHabit(habit))) : emptyState(this.t.empty),
            this.renderHabitEditor()
        );
    }

    renderHabit(habit) {
        const completion = this.todayCompletion(habit.id);
        return el("article", { className: `zedo-item${completion ? " is-completed" : ""}` },
            el("div", { className: "zedo-item-main" },
                el("div", { className: "zedo-item-title" }, habit.title),
                el("div", { className: "zedo-meta" }, pill(this.t[habit.frequency] || habit.frequency), pill(`${habit.currentStreak || 0}/${habit.bestStreak || 0}`))
            ),
            button(completion ? this.t.undo : this.t.checkIn, completion ? "secondary" : "primary", this.busy, "button").tap(item => item.addEventListener("click", () => completion ? this.deleteCompletion(habit.id, completion.id) : this.checkIn(habit.id))),
            iconButton("edit", this.t.edit, () => {
                this.editing = habit;
                this.render();
            }, this.busy),
            iconButton("trash", this.t.delete, () => this.deleteHabit(habit.id), this.busy)
        );
    }

    renderHabitEditor() {
        if (!this.editing) return el("aside", { className: "zedo-detail zedo-empty color-subdue" }, this.t.selectItem);
        const habit = this.editing;
        const form = el("form", { className: "zedo-detail" },
            hidden("id", habit.id || ""),
            el("div", { className: "zedo-detail-title" }, habit.id ? this.t.edit : this.t.createHabit),
            textField("title", this.t.title, habit.title || "", true),
            textareaField("description", this.t.description, habit.description || ""),
            el("div", { className: "zedo-field-grid" },
                selectField("frequency", this.t.frequency, habit.frequency || "daily", [["daily", this.t.daily], ["weekly", this.t.weekly]]),
                numberField("estimatedMinutes", this.t.estimatedMinutes, habit.estimatedMinutes || "")
            ),
            this.renderOverrides(habit),
            el("div", { className: "zedo-actions" }, button(this.t.save, "primary", this.busy), button(this.t.cancel, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                this.editing = null;
                this.render();
            })))
        );
        onFormSubmit(form, () => {
            this.saveHabit(form);
        });
        return form;
    }

    renderOverrides(habit) {
        if (!habit.id) return "";
        const inputDate = el("input", { className: "zedo-input", type: "date" });
        const inputTime = el("input", { className: "zedo-input", type: "time" });
        const inputMinutes = el("input", { className: "zedo-input", type: "number", min: "1", placeholder: this.t.estimatedMinutes });
        const add = button(this.t.add, "secondary", this.busy, "button");
        add.addEventListener("click", () => this.addOverride(habit.id, inputDate.value, inputTime.value, inputMinutes.value));
        return el("section", { className: "zedo-section" },
            el("div", { className: "zedo-section-title" }, this.t.scheduleOverrides),
            el("div", { className: "zedo-list" }, ...this.overrides.filter(item => item.habitId === habit.id).map(item => this.renderOverride(habit.id, item))),
            this.editingOverride ? this.renderOverrideForm(habit.id, this.editingOverride) : "",
            el("div", { className: "zedo-form-row" }, inputDate, inputTime, inputMinutes, add)
        );
    }

    renderOverride(habitId, override) {
        return el("div", { className: "zedo-subtask" },
            el("span", { className: "zedo-grow" }, `${override.date || formatDate(override.startAt, this.language)} ${formatTime(override.startAt, this.language)}`),
            iconButton("edit", this.t.edit, () => {
                this.editingOverride = override;
                this.render();
            }, this.busy),
            iconButton("trash", this.t.delete, () => this.deleteOverride(habitId, override.id), this.busy)
        );
    }

    renderOverrideForm(habitId, override) {
        const form = el("form", { className: "zedo-form-row zedo-inline-form" },
            hidden("id", override.id),
            el("input", { className: "zedo-input", name: "date", type: "date", value: override.date || localDate(new Date(override.startAt)) }),
            el("input", { className: "zedo-input", name: "time", type: "time", value: isoToTime(override.startAt) }),
            el("input", { className: "zedo-input", name: "estimatedMinutes", type: "number", min: "1", value: override.estimatedMinutes || "" }),
            button(this.t.save, "primary", this.busy),
            button(this.t.cancel, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                this.editingOverride = null;
                this.render();
            }))
        );
        onFormSubmit(form, () => {
            this.saveOverride(habitId, form);
        });
        return form;
    }

    filteredHabits() {
        const query = this.search.trim().toLowerCase();
        if (!query) return this.habits;
        return this.habits.filter(item => [item.title, item.description, item.frequency].join(" ").toLowerCase().includes(query));
    }

    todayCompletion(id) {
        const today = localDate();
        return this.completions.find(item => item.habitId === id && item.completedDate === today && !item.deletedAt);
    }

    saveHabit(form) {
        const data = new FormData(form);
        const id = stringValue(data.get("id"));
        const estimatedMinutes = Number(data.get("estimatedMinutes"));
        const payload = this.nowPayload({
            title: stringValue(data.get("title")).trim(),
            description: stringValue(data.get("description")).trim(),
            frequency: stringValue(data.get("frequency") || "daily")
        });
        if (Number.isFinite(estimatedMinutes) && estimatedMinutes > 0) payload.estimatedMinutes = Math.round(estimatedMinutes);
        if (!payload.title) return;
        return this.mutate(async () => {
            if (id) await this.request(`/habits/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
            else await this.request("/habits", { method: "POST", body: { ...payload, createdAt: new Date().toISOString() } });
            this.editing = null;
        });
    }

    deleteHabit(id) {
        return this.mutate(() => this.request(`/habits/${encodeURIComponent(id)}`, { method: "DELETE" }));
    }

    checkIn(id) {
        return this.mutate(() => this.request(`/habits/${encodeURIComponent(id)}/completions`, {
            method: "POST",
            body: { completedDate: localDate(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        }));
    }

    deleteCompletion(habitId, completionId) {
        return this.mutate(() => this.request(`/habits/${encodeURIComponent(habitId)}/completions/${encodeURIComponent(completionId)}`, { method: "DELETE" }));
    }

    addOverride(habitId, date, time, minutes) {
        if (!date) return Promise.resolve();
        const startAt = new Date(`${date}T${time || "09:00"}`).toISOString();
        return this.mutate(() => this.request(`/habits/${encodeURIComponent(habitId)}/schedule-overrides`, {
            method: "POST",
            body: {
                date,
                startAt,
                estimatedMinutes: clampInt(Number(minutes), 1, 1440, 30),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        }));
    }

    deleteOverride(habitId, overrideId) {
        return this.mutate(() => this.request(`/habits/${encodeURIComponent(habitId)}/schedule-overrides/${encodeURIComponent(overrideId)}`, { method: "DELETE" }));
    }

    saveOverride(habitId, form) {
        const data = new FormData(form);
        const id = stringValue(data.get("id"));
        const date = stringValue(data.get("date"));
        const time = stringValue(data.get("time")) || "09:00";
        const minutes = Number(data.get("estimatedMinutes"));
        if (!id || !date) return Promise.resolve();
        const startAt = new Date(`${date}T${time}`).toISOString();
        return this.mutate(async () => {
            await this.request(`/habits/${encodeURIComponent(habitId)}/schedule-overrides/${encodeURIComponent(id)}`, {
                method: "PATCH",
                body: this.nowPayload({
                    date,
                    startAt,
                    estimatedMinutes: clampInt(minutes, 1, 1440, 30)
                })
            });
            this.editingOverride = null;
        });
    }
}

class ZedoFocusPanel extends ZedoPanel {
    constructor(root) {
        super(root);
        this.sessions = [];
        this.tasks = [];
        this.running = false;
        this.paused = false;
        this.workMinutes = 25;
        this.breakMinutes = 5;
        this.secondsLeft = this.workMinutes * 60;
        this.timer = null;
        this.editingSession = null;
    }

    async fetchData() {
        const [sessionResponse, taskResponse] = await Promise.all([
            this.request(`/focus/sessions?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`),
            this.request(`/tasks?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`)
        ]);
        this.sessions = this.getList(sessionResponse, ["pomodoroSessions", "focusSessions", "sessions", "items"]).map(normalizeSession).filter(item => item.id);
        this.tasks = this.getList(taskResponse, ["tasks", "todos", "items"]).map(normalizeTask).filter(item => item.id);
    }

    renderToolbar() {
        return el("div", { className: "zedo-toolbar" },
            el("div", { className: "zedo-controls" }, this.renderSearch(), iconButton("refresh", this.t.refresh, () => this.load(), this.busy))
        );
    }

    renderContent() {
        return el("div", { className: "zedo-master-detail" },
            this.renderTimer(),
            el("div", { className: "zedo-stack" },
                this.editingSession ? this.renderSessionForm(this.editingSession) : "",
                this.sessions.length ? el("div", { className: "zedo-list" }, ...this.filteredSessions().map(session => this.renderSession(session))) : emptyState(this.t.empty)
            )
        );
    }

    renderTimer() {
        const taskSelect = selectField("taskId", this.t.tasks, "", [["", this.t.noCategory], ...this.tasks.map(task => [task.id, task.title])]);
        const form = el("form", { className: "zedo-detail zedo-focus-timer" },
            el("div", { className: "zedo-timer-display" }, formatSeconds(this.secondsLeft)),
            el("div", { className: "zedo-field-grid" },
                numberField("workMinutes", this.t.workMinutes, this.workMinutes),
                numberField("breakMinutes", this.t.breakMinutes, this.breakMinutes),
                taskSelect
            ),
            el("div", { className: "zedo-actions" },
                button(this.running ? (this.paused ? this.t.resume : this.t.pause) : this.t.start, "primary", this.busy, "button").tap(item => item.addEventListener("click", () => this.toggleTimer(form))),
                button(this.t.stop, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => this.stopTimer(form))),
                button(this.t.createSession, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => this.logSession(form)))
            )
        );
        return form;
    }

    renderSession(session) {
        return el("article", { className: "zedo-item" },
            el("div", { className: "zedo-item-main" },
                el("div", { className: "zedo-item-title" }, formatDateTime(session.startedAt, this.language) || session.id),
                el("div", { className: "zedo-meta" }, pill(`${session.durationMinutes || session.focusMinutes || 0} min`), session.taskId ? pill(this.taskName(session.taskId)) : "")
            ),
            iconButton("edit", this.t.edit, () => {
                this.editingSession = session;
                this.render();
            }, this.busy),
            iconButton("trash", this.t.delete, () => this.deleteSession(session.id), this.busy)
        );
    }

    renderSessionForm(session) {
        const form = el("form", { className: "zedo-detail" },
            hidden("id", session.id),
            el("div", { className: "zedo-detail-title" }, this.t.edit),
            el("div", { className: "zedo-field-grid" },
                datetimeField("startedAt", this.t.startedAt, session.startedAt),
                numberField("durationMinutes", this.t.focusMinutes, session.durationMinutes || session.focusMinutes || 25),
                selectField("taskId", this.t.tasks, session.taskId || "", [["", this.t.noCategory], ...this.tasks.map(task => [task.id, task.title])])
            ),
            textareaField("notes", this.t.notes, session.notes || ""),
            el("div", { className: "zedo-actions" },
                button(this.t.save, "primary", this.busy),
                button(this.t.cancel, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                    this.editingSession = null;
                    this.render();
                }))
            )
        );
        onFormSubmit(form, () => {
            this.saveSession(form);
        });
        return form;
    }

    filteredSessions() {
        const query = this.search.trim().toLowerCase();
        if (!query) return this.sessions;
        return this.sessions.filter(item => [item.id, this.taskName(item.taskId), item.notes].join(" ").toLowerCase().includes(query));
    }

    toggleTimer(form) {
        const data = new FormData(form);
        this.workMinutes = clampInt(Number(data.get("workMinutes")), 1, 240, this.workMinutes);
        this.breakMinutes = clampInt(Number(data.get("breakMinutes")), 1, 120, this.breakMinutes);
        if (!this.running) {
            this.running = true;
            this.paused = false;
            this.secondsLeft = this.workMinutes * 60;
            this.tick();
        } else {
            this.paused = !this.paused;
        }
        this.render();
    }

    tick() {
        clearTimeout(this.timer);
        if (!this.running || this.paused) return;
        if (this.secondsLeft <= 0) {
            this.running = false;
            this.render();
            return;
        }
        this.timer = setTimeout(() => {
            this.secondsLeft -= 1;
            this.tick();
            this.render();
        }, 1000);
    }

    stopTimer(form) {
        clearTimeout(this.timer);
        this.logSession(form);
        this.running = false;
        this.paused = false;
        this.secondsLeft = this.workMinutes * 60;
        this.render();
    }

    logSession(form) {
        const data = new FormData(form);
        const workMinutes = clampInt(Number(data.get("workMinutes")), 1, 240, this.workMinutes);
        const taskId = stringValue(data.get("taskId"));
        const now = new Date();
        const started = new Date(now.getTime() - workMinutes * 60000);
        const payload = {
            taskId: taskId || null,
            startedAt: started.toISOString(),
            endedAt: now.toISOString(),
            durationMinutes: workMinutes,
            focusMinutes: workMinutes,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };
        return this.mutate(() => this.request("/focus/sessions", { method: "POST", body: payload }));
    }

    deleteSession(id) {
        return this.mutate(() => this.request(`/focus/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }));
    }

    saveSession(form) {
        const data = new FormData(form);
        const id = stringValue(data.get("id"));
        const startedAt = datetimeLocalToISOString(stringValue(data.get("startedAt")));
        const durationMinutes = clampInt(Number(data.get("durationMinutes")), 1, 1440, 25);
        const endedAt = startedAt ? new Date(new Date(startedAt).getTime() + durationMinutes * 60000).toISOString() : "";
        if (!id || !startedAt) return Promise.resolve();
        return this.mutate(async () => {
            await this.request(`/focus/sessions/${encodeURIComponent(id)}`, {
                method: "PATCH",
                body: this.nowPayload({
                    taskId: stringValue(data.get("taskId")) || null,
                    startedAt,
                    endedAt,
                    durationMinutes,
                    focusMinutes: durationMinutes,
                    notes: stringValue(data.get("notes")).trim()
                })
            });
            this.editingSession = null;
        });
    }

    taskName(id) {
        return (this.tasks.find(task => task.id === id) || {}).title || id;
    }
}

class ZedoAnniversariesPanel extends ZedoPanel {
    constructor(root) {
        super(root);
        this.anniversaries = [];
        this.editing = null;
    }

    async fetchData() {
        const response = await this.request(`/anniversaries?limit=${encodeURIComponent(this.limit)}&includeDeleted=false`);
        this.anniversaries = this.getList(response, ["anniversaries", "items"]).map(normalizeAnniversary).filter(item => item.id);
    }

    renderToolbar() {
        return el("div", { className: "zedo-toolbar" },
            el("div", { className: "zedo-controls" }, this.renderSearch(), button(this.t.createAnniversary, "secondary", this.busy, "button").tap(item => item.addEventListener("click", () => {
                this.editing = {};
                this.render();
            })), iconButton("refresh", this.t.refresh, () => this.load(), this.busy))
        );
    }

    renderContent() {
        return el("div", { className: "zedo-master-detail" },
            this.filteredAnniversaries().length ? el("div", { className: "zedo-list" }, ...this.filteredAnniversaries().map(item => this.renderAnniversary(item))) : emptyState(this.t.empty),
            this.renderAnniversaryEditor()
        );
    }

    renderAnniversary(item) {
        const next = nextAnniversaryDate(item.date);
        return el("article", { className: "zedo-item" },
            el("div", { className: "zedo-item-main" },
                el("div", { className: "zedo-item-title" }, item.title),
                el("div", { className: "zedo-meta" }, pill(item.date), next ? pill(formatDate(next, this.language)) : "", item.reminderEnabled ? pill(this.t.reminder) : "")
            ),
            iconButton("edit", this.t.edit, () => {
                this.editing = item;
                this.render();
            }, this.busy),
            iconButton("trash", this.t.delete, () => this.deleteAnniversary(item.id), this.busy)
        );
    }

    renderAnniversaryEditor() {
        if (!this.editing) return el("aside", { className: "zedo-detail zedo-empty color-subdue" }, this.t.selectItem);
        const item = this.editing;
        const form = el("form", { className: "zedo-detail" },
            hidden("id", item.id || ""),
            el("div", { className: "zedo-detail-title" }, item.id ? this.t.edit : this.t.createAnniversary),
            textField("title", this.t.title, item.title || "", true),
            dateField("date", this.t.date, item.date || "", true),
            textareaField("notes", this.t.notes, item.notes || ""),
            el("div", { className: "zedo-check-row" }, checkField("reminderEnabled", this.t.reminder, item.reminderEnabled || false)),
            el("div", { className: "zedo-actions" }, button(this.t.save, "primary", this.busy), button(this.t.cancel, "secondary", this.busy, "button").tap(button => button.addEventListener("click", () => {
                this.editing = null;
                this.render();
            })))
        );
        onFormSubmit(form, () => {
            this.saveAnniversary(form);
        });
        return form;
    }

    filteredAnniversaries() {
        const query = this.search.trim().toLowerCase();
        return this.anniversaries.filter(item => !query || [item.title, item.notes, item.date].join(" ").toLowerCase().includes(query))
            .sort((a, b) => dateSortValue(nextAnniversaryDate(a.date)) - dateSortValue(nextAnniversaryDate(b.date)));
    }

    saveAnniversary(form) {
        const data = new FormData(form);
        const id = stringValue(data.get("id"));
        const payload = this.nowPayload({
            title: stringValue(data.get("title")).trim(),
            date: stringValue(data.get("date")),
            notes: stringValue(data.get("notes")).trim(),
            reminderEnabled: data.get("reminderEnabled") === "on"
        });
        if (!payload.title || !payload.date) return;
        return this.mutate(async () => {
            if (id) await this.request(`/anniversaries/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
            else await this.request("/anniversaries", { method: "POST", body: { ...payload, createdAt: new Date().toISOString() } });
            this.editing = null;
        });
    }

    deleteAnniversary(id) {
        return this.mutate(() => this.request(`/anniversaries/${encodeURIComponent(id)}`, { method: "DELETE" }));
    }
}

class ZedoTodayPanel extends ZedoPanel {
    constructor(root) {
        super(root);
        this.data = {};
    }

    async fetchData() {
        const params = new URLSearchParams({ now: new Date().toISOString(), collections: this.sections.join(",") });
        this.data = await this.request(`/today?${params}`);
    }

    renderToolbar() {
        return el("div", { className: "zedo-toolbar" },
            el("div", { className: "zedo-controls" },
                ...collectionValues.map(value => toggleButton(value, this.t[value] || value, this.sections.includes(value), checked => {
                    this.sections = checked ? unique([...this.sections, value]) : this.sections.filter(item => item !== value);
                    this.load();
                })),
                iconButton("refresh", this.t.refresh, () => this.load(), this.busy)
            )
        );
    }

    renderContent() {
        const groups = this.extractGroups(this.data);
        return el("div", { className: "zedo-stack" },
            this.sections.includes("tasks") ? this.renderGroup(this.t.tasks, groups.tasks, item => this.renderTodayItem(item, "task")) : "",
            this.sections.includes("memory") ? this.renderGroup(this.t.memory, groups.memory, item => this.renderTodayItem(item, "memory")) : "",
            this.sections.includes("habits") ? this.renderGroup(this.t.habits, groups.habits, item => this.renderTodayItem(item, "habit")) : "",
            this.sections.includes("anniversaries") ? this.renderGroup(this.t.anniversaries, groups.anniversaries, item => this.renderTodayItem(item, "anniversary")) : ""
        );
    }

    renderGroup(title, items, renderer) {
        return el("section", { className: "zedo-section" },
            el("div", { className: "zedo-section-title" }, title),
            items.length ? el("div", { className: "zedo-list" }, ...items.map(renderer)) : emptyState(this.t.empty)
        );
    }

    renderTodayItem(item, type) {
        const title = item.title || item.front || item.name || item.sourceTitle || item.id || type;
        return el("article", { className: "zedo-item zedo-compact-item" },
            el("div", { className: "zedo-item-main" },
                el("div", { className: "zedo-item-title" }, title),
                el("div", { className: "zedo-meta" }, item.dueAt ? pill(formatDateTime(item.dueAt, this.language)) : "", item.date ? pill(item.date) : "", pill(type))
            ),
            type === "task" && item.id ? button(this.t.complete, "secondary", this.busy, "button").tap(button => button.addEventListener("click", () => this.completeTask(item.id))) : "",
            type === "habit" && item.id ? button(this.t.checkIn, "secondary", this.busy, "button").tap(button => button.addEventListener("click", () => this.checkIn(item.id))) : ""
        );
    }

    extractGroups(data) {
        const candidates = data.data || data;
        const groups = candidates.groups || candidates;
        return {
            tasks: getFirstArray(groups, ["tasks", "todos", "today", "dueTasks"]).map(normalizeTask),
            memory: getFirstArray(groups, ["memory", "memoryCards", "reviews", "dueMemory"]).map(normalizeCard),
            habits: getFirstArray(groups, ["habits", "todayHabits"]).map(normalizeHabit),
            anniversaries: getFirstArray(groups, ["anniversaries", "upcomingAnniversaries"]).map(normalizeAnniversary)
        };
    }

    completeTask(id) {
        return this.mutate(() => this.request(`/tasks/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: this.nowPayload({ completed: true, completedAt: new Date().toISOString() })
        }));
    }

    checkIn(id) {
        return this.mutate(() => this.request(`/habits/${encodeURIComponent(id)}/completions`, {
            method: "POST",
            body: { completedDate: localDate(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        }));
    }
}

class ZedoStatsPanel extends ZedoPanel {
    constructor(root) {
        super(root);
        this.stats = {};
    }

    async fetchData() {
        this.stats = await this.request(`/stats?now=${encodeURIComponent(new Date().toISOString())}`);
    }

    renderToolbar() {
        return el("div", { className: "zedo-toolbar" }, el("div", { className: "zedo-controls" }, iconButton("refresh", this.t.refresh, () => this.load(), this.busy)));
    }

    renderContent() {
        const flat = flattenStats(this.stats.data || this.stats);
        if (flat.length === 0) return emptyState(this.t.empty);
        return el("div", { className: "zedo-stat-grid" }, ...flat.map(([key, value]) => el("div", { className: "zedo-stat" }, el("span", {}, humanizeKey(key)), el("strong", {}, formatStat(value, this.language)))));
    }
}

class ZedoReviewPanel extends ZedoPanel {
    constructor(root) {
        super(root);
        this.review = {};
    }

    async fetchData() {
        const path = this.mode === "weekly" ? "/reviews/weekly" : "/reviews/daily";
        const params = new URLSearchParams({ now: new Date().toISOString() });
        if (this.mode === "daily") params.set("collections", this.collections.join(","));
        this.review = await this.request(`${path}?${params}`);
    }

    renderToolbar() {
        return el("div", { className: "zedo-toolbar" },
            el("div", { className: "zedo-controls" },
                segmented([["daily", this.t.reviewDaily], ["weekly", this.t.reviewWeekly]], this.mode, value => {
                    this.mode = value;
                    this.load();
                }),
                iconButton("refresh", this.t.refresh, () => this.load(), this.busy)
            )
        );
    }

    renderContent() {
        const items = collectReviewItems(this.review.data || this.review);
        return items.length ? el("div", { className: "zedo-list" }, ...items.map(item => this.renderReviewItem(item))) : emptyState(this.t.empty);
    }

    renderReviewItem(item) {
        return el("article", { className: "zedo-item" },
            el("div", { className: "zedo-item-main" },
                el("div", { className: "zedo-item-title" }, item.title || item.front || item.name || item.id),
                el("div", { className: "zedo-meta" }, item.type ? pill(item.type) : "", item.dueAt ? pill(formatDateTime(item.dueAt, this.language)) : "")
            ),
            item.type === "task" || item.type === "todo" ? button(this.t.complete, "secondary", this.busy, "button").tap(button => button.addEventListener("click", () => this.completeTask(item.id || item.sourceId))) : ""
        );
    }

    completeTask(id) {
        if (!id) return Promise.resolve();
        return this.mutate(() => this.request(`/tasks/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: this.nowPayload({ completed: true, completedAt: new Date().toISOString() })
        }));
    }
}

class ZedoSchedulePanel extends ZedoPanel {
    constructor(root) {
        super(root);
        this.dateValue = this.date === "today" ? localDate() : this.date;
        this.planning = {};
    }

    async fetchData() {
        const params = new URLSearchParams({ date: this.dateValue, collections: this.collections.join(",") });
        this.planning = await this.request(`/schedule/planning?${params}`);
    }

    renderToolbar() {
        const date = el("input", { className: "zedo-input", type: "date", value: this.dateValue });
        date.addEventListener("change", () => {
            this.dateValue = date.value || localDate();
            this.load();
        });
        return el("div", { className: "zedo-toolbar" }, el("div", { className: "zedo-controls" }, date, iconButton("refresh", this.t.refresh, () => this.load(), this.busy)));
    }

    renderContent() {
        const planning = this.planning.data || this.planning;
        const scheduled = getFirstArray(planning, ["scheduled", "timeline", "blocks", "items"]);
        const unscheduled = getFirstArray(planning, ["unscheduled", "unscheduledItems"]);
        const conflicts = getFirstArray(planning, ["conflicts"]);
        return el("div", { className: "zedo-stack" },
            conflicts.length ? el("section", { className: "zedo-section zedo-warning" }, el("div", { className: "zedo-section-title" }, "Conflicts"), ...conflicts.map(item => this.renderScheduleItem(item))) : "",
            this.renderScheduleGroup(this.t.schedule, scheduled),
            this.renderScheduleGroup("Unscheduled", unscheduled)
        );
    }

    renderScheduleGroup(title, items) {
        return el("section", { className: "zedo-section" },
            el("div", { className: "zedo-section-title" }, title),
            items.length ? el("div", { className: "zedo-list" }, ...items.map(item => this.renderScheduleItem(item))) : emptyState(this.t.empty)
        );
    }

    renderScheduleItem(item) {
        const sourceId = item.sourceId || item.id;
        return el("article", { className: "zedo-item" },
            el("div", { className: "zedo-item-main" },
                el("div", { className: "zedo-item-title" }, item.title || item.name || sourceId),
                el("div", { className: "zedo-meta" },
                    item.type ? pill(item.type) : "",
                    item.startAt ? pill(formatTime(item.startAt, this.language)) : "",
                    item.estimatedMinutes ? pill(`${item.estimatedMinutes} min`) : ""
                )
            ),
            sourceId && (item.type === "todo" || item.type === "task") ? this.renderReschedule(sourceId, item) : ""
        );
    }

    renderReschedule(id, item) {
        const time = el("input", { className: "zedo-input zedo-time-input", type: "time", value: isoToTime(item.startAt) });
        const minutes = el("input", { className: "zedo-input zedo-min-input", type: "number", min: "1", value: item.estimatedMinutes || 30 });
        const apply = iconButton("check", this.t.apply, () => this.rescheduleTask(id, time.value, minutes.value), this.busy);
        return el("div", { className: "zedo-inline-editor" }, time, minutes, apply);
    }

    rescheduleTask(id, time, minutes) {
        const dueAt = new Date(`${this.dateValue}T${time || "09:00"}`).toISOString();
        return this.mutate(() => this.request(`/tasks/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: this.nowPayload({ dueAt, estimatedMinutes: clampInt(Number(minutes), 1, 1440, 30) })
        }));
    }
}

function el(tag, attrs = {}, ...children) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs || {})) {
        if (value === false || value === null || value === undefined) continue;
        if (name === "className") element.className = value;
        else if (["checked", "disabled", "required", "selected"].includes(name)) element[name] = Boolean(value);
        else element.setAttribute(name, value);
    }
    for (const child of children.flat()) {
        if (child === null || child === undefined || child === "") continue;
        element.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    element.tap = callback => {
        callback(element);
        return element;
    };
    if (tag === "input" || tag === "textarea") trackComposition(element);
    return element;
}

function hidden(name, value) {
    return el("input", { type: "hidden", name, value });
}

function button(label, kind = "secondary", disabled = false, type = "submit") {
    return el("button", { className: `zedo-button zedo-button-${kind}`, type, disabled }, label);
}

function iconButton(icon, label, onClick, disabled = false) {
    const btn = el("button", { className: "zedo-icon-button", type: "button", title: label, "aria-label": label, disabled }, iconSvg(icon));
    btn.addEventListener("click", event => {
        event.preventDefault();
        if (!disabled) onClick();
    });
    return btn;
}

function iconSvg(icon) {
    const svg = svgElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" });
    const paths = {
        refresh: ["M21 12a9 9 0 0 1-15.6 6.1", "M3 12A9 9 0 0 1 18.6 5.9", "M18.5 2.8v3.4h-3.4", "M5.5 21.2v-3.4h3.4"],
        trash: ["M3 6h18", "M8 6V4h8v2", "M6 6l1 15h10l1-15"],
        edit: ["M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z", "M13 6l5 5"],
        x: ["M6 6l12 12", "M18 6 6 18"],
        up: ["M12 19V5", "M6 11l6-6 6 6"],
        down: ["M12 5v14", "M6 13l6 6 6-6"],
        check: ["M20 6 9 17l-5-5"]
    };
    for (const d of paths[icon] || paths.refresh) svg.append(svgElement("path", { d }));
    return svg;
}

function svgElement(tag, attrs) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
    return element;
}

function textField(name, label, value = "", required = false) {
    return el("label", { className: "zedo-field" }, el("span", {}, label), el("input", { className: "zedo-input", type: "text", name, value, required }));
}

function textareaField(name, label, value = "", required = false) {
    return el("label", { className: "zedo-field" }, el("span", {}, label), el("textarea", { className: "zedo-input", name, rows: "3", required }, value));
}

function numberField(name, label, value = "") {
    return el("label", { className: "zedo-field" }, el("span", {}, label), el("input", { className: "zedo-input", type: "number", min: "0", step: "1", name, value: value || "" }));
}

function datetimeField(name, label, value = "") {
    return el("label", { className: "zedo-field" }, el("span", {}, label), el("input", { className: "zedo-input", type: "datetime-local", name, value: isoToDatetimeLocal(value) }));
}

function dateField(name, label, value = "", required = false) {
    return el("label", { className: "zedo-field" }, el("span", {}, label), el("input", { className: "zedo-input", type: "date", name, value, required }));
}

function selectField(name, label, value, options) {
    return el("label", { className: "zedo-field" },
        el("span", {}, label),
        el("select", { className: "zedo-input", name }, ...options.map(([optionValue, optionLabel]) => el("option", { value: optionValue, selected: optionValue === value }, optionLabel)))
    );
}

function checkField(name, label, checked) {
    return el("label", { className: "zedo-check" }, el("input", { type: "checkbox", name, checked }), el("span", {}, label));
}

function segmented(options, value, onChange) {
    return el("div", { className: "zedo-segmented", role: "group" }, ...options.map(([optionValue, label]) => el("button", {
        className: "zedo-segment",
        type: "button",
        "aria-pressed": optionValue === value ? "true" : "false"
    }, label).tap(button => button.addEventListener("click", () => onChange(optionValue)))));
}

function toggleButton(value, label, checked, onChange) {
    return el("button", { className: "zedo-toggle", type: "button", "aria-pressed": checked ? "true" : "false" }, label)
        .tap(button => button.addEventListener("click", () => onChange(!checked, value)));
}

function emptyState(text) {
    return el("div", { className: "zedo-empty color-subdue" }, text);
}

function pill(text) {
    return text === "" || text === null || text === undefined ? "" : el("span", { className: "zedo-pill" }, text);
}

function swatch(color) {
    return el("span", { className: "zedo-swatch", style: color ? `background:${cssColor(color)}` : "" });
}

function cssColor(value) {
    return String(value).replace(/[;"'<>]/g, "");
}

function isComposingEvent(event) {
    return event.isComposing || event.keyCode === 229;
}

function trackComposition(input) {
    input.dataset.zedoComposing = "false";
    input.addEventListener("compositionstart", () => {
        input.dataset.zedoComposing = "true";
    });
    input.addEventListener("compositionend", () => {
        input.dataset.zedoComposing = "false";
    });
}

function onFormSubmit(form, callback) {
    form.addEventListener("submit", event => {
        event.preventDefault();
        if (isFormComposing(form)) return;
        callback(event);
    });
}

function isFormComposing(form) {
    const activeElement = form.ownerDocument.activeElement;
    return form.contains(activeElement) && activeElement.dataset.zedoComposing === "true";
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
    return {
        id: stringValue(task.id ?? task.sourceId),
        title: stringValue(task.title),
        notes: stringValue(task.notes ?? task.subtitle),
        categoryId: stringValue(task.categoryId ?? task.category_id),
        priority: normalizePriority(stringValue(task.priority || "medium")),
        focusEnabled: Boolean(task.focusEnabled ?? task.focus_enabled),
        starred: Boolean(task.starred),
        dueAt: stringValue(task.dueAt ?? task.due_at ?? task.startAt),
        reminderEnabled: Boolean(task.reminderEnabled ?? task.reminder_enabled),
        recurrence: task.recurrence || null,
        estimatedMinutes: task.estimatedMinutes ?? task.estimated_minutes ?? null,
        completed: Boolean(task.completed),
        completedAt: stringValue(task.completedAt ?? task.completed_at),
        createdAt: stringValue(task.createdAt ?? task.created_at),
        updatedAt: stringValue(task.updatedAt ?? task.updated_at),
        subtasks: getFirstArray(task, ["subtasks", "todoSubtasks"]).map(subtask => normalizeSubtask({ ...subtask, todoId: subtask.todoId || task.id }))
    };
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
        title: stringValue(category.title ?? category.name ?? category.id),
        icon: stringValue(category.icon),
        color: stringValue(category.color),
        updatedAt: stringValue(category.updatedAt ?? category.updated_at)
    };
}

function normalizeDeck(deck) {
    return {
        id: stringValue(deck.id),
        title: stringValue(deck.title ?? deck.name ?? deck.id),
        updatedAt: stringValue(deck.updatedAt ?? deck.updated_at)
    };
}

function normalizeCard(card) {
    return {
        id: stringValue(card.id ?? card.sourceId),
        front: stringValue(card.front ?? card.title),
        back: stringValue(card.back),
        notes: stringValue(card.notes),
        deckId: stringValue(card.deckId ?? card.deck_id),
        status: stringValue(card.status || (isDue(card.nextReviewAt) ? "due" : "active")),
        nextReviewAt: stringValue(card.nextReviewAt ?? card.next_review_at ?? card.dueAt),
        repeatRounds: card.repeatRounds ?? card.repeat_rounds ?? 1,
        reminderEnabled: Boolean(card.reminderEnabled ?? card.reminder_enabled),
        estimatedMinutes: card.estimatedMinutes ?? card.estimated_minutes ?? null,
        updatedAt: stringValue(card.updatedAt ?? card.updated_at)
    };
}

function normalizeHabit(habit) {
    return {
        id: stringValue(habit.id ?? habit.sourceId),
        title: stringValue(habit.title ?? habit.name),
        description: stringValue(habit.description ?? habit.notes),
        frequency: stringValue(habit.frequency || "daily"),
        currentStreak: Number(habit.currentStreak ?? habit.current_streak ?? 0),
        bestStreak: Number(habit.bestStreak ?? habit.best_streak ?? 0),
        estimatedMinutes: habit.estimatedMinutes ?? habit.estimated_minutes ?? null,
        updatedAt: stringValue(habit.updatedAt ?? habit.updated_at)
    };
}

function normalizeCompletion(completion) {
    return {
        id: stringValue(completion.id),
        habitId: stringValue(completion.habitId ?? completion.habit_id),
        completedDate: stringValue(completion.completedDate ?? completion.completed_date ?? completion.date),
        deletedAt: stringValue(completion.deletedAt ?? completion.deleted_at)
    };
}

function normalizeOverride(override) {
    return {
        id: stringValue(override.id),
        habitId: stringValue(override.habitId ?? override.habit_id),
        date: stringValue(override.date),
        startAt: stringValue(override.startAt ?? override.start_at),
        estimatedMinutes: override.estimatedMinutes ?? override.estimated_minutes ?? null
    };
}

function normalizeSession(session) {
    return {
        id: stringValue(session.id),
        taskId: stringValue(session.taskId ?? session.task_id ?? session.todoId),
        startedAt: stringValue(session.startedAt ?? session.started_at ?? session.createdAt),
        endedAt: stringValue(session.endedAt ?? session.ended_at),
        durationMinutes: session.durationMinutes ?? session.duration_minutes ?? session.focusMinutes ?? null,
        focusMinutes: session.focusMinutes ?? session.focus_minutes ?? null,
        notes: stringValue(session.notes)
    };
}

function normalizeAnniversary(anniversary) {
    return {
        id: stringValue(anniversary.id ?? anniversary.sourceId),
        title: stringValue(anniversary.title ?? anniversary.name),
        date: stringValue(anniversary.date),
        notes: stringValue(anniversary.notes),
        reminderEnabled: Boolean(anniversary.reminderEnabled ?? anniversary.reminder_enabled),
        updatedAt: stringValue(anniversary.updatedAt ?? anniversary.updated_at)
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
    const uniqueItems = [];
    for (const subtask of subtasks) {
        const key = subtask.id || `${subtask.todoId}:${subtask.order}:${subtask.title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueItems.push(subtask);
    }
    return uniqueItems;
}

function compareTasks(a, b) {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    const aDue = dateSortValue(a.dueAt);
    const bDue = dateSortValue(b.dueAt);
    if (aDue !== bDue) return aDue - bDue;
    return dateSortValue(b.updatedAt || b.createdAt) - dateSortValue(a.updatedAt || a.createdAt);
}

function uniqueById(items) {
    const map = new Map();
    for (const item of items) {
        if (item.id) map.set(item.id, item);
    }
    return [...map.values()];
}

function unique(items) {
    return [...new Set(items)];
}

function csvList(value, fallback) {
    const items = stringValue(value).split(",").map(item => item.trim()).filter(Boolean);
    return items.length ? items : [...fallback];
}

function localDate(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function dateSortValue(value) {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function isDue(value) {
    return !!value && dateSortValue(value) <= Date.now();
}

function formatDateTime(value, language) {
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

function formatDate(value, language) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { month: "2-digit", day: "2-digit" }).format(date);
}

function formatTime(value, language) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function isoToDatetimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isoToTime(value) {
    const local = isoToDatetimeLocal(value);
    return local ? local.slice(11, 16) : "";
}

function datetimeLocalToISOString(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function nextAnniversaryDate(value) {
    if (!value) return "";
    const [, month, day] = value.match(/^\d{4}-(\d{2})-(\d{2})$/) || [];
    if (!month || !day) return value;
    const now = new Date();
    let next = new Date(now.getFullYear(), Number(month) - 1, Number(day));
    if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next = new Date(now.getFullYear() + 1, Number(month) - 1, Number(day));
    return next.toISOString();
}

function formatSeconds(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
}

function flattenStats(value, prefix = "") {
    if (!value || typeof value !== "object") return [];
    const result = [];
    for (const [key, item] of Object.entries(value)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (item && typeof item === "object" && !Array.isArray(item)) result.push(...flattenStats(item, fullKey));
        else if (typeof item !== "object") result.push([fullKey, item]);
    }
    return result.slice(0, 24);
}

function formatStat(value, language) {
    if (typeof value === "number") return new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-US").format(value);
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return stringValue(value);
}

function humanizeKey(key) {
    return key.replace(/[._-]/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

function collectReviewItems(value) {
    const arrays = [
        ...getFirstArray(value, ["items", "reviewItems", "tasks", "todos"]).map(item => ({ ...item, type: item.type || "task" })),
        ...getFirstArray(value, ["memory", "memoryCards"]).map(item => ({ ...item, type: item.type || "memory" })),
        ...getFirstArray(value, ["habits"]).map(item => ({ ...item, type: item.type || "habit" })),
        ...getFirstArray(value, ["anniversaries"]).map(item => ({ ...item, type: item.type || "anniversary" }))
    ];
    if (arrays.length) return arrays;
    const groups = value.groups || {};
    return Object.entries(groups).flatMap(([type, items]) => Array.isArray(items) ? items.map(item => ({ ...item, type })) : []);
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
