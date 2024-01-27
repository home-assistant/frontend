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
    | HTMLAnchorElement
    | undefined;
  if (
    !anchor ||
    anchor.target ||
    anchor.hasAttribute("download") ||
    anchor.getAttribute("rel") === "external"
  ) {
    return undefined;
  }

  let href = anchor.href;
  if (!href || href.indexOf("mailto:") !== -1) {
    return undefined;
  }

  const location = window.location;
  const origin = location.origin || location.protocol + "//" + location.host;
  if (href.indexOf(origin) !== 0) {
    return undefined;
  }
  href = href.substr(origin.length);

  if (href === "#") {
    return undefined;
  }

  if (preventDefault) {
    e.preventDefault();
  }
  return href;
};
