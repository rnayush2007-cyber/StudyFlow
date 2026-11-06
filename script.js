
"use strict";

/* =========================================
   STUDYFLOW 2.0 — APPLICATION LOGIC
   ========================================= */

/* 1. STORAGE */

const TASK_KEY = "studyflow-tasks";
const THEME_KEY = "studyflow-theme";
const DATA_KEY = "studyflow-v2-data";

const DEFAULT_SUBJECTS = [
  "Biochemistry",
  "Microbiology",
  "Mathematics",
  "Thermodynamics",
  "Other"
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const $ = id => document.getElementById(id);

const uid = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Date.now().toString(36) +
      Math.random().toString(36).slice(2);

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null
      ? fallback
      : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showNotice(
      "Storage unavailable. Changes may not be saved."
    );
    return false;
  }
}

function showNotice(message) {
  const notice = $("notice");
  notice.textContent = message;

  clearTimeout(showNotice.timeout);

  showNotice.timeout = setTimeout(() => {
    notice.textContent = "";
  }, 3500);
}

/* 2. INITIAL DATA */

const initialState = {
  semesters: [
    {
      id: "sem-default",
      name: "Semester 3",
      subjects: [...DEFAULT_SUBJECTS]
    }
  ],
  currentSemester: "sem-default",
  timetable: [],
  exams: [],
  notes: [],
  sessions: []
};

let state = readJSON(DATA_KEY, initialState);

if (
  !state ||
  !Array.isArray(state.semesters) ||
  state.semesters.length === 0
) {
  state = structuredClone(initialState);
}

for (const key of [
  "timetable",
  "exams",
  "notes",
  "sessions"
]) {
  if (!Array.isArray(state[key])) {
    state[key] = [];
  }
}

state.semesters.forEach(sem => {
  if (!Array.isArray(sem.subjects)) {
    sem.subjects = ["Other"];
  }
});

if (
  !state.semesters.some(
    s => s.id === state.currentSemester
  )
) {
  state.currentSemester = state.semesters[0].id;
}

/* Preserve old StudyFlow tasks */

let tasks = readJSON(TASK_KEY, []);

if (!Array.isArray(tasks)) {
  tasks = [];
}

const fallbackSemester =
  state.semesters.find(s => s.id === "sem-default") ||
  state.semesters[0];

tasks = tasks
  .filter(t => t && typeof t === "object")
  .map(t => ({
    ...t,
    id: t.id || uid(),
    name: String(t.name || "Untitled task"),
    subject: String(t.subject || "Other"),
    completed: Boolean(t.completed),
    semesterId: t.semesterId || fallbackSemester.id,
    due: t.due || ""
  }));

tasks.forEach(task => {
  if (
    !state.semesters.some(
      s => s.id === task.semesterId
    )
  ) {
    task.semesterId = fallbackSemester.id;
  }

  const sem = state.semesters.find(
    s => s.id === task.semesterId
  );

  if (
    sem &&
    !sem.subjects.includes(task.subject)
  ) {
    sem.subjects.push(task.subject);
  }
});

function saveAll() {
  saveJSON(TASK_KEY, tasks);
  saveJSON(DATA_KEY, state);
}

/* 3. DOM HELPERS */

function element(tag, text, className) {
  const node = document.createElement(tag);

  if (text !== undefined && text !== null) {
    node.textContent = String(text);
  }

  if (className) {
    node.className = className;
  }

  return node;
}

function empty(container, message) {
  container.replaceChildren(
    element("p", message, "empty")
  );
}

function addButton(text, className, action) {
  const button = element(
    "button",
    text,
    className
  );

  button.type = "button";
  button.addEventListener("click", action);

  return button;
}

function getSemester() {
  return state.semesters.find(
    s => s.id === state.currentSemester
  );
}

function semesterTasks() {
  return tasks.filter(
    t => t.semesterId === state.currentSemester
  );
}

function semesterRecords(key) {
  return state[key].filter(
    item => item.semesterId === state.currentSemester
  );
}

function optionsFor(selectId, subjects) {
  const select = $(selectId);
  const previous = select.value;

  select.replaceChildren();

  subjects.forEach(subject => {
    const option = element("option", subject);
    option.value = subject;
    select.append(option);
  });

  if (subjects.includes(previous)) {
    select.value = previous;
  }
}

/* 4. DATE HELPERS */

function localDateString(date = new Date()) {
  const y = date.getFullYear();

  const m = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const d = String(
    date.getDate()
  ).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function daysUntil(dateString) {
  const [y, m, d] =
    dateString.split("-").map(Number);

  const now = new Date();

  const todayUTC = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  return Math.round(
    (
      Date.UTC(y, m - 1, d) - todayUTC
    ) / 86400000
  );
}

function dateLabel(dateString) {
  if (!dateString) {
    return "No date";
  }

  const [y, m, d] =
    dateString.split("-").map(Number);

  return new Date(
    y,
    m - 1,
    d
  ).toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}

function percent(done, total) {
  return total
    ? Math.round(done / total * 100)
    : 0;
}

function setProgress(id, value) {
  $(id).style.width = value + "%";
}

/* 5. NAVIGATION */

let activePage = "dashboard";

function showPage(page) {
  activePage = page;

  document
    .querySelectorAll(".page")
    .forEach(section => {
      section.classList.toggle(
        "active",
        section.id === page
      );
    });

  document
    .querySelectorAll(".nav button")
    .forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.page === page
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document
  .querySelectorAll("[data-page]")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      showPage(btn.dataset.page);
    });
  });

