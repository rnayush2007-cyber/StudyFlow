
"use strict";

/* =========================================
   STUDYFLOW 2.0
   GOOGLE LOGIN + CLOUD SYNC
   ACCOUNT-SPECIFIC STORAGE
   ========================================= */

(() => {

  // ========================================

  
  // 1. SUPABASE CONFIGURATION
  // ========================================

const PROJECT_URL =
  "https://hqxumaauszmavelndvmj.supabase.co";

const PUBLISHABLE_KEY =
  "sb_publishable_LUIW4YhZcQhiB6CfbDEFGw_iIjbnWm_";

  const TASK_KEY = "studyflow-tasks";
  const DATA_KEY = "studyflow-v2-data";
  const THEME_KEY = "studyflow-theme";

  const ACCOUNT_KEY = "studyflow-active-account";
  const UNLOCK_KEY = "studyflow-cloud-unlocked-user";

  const READY_PREFIX = "studyflow-account-cloud-ready:";
  const STORAGE_PREFIX = "studyflow-account:";

  const $ = id => document.getElementById(id);

  let client = null;
  let currentUser = null;
  let busy = false;

  // ========================================
  // 2. ACCOUNT-SPECIFIC LOCAL STORAGE
  // ========================================

  /*
    This provides a fallback storage wrapper.

    IMPORTANT:
    account-storage.js should load BEFORE script.js
    and backup.js in index.html.

    The fallback below cannot undo any reads or
    writes performed before cloud.js loads.
  */

  const ACADEMIC_KEYS = new Set([
    TASK_KEY,
    DATA_KEY,
    THEME_KEY
  ]);

  function installAccountStorage() {

    // Avoid wrapping storage a second time if
    // the earlier account-storage.js is active.

    const existing =
      Storage.prototype.getItem.toString();

    if (existing.includes("scopedKey(this, key)")) {
      console.log(
        "Existing account-storage.js detected."
      );
      return;
    }

    const originalGet = Storage.prototype.getItem;
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;

    function scopedKey(storage, key) {

      key = String(key);

      if (
        storage !== window.localStorage ||
        !ACADEMIC_KEYS.has(key)
      ) {
        return key;
      }

      const accountId =
        sessionStorage.getItem(ACCOUNT_KEY);

      const namespace =
        accountId || "signed-out";

      return (
        STORAGE_PREFIX +
        namespace +
        ":" +
        key
      );
    }

    Storage.prototype.getItem = function(key) {
      return originalGet.call(
        this,
        scopedKey(this, key)
      );
    };

    Storage.prototype.setItem = function(key, value) {
      return originalSet.call(
        this,
        scopedKey(this, key),
        value
      );
    };

    Storage.prototype.removeItem = function(key) {
      return originalRemove.call(
        this,
        scopedKey(this, key)
      );
    };

    console.log(
      "StudyFlow account-specific storage enabled."
    );
  }

  installAccountStorage();

  // ========================================
  // 3. HELPERS
  // ========================================

  function showStatus(message) {

    const element = $("cloudStatus");

    if (element) {
      element.textContent = message;
    }

    console.log("[StudyFlow Cloud]", message);
  }

  function readJSON(key, fallback) {

    try {

      const raw = localStorage.getItem(key);

      return raw === null
        ? fallback
        : JSON.parse(raw);

    } catch {
      return fallback;
    }
  }

  function getLocalData() {

    return {
      tasks: readJSON(TASK_KEY, []),
      state: readJSON(DATA_KEY, null),
      theme: readJSON(THEME_KEY, "light")
    };
  }

  function validateData(data) {

    if (
      !data ||
      !Array.isArray(data.tasks) ||
      !data.state ||
      !Array.isArray(data.state.semesters) ||
      data.state.semesters.length === 0
    ) {
      throw new Error(
        "Invalid StudyFlow academic data."
      );
    }

    const state = data.state;

    const semesterIds = new Set();

    for (const semester of state.semesters) {

      if (
        !semester ||
        typeof semester.id !== "string" ||
        !semester.id ||
        typeof semester.name !== "string" ||
        !Array.isArray(semester.subjects) ||
        semesterIds.has(semester.id)
      ) {
        throw new Error(
          "Invalid semester information."
        );
      }

      semesterIds.add(semester.id);
    }

    if (!semesterIds.has(state.currentSemester)) {
      throw new Error(
        "Invalid active semester."
      );
    }

    for (const key of [
      "timetable",
      "exams",
      "notes",
      "sessions"
    ]) {

      if (!Array.isArray(state[key])) {
        throw new Error(
          "Invalid " + key + " records."
        );
      }

      for (const record of state[key]) {

        if (
          !record ||
          typeof record !== "object" ||
          !semesterIds.has(record.semesterId)
        ) {
          throw new Error(
            "Invalid " + key + " record."
          );
        }
      }
    }

    for (const task of data.tasks) {

      if (
        !task ||
        typeof task.name !== "string" ||
        typeof task.subject !== "string" ||
        typeof task.completed !== "boolean" ||
        !semesterIds.has(task.semesterId)
      ) {
        throw new Error(
          "Invalid task information."
        );
      }
    }

    if (!["light", "dark"].includes(data.theme)) {
      throw new Error(
        "Invalid theme setting."
      );
    }

    return data;
  }

  function revisionKey() {

    if (!currentUser) {
      throw new Error("Not signed in.");
    }

    return (
      "studyflow-cloud-revision-" +
      currentUser.id
    );
  }

  function getRevision() {

    const value =
      localStorage.getItem(revisionKey());

    if (value === null) return null;

    const revision = Number(value);

    return Number.isInteger(revision)
      ? revision
      : null;
  }

  function saveRevision(revision) {

    localStorage.setItem(
      revisionKey(),
      String(revision)
    );
  }

  function accountReadyKey() {

    if (!currentUser) {
      throw new Error("Not signed in.");
    }

    return READY_PREFIX + currentUser.id;
  }

  function markAccountReady() {

    localStorage.setItem(
      accountReadyKey(),
      "yes"
    );
  }

  function isAccountReady() {

    return (
      localStorage.getItem(accountReadyKey()) ===
      "yes"
    );
  }

  // ========================================
  // 4. LOGIN SCREEN AND APP UI
  // ========================================

  function lockApp() {

    const gate = $("cloudGate");

    if (gate) {
      gate.hidden = false;
    }

    const sidebar = $("cloudSidebar");

    if (sidebar) {
      sidebar.hidden = true;
    }
  }

  function unlockApp() {

    if (!currentUser) return;

    sessionStorage.setItem(
      UNLOCK_KEY,
      currentUser.id
    );

    const gate = $("cloudGate");

    if (gate) {
      gate.hidden = true;
    }

    const sidebar = $("cloudSidebar");

    if (sidebar) {
      sidebar.hidden = false;
    }

    const emailDisplay = $("cloudSignedInEmail");

    if (emailDisplay) {
      emailDisplay.textContent =
        currentUser.email || "Signed in";
    }
  }

  function showLoginScreen() {

    lockApp();

    if ($("cloudLogin")) {
      $("cloudLogin").hidden = false;
    }

    if ($("cloudChoices")) {
      $("cloudChoices").hidden = true;
    }

    if ($("cloudHeading")) {
      $("cloudHeading").textContent =
        "Welcome to StudyFlow";
    }

    showStatus(
      "Sign in with Google or your email account."
    );
  }

  function showAccountScreen() {

    if (!currentUser) {
      showLoginScreen();
      return;
    }

    lockApp();

    if ($("cloudLogin")) {
      $("cloudLogin").hidden = true;
    }

    if ($("cloudChoices")) {
      $("cloudChoices").hidden = false;
    }

    if ($("cloudHeading")) {
      $("cloudHeading").textContent =
        "Your StudyFlow Account";
    }

    if ($("cloudAccount")) {
      $("cloudAccount").textContent =
        currentUser.email || "Signed in";
    }
  }

  // ========================================
  // 5. FETCH CLOUD DATA
  // ========================================

  async function getCloudRecord() {

    if (!currentUser) {
      throw new Error(
        "Please sign in first."
      );
    }

    const { data, error } = await client
      .from("studyflow_cloud")
      .select("payload, revision, updated_at")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  // ========================================
  // 6. DOWNLOAD LOCAL BACKUP
  // ========================================

  function downloadLocalBackup() {

    const data = validateData(
      getLocalData()
    );

    const backup = {
      app: "StudyFlow",
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      data
    };

    const blob = new Blob(
      [
        JSON.stringify(
          backup,
          null,
          2
        )
      ],
      {
        type: "application/json"
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "StudyFlow-Backup-" +
      new Date().toISOString().slice(0, 10) +
      ".json";

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    showStatus(
      "Local JSON backup downloaded successfully."
    );
  }

  // ========================================
  // 7. UPLOAD LOCAL DATA TO SUPABASE
  // ========================================

  async function uploadCloud() {

    if (!currentUser) {
      throw new Error(
        "Please sign in first."
      );
    }

    const local = validateData(
      getLocalData()
    );

    const remote = await getCloudRecord();

    const proceed = confirm(
      "Upload your StudyFlow academic data?\n\n" +
      "This includes semesters, subjects, tasks, " +
      "timetable, exams, notes and study sessions.\n\n" +
      "PDF, DOCX, PPTX and XLSX uploads are " +
      "NOT included.\n\n" +
      "Make sure you have a JSON backup."
    );

    if (!proceed) {
      showStatus("Cloud upload cancelled.");
      return;
    }

    if (!remote) {

      // First cloud upload for this account.

      const { error } = await client
        .from("studyflow_cloud")
        .insert({
          user_id: currentUser.id,
          payload: local,
          revision: 1
        });

      if (error) {
        throw error;
      }

      saveRevision(1);

    } else {

      // Existing backup: protect against
      // accidentally overwriting newer data.

      const expected = getRevision();

      if (
        !isAccountReady() ||
        expected === null ||
        expected !== remote.revision
      ) {
        throw new Error(
          "Cloud data may be newer than the " +
          "records in this browser.\n\n" +
          "Upload blocked to protect your data.\n\n" +
          "Download a local backup and restore " +
          "your cloud records first."
        );
      }

      const { data, error } = await client
        .from("studyflow_cloud")
        .update({
          payload: local,
          revision: expected + 1,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", currentUser.id)
        .eq("revision", expected)
        .select("revision")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "Another device updated your cloud data.\n\n" +
          "Your upload was blocked to prevent " +
          "overwriting that newer version."
        );
      }

      saveRevision(data.revision);
    }

    markAccountReady();

    showStatus(
      "StudyFlow academic data uploaded to cloud!"
    );

    alert(
      "Upload Successful!\n\n" +
      "Your StudyFlow academic records are now " +
      "stored in Supabase.\n\n" +
      "Uploaded study material files are not included."
    );

    showAccountScreen();
  }

  // ========================================
  // 8. RESTORE CLOUD DATA
  // ========================================

  async function restoreCloud() {

    if (!currentUser) {
      throw new Error(
        "Please sign in first."
      );
    }

    const remote = await getCloudRecord();

    if (!remote) {
      throw new Error(
        "No cloud backup exists for this account."
      );
    }

    const cloudData = validateData(
      remote.payload
    );

    const proceed = confirm(
      "Restore academic data from Supabase?\n\n" +
      "This replaces the current local academic " +
      "records for this account.\n\n" +
      "Export a JSON backup first if you need " +
      "to preserve local changes."
    );

    if (!proceed) {
      showStatus("Cloud restore cancelled.");
      return;
    }

    const keys = [
      TASK_KEY,
      DATA_KEY,
      THEME_KEY
    ];

    const previous = {};

    for (const key of keys) {
      previous[key] =
        localStorage.getItem(key);
    }

    try {

      localStorage.setItem(
        TASK_KEY,
        JSON.stringify(cloudData.tasks)
      );

      localStorage.setItem(
        DATA_KEY,
        JSON.stringify(cloudData.state)
      );

      localStorage.setItem(
        THEME_KEY,
        JSON.stringify(cloudData.theme)
      );

    } catch (error) {

      let recoveryFailed = false;

      for (const key of keys) {

        try {

          if (previous[key] === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(
              key,
              previous[key]
            );
          }

        } catch (rollbackError) {

          console.error(
            "Recovery failed:",
            rollbackError
          );

          recoveryFailed = true;
        }
      }

      if (recoveryFailed) {
        throw new Error(
          "Restore failed and local recovery " +
          "was incomplete.\n\n" +
          "Use your saved JSON backup."
        );
      }

      throw new Error(
        "Cloud restore failed. Previous local " +
        "records were restored."
      );
    }

    saveRevision(remote.revision);

    markAccountReady();

    sessionStorage.setItem(
      UNLOCK_KEY,
      currentUser.id
    );

    alert(
      "Cloud Restore Successful!\n\n" +
      "StudyFlow will reload with your " +
      "restored academic data."
    );

    window.location.reload();
  }

  // ========================================
  // 9. OPEN LOCAL WORKSPACE
  // ========================================

  async function openLocalWorkspace() {

    if (!currentUser) {
      throw new Error(
        "Please sign in first."
      );
    }

    const remote = await getCloudRecord();

    if (remote) {

      if (
        !isAccountReady() ||
        getRevision() !== remote.revision
      ) {
        throw new Error(
          "Your cloud account already contains data, " +
          "but this local workspace has not been " +
          "verified against it.\n\n" +
          "Please restore the cloud backup first."
        );
      }
    }

    unlockApp();

    showStatus(
      "Local StudyFlow workspace opened."
    );
  }

  // ========================================
  // 10. GOOGLE SIGN-IN
  // ========================================

  async function signInGoogle() {

    const { error } =
      await client.auth.signInWithOAuth({
        provider: "google",

        options: {
          redirectTo:
            window.location.origin +
            window.location.pathname
        }
      });

    if (error) {
      throw error;
    }
  }

  // ========================================
  // 11. EMAIL LOGIN
  // ========================================

  async function signInEmail() {

    const email =
      $("cloudEmail").value.trim();

    const password =
      $("cloudPassword").value;

    if (!email || !password) {
      throw new Error(
        "Enter your email and password."
      );
    }

    const { error } =
      await client.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    await refreshAccount();
  }

  // ========================================
  // 12. CREATE EMAIL ACCOUNT
  // ========================================

  async function registerEmail() {

    const email =
      $("cloudEmail").value.trim();

    const password =
      $("cloudPassword").value;

    if (!email || password.length < 8) {
      throw new Error(
        "Enter a valid email and a password " +
        "with at least 8 characters."
      );
    }

    const { data, error } =
      await client.auth.signUp({
        email,
        password,

        options: {
          emailRedirectTo:
            window.location.origin +
            window.location.pathname
        }
      });

    if (error) {
      throw error;
    }

    if (data.session) {

      showStatus(
        "Account created successfully."
      );

      await refreshAccount();

    } else {

      showStatus(
        "Check your email for verification."
      );

      alert(
        "Registration submitted!\n\n" +
        "Please verify your email address " +
        "before signing in."
      );
    }
  }

  // ========================================
  // 13. SIGN OUT
  // ========================================

  async function signOut() {

    const proceed = confirm(
      "Sign out of StudyFlow?\n\n" +
      "Your local academic records will stay " +
      "saved under this account.\n\n" +
      "Upload recent changes if you want " +
      "them on other devices."
    );

    if (!proceed) return;

    const { error } =
      await client.auth.signOut();

    if (error) {
      throw error;
    }

    currentUser = null;

    sessionStorage.removeItem(
      ACCOUNT_KEY
    );

    sessionStorage.removeItem(
      UNLOCK_KEY
    );

    window.location.reload();
  }

  // ========================================
  // 14. ACCOUNT REFRESH
  // ========================================

  async function refreshAccount() {

    const { data, error } =
      await client.auth.getUser();

    if (error && !data?.user) {
      console.warn(
        "Authentication:",
        error.message
      );
    }

    currentUser =
      data?.user || null;

    const activeAccount =
      sessionStorage.getItem(
        ACCOUNT_KEY
      );

    // SIGNED OUT

    if (!currentUser) {

      if (activeAccount) {

        sessionStorage.removeItem(
          ACCOUNT_KEY
        );

        sessionStorage.removeItem(
          UNLOCK_KEY
        );

        window.location.reload();
        return;
      }

      showLoginScreen();
      return;
    }

    // ACCOUNT CHANGED

    if (activeAccount !== currentUser.id) {

      sessionStorage.setItem(
        ACCOUNT_KEY,
        currentUser.id
      );

      sessionStorage.removeItem(
        UNLOCK_KEY
      );

      // Reload dashboard data using the
      // new account's local storage.

      window.location.reload();
      return;
    }

    // ACCOUNT ALREADY UNLOCKED

    if (
      sessionStorage.getItem(
        UNLOCK_KEY
      ) === currentUser.id
    ) {

      unlockApp();
      return;
    }

    // SHOW CLOUD ACCOUNT OPTIONS

    showAccountScreen();

    try {

      const remote =
        await getCloudRecord();

      if (remote) {

        showStatus(
          "Cloud records found.\n" +
          "Restore your backup or open your " +
          "already-linked local workspace."
        );

      } else {

        showStatus(
          "No cloud records found.\n" +
          "You can open a new local workspace " +
          "or upload your academic data."
        );
      }

    } catch (error) {

      showStatus(
        "Unable to check cloud data: " +
        error.message
      );
    }
  }

  // ========================================
  // 15. ACTION HANDLER
  // ========================================

  async function runAction(action) {

    if (busy) return;

    busy = true;

    try {

      showStatus("Working...");

      await action();

    } catch (error) {

      console.error(
        "[StudyFlow Cloud Error]",
        error
      );

      showStatus(
        error.message
      );

      alert(
        "StudyFlow Cloud Error:\n\n" +
        error.message
      );

    } finally {

      busy = false;
    }
  }

  // ========================================
  // 16. CONNECT ALL BUTTONS
  // ========================================

  function connectButtons() {

    // CLOUD ACCOUNT BUTTON ON DASHBOARD

    const accountButton =
      $("openCloudAccount");

    if (accountButton) {

      accountButton.addEventListener(
        "click",
        () => {

          if (!currentUser) {
            showLoginScreen();
            return;
          }

          showAccountScreen();
        }
      );
    }

    // EMAIL LOGIN FORM

    const emailForm =
      $("cloudEmailForm");

    if (emailForm) {

      emailForm.addEventListener(
        "submit",
        event => {

          event.preventDefault();

          runAction(signInEmail);
        }
      );
    }

    // CLOUD BUTTONS

    const actions = [
      ["cloudGoogle", signInGoogle],
      ["cloudRegister", registerEmail],

      ["cloudUpload", uploadCloud],
      ["cloudRestore", restoreCloud],
      ["cloudLocal", openLocalWorkspace],
      ["cloudBackup", downloadLocalBackup],

      ["cloudSyncUpload", uploadCloud],
      ["cloudSyncDownload", restoreCloud],

      ["cloudSignOut", signOut],
      ["cloudSignOutGate", signOut]
    ];

    for (const [id, action] of actions) {

      const button = $(id);

      if (button) {

        button.addEventListener(
          "click",
          () => runAction(action)
        );
      }
    }
  }

  // ========================================
  // 17. INITIALIZE STUDYFLOW CLOUD
  // ========================================

  async function initialize() {

    lockApp();

    if (
      PROJECT_URL.includes("YOUR_") ||
      PUBLISHABLE_KEY.includes("PASTE_") ||
      PUBLISHABLE_KEY.includes("YOUR_")
    ) {

      showStatus(
        "Add your Supabase Project URL " +
        "and Publishable Key to cloud.js."
      );

      return;
    }

    if (!window.supabase) {

      showStatus(
        "Supabase library failed to load.\n" +
        "Check your internet connection."
      );

      return;
    }

    if (!$("cloudGate")) {

      console.error(
        "StudyFlow login HTML is missing."
      );

      return;
    }

    client = window.supabase.createClient(
      PROJECT_URL,
      PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    connectButtons();

    client.auth.onAuthStateChange(() => {

      setTimeout(() => {

        refreshAccount().catch(
          console.error
        );

      }, 0);
    });

    await refreshAccount();

    console.log(
      "StudyFlow Cloud Authentication Ready"
    );
  }

  // ========================================
  // 18. START
  // ========================================

  initialize().catch(error => {

    console.error(
      "[StudyFlow Startup Error]",
      error
    );

    showStatus(
      "Cloud startup failed: " +
      error.message
    );
  });

})();
