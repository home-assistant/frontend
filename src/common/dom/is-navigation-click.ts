export const isNavigationClick = (e: MouseEvent) => {
  // Taken from polymer/pwa-helpers. BSD-3 licensed
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey
  ) {
    return;
  }

  const anchor = e
    .composedPath()
    .filter((n) => (n as HTMLElement).tagName === "A")[0] as
    | HTMLAnchorElement
    | undefined;
  if (
    !anchor ||
    anchor.target ||
    anchor.hasAttribute("download") ||
    anchor.getAttribute("rel") === "external"
  ) {
    return;
  }

  let href = anchor.href;
  if (!href || href.indexOf("mailto:") !== -1) {
    return;
  }

  const location = window.location;
  const origin = location.origin || location.protocol + "//" + location.host;
  if (href.indexOf(origin) !== 0) {
    return;
  }
  href = href.substr(origin.length);

  if (href === "#") {
    return;
  }

  e.preventDefault();
  return href;
};
