import { deepActiveElement } from "../dom/deep-active-element";

const getClipboardFallbackRoot = (): HTMLElement => {
  const activeElement = deepActiveElement();
  if (activeElement instanceof HTMLElement) {
    let root: Node = activeElement.getRootNode();
    let host: HTMLElement | null = null;

    while (root instanceof ShadowRoot && root.host instanceof HTMLElement) {
      host = root.host;
      root = root.host.getRootNode();
    }

    if (host) {
      return host;
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

  const root = rootEl || getClipboardFallbackRoot();

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