document
  .querySelectorAll("[data-go]")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      showPage(btn.dataset.go);
    });
  });

/* 6. SEMESTER MANAGEMENT */

function renderSemesterOptions() {
  const select = $("globalSemester");

  select.replaceChildren();

  state.semesters.forEach(sem => {
    const option = element(
      "option",
      sem.name
    );

    option.value = sem.id;
    select.append(option);
  });

  select.value = state.currentSemester;
}

$("globalSemester")
  .addEventListener("change", event => {
    state.currentSemester = event.target.value;

    saveJSON(DATA_KEY, state);

    clearNoteForm();
    renderAll();
    resetTimer();
  });

$("semesterForm")
  .addEventListener("submit", event => {
    event.preventDefault();

    const name =
      $("semesterName").value.trim();

    if (!name) return;

    if (
      state.semesters.some(
        s => s.name.toLowerCase() ===
          name.toLowerCase()
      )
    ) {
      showNotice("This semester already exists.");
      return;
    }

    const semester = {
      id: uid(),
      name,
      subjects: ["Other"]
    };

    state.semesters.push(semester);
    state.currentSemester = semester.id;

    $("semesterName").value = "";

    saveJSON(DATA_KEY, state);
    renderAll();
    resetTimer();

    showNotice(name + " created!");
  });

function renderSemesters() {
  const container = $("semesterList");
  container.replaceChildren();

  state.semesters.forEach(sem => {
    const card = element(
      "div",
      null,
      "card"
    );

    const count = tasks.filter(
      t => t.semesterId === sem.id
    ).length;

    card.append(
      element("h2", sem.name),
      element(
        "p",
        sem.subjects.length +
          " subjects • " +
          count +
          " tasks",
        "muted"
      )
    );

    if (
      sem.id === state.currentSemester
    ) {
      card.append(
        element(
          "span",
          "Active Semester",
          "pill"
        )
      );
    } else {
      card.append(
        addButton(
          "Switch to Semester",
          "secondary",
          () => {
            state.currentSemester = sem.id;

            saveJSON(DATA_KEY, state);
            clearNoteForm();
            renderAll();
            resetTimer();
          }
        )
      );
    }

    container.append(card);
  });
}

/* 7. SUBJECT MANAGEMENT */

$("subjectForm")
  .addEventListener("submit", event => {
    event.preventDefault();

    const name =
      $("subjectName").value.trim();

    if (!name) return;

    const sem = getSemester();

    if (
      sem.subjects.some(
        s => s.toLowerCase() ===
          name.toLowerCase()
      )
    ) {
      showNotice("Subject already exists.");
      return;
    }

    sem.subjects.push(name);

    $("subjectName").value = "";

    saveJSON(DATA_KEY, state);
    renderAll();

    showNotice("Subject added!");
  });

function renderSubjects() {
  const container = $("subjectList");
  container.replaceChildren();

  const subjects = getSemester().subjects;

  subjects.forEach(subject => {
    const card = element(
      "div",
      null,
      "card subject-card"
    );

    const related = semesterTasks().filter(
      t => t.subject === subject
    );

    const completed = related.filter(
      t => t.completed
    ).length;

    card.append(
      element(
        "div",
        subject,
        "subject-name"
      ),
      element(
        "p",
        `${completed} of ${related.length} tasks completed`,
        "muted"
      )
    );

    const bar = element(
      "div",
      null,
      "progress-track"
    );

    const fill = element(
      "div",
      null,
      "progress-fill"
    );

    fill.style.width =
      percent(
        completed,
        related.length
      ) + "%";

    bar.append(fill);
    card.append(bar);

    if (subject !== "Other") {
      const remove = addButton(
        "Remove Subject",
        "secondary",
        () => {
          const used =
            semesterTasks().some(
              t => t.subject === subject
            ) ||
            [
              "timetable",
              "exams",
              "notes"
            ].some(key =>
              semesterRecords(key).some(
                r => r.subject === subject
              )
            );

          if (used) {
            showNotice(
              "Move or delete this subject's records first."
            );
            return;
          }

          if (
            !confirm(
              "Remove " + subject + "?"
            )
          ) {
            return;
          }

          getSemester().subjects =
            getSemester().subjects.filter(
              s => s !== subject
            );

          saveJSON(DATA_KEY, state);
          renderAll();
        }
      );

      remove.style.marginTop = "16px";
      card.append(remove);
    }

    container.append(card);
  });

 


  for (const id of [
    "taskSubject",
    "scheduleSubject",
    "examSubject",
    "noteSubject",
    "materialSubject"
  ]) {
    optionsFor(id, subjects);
  }

} // End of renderSubjects()

/* 8. TASK MANAGER */


$("taskForm")
  .addEventListener("submit", event => {
    event.preventDefault();

    const name =
      $("taskInput").value.trim();

    if (!name) return;

    tasks.push({
      id: uid(),
      name,
      subject: $("taskSubject").value,
      semesterId: state.currentSemester,
      due: $("taskDue").value,
      completed: false
    });

    $("taskInput").value = "";
    $("taskDue").value = "";

    saveAll();
    renderAll();

    showNotice("Task added!");
  });

