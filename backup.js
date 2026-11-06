
"use strict";

(() => {
  const keys = {
    tasks: "studyflow-tasks",
    state: "studyflow-v2-data",
    theme: "studyflow-theme"
  };

  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");

  if (!exportBtn || !importBtn || !importFile) {
    console.error("Backup controls missing from HTML.");
    return;
  }

  function read(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  }

  function exportData() {
    try {
      const backup = {
        app: "StudyFlow",
        backupVersion: 1,
        exportedAt: new Date().toISOString(),
        data: {
          tasks: read(keys.tasks, []),
          state: read(keys.state, null),
          theme: read(keys.theme, "light")
        }
      };

      if (!backup.data.state) {
        alert("No StudyFlow semester data found.");
        return;
      }

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download =
        "StudyFlow-Backup-" +
        new Date().toISOString().slice(0, 10) +
        ".json";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (error) {
      console.error(error);
      alert("Export failed: " + error.message);
    }
  }

  async function importData(file) {
    if (!file) return;

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Maximum backup size is 10 MB.");
      }

      const backup = JSON.parse(await file.text());

      if (
        backup.app !== "StudyFlow" ||
        backup.backupVersion !== 1 ||
        !backup.data ||
        !Array.isArray(backup.data.tasks) ||
        !backup.data.state ||
        !Array.isArray(backup.data.state.semesters) ||
        backup.data.state.semesters.length === 0 ||
        !["light", "dark"].includes(backup.data.theme)
      ) {
        throw new Error("Invalid StudyFlow backup.");
      }

      const state = backup.data.state;
      const semesterIds = new Set();

      for (const sem of state.semesters) {
        if (
          !sem || typeof sem.id !== "string" ||
          typeof sem.name !== "string" ||
          !Array.isArray(sem.subjects) ||
          !sem.subjects.every(s => typeof s === "string") ||
          semesterIds.has(sem.id)
        ) {
          throw new Error("Invalid semester data.");
        }
        semesterIds.add(sem.id);
      }

      if (!semesterIds.has(state.currentSemester)) {
        throw new Error("Invalid active semester.");
      }

      for (const key of [
        "timetable", "exams", "notes", "sessions"
      ]) {
        if (
          !Array.isArray(state[key]) ||
          !state[key].every(item =>
            item &&
            typeof item.id === "string" &&
            semesterIds.has(item.semesterId)
          )
        ) {
          throw new Error("Invalid " + key + " data.");
        }
      }

      if (!backup.data.tasks.every(task =>
        task &&
        typeof task.name === "string" &&
        typeof task.subject === "string" &&
        typeof task.completed === "boolean" &&
        semesterIds.has(task.semesterId)
      )) {
        throw new Error("Invalid task data.");
      }

      if (!confirm(
        "Import this StudyFlow backup?\n\n" +
        "This will REPLACE your current saved data.\n" +
        "Export your current data first."
      )) {
        return;
      }

      const previous = {};
      Object.values(keys).forEach(key => {
        previous[key] = localStorage.getItem(key);
      });

      try {
        localStorage.setItem(
          keys.tasks,
          JSON.stringify(backup.data.tasks)
        );

        localStorage.setItem(
          keys.state,
          JSON.stringify(state)
        );

        localStorage.setItem(
          keys.theme,
          JSON.stringify(backup.data.theme)
        );
      } catch (error) {
        try {
          Object.values(keys).forEach(key => {
            if (previous[key] === null) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, previous[key]);
            }
          });
        } catch (rollbackError) {
          console.error("Rollback failed:", rollbackError);
          throw new Error(
            "Import failed and recovery failed. " +
            "Keep your original backup file."
          );
        }
        throw error;
      }

      alert("Backup restored! Reloading StudyFlow.");
      location.reload();

    } catch (error) {
      console.error(error);
      alert("Import failed: " + error.message);
    }
  }

  exportBtn.addEventListener("click", exportData);

  importBtn.addEventListener("click", () => {
    importFile.click();
  });

  importFile.addEventListener("change", async event => {
    await importData(event.target.files[0]);
    event.target.value = "";
  });

  console.log("StudyFlow Backup System Ready");
})();






