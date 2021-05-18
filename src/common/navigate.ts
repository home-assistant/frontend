import { fireEvent } from "./dom/fire_event";
import { mainWindow } from "./dom/get_main_window";

declare global {
  // for fire event
  interface HASSDomEvents {
    "location-changed": {
      replace: boolean;
    };
  }
}

export const navigate = (_node: any, path: string, replace = false) => {
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
