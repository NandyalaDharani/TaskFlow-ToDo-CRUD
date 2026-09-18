"use strict";

/*
  TASKFLOW
  JavaScript Logic & State Management

  Assignment requirements:
  - Create
  - Read
  - Update
  - Delete
  - localStorage
  - Filtering
  - Dynamic DOM
  - Event delegation
*/


// ==========================================
// STORAGE KEYS
// ==========================================

const STORAGE_KEY = "taskflow.tasks.v2";
const THEME_KEY = "taskflow.theme";


// ==========================================
// APPLICATION STATE
// ==========================================

const state = {

  tasks: loadTasks(),

  filter: "all",

  search: "",

  sort: "newest",

  editingId: null

};


// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {

  form: document.getElementById("taskForm"),

  taskInput: document.getElementById("taskInput"),

  priorityInput: document.getElementById("priorityInput"),

  dueDateInput: document.getElementById("dueDateInput"),

  submitBtn: document.getElementById("submitBtn"),

  list: document.getElementById("taskList"),

  emptyState: document.getElementById("emptyState"),

  filterButtons: document.getElementById("filterButtons"),

  searchInput: document.getElementById("searchInput"),

  sortSelect: document.getElementById("sortSelect"),

  clearCompletedBtn:
    document.getElementById("clearCompletedBtn"),

  clearAllBtn:
    document.getElementById("clearAllBtn"),

  themeBtn:
    document.getElementById("themeBtn"),

  totalCount:
    document.getElementById("totalCount"),

  activeCount:
    document.getElementById("activeCount"),

  completedCount:
    document.getElementById("completedCount"),

  progressText:
    document.getElementById("progressText"),

  progressBar:
    document.getElementById("progressBar"),

  resultText:
    document.getElementById("resultText"),

  toast:
    document.getElementById("toast")

};


let toastTimer = null;


// ==========================================
// INITIALIZE APPLICATION
// ==========================================

init();


function init() {

  applySavedTheme();

  bindEvents();

  render();

  elements.taskInput.focus();

}


// ==========================================
// EVENT LISTENERS
// ==========================================

function bindEvents() {

  // CREATE
  elements.form.addEventListener(
    "submit",
    handleFormSubmit
  );


  // EVENT DELEGATION
  elements.list.addEventListener(
    "click",
    handleTaskClick
  );

  elements.list.addEventListener(
    "change",
    handleTaskChange
  );

  elements.list.addEventListener(
    "keydown",
    handleTaskKeydown
  );


  // FILTER
  elements.filterButtons.addEventListener(
    "click",
    handleFilterClick
  );


  // SEARCH
  elements.searchInput.addEventListener(
    "input",
    handleSearch
  );


  // SORT
  elements.sortSelect.addEventListener(
    "change",
    handleSort
  );


  // CLEAR COMPLETED
  elements.clearCompletedBtn.addEventListener(
    "click",
    clearCompleted
  );


  // DELETE ALL
  elements.clearAllBtn.addEventListener(
    "click",
    clearAll
  );


  // THEME
  elements.themeBtn.addEventListener(
    "click",
    toggleTheme
  );

}


// ==========================================
// LOAD TASKS FROM LOCAL STORAGE
// ==========================================

function loadTasks() {

  try {

    const saved =
      localStorage.getItem(STORAGE_KEY);


    if (!saved) {
      return [];
    }


    const parsed =
      JSON.parse(saved);


    if (!Array.isArray(parsed)) {
      return [];
    }


    return parsed

      .filter(isValidTask)

      .map(task => ({

        id: String(task.id),

        title:
          String(task.title).trim(),

        completed:
          Boolean(task.completed),

        priority:
          ["low", "medium", "high"].includes(
            task.priority
          )
            ? task.priority
            : "medium",

        dueDate:
          typeof task.dueDate === "string"
            ? task.dueDate
            : "",

        createdAt:
          Number.isFinite(
            Number(task.createdAt)
          )
            ? Number(task.createdAt)
            : Date.now()

      }));


  } catch (error) {

    console.error(
      "TaskFlow: localStorage data could not be read.",
      error
    );

    return [];

  }

}


