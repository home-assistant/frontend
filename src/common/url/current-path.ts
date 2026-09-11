import { mainWindow } from "../dom/get_main_window";

/**
 * The path of the page currently shown by the app. The demo routes with the
 * hash instead of the pathname, see navigate().
 */
export const currentPath = (): string =>
  __DEMO__
    ? mainWindow.location.hash.substring(1)
    : mainWindow.location.pathname;
