const getClipboardFallbackRoot = (rootEl?: HTMLElement): HTMLElement => {
  if (rootEl) {
    return rootEl;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    const root = activeElement.getRootNode();
    if (root instanceof ShadowRoot) {
      return root.host as HTMLElement;
    }
  }

  return document.body;
};

export const copyToClipboard = async (str, rootEl?: HTMLElement) => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(str);
      return;
    } catch {
      // just continue with the fallback coding below
    }
  }

  const root = getClipboardFallbackRoot(rootEl);

  const el = document.createElement("textarea");
  el.value = str;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.opacity = "0";
  root.appendChild(el);
  el.select();
  document.execCommand("copy");
  root.removeChild(el);
};