// ==========================================
// VALIDATE TASK
// ==========================================

function isValidTask(task) {

  return (

    task &&

    typeof task === "object" &&

    task.id !== undefined &&

    typeof task.title === "string" &&

    task.title.trim().length > 0

  );

}


// ==========================================
// SAVE STATE
// ==========================================

function saveTasks() {

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state.tasks)
    );

  } catch (error) {

    console.error(
      "TaskFlow: localStorage data could not be saved.",
      error
    );

    showToast(
      "Could not save data in this browser."
    );

  }

}


// ==========================================
// CREATE
// ==========================================

function createTask(
  title,
  priority,
  dueDate
) {

  const task = {

    id: createId(),

    title,

    completed: false,

    priority,

    dueDate,

    createdAt: Date.now()

  };


  state.tasks.unshift(task);


  saveTasks();

  render();

  showToast("Task added.");

}


// ==========================================
// READ
// ==========================================

function getVisibleTasks() {

  const query =
    state.search.trim().toLowerCase();


  let visible =
    state.tasks.filter(task => {


      // ACTIVE FILTER
      if (
        state.filter === "active" &&
        task.completed
      ) {
        return false;
      }


      // COMPLETED FILTER
      if (
        state.filter === "completed" &&
        !task.completed
      ) {
        return false;
      }


      // SEARCH
      if (
        query &&
        !task.title
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }


      return true;

    });


  visible = [...visible];


  // NEWEST
  if (state.sort === "newest") {

    visible.sort(
      (a, b) =>
        b.createdAt - a.createdAt
    );

  }


  // OLDEST
  else if (state.sort === "oldest") {

    visible.sort(
      (a, b) =>
        a.createdAt - b.createdAt
    );

  }


  // PRIORITY
  else if (state.sort === "priority") {

    const weight = {

      high: 3,

      medium: 2,

      low: 1

    };

    visible.sort(
      (a, b) =>
        weight[b.priority] -
        weight[a.priority]
    );

  }


  // DUE DATE
  else if (state.sort === "dueDate") {

    visible.sort((a, b) => {

      if (
        !a.dueDate &&
        !b.dueDate
      ) {
        return b.createdAt - a.createdAt;
      }


      if (!a.dueDate) {
        return 1;
      }


      if (!b.dueDate) {
        return -1;
      }


      return a.dueDate.localeCompare(
        b.dueDate
      );

    });

  }


  return visible;

}


// ==========================================
// RENDER APPLICATION
// ==========================================

function render() {

  renderStats();


  const visibleTasks =
    getVisibleTasks();


  elements.list.innerHTML =
    visibleTasks
      .map(task => renderTask(task))
      .join("");


  elements.emptyState.hidden =
    visibleTasks.length > 0;


  if (visibleTasks.length === 0) {

    const heading =
      elements.emptyState.querySelector("h2");

    const paragraph =
      elements.emptyState.querySelector("p");


    heading.textContent =
      state.tasks.length === 0
        ? "No tasks yet"
        : "No tasks found";


    paragraph.textContent =
      state.tasks.length === 0
        ? "Add your first task above to get started."
        : "Try another filter or search term.";

  }


  // Update filter buttons
  elements.filterButtons
    .querySelectorAll("[data-filter]")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.filter ===
          state.filter
      );

    });


  elements.searchInput.value =
    state.search;


  elements.sortSelect.value =
    state.sort;

}


// ==========================================
// CREATE HTML FOR ONE TASK
// ==========================================

