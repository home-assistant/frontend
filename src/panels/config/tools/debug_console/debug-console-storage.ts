// What the debug console remembers in the browser, per user, so accounts taking
// turns in the same browser share nothing. All of it is a convenience: without
// storage, the console works and forgets it on reload.

const STORAGE_KEY_HISTORY = "tools-debug-console-history";
const STORAGE_KEY_ALLOW_PASTING = "tools-debug-console-allow-pasting";

export const MAX_HISTORY = 100;

/** Return the code the user ran before, oldest first. */
export const loadHistory = (userId: string): string[] => {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(`${STORAGE_KEY_HISTORY}-${userId}`) ?? "[]"
    );
    return Array.isArray(stored) ? stored : [];
  } catch (_err: unknown) {
    return [];
  }
};

/** Add code the user ran to the history, and return the new history. */
export const addToHistory = (
  userId: string,
  history: string[],
  code: string
): string[] => {
  // Running the same code again in a row adds nothing new to browse back to.
  const updated =
    history[history.length - 1] === code
      ? history
      : [...history, code].slice(-MAX_HISTORY);

  try {
    window.localStorage.setItem(
      `${STORAGE_KEY_HISTORY}-${userId}`,
      JSON.stringify(updated)
    );
  } catch (_err: unknown) {
    // Kept for this page load only.
  }

  return updated;
};

/** Return if the user unlocked pasting into the console. */
export const loadPasteAllowed = (userId: string): boolean => {
  try {
    return (
      window.localStorage.getItem(`${STORAGE_KEY_ALLOW_PASTING}-${userId}`) ===
      "true"
    );
  } catch (_err: unknown) {
    return false;
  }
};

/** Remember the user unlocked pasting into the console. */
export const savePasteAllowed = (userId: string): void => {
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY_ALLOW_PASTING}-${userId}`,
      "true"
    );
  } catch (_err: unknown) {
    // Allowed for this page load only.
  }
};
