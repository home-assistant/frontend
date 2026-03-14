export const copyToClipboard = async (str, rootEl?: HTMLElement) => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(str);
      return;
    } catch {
      // just continue with the fallback coding below
    }
  }

  const root = rootEl ?? document.body;

  const el = document.createElement("textarea");
  el.value = str;
  root.appendChild(el);
  el.select();
  document.execCommand("copy");
  root.removeChild(el);
};