function renderTask(task) {

  const editing =
    state.editingId === task.id;


  // EDIT MODE
  if (editing) {

    return `

      <li
        class="task-item"
        data-id="${escapeHTML(task.id)}"
      >

        <input
          class="task-check"
          type="checkbox"
          data-action="toggle"
          ${task.completed ? "checked" : ""}
          aria-label="Toggle task completion"
        >


        <div class="task-main">

          <input
            class="edit-input"
            data-role="edit-input"
            type="text"
            maxlength="120"
            value="${escapeAttribute(task.title)}"
            aria-label="Edit task"
          >

        </div>


        <div class="task-actions">

          <button
            class="action-btn"
            type="button"
            data-action="save-edit"
          >
            Save
          </button>


          <button
            class="action-btn"
            type="button"
            data-action="cancel-edit"
          >
            Cancel
          </button>

        </div>

      </li>

    `;

  }


  // DUE DATE
  const dueMarkup =
    task.dueDate

      ? `

        <span
          class="${isOverdue(task) ? "overdue" : ""}"
        >
          📅 ${formatDate(task.dueDate)}
        </span>

      `

      : "";


  // NORMAL MODE
  return `

    <li
      class="task-item ${
        task.completed ? "completed" : ""
      }"
      data-id="${escapeHTML(task.id)}"
    >

      <input
        class="task-check"
        type="checkbox"
        data-action="toggle"
        ${task.completed ? "checked" : ""}
        aria-label="Toggle task completion"
      >


      <div class="task-main">

        <span class="task-title">
          ${escapeHTML(task.title)}
        </span>


        <div class="task-meta">

          <span
            class="priority priority-${task.priority}"
          >
            ${task.priority}
          </span>

          ${dueMarkup}

        </div>

      </div>


      <div class="task-actions">

        <button
          class="action-btn"
          type="button"
          data-action="edit"
        >
          Edit
        </button>


        <button
          class="action-btn delete"
          type="button"
          data-action="delete"
        >
          Delete
        </button>

      </div>

    </li>

  `;

}


// ==========================================
// STATISTICS
// ==========================================

function renderStats() {

  const total =
    state.tasks.length;


  const completed =
    state.tasks.filter(
      task => task.completed
    ).length;


  const active =
    total - completed;


  const progress =
    total === 0
      ? 0
      : Math.round(
          (completed / total) * 100
        );


  elements.totalCount.textContent =
    String(total);


  elements.activeCount.textContent =
    String(active);


  elements.completedCount.textContent =
    String(completed);


  elements.progressText.textContent =
    `${progress}%`;


  elements.progressBar.style.width =
    `${progress}%`;


  const visibleCount =
    getVisibleTasks().length;


  elements.resultText.textContent =
    `${visibleCount} ${
      visibleCount === 1
        ? "task"
        : "tasks"
    }`;

}


// ==========================================
// UPDATE
// ==========================================

function updateTask(id, changes) {

  const index =
    state.tasks.findIndex(
      task => task.id === id
    );


  if (index === -1) {
    return false;
  }


  state.tasks[index] = {

    ...state.tasks[index],

    ...changes

  };


  saveTasks();


  return true;

}


// ==========================================
// START EDITING
// ==========================================

function startEditing(id) {

  if (
    !state.tasks.some(
      task => task.id === id
    )
  ) {
    return;
  }


  state.editingId = id;


  render();


  const input =
    elements.list.querySelector(
      "[data-role='edit-input']"
    );


  if (input) {

    input.focus();

    input.select();

  }

}


// ==========================================
// SAVE EDIT
// ==========================================

function saveEdit(id) {

  const item =
    findTaskElement(id);


  if (!item) {
    return;
  }


  const input =
    item.querySelector(
      "[data-role='edit-input']"
    );


  if (!input) {
    return;
  }


  const title =
    input.value.trim();


  if (!title) {

    input.focus();

    showToast(
      "Task title cannot be empty."
    );

    return;

  }


  updateTask(
    id,
    {
      title
    }
  );


  state.editingId = null;


  render();


  showToast("Task updated.");

}


// ==========================================
// DELETE ONE TASK
// ==========================================