function toggleTask(id, checked) {
  const task = tasks.find(
    t => t.id === id
  );

  if (!task) return;

  task.completed = checked;

  saveAll();
  renderAll();
}

function deleteTask(id) {
  if (
    !confirm("Delete this task?")
  ) {
    return;
  }

  tasks = tasks.filter(
    t => t.id !== id
  );

  saveAll();
  renderAll();
}

function renderTasks() {
  const container = $("taskList");
  container.replaceChildren();

  const current =
    semesterTasks().sort(
      (a, b) =>
        Number(a.completed) -
        Number(b.completed)
    );

  const done = current.filter(
    t => t.completed
  ).length;

  $("taskCount").textContent =
    `${done}/${current.length} completed`;

  setProgress(
    "taskProgress",
    percent(done, current.length)
  );

  if (!current.length) {
    empty(
      container,
      "No tasks in this semester yet."
    );
    return;
  }

  current.forEach(task => {
    const row = element(
      "div",
      null,
      "item"
    );

    if (task.completed) {
      row.classList.add("done");
    }

    const checkbox = element("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;

    checkbox.addEventListener(
      "change",
      () => toggleTask(
        task.id,
        checkbox.checked
      )
    );

    const info = element(
      "div",
      null,
      "item-info"
    );

    info.append(
      element("strong", task.name),
      element(
        "small",
        task.subject +
          (
            task.due
              ? " • Due " +
                dateLabel(task.due)
              : ""
          )
      )
    );

    row.append(
      checkbox,
      info,
      addButton(
        "Delete",
        "danger",
        () => deleteTask(task.id)
      )
    );

    container.append(row);
  });
}

/* 9. TIMETABLE */

$("scheduleForm")
  .addEventListener("submit", event => {
    event.preventDefault();

    const start =
      $("scheduleStart").value;

    const end =
      $("scheduleEnd").value;

    if (end <= start) {
      showNotice(
        "End time must be after start time."
      );
      return;
    }

    state.timetable.push({
      id: uid(),
      semesterId: state.currentSemester,
      subject: $("scheduleSubject").value,
      day: $("scheduleDay").value,
      start,
      end,
      type: $("scheduleType").value
    });

    saveJSON(DATA_KEY, state);
    renderTimetable();

    showNotice("Session added!");
  });

function renderTimetable() {
  const container = $("weekGrid");
  container.replaceChildren();

  DAYS.forEach(dayName => {
    const day = element(
      "div",
      null,
      "day"
    );

    day.append(
      element("h4", dayName)
    );

    const sessions =
      semesterRecords("timetable")
        .filter(
          s => s.day === dayName
        )
        .sort(
          (a, b) =>
            a.start.localeCompare(b.start)
        );

    sessions.forEach(session => {
      const chip = element(
        "div",
        null,
        "session-chip"
      );

      chip.append(
        element("strong", session.subject),
        element(
          "span",
          `${session.start}–${session.end}`
        ),
        element("span", session.type)
      );

      chip.append(
        addButton(
          "Remove",
          "",
          () => {
            state.timetable =
              state.timetable.filter(
                s => s.id !== session.id
              );

            saveJSON(DATA_KEY, state);
            renderTimetable();
          }
        )
      );

      day.append(chip);
    });

    container.append(day);
  });
}

/* 10. EXAM COUNTDOWN */

$("examForm")
  .addEventListener("submit", event => {
    event.preventDefault();

    state.exams.push({
      id: uid(),
      semesterId: state.currentSemester,
      name: $("examName").value.trim(),
      subject: $("examSubject").value,
      date: $("examDate").value
    });

    $("examName").value = "";
    $("examDate").value = "";

    saveJSON(DATA_KEY, state);
    renderAll();

    showNotice("Exam added!");
  });

function futureExams() {
  return semesterRecords("exams")
    .filter(
      e => daysUntil(e.date) >= 0
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date)
    );
}

function renderExams() {
  const container = $("examList");
  container.replaceChildren();

  const exams = [
    ...semesterRecords("exams")
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date)
  );

  if (!exams.length) {
    empty(
      container,
      "No exams added yet."
    );
    return;
  }

  exams.forEach(exam => {
    const remaining =
      daysUntil(exam.date);

    const card = element(
      "div",
      null,
      "card"
    );

    const status =
      remaining < 0
        ? "Completed Date"
        : remaining === 0
          ? "Today!"
          : remaining + " days left";

    card.append(
      element("h2", exam.name),
      element(
        "p",
        exam.subject,
        "muted"
      ),
      element(
        "p",
        dateLabel(exam.date),
        "muted"
      ),
      element(
        "span",
        status,
        "pill"
      )
    );

    const remove = addButton(
      "Delete Exam",
      "danger",
      () => {
        if (
          !confirm("Delete exam?")
        ) {
          return;
        }

        state.exams =
          state.exams.filter(
            e => e.id !== exam.id
          );

        saveJSON(DATA_KEY, state);
        renderAll();
      }
    );

    remove.style.display = "block";
    remove.style.marginTop = "15px";

    card.append(remove);
    container.append(card);
  });
}

/* 11. STUDY ANALYTICS */

function studySessions() {
  return semesterRecords("sessions");
}

function studyMinutes() {
  return studySessions().reduce(
    (sum, s) =>
      sum + Number(s.minutes || 0),
    0
  );
}

