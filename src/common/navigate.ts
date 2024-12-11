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

export const navigate = async (path: string, options?: NavigateOptions) => {
  const { history } = mainWindow;
  let replace = options?.replace || false;

  if (history.state?.dialog) {
    const closed = await closeAllDialogs();
    if (!closed) {
      // eslint-disable-next-line no-console
      console.warn("Navigation blocked, because dialog refused to close");
      return false;
    }
    // if there were open dialogs, we discard the current state
    replace = true;
  }

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