function deleteTask(id) {

  const task =
    state.tasks.find(
      item => item.id === id
    );


  if (!task) {
    return;
  }


  state.tasks =
    state.tasks.filter(
      item => item.id !== id
    );


  state.editingId = null;


  saveTasks();

  render();

  showToast("Task deleted.");

}


// ==========================================
// CLEAR COMPLETED
// ==========================================

function clearCompleted() {

  const before =
    state.tasks.length;


  state.tasks =
    state.tasks.filter(
      task => !task.completed
    );


  const removed =
    before - state.tasks.length;


  state.editingId = null;


  saveTasks();

  render();


  showToast(

    removed > 0

      ? `${removed} completed ${
          removed === 1
            ? "task"
            : "tasks"
        } cleared.`

      : "There are no completed tasks."

  );

}


// ==========================================
// DELETE ALL
// ==========================================

function clearAll() {

  if (state.tasks.length === 0) {

    showToast(
      "There are no tasks to delete."
    );

    return;

  }


  const confirmed =
    window.confirm(
      "Delete all tasks? This action cannot be undone."
    );


  if (!confirmed) {
    return;
  }


  state.tasks = [];

  state.editingId = null;


  saveTasks();

  render();


  showToast(
    "All tasks deleted."
  );

}


// ==========================================
// FORM SUBMIT
// ==========================================

function handleFormSubmit(event) {

  event.preventDefault();


  const title =
    elements.taskInput.value.trim();


  const priority =
    elements.priorityInput.value;


  const dueDate =
    elements.dueDateInput.value;


  if (!title) {

    elements.taskInput.focus();

    showToast(
      "Please enter a task."
    );

    return;

  }


  createTask(
    title,
    priority,
    dueDate
  );


  elements.form.reset();


  elements.priorityInput.value =
    "medium";


  elements.taskInput.focus();

}


// ==========================================
// TASK CLICK EVENT DELEGATION
// ==========================================

function handleTaskClick(event) {

  const button =
    event.target.closest(
      "[data-action]"
    );


  if (!button) {
    return;
  }


  const item =
    button.closest("[data-id]");


  if (!item) {
    return;
  }


  const id =
    item.dataset.id;


  const action =
    button.dataset.action;


  if (action === "edit") {

    startEditing(id);

  }


  else if (action === "delete") {

    deleteTask(id);

  }


  else if (action === "save-edit") {

    saveEdit(id);

  }


  else if (action === "cancel-edit") {

    state.editingId = null;

    render();

  }

}


// ==========================================
// TASK CHANGE EVENT
// ==========================================

function handleTaskChange(event) {

  const checkbox =
    event.target.closest(
      "[data-action='toggle']"
    );


  if (!checkbox) {
    return;
  }


  const item =
    checkbox.closest("[data-id]");


  if (!item) {
    return;
  }


  const changed =
    updateTask(

      item.dataset.id,

      {
        completed:
          checkbox.checked
      }

    );


  if (changed) {

    render();


    showToast(

      checkbox.checked

        ? "Task completed!"

        : "Task marked active."

    );

  }

}


// ==========================================
// EDIT KEYBOARD EVENTS
// ==========================================

function handleTaskKeydown(event) {

  if (
    event.key !== "Enter" &&
    event.key !== "Escape"
  ) {
    return;
  }


  const input =
    event.target.closest(
      "[data-role='edit-input']"
    );


  if (!input) {
    return;
  }


  const item =
    input.closest("[data-id]");


  if (!item) {
    return;
  }


  if (event.key === "Enter") {

    event.preventDefault();

    saveEdit(
      item.dataset.id
    );

  }


  else {

    state.editingId = null;

    render();

  }

}


// ==========================================
// FILTER
// ==========================================

function handleFilterClick(event) {

  const button =
    event.target.closest(
      "[data-filter]"
    );


  if (!button) {
    return;
  }


  state.filter =
    button.dataset.filter;


  state.editingId = null;


  render();

}