function renderAnalytics() {
  const current = semesterTasks();

  const done = current.filter(
    t => t.completed
  ).length;

  $("analyticsRate").textContent =
    percent(
      done,
      current.length
    ) + "%";

  $("analyticsSessions").textContent =
    studySessions().length;

  $("analyticsMinutes").textContent =
    studyMinutes();

  const subjects =
    $("subjectAnalytics");

  subjects.replaceChildren();

  getSemester().subjects.forEach(subject => {
    const subset = current.filter(
      t => t.subject === subject
    );

    const finished = subset.filter(
      t => t.completed
    ).length;

    const p = percent(
      finished,
      subset.length
    );

    const row = element(
      "div",
      null,
      "bar-row"
    );

    const label = element(
      "div",
      null,
      "bar-label"
    );

    label.append(
      element("span", subject),
      element("span", p + "%")
    );

    const bar = element(
      "div",
      null,
      "progress-track"
    );

    const fill = element(
      "div",
      null,
      "progress-fill"
    );

    fill.style.width = p + "%";

    bar.append(fill);
    row.append(label, bar);
    subjects.append(row);
  });

  const daily = $("dailyAnalytics");
  daily.replaceChildren();

  // Aggregate each date once.
  const totals = {};

  studySessions().forEach(session => {
    totals[session.date] =
      (totals[session.date] || 0) +
      Number(session.minutes || 0);
  });

  const dates = [];

  for (
    let offset = 6;
    offset >= 0;
    offset--
  ) {
    const date = new Date();

    date.setHours(12, 0, 0, 0);
    date.setDate(
      date.getDate() - offset
    );

    dates.push(
      localDateString(date)
    );
  }

  const maxMinutes = Math.max(
    60,
    ...dates.map(
      date => totals[date] || 0
    )
  );

  dates.forEach(date => {
    const minutes =
      totals[date] || 0;

    const row = element(
      "div",
      null,
      "bar-row"
    );

    const label = element(
      "div",
      null,
      "bar-label"
    );

    label.append(
      element(
        "span",
        dateLabel(date)
      ),
      element(
        "span",
        minutes + " min"
      )
    );

    const bar = element(
      "div",
      null,
      "progress-track"
    );

    const fill = element(
      "div",
      null,
      "progress-fill"
    );

    fill.style.width =
      Math.min(
        100,
        minutes / maxMinutes * 100
      ) + "%";

    bar.append(fill);
    row.append(label, bar);
    daily.append(row);
  });
}

/* 12. POMODORO TIMER */

let timerInterval = null;
let timerRunning = false;
let timerMode = "focus";
let timerEnd = 0;
let remainingSeconds = 25 * 60;
let timerSemester =
  state.currentSemester;

// Store the duration used by the active session.
let sessionFocusSeconds = 25 * 60;

function getDuration(id, min, max) {
  const value = Number($(id).value);

  return Number.isFinite(value)
    ? Math.min(
        max,
        Math.max(
          min,
          Math.round(value)
        )
      )
    : min;
}

function focusDuration() {
  return getDuration(
    "focusMinutes",
    1,
    180
  ) * 60;
}

function breakDuration() {
  return getDuration(
    "breakMinutes",
    1,
    60
  ) * 60;
}

function displayTimer() {
  const minutes =
    Math.floor(remainingSeconds / 60);

  const seconds =
    remainingSeconds % 60;

  $("timerDisplay").textContent =
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0");

  $("timerMode").textContent =
    timerMode === "focus"
      ? "Focus Session"
      : "Break Time";
}

function pauseTimer() {
  if (!timerRunning) return;

  remainingSeconds = Math.max(
    0,
    Math.ceil(
      (timerEnd - Date.now()) / 1000
    )
  );

  timerRunning = false;

  clearInterval(timerInterval);
  timerInterval = null;

  displayTimer();
}

function resetTimer() {
  clearInterval(timerInterval);

  timerInterval = null;
  timerRunning = false;
  timerMode = "focus";

  timerSemester =
    state.currentSemester;

  sessionFocusSeconds =
    focusDuration();

  remainingSeconds =
    sessionFocusSeconds;

  displayTimer();
}

function timerTick() {
  remainingSeconds = Math.max(
    0,
    Math.ceil(
      (timerEnd - Date.now()) / 1000
    )
  );

  displayTimer();

  if (remainingSeconds !== 0) {
    return;
  }

  clearInterval(timerInterval);

  timerInterval = null;
  timerRunning = false;

  if (timerMode === "focus") {
    state.sessions.push({
      id: uid(),
      semesterId: timerSemester,
      date: localDateString(),
      minutes: sessionFocusSeconds / 60
    });

    saveJSON(DATA_KEY, state);
    renderAll();

    showNotice(
      "Focus completed! Time for a break."
    );

    timerMode = "break";
    remainingSeconds =
      breakDuration();
  } else {
    showNotice(
      "Break complete! Ready to focus."
    );

    timerMode = "focus";

    sessionFocusSeconds =
      focusDuration();

    remainingSeconds =
      sessionFocusSeconds;
  }

  displayTimer();
}

$("timerStart").addEventListener(
  "click",
  () => {
    if (timerRunning) return;

    timerSemester =
      state.currentSemester;

    timerRunning = true;

    timerEnd =
      Date.now() +
      remainingSeconds * 1000;

    timerInterval = setInterval(
      timerTick,
      250
    );
  }
);

$("timerPause").addEventListener(
  "click",
  pauseTimer
);

