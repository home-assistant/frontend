import { closeAllDialogs } from "../dialogs/make-dialog-manager";
import { fireEvent } from "./dom/fire_event";
import { mainWindow } from "./dom/get_main_window";
import { currentPath } from "./url/current-path";

declare global {
  // for fire event
  interface HASSDomEvents {
    "location-changed": NavigateOptions;
  }
}

export interface NavigateOptions {
  replace?: boolean;
  data?: Record<string, unknown>;
}

// max time to wait for dialogs to close before navigating
const DIALOG_WAIT_TIMEOUT = 500;

/**
 * State of the current history entry. Always read through this, the app writes
 * to the main window and a panel running in an iframe has its own history.
 */
export const getHistoryState = (): any => mainWindow.history.state;

/**
 * Merge into the current history entry's state, keeping what is already there.
 * Entries carry the app's own bookkeeping (`from`, `root`, dialog state), so
 * they must never be replaced wholesale.
 */
export const updateHistoryState = (patch: Record<string, unknown>) => {
  mainWindow.history.replaceState(
    { ...mainWindow.history.state, ...patch },
    ""
  );
};

/**
 * Rewrite the URL of the current history entry without navigating and without
 * touching its state. For query parameter cleanup.
 */
export const replaceCurrentUrl = (url: string) => {
  mainWindow.history.replaceState(mainWindow.history.state, "", url);
};

/**
 * Stash a destination URL in the current history entry's state. If the page
 * is refreshed while a dialog is open, urlSyncMixin will navigate to this URL
 * on load instead of cleaning up the stale dialog state by going back.
 * The current URL is not changed.
 */
export const setRefreshUrl = (path: string) => {
  updateHistoryState({ refreshUrl: path });
};

/**
 * Ensures all dialogs are closed before navigation.
 * Returns true if navigation can proceed, false if a dialog refused to close.
 */
const ensureDialogsClosed = async (timestamp: number): Promise<boolean> => {
  const { history } = mainWindow;

  if (!history.state?.dialog || Date.now() - timestamp >= DIALOG_WAIT_TIMEOUT) {
    return true;
  }

  const closed = await closeAllDialogs();
  if (!closed) {
    // eslint-disable-next-line no-console
    console.warn("Navigation blocked, because dialog refused to close");
    return false;
  }

  // wait for history state to be updated after dialog closed
  await new Promise<void>((resolve) => {
    setTimeout(resolve);
  });

  return ensureDialogsClosed(timestamp);
};

/**
 * Lets a page with unsaved changes (e.g. the automation editor) veto
 * navigation. `isDirty` is read live at navigation time; `prompt` resolves
 * true when navigation may proceed.
 */
export interface UnsavedChangesGuard {
  isDirty(): boolean;
  prompt(): Promise<boolean>;
}

const unsavedChangesGuards = new Set<UnsavedChangesGuard>();

export const registerUnsavedChangesGuard = (guard: UnsavedChangesGuard) => {
  unsavedChangesGuards.add(guard);
};

export const unregisterUnsavedChangesGuard = (guard: UnsavedChangesGuard) => {
  unsavedChangesGuards.delete(guard);
};

let pendingUnsavedPrompt: Promise<boolean> | undefined;

/**
 * Counts navigations that changed the history entry, so a navigation held up
 * by an unsaved-changes prompt can tell whether a newer one has moved the app
 * on in the meantime.
 */
let committedNavigations = 0;

/**
 * Asks each dirty guard whether navigation may proceed. Returns true when
 * nothing is dirty or every prompt was confirmed. Concurrent navigations
 * share one pending prompt instead of stacking dialogs; the dirty check runs
 * before joining it, so a navigation triggered from inside a prompt (e.g. by
 * its save action) cannot deadlock on its own promise.
 */
const ensureUnsavedChangesConfirmed = (): Promise<boolean> => {
  const dirtyGuards = [...unsavedChangesGuards].filter((guard) =>
    guard.isDirty()
  );
  if (!dirtyGuards.length) {
    return Promise.resolve(true);
  }
  if (!pendingUnsavedPrompt) {
    pendingUnsavedPrompt = (async () => {
      try {
        for (const guard of dirtyGuards) {
          // eslint-disable-next-line no-await-in-loop
          if (!(await guard.prompt())) {
            return false;
          }
        }
        return true;
      } finally {
        pendingUnsavedPrompt = undefined;
      }
    })();
  }
  return pendingUnsavedPrompt;
};

const buildHistoryState = (
  data: Record<string, unknown> | undefined,
  from?: string
) => {
  const state = typeof data === "object" ? data : undefined;
  if (from === undefined) {
    return state ?? null;
  }
  return { ...state, from };
};

const performNavigation = async (path: string, options?: NavigateOptions) => {
  const canProceed = await ensureDialogsClosed(Date.now());
  if (!canProceed) {
    return false;
  }
  const replace = options?.replace || false;

  if (__DEMO__ && !path.includes("#")) {
    // The demo routes with the hash instead of the pathname. Resolve the
    // path like the browser would do for pushState, and keep the query
    // parameters in the URL query instead of inside the hash.
    const url = new URL(
      path,
      `${mainWindow.location.origin}${mainWindow.location.hash.substring(1)}`
    );
    path = `${mainWindow.location.pathname}${url.search}#${url.pathname}`;
  }

  const { history } = mainWindow;

  if (replace) {
    // A replaced entry keeps its predecessor, so it keeps `from`.
    const { root, from } = history.state ?? {};
    const data = root ? { root: true } : options?.data;
    history.replaceState(buildHistoryState(data, from), "", path);
  } else {
    history.pushState(
      buildHistoryState(options?.data, currentPath()),
      "",
      path
    );
  }

  fireEvent(mainWindow, "location-changed", {
    replace,
  });
  committedNavigations += 1;
  return true;
};

export const navigate = async (path: string, options?: NavigateOptions) => {
  // Only guard actual departures: navigating to the current path keeps the
  // page, and any unsaved state on it, mounted.
  if (path !== currentPath()) {
    const navigationsBeforePrompt = committedNavigations;
    if (!(await ensureUnsavedChangesConfirmed())) {
      return false;
    }
    if (committedNavigations !== navigationsBeforePrompt) {
      // Another navigation landed while the prompt was waiting for an answer,
      // so this destination is stale. Dropping it keeps a late answer from
      // pulling the user back off the page they are on now.
      return false;
    }
  }
  return performNavigation(path, options);
};

/**
 * Whether the previous history entry is a page this app navigated away from.
 * `history.length` cannot answer this: a login redirect goes through
 * `location.assign`, which leaves /auth/authorize right behind the requested
 * page, and going back there would bounce the user out of the app.
 */
export const canGoBack = (): boolean =>
  mainWindow.history.state?.from !== undefined;

/**
 * Navigate back to the page we came from, falling back to a path when the
 * previous entry is not ours (deep link, login redirect, fresh tab).
 * Deliberately not guarded against unsaved changes: pages with such a guard
 * confirm in their own back handlers, and delete flows leave through here
 * after the edited item is already gone.
 */
export const goBack = async (fallbackPath?: string): Promise<void> => {
  const canProceed = await ensureDialogsClosed(Date.now());
  if (!canProceed) {
    return;
  }

  // Read after closing dialogs: their history entries are popped by then, so
  // this is the state of the page entry.
  if (canGoBack()) {
    mainWindow.history.back();
    return;
  }

  await performNavigation(fallbackPath || "/", { replace: true });
};