// ==========================================
// SEARCH
// ==========================================

function handleSearch(event) {

  state.search =
    event.target.value;


  state.editingId = null;


  render();

}


// ==========================================
// SORT
// ==========================================

function handleSort(event) {

  state.sort =
    event.target.value;


  render();

}


// ==========================================
// DARK / LIGHT THEME
// ==========================================

function applySavedTheme() {

  try {

    const savedTheme =
      localStorage.getItem(
        THEME_KEY
      );


    if (savedTheme === "dark") {

      document.body.classList.add(
        "dark"
      );

    }


    updateThemeButton();

  }

  catch (error) {

    console.error(
      "TaskFlow: theme preference could not be loaded.",
      error
    );

  }

}


function toggleTheme() {

  document.body.classList.toggle(
    "dark"
  );


  const theme =
    document.body.classList.contains(
      "dark"
    )
      ? "dark"
      : "light";


  try {

    localStorage.setItem(
      THEME_KEY,
      theme
    );

  }

  catch (error) {

    console.error(
      "TaskFlow: theme preference could not be saved.",
      error
    );

  }


  updateThemeButton();

}


function updateThemeButton() {

  const dark =
    document.body.classList.contains(
      "dark"
    );


  elements.themeBtn.textContent =
    dark ? "☀️" : "🌙";


  elements.themeBtn.setAttribute(

    "aria-label",

    dark
      ? "Switch to light theme"
      : "Switch to dark theme"

  );

}


// ==========================================
// HELPER: CREATE UNIQUE ID
// ==========================================

function createId() {

  if (

    typeof crypto !== "undefined" &&

    typeof crypto.randomUUID ===
      "function"

  ) {

    return crypto.randomUUID();

  }


  return (

    `${Date.now()}-` +

    `${Math.random()
      .toString(16)
      .slice(2)}`

  );

}


// ==========================================
// HELPER: FIND TASK ELEMENT
// ==========================================

function findTaskElement(id) {

  return Array.from(
    elements.list.querySelectorAll(
      "[data-id]"
    )
  ).find(
    element =>
      element.dataset.id === id
  );

}


// ==========================================
// HELPER: FORMAT DATE
// ==========================================

function formatDate(dateString) {

  const date =
    new Date(
      `${dateString}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return dateString;

  }


  return new Intl.DateTimeFormat(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  ).format(date);

}


// ==========================================
// HELPER: CHECK OVERDUE
// ==========================================

function isOverdue(task) {

  if (
    !task.dueDate ||
    task.completed
  ) {
    return false;
  }


  const today =
    new Date();


  const localToday =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );


  const due =
    new Date(
      `${task.dueDate}T00:00:00`
    );


  return due < localToday;

}


// ==========================================
// SECURITY: ESCAPE HTML
// ==========================================

function escapeHTML(value) {

  return String(value).replace(
    /[&<>"']/g,
    character => {

      const map = {

        "&": "&amp;",

        "<": "&lt;",

        ">": "&gt;",

        '"': "&quot;",

        "'": "&#039;"

      };


      return map[character];

    }
  );

}


function escapeAttribute(value) {

  return escapeHTML(value);

}


// ==========================================
// CSS ESCAPE FALLBACK
// ==========================================

function cssEscape(value) {

  if (
    window.CSS &&
    typeof window.CSS.escape ===
      "function"
  ) {

    return window.CSS.escape(
      value
    );

  }


  return String(value).replace(
    /["\\]/g,
    "\\$&"
  );

}


// ==========================================
// TOAST MESSAGE
// ==========================================

function showToast(message) {

  window.clearTimeout(
    toastTimer
  );


  elements.toast.textContent =
    message;


  elements.toast.classList.add(
    "show"
  );


  toastTimer =
    window.setTimeout(
      () => {

        elements.toast.classList.remove(
          "show"
        );

      },
      2200
    );

}