$("timerReset").addEventListener(
  "click",
  resetTimer
);

[
  "focusMinutes",
  "breakMinutes"
].forEach(id => {
  $(id).addEventListener(
    "change",
    resetTimer
  );
});

/* 13. NOTES MANAGER */

let editingNoteId = null;

function clearNoteForm() {
  editingNoteId = null;

  $("noteTitle").value = "";
  $("noteBody").value = "";

  $("noteFormTitle").textContent =
    "Create Note";

  $("noteSave").textContent =
    "Save Note";
}

$("noteCancel").addEventListener(
  "click",
  clearNoteForm
);

$("noteForm").addEventListener(
  "submit",
  event => {
    event.preventDefault();

    const title =
      $("noteTitle").value.trim();

    const body =
      $("noteBody").value.trim();

    if (!title || !body) {
      return;
    }

    if (editingNoteId) {
      const note = state.notes.find(
        n =>
          n.id === editingNoteId &&
          n.semesterId ===
            state.currentSemester
      );

      if (note) {
        note.title = title;
        note.body = body;
        note.subject =
          $("noteSubject").value;

        note.updated =
          new Date().toISOString();
      }
    } else {
      state.notes.push({
        id: uid(),
        semesterId: state.currentSemester,
        title,
        body,
        subject: $("noteSubject").value,
        updated: new Date().toISOString()
      });
    }

    saveJSON(DATA_KEY, state);
    clearNoteForm();
    renderNotes();

    showNotice("Note saved!");
  }
);

