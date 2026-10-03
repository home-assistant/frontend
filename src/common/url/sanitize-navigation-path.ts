import { mainWindow } from "../dom/get_main_window";

/**
 * Checks that a path resolves to the origin the frontend is served from, so it
 * is safe to use as a link target. Rejects URIs that carry their own scheme,
 * like `javascript:`, and URLs pointing at another origin. Resolves against the
 * main window, because that is where `navigate()` applies the path.
 */
const isSameOriginPath = (path: string): boolean => {
  try {
    const { origin } = mainWindow.location;
    return new URL(path, origin).origin === origin;
  } catch (_err) {
    return false;
  }
};

/**
 * Returns the path if it is safe to navigate to, `undefined` otherwise. Use for
 * paths that can be influenced by a URL parameter or by dashboard config before
 * they end up in an `href` or in `navigate()`.
 */
export const sanitizeNavigationPath = (
  path: string | null | undefined
): string | undefined =>
  path != null && isSameOriginPath(path) ? path : undefined;
