import { deepActiveElement } from "../dom/deep-active-element";

export const copyToClipboard = async (str, rootEl?: HTMLElement) => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(str);
      return;
    } catch {
      // just continue with the fallback coding below
    }
  }

  const root = rootEl || deepActiveElement()?.getRootNode() || document.body;
  // A document node cannot have a textarea appended directly (only the single
  // documentElement is allowed), so fall back to its body. Shadow roots and
  // elements can hold the textarea directly, which keeps execCommand working
  // inside dialogs that trap focus.
  const container: Node =
    root.nodeType === Node.DOCUMENT_NODE ? document.body : root;

  const el = document.createElement("textarea");
  el.value = str;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.opacity = "0";
  container.appendChild(el);
  el.select();
  document.execCommand("copy");
  container.removeChild(el);
};