function editNote(id) {
  const note = state.notes.find(
    n =>
      n.id === id &&
      n.semesterId ===
        state.currentSemester
  );

  if (!note) return;

  editingNoteId = note.id;

  $("noteTitle").value = note.title;
  $("noteBody").value = note.body;
  $("noteSubject").value = note.subject;

  $("noteFormTitle").textContent =
    "Edit Note";

  $("noteSave").textContent =
    "Update Note";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function renderNotes() {
  const container = $("notesList");
  container.replaceChildren();

  const notes =
    semesterRecords("notes")
      .sort(
        (a, b) =>
          b.updated.localeCompare(
            a.updated
          )
      );

  if (!notes.length) {
    empty(
      container,
      "No notes yet."
    );
    return;
  }

  notes.forEach(note => {
    const card = element(
      "div",
      null,
      "card"
    );

    card.append(
      element("h2", note.title),
      element(
        "span",
        note.subject,
        "pill"
      ),
      element(
        "p",
        note.body,
        "note"
      )
    );

    const controls = element(
      "div",
      null,
      "form-row"
    );

    controls.append(
      addButton(
        "Edit",
        "secondary",
        () => editNote(note.id)
      ),
      addButton(
        "Delete",
        "danger",
        () => {
          if (
            !confirm(
              "Delete this note?"
            )
          ) {
            return;
          }

          state.notes =
            state.notes.filter(
              n => n.id !== note.id
            );

          saveJSON(DATA_KEY, state);
          renderNotes();
        }
      )
    );

    card.append(controls);
    container.append(card);
  });
}

/* 14. OFFLINE STUDY ASSISTANT */

function appendMessage(message, type) {
  const log = $("chatLog");

  log.append(
    element(
      "div",
      message,
      "bubble " + type
    )
  );

  log.scrollTop =
    log.scrollHeight;
}

function assistantReply(query) {
  const q = query.toLowerCase();

  const current =
    semesterTasks();

  const pending = current.filter(
    t => !t.completed
  );

  const upcoming =
    futureExams();

  const completed = current.filter(
    t => t.completed
  ).length;

  if (
    q.includes("exam") ||
    q.includes("countdown")
  ) {
    if (!upcoming.length) {
      return (
        "You have no upcoming exams saved. " +
        "Add an exam date in the Exams section."
      );
    }

    return (
      "Your upcoming exams:\n\n" +
      upcoming.slice(0, 5).map(e =>
        `• ${e.name} (${e.subject}): ` +
        `${daysUntil(e.date)} days left`
      ).join("\n")
    );
  }

  if (
    q.includes("plan") ||
    q.includes("study")
  ) {
    if (!pending.length) {
      return (
        "You have no pending tasks! " +
        "Add subjects and tasks first.\n\n" +
        "Try 25 minutes of focused study " +
        "followed by a 5-minute break."
      );
    }

    return (
      "Suggested study plan:\n\n" +
      pending.slice(0, 4).map(
        (t, i) =>
          `${i + 1}. ${t.name} — ${t.subject}`
      ).join("\n") +
      "\n\nStudy one task at a time " +
      "using your Pomodoro timer."
    );
  }

  if (
    q.includes("progress") ||
    q.includes("analytics")
  ) {
    return (
      `In ${getSemester().name}, ` +
      `you completed ${completed} of ` +
      `${current.length} tasks ` +
      `(${percent(completed, current.length)}%). ` +
      `You have recorded ${studyMinutes()} ` +
      "minutes of focus time."
    );
  }

  if (
    q.includes("task") ||
    q.includes("pending")
  ) {
    return pending.length
      ? (
        "Your pending tasks:\n\n" +
        pending.slice(0, 8).map(
          t =>
            "• " + t.name +
            " (" + t.subject + ")"
        ).join("\n")
      )
      : "No pending tasks in this semester.";
  }

  if (
    q.includes("focus") ||
    q.includes("pomodoro")
  ) {
    return (
      "Try the Pomodoro method:\n\n" +
      "1. Choose one task.\n" +
      "2. Focus for 25 minutes.\n" +
      "3. Take a 5-minute break.\n" +
      "4. Repeat.\n\n" +
      "Use the Focus Timer section."
    );
  }

  if (q.includes("subject")) {
    return (
      "Subjects in this semester:\n\n" +
      getSemester().subjects.map(
        s => "• " + s
      ).join("\n")
    );
  }

  return (
    "I'm your offline StudyFlow helper!\n\n" +
    "I can show your tasks, exam countdowns, " +
    "progress, subjects and study plans.\n\n" +
    "Try asking:\n" +
    "• Plan my study\n" +
    "• Upcoming exams\n" +
    "• My progress\n" +
    "• Pending tasks\n" +
    "• Focus tips\n\n" +
    "For general AI explanations, " +
    "a real AI service must be connected later."
  );
}

function askAssistant(question) {
  const text = question.trim();

  if (!text) return;

  appendMessage(
    text,
    "user"
  );

  appendMessage(
    assistantReply(text),
    "bot"
  );
}

$("chatForm").addEventListener(
  "submit",
  event => {
    event.preventDefault();

    askAssistant(
      $("chatInput").value
    );

    $("chatInput").value = "";
  }
);

document
  .querySelectorAll("[data-ask]")
  .forEach(btn => {
    btn.addEventListener(
      "click",
      () => {
        askAssistant(
          btn.dataset.ask
        );
      }
    );
  });

/* 15. DASHBOARD */

function renderDashboard() {
  const current =
    semesterTasks();

  const done = current.filter(
    t => t.completed
  ).length;

  const pending = current.filter(
    t => !t.completed
  );

  $("dashTotal").textContent =
    current.length;

  $("dashDone").textContent =
    done;

  $("dashExams").textContent =
    futureExams().length;

  const progress = percent(
    done,
    current.length
  );

  $("dashProgressText").textContent =
    progress + "% completed";

  setProgress(
    "dashProgressBar",
    progress
  );

  $("dashFocus").textContent =
    studyMinutes() + " min";

  /* Pending tasks */

  const taskContainer =
    $("dashTaskList");

  taskContainer.replaceChildren();

  if (!pending.length) {
    empty(
      taskContainer,
      "No pending tasks."
    );
  } else {
    pending.slice(0, 5).forEach(task => {
      const row = element(
        "div",
        null,
        "item"
      );

      const info = element(
        "div",
        null,
        "item-info"
      );

      info.append(
        element(
          "strong",
          task.name
        ),
        element(
          "small",
          task.subject
        )
      );

      row.append(info);
      taskContainer.append(row);
    });
  }

  /* Next exam */

  const examContainer =
    $("nextExam");

  examContainer.replaceChildren();

  const next = futureExams()[0];

  if (next) {
    examContainer.append(
      element(
        "h3",
        next.name
      ),
      element(
        "p",
        next.subject,
        "muted"
      ),
      element(
        "p",
        dateLabel(next.date),
        "muted"
      ),
      element(
        "span",
        daysUntil(next.date) === 0
          ? "Today!"
          : daysUntil(next.date) +
            " days left",
        "pill"
      )
    );
  } else {
    empty(
      examContainer,
      "No upcoming exams."
    );
  }

  /* Semester overview */

  const overview =
    $("semesterOverview");

  overview.replaceChildren();

  overview.append(
    element(
      "h3",
      getSemester().name
    ),
    element(
      "p",
      getSemester().subjects.length +
        " subjects",
      "muted"
    ),
    element(
      "p",
      current.length +
        " tasks • " +
        done +
        " completed",
      "muted"
    ),
    element(
      "p",
      semesterRecords("notes").length +
        " notes",
      "muted"
    )
  );
}

/* 16. DARK MODE */

function applyTheme() {
  const dark =
    readJSON(
      THEME_KEY,
      "light"
    ) === "dark";

  document.body.classList.toggle(
    "dark",
    dark
  );

  $("themeBtn").textContent =
    dark
      ? "☀️ Light Mode"
      : "🌙 Dark Mode";
}

$("themeBtn").addEventListener(
  "click",
  () => {
    const dark =
      document.body.classList.contains(
        "dark"
      );

    saveJSON(
      THEME_KEY,
      dark ? "light" : "dark"
    );

    applyTheme();
  }
);

/* 17. INITIALIZE THE APP */

/* =====================================
   STUDYFLOW — STUDY MATERIALS LIBRARY
   ===================================== */

const MATERIAL_DB = "StudyFlowMaterials";
const MATERIAL_STORE = "files";
const MATERIAL_MAX_SIZE = 25 * 1024 * 1024;

const MATERIAL_TYPES = new Set([
  "pdf", "doc", "docx",
  "ppt", "pptx",
  "xls", "xlsx", "csv",
  "txt", "md",
  "png", "jpg", "jpeg"
]);

function openMaterialsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MATERIAL_DB, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(MATERIAL_STORE)) {
        db.createObjectStore(MATERIAL_STORE, {
          keyPath: "id"
        });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => reject(
      request.error || new Error("Cannot open database")
    );
  });
}

