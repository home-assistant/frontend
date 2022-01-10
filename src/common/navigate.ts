import { historyPromise } from "../state/url-sync-mixin";
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
}

export const navigate = (path: string, options?: NavigateOptions) => {
  const replace = options?.replace || false;

  if (historyPromise) {
    historyPromise.then(() => navigate(path, options));
    return;
  }

  if (__DEMO__) {
    if (replace) {
      mainWindow.history.replaceState(
        mainWindow.history.state?.root ? { root: true } : null,
        "",
        `${mainWindow.location.pathname}#${path}`
      );
    } else {
      mainWindow.location.hash = path;
    }
  } else if (replace) {
    mainWindow.history.replaceState(
      mainWindow.history.state?.root ? { root: true } : null,
      "",
      path
    );
  } else {
    mainWindow.history.pushState(null, "", path);
  }
  fireEvent(mainWindow, "location-changed", {
    replace,
  });
};
