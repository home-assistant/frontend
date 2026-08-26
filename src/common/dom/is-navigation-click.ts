export const isNavigationClick = (e: MouseEvent, preventDefault = true) => {
  // Taken from polymer/pwa-helpers. BSD-3 licensed
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey
  ) {
    return undefined;
  }

  const anchor = e
    .composedPath()
    .find((n) => (n as HTMLElement).tagName === "A") as
    HTMLAnchorElement | undefined;
  if (
    !anchor ||
    anchor.target ||
    anchor.hasAttribute("download") ||
    anchor.getAttribute("rel") === "external"
  ) {
    return undefined;
  }

  let url: URL;
  try {
    // anchor.href is always absolute; an empty or unparseable value throws.
    url = new URL(anchor.href);
  } catch {
    return undefined;
  }

  // Only intercept same-origin links. A different scheme, host, or port is a
  // different origin (e.g. another port like ":8123") and must trigger a full
  // browser navigation instead of an in-app route change. Non-http(s) schemes
  // such as mailto: resolve to a null origin and are excluded here too.
  if (url.origin !== window.location.origin) {
    return undefined;
  }

  if (preventDefault) {
    e.preventDefault();
  }
  return url.pathname + url.search + url.hash;
};
