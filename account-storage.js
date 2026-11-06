
"use strict";

/*
  STUDYFLOW — ACCOUNT STORAGE ISOLATION

  Each signed-in account gets its own localStorage
  namespace for academic data.

  Existing unscoped data is left untouched.
*/

(() => {
  const ACCOUNT_KEY = "studyflow-active-account";

  const DATA_KEYS = new Set([
    "studyflow-tasks",
    "studyflow-v2-data",
    "studyflow-theme"
  ]);

  const originalGet = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;

  function scopedKey(storage, key) {
    key = String(key);

    // Do not modify sessionStorage.
    if (storage !== window.localStorage) {
      return key;
    }

    // Leave unrelated localStorage keys unchanged.
    if (!DATA_KEYS.has(key)) {
      return key;
    }

    const accountId = originalGet.call(
      window.sessionStorage,
      ACCOUNT_KEY
    );

    // A separate temporary workspace when signed out.
    const namespace = accountId || "signed-out";

    return (
      "studyflow-account:" +
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
    "StudyFlow account-specific storage ready."
  );
})();
