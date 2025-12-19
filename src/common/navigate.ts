import { closeAllDialogs } from "../dialogs/make-dialog-manager";
import { fireEvent } from "./dom/fire_event";
import { mainWindow } from "./dom/get_main_window";

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

  if (__DEMO__) {
    if (replace) {
      history.replaceState(
        history.state?.root ? { root: true } : (options?.data ?? null),
        "",
        `${mainWindow.location.pathname}#${path}`
      );
    } else {
      mainWindow.location.hash = path;
    }
  } else if (replace) {
    history.replaceState(
      history.state?.root ? { root: true } : (options?.data ?? null),
      "",
      path
    );
  } else {
    history.pushState(options?.data ?? null, "", path);
  }
  fireEvent(mainWindow, "location-changed", {
    replace,
  });
  return true;
};

/**
 * Navigate back in history, with fallback to a default path if no history exists.
 * This prevents a user from getting stuck when they navigate directly to a page with no history.
 */
export const goBack = async (fallbackPath?: string): Promise<void> => {
  const canProceed = await ensureDialogsClosed(Date.now());
  if (!canProceed) {
    return;
  }

  // Check if we have history to go back to
  const { history } = mainWindow;
  if (history.length > 1) {
    history.back();
    return;
  }

  // No history available, navigate to fallback path
  const fallback = fallbackPath || "/";
  navigate(fallback, { replace: true });
};