async function saveMaterial(record) {
  const db = await openMaterialsDB();

  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(
        MATERIAL_STORE, "readwrite"
      );

      tx.objectStore(MATERIAL_STORE).put(record);

      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function getMaterials() {
  const db = await openMaterialsDB();

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        MATERIAL_STORE, "readonly"
      );

      const request =
        tx.objectStore(MATERIAL_STORE).getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function removeMaterial(id) {
  const db = await openMaterialsDB();

  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(
        MATERIAL_STORE, "readwrite"
      );

      tx.objectStore(MATERIAL_STORE).delete(id);

      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function materialExtension(filename) {
  return filename.split(".").pop().toLowerCase();
}

function materialIcon(filename) {
  const ext = materialExtension(filename);

  if (ext === "pdf") return "📕";
  if (["doc", "docx"].includes(ext)) return "📘";
  if (["ppt", "pptx"].includes(ext)) return "📙";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📗";
  if (["png", "jpg", "jpeg"].includes(ext)) return "🖼️";

  return "📄";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";

  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

$("materialForm").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const file = $("materialFile").files[0];
    if (!file) return;

    const ext = materialExtension(file.name);

    if (!MATERIAL_TYPES.has(ext)) {
      showNotice("Unsupported file type.");
      return;
    }

    if (file.size > MATERIAL_MAX_SIZE) {
      showNotice("File must be 25 MB or smaller.");
      return;
    }

    const record = {
      id: uid(),
      semesterId: state.currentSemester,
      subject: $("materialSubject").value,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      file: file
    };

    try {
      await saveMaterial(record);

      $("materialFile").value = "";

      showNotice("Study material saved!");
      await renderMaterials();

    } catch (error) {
      console.error(error);
      showNotice("Could not save this file.");
    }
  }
);

async function downloadMaterial(record, preview = false) {
  const url = URL.createObjectURL(record.file);

  const ext = materialExtension(record.name);

  const browserPreview = [
    "pdf", "png", "jpg", "jpeg", "txt"
  ].includes(ext);

  if (preview && browserPreview) {
    const tab = window.open(url, "_blank");

    if (!tab) {
      URL.revokeObjectURL(url);
      showNotice("Allow pop-ups to preview this file.");
      return;
    }
  } else {
    const link = document.createElement("a");

    link.href = url;
    link.download = record.name;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // Keep the temporary URL alive for previews/downloads.
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

async function renderMaterials() {
  const container = $("materialList");
  container.replaceChildren();

  $("materialCount").textContent = "Loading...";

  try {
    const all = await getMaterials();

    const current = all.filter(
      file => file.semesterId === state.currentSemester
    );

    $("materialCount").textContent =
      current.length + " files";

    if (!current.length) {
      empty(container, "No study materials uploaded yet.");
      return;
    }

    current.sort((a, b) =>
      b.uploadedAt.localeCompare(a.uploadedAt)
    );

    current.forEach(record => {
      const row = element("div", null, "material-item");

      const icon = element(
        "span",
        materialIcon(record.name),
        "material-icon"
      );

      const info = element("div", null, "material-info");

      info.append(
        element("strong", record.name),
        element(
          "small",
          record.subject + " • " +
          formatFileSize(record.size)
        )
      );

      const actions = element(
        "div", null, "material-actions"
      );

      actions.append(
        addButton("Open", "secondary", () => {
          downloadMaterial(record, true);
        }),

        addButton("Download", "secondary", () => {
          downloadMaterial(record, false);
        }),

        addButton("Delete", "danger", async () => {
          if (!confirm("Delete this study material?")) {
            return;
          }

          try {
            await removeMaterial(record.id);
            await renderMaterials();
            showNotice("File deleted.");
          } catch (error) {
            console.error(error);
            showNotice("Could not delete file.");
          }
        })
      );

      row.append(icon, info, actions);
      container.append(row);
    });

  } catch (error) {
    console.error(error);
    $("materialCount").textContent = "Error";
    empty(container, "Unable to load materials.");
  }
}



function renderAll() {
  renderSemesterOptions();
  renderSemesters();
  renderSubjects();
  renderTasks();
  renderTimetable();
  renderExams();
  renderAnalytics();
  renderNotes();
  renderDashboard();
  renderMaterials();
}



renderAll();
applyTheme();
resetTimer();

appendMessage(
  "Hey Ayush! 👋 Welcome to StudyFlow 2.0.\n\n" +
  "I'm your offline study assistant. " +
  "Ask me about your tasks, progress, " +
  "exams or study plans.",
  "bot"
);

// Refresh countdowns and analytics.
setInterval(() => {
  renderExams();
  renderDashboard();
  renderAnalytics();
}, 60000);

/* =========================================
   STUDYFLOW 2.0 — BACKUP & RESTORE
   ========================================= */

const BACKUP_VERSION = 1;
const MAX_BACKUP_SIZE = 10 * 1024 * 1024;

// Create a downloadable JSON backup.
function exportStudyFlowData() {
  try {
    const backup = {
      app: "StudyFlow",
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),

      data: {
        tasks: tasks,
        state: state,
        theme: localStorage.getItem(THEME_KEY)
          ? readJSON(THEME_KEY, "light")
          : "light"
      }
    };

    const json = JSON.stringify(backup, null, 2);

    const blob = new Blob([json], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
      "StudyFlow-Backup-" +
      localDateString() +
      ".json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    showNotice("StudyFlow backup created!");
  } catch (error) {
    console.error("Export failed:", error);
    showNotice("Unable to export backup.");
  }
}

// Verify a backup before importing it.
function validateStudyFlowBackup(backup) {
  if (
    !backup ||
    typeof backup !== "object" ||
    Array.isArray(backup) ||
    backup.app !== "StudyFlow" ||
    backup.backupVersion !== BACKUP_VERSION
  ) {
    throw new Error("Not a supported StudyFlow backup.");
  }

  const data = backup.data;

  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray(data.tasks) ||
    !data.state ||
    typeof data.state !== "object"
  ) {
    throw new Error("Backup data is missing.");
  }

  const importedState = data.state;

  if (
    !Array.isArray(importedState.semesters) ||
    importedState.semesters.length === 0 ||
    typeof importedState.currentSemester !== "string"
  ) {
    throw new Error("Invalid semester data.");
  }

  const semesterIds = new Set();

  for (const sem of importedState.semesters) {
    if (
      !sem ||
      typeof sem.id !== "string" ||
      !sem.id ||
      typeof sem.name !== "string" ||
      !Array.isArray(sem.subjects) ||
      !sem.subjects.every(
        subject => typeof subject === "string"
      ) ||
      semesterIds.has(sem.id)
    ) {
      throw new Error("Invalid semester structure.");
    }

    semesterIds.add(sem.id);
  }

  if (!semesterIds.has(importedState.currentSemester)) {
    throw new Error("Active semester is missing.");
  }

  for (const key of [
    "timetable",
    "exams",
    "notes",
    "sessions"
  ]) {
    if (!Array.isArray(importedState[key])) {
      throw new Error("Invalid " + key + " data.");
    }

    for (const record of importedState[key]) {
      if (
        !record ||
        typeof record !== "object" ||
        typeof record.id !== "string" ||
        !semesterIds.has(record.semesterId)
      ) {
        throw new Error("Invalid record in " + key + ".");
      }
    }
  }

  for (const task of data.tasks) {
    if (
      !task ||
      typeof task !== "object" ||
      !["string", "number"].includes(typeof task.id) ||
      typeof task.name !== "string" ||
      typeof task.subject !== "string" ||
      typeof task.completed !== "boolean" ||
      !semesterIds.has(task.semesterId)
    ) {
      throw new Error("Invalid task data.");
    }
  }

  if (!["light", "dark"].includes(data.theme)) {
    throw new Error("Invalid theme setting.");
  }

  return data;
}

// Restore the previous values if saving fails.
function restorePreviousValues(previous) {
  for (const key of [
    TASK_KEY,
    DATA_KEY,
    THEME_KEY
  ]) {
    if (previous[key] === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, previous[key]);
    }
  }
}

async function importStudyFlowData(file) {
  if (!file) return;

  try {
    if (file.size > MAX_BACKUP_SIZE) {
      throw new Error("Backup exceeds the 10 MB limit.");
    }

    const content = await file.text();
    const parsed = JSON.parse(content);

    const imported = validateStudyFlowBackup(parsed);

    const semesterCount =
      imported.state.semesters.length;

    const taskCount =
      imported.tasks.length;

    const noteCount =
      imported.state.notes.length;

    const message =
      "Restore this StudyFlow backup?\n\n" +
      "Semesters: " + semesterCount + "\n" +
      "Tasks: " + taskCount + "\n" +
      "Notes: " + noteCount + "\n\n" +
      "WARNING: This REPLACES your current " +
      "StudyFlow data in this browser.\n\n" +
      "Export your current data first if " +
      "you want to keep a copy.";

    if (!confirm(message)) {
      showNotice("Import cancelled.");
      return;
    }

    // Remember the current browser data.
    const previous = {
      [TASK_KEY]: localStorage.getItem(TASK_KEY),
      [DATA_KEY]: localStorage.getItem(DATA_KEY),
      [THEME_KEY]: localStorage.getItem(THEME_KEY)
    };

    try {
      localStorage.setItem(
        TASK_KEY,
        JSON.stringify(imported.tasks)
      );

      localStorage.setItem(
        DATA_KEY,
        JSON.stringify(imported.state)
      );

      localStorage.setItem(
        THEME_KEY,
        JSON.stringify(imported.theme)
      );
    } catch (storageError) {
      console.error("Import save failed:", storageError);

      try {
        restorePreviousValues(previous);
      } catch (rollbackError) {
        console.error(
          "Rollback failed:",
          rollbackError
        );

        throw new Error(
          "Import failed and automatic recovery failed. " +
          "Check your previously exported backup."
        );
      }

      throw new Error(
        "Unable to save imported data. " +
        "Your previous browser values were restored."
      );
    }

    alert(
      "StudyFlow data restored successfully!\n\n" +
      "The app will now reload."
    );

    // Reload variables from restored localStorage.
    window.location.reload();

  } catch (error) {
    console.error("Import error:", error);

    alert(
      "Could not import this backup.\n\n" +
      error.message
    );
  }
}

// EXPORT BUTTON
$("exportBtn").addEventListener("click", () => {
  exportStudyFlowData();
});

// IMPORT BUTTON
$("importBtn").addEventListener("click", () => {
  $("importFile").click();
});

// FILE SELECTION
$("importFile").addEventListener(
  "change",
  async event => {
    const file = event.target.files[0];

    await importStudyFlowData(file);

    // Allows selecting the same file again.
    event.target.value = "";
  }
);
