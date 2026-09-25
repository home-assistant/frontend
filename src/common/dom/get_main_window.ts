import { MAIN_WINDOW_NAME } from "../../data/main_window";

export const mainWindow = (() => {
  try {
    return window.name === MAIN_WINDOW_NAME
      ? window
      : parent.name === MAIN_WINDOW_NAME
        ? parent
        : top!;
  } catch {
    return window;
  }
})();
