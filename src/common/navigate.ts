import { fireEvent } from "./dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "location-changed": {
      replace: boolean;
    };
  }
}

export const MAIN_WINDOW_NAME = "ha-main";

export const getMainWindow = () =>
  top.name === MAIN_WINDOW_NAME
    ? top
    : parent.name === MAIN_WINDOW_NAME
    ? parent
    : window;

export const navigate = (_node: any, path: string, replace = false) => {
  const mainWindow = getMainWindow();
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
