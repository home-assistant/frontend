import { isNavigationClick } from "../common/dom/is-navigation-click";
import { goBack } from "../common/navigate";
import { sanitizeNavigationPath } from "../common/url/sanitize-navigation-path";

/**
 * Shared behavior of the toolbar back arrow. The arrow is a link to the
 * declared parent page so it can be opened in a new tab, but a plain click
 * returns to the page the user came from instead.
 */
export const handleBackClick = (
  ev: MouseEvent,
  backPath?: string,
  backCallback?: () => void
): void => {
  const path = sanitizeNavigationPath(backPath);

  // Ctrl, cmd and shift click open the parent in a new tab or window: let
  // the anchor handle those. A plain click is handled here instead, and
  // isNavigationClick calls preventDefault so the anchor stays inert.
  if (path && !isNavigationClick(ev)) {
    return;
  }

  if (backCallback) {
    backCallback();
    return;
  }

  goBack(path);
};
