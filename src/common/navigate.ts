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
  data?: any;
}

// max time to wait for dialogs to close before navigating
const DIALOG_WAIT_TIMEOUT = 500;

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

export const navigate = async (path: string, options?: NavigateOptions) => {
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
    const state = root ? { root: true } : (options?.data ?? null);
    history.replaceState(
      from === undefined ? state : { ...state, from },
      "",
      path
    );
  } else {
    history.pushState({ ...options?.data, from: currentPath() }, "", path);
  }

  fireEvent(mainWindow, "location-changed", {
    replace,
  });
  return true;
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

  navigate(fallbackPath || "/", { replace: true });
};
