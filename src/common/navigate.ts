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
  if (history.state?.dialog) {
    const closed = await closeAllDialogs();
    if (!closed) {
      // eslint-disable-next-line no-console
      console.warn("Navigation blocked, because dialog refused to close");
      return false;
    }
  }
  return new Promise<boolean>((resolve) => {
    // need to wait for history state to be updated in case a dialog was closed
    setTimeout(async () => {
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
      resolve(true);
    });
  });
};